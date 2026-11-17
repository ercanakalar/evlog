import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { FakeOcr } from './fake-ocr';

/** A minimal JPEG header plus random bytes: passes magic-number checks, unique hash. */
const jpeg = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    randomBytes(256),
  ]);

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe('Evlog API (e2e)', () => {
  let app: INestApplication<App>;
  const ocr = new FakeOcr();
  let owner: string;
  let tenant: string;
  let homeId: string;

  const api = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (email: string) => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret', fullName: email.split('@')[0] })
      .expect(201);
    return res.body.accessToken as string;
  };

  const scan = (token: string, kind: string, extra: Record<string, string> = {}) => {
    const req = api()
      .post('/api/v1/receipts')
      .set(auth(token))
      .field('kind', kind)
      .attach('file', jpeg(), { filename: 'r.jpg', contentType: 'image/jpeg' });
    for (const [k, v] of Object.entries(extra)) void req.field(k, v);
    return req;
  };

  const scanAndConfirm = async (token: string, kind: string) => {
    const res = await scan(token, kind, { homeId }).expect(201);
    expect(res.body.status).toBe('PARSED');
    await api()
      .post(`/api/v1/receipts/${res.body.id}/confirm`)
      .set(auth(token))
      .expect(200);
    return res.body.id as string;
  };

  beforeAll(async () => {
    await ocr.start(4599);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    owner = await register('owner@example.com');
    tenant = await register('tenant@example.com');
  });

  afterAll(async () => {
    await app.close();
    await ocr.stop();
  });

  describe('auth & validation', () => {
    it('rejects unknown fields and weak passwords', async () => {
      const res = await api()
        .post('/api/v1/auth/register')
        .send({ email: 'x@example.com', password: 'weak', fullName: 'X', isAdmin: true })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining(['property isAdmin should not exist']),
      );
    });

    it('rejects duplicate emails with 409', () =>
      api()
        .post('/api/v1/auth/register')
        .send({ email: 'OWNER@example.com', password: 'Sup3rSecret', fullName: 'Dup' })
        .expect(409));

    it('rotates refresh tokens', async () => {
      const login = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'owner@example.com', password: 'Sup3rSecret' })
        .expect(200);
      const { refreshToken } = login.body;
      await api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(200);
      await api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('requires a token', () => api().get('/api/v1/me').expect(401));
  });

  describe('home & tenancy', () => {
    it('creates a home and invites a tenant', async () => {
      const home = await api()
        .post('/api/v1/homes')
        .set(auth(owner))
        .send({
          city: 'Ankara',
          district: 'Çankaya',
          addressLine: 'Atatürk Blv. 1/3',
          roomLayout: '2+1',
          areaM2: 95,
        })
        .expect(201);
      homeId = home.body.id;

      await api()
        .post('/api/v1/homes')
        .set(auth(owner))
        .send({ city: 'Ankara', district: 'X', addressLine: 'Y', roomLayout: 'big' })
        .expect(400);

      // The tenant cannot see the home before accepting.
      await api().get(`/api/v1/homes/${homeId}`).set(auth(tenant)).expect(404);

      const invite = await api()
        .post(`/api/v1/homes/${homeId}/tenancies/invite`)
        .set(auth(owner))
        .send({ startDate: daysAgo(90).slice(0, 10) })
        .expect(201);
      await api()
        .post('/api/v1/tenancies/accept')
        .set(auth(tenant))
        .send({ code: invite.body.inviteCode })
        .expect(200);

      const me = await api().get('/api/v1/me').set(auth(tenant)).expect(200);
      expect(me.body.homes).toEqual([
        expect.objectContaining({ role: 'TENANT', home: expect.objectContaining({ id: homeId }) }),
      ]);
    });
  });

  describe('condition record', () => {
    let sessionId: string;

    it('records time-stamped photos and locks them', async () => {
      const session = await api()
        .post(`/api/v1/homes/${homeId}/condition-sessions`)
        .set(auth(owner))
        .send({ type: 'MOVE_IN' })
        .expect(201);
      sessionId = session.body.id;

      for (const room of ['LIVING_ROOM', 'KITCHEN', 'KITCHEN']) {
        await api()
          .post(`/api/v1/condition-sessions/${sessionId}/photos`)
          .set(auth(owner))
          .field('room', room)
          .field('capturedAt', new Date().toISOString())
          .attach('file', jpeg(), { filename: 'p.jpg', contentType: 'image/jpeg' })
          .expect(201);
      }

      // Not an image, even though the client claims it is.
      await api()
        .post(`/api/v1/condition-sessions/${sessionId}/photos`)
        .set(auth(owner))
        .field('room', 'BEDROOM')
        .field('capturedAt', new Date().toISOString())
        .attach('file', Buffer.from('%PDF-1.7 not an image'), {
          filename: 'p.jpg',
          contentType: 'image/jpeg',
        })
        .expect(422);

      const locked = await api()
        .post(`/api/v1/condition-sessions/${sessionId}/lock`)
        .set(auth(owner))
        .expect(200);
      expect(locked.body.status).toBe('LOCKED');
      expect(locked.body.contentHash).toMatch(/^[a-f0-9]{64}$/);

      await api()
        .post(`/api/v1/condition-sessions/${sessionId}/photos`)
        .set(auth(owner))
        .field('room', 'BEDROOM')
        .field('capturedAt', new Date().toISOString())
        .attach('file', jpeg(), { filename: 'p.jpg', contentType: 'image/jpeg' })
        .expect(409);
    });

    it('is confirmed once the tenant agrees', async () => {
      const res = await api()
        .post(`/api/v1/condition-sessions/${sessionId}/confirm`)
        .set(auth(tenant))
        .expect(200);
      expect(res.body.status).toBe('CONFIRMED');

      const detail = await api()
        .get(`/api/v1/condition-sessions/${sessionId}`)
        .set(auth(tenant))
        .expect(200);
      expect(detail.body.rooms).toEqual({ LIVING_ROOM: 1, KITCHEN: 2 });
      expect(detail.body.photos[0].storageKey).toBeUndefined();

      const file = await api()
        .get(`/api/v1/condition-photos/${detail.body.photos[0].id}/file`)
        .set(auth(owner))
        .expect(200);
      expect(file.headers['content-type']).toBe('image/jpeg');
    });
  });

  describe('receipts, verification and ratings', () => {
    beforeAll(() => {
      let rentMonth = 0;
      ocr.respond = (call) => {
        switch (call.kind) {
          case 'RENT':
            rentMonth += 1;
            return {
              status: 200,
              body: { merchantName: 'Bank transfer', issuedAt: daysAgo(rentMonth * 31), total: 25000, items: [] },
            };
          case 'UTILITY_GAS':
            return { status: 200, body: { merchantName: 'Başkentgaz', issuedAt: daysAgo(10), total: 1840.5, items: [] } };
          default:
            return { status: 200, body: { items: [] } };
        }
      };
    });

    it('cannot rate before the tenancy is verified', async () => {
      await api()
        .post(`/api/v1/homes/${homeId}/ratings`)
        .set(auth(tenant))
        .send({ scores: [{ category: 'HEATING_EFFICIENCY', score: 2 }] })
        .expect(403);
    });

    it('verifies the tenancy from rent receipts', async () => {
      expect(ocr.calls).toHaveLength(0);
      await scanAndConfirm(tenant, 'RENT');
      await scanAndConfirm(tenant, 'RENT');
      expect(ocr.calls[0].authorization).toBe('Bearer test-ocr-token');

      const eligibility = await api()
        .get(`/api/v1/homes/${homeId}/ratings/eligibility`)
        .set(auth(tenant))
        .expect(200);
      expect(eligibility.body.tenancyVerified).toBe(true);
      const eligible = Object.fromEntries(
        eligibility.body.categories.map((c: { category: string; eligible: boolean }) => [c.category, c.eligible]),
      );
      expect(eligible).toEqual({
        HOME_CONDITION: true,
        NEIGHBORHOOD: true,
        INFRASTRUCTURE: false,
        HEATING_EFFICIENCY: false,
        RENOVATIONS: false,
      });
    });

    it('rejects scores without evidence, accepts them with it', async () => {
      await api()
        .post(`/api/v1/homes/${homeId}/ratings`)
        .set(auth(tenant))
        .send({ scores: [{ category: 'HEATING_EFFICIENCY', score: 2 }] })
        .expect(422);

      await scanAndConfirm(tenant, 'UTILITY_GAS');

      await api()
        .post(`/api/v1/homes/${homeId}/ratings`)
        .set(auth(tenant))
        .send({
          scores: [
            { category: 'HOME_CONDITION', score: 4 },
            { category: 'NEIGHBORHOOD', score: 4 },
            { category: 'HEATING_EFFICIENCY', score: 2 },
          ],
          noteForNextTenant: 'Bleed the radiators in October.',
        })
        .expect(201);

      await api()
        .post(`/api/v1/homes/${homeId}/ratings`)
        .set(auth(tenant))
        .send({ scores: [{ category: 'NEIGHBORHOOD', score: 5 }] })
        .expect(409);

      const home = await api().get(`/api/v1/homes/${homeId}`).set(auth(owner)).expect(200);
      expect(home.body.score).toEqual(
        expect.objectContaining({ score: 3.3, ratingCount: 1 }),
      );
    });

    it('validates scores', () =>
      api()
        .post(`/api/v1/homes/${homeId}/ratings`)
        .set(auth(tenant))
        .send({ scores: [{ category: 'NEIGHBORHOOD', score: 6 }] })
        .expect(400));

    it('rejects the same receipt image twice', async () => {
      const image = jpeg();
      const first = await api()
        .post('/api/v1/receipts')
        .set(auth(owner))
        .field('kind', 'OTHER')
        .attach('file', image, { filename: 'r.jpg', contentType: 'image/jpeg' })
        .expect(201);
      const second = await api()
        .post('/api/v1/receipts')
        .set(auth(owner))
        .field('kind', 'OTHER')
        .attach('file', image, { filename: 'r.jpg', contentType: 'image/jpeg' })
        .expect(409);
      expect(second.body.receiptId).toBe(first.body.id);
    });

    it('accepts asynchronous reader results through the callback', async () => {
      ocr.respond = () => ({ status: 202 });
      const res = await scan(owner, 'SERVICE').expect(201);
      expect(res.body.status).toBe('PROCESSING');
      const { callbackUrl } = ocr.calls.at(-1)!;
      const path = new URL(callbackUrl).pathname;

      await api().post(path).set('X-Ocr-Secret', 'wrong').send({ items: [] }).expect(401);
      await api()
        .post(path)
        .set('X-Ocr-Secret', 'test-ocr-callback-secret-0123456789abcd')
        .send({ merchantName: 'Kombi Servis', issuedAt: daysAgo(1), total: 1500, items: [] })
        .expect(200);

      const receipt = await api().get(`/api/v1/receipts/${res.body.id}`).set(auth(owner)).expect(200);
      expect(receipt.body).toEqual(
        expect.objectContaining({ status: 'PARSED', merchantName: 'Kombi Servis', totalAmount: '1500' }),
      );
    });

    it('marks the receipt failed when the reader returns garbage', async () => {
      ocr.respond = () => ({ status: 200, body: { items: [{ name: '', totalPrice: -1 }] } });
      const res = await scan(owner, 'OTHER').expect(201);
      expect(res.body.status).toBe('FAILED');
      expect(res.body.ocrError).toMatch(/invalid fields/);
    });
  });

  describe('kitchen & market data', () => {
    it('learns the pantry and tracks prices from grocery receipts', async () => {
      const groceries = (daysBack: number, oil: number) => ({
        status: 200,
        body: {
          merchantName: 'Migros',
          issuedAt: daysAgo(daysBack),
          items: [
            { name: 'SÜT 1LT TAM YAĞLI', quantity: 1, unit: 'L', totalPrice: 42.75 },
            { name: 'Zeytinyağı 1L', quantity: 1, unit: 'L', totalPrice: oil },
          ],
        },
      });
      ocr.respond = () => groceries(40, 348.0);
      await scanAndConfirm(owner, 'GROCERY');
      ocr.respond = () => groceries(33, 389.9);
      await scanAndConfirm(owner, 'GROCERY');

      const kitchen = await api().get(`/api/v1/homes/${homeId}/kitchen`).set(auth(tenant)).expect(200);
      expect(kitchen.body.lastScan.itemCount).toBe(2);
      const oil = kitchen.body.priceWatch.find((p: { normalizedName: string }) =>
        p.normalizedName.startsWith('zeytinyagi'),
      );
      expect(oil).toEqual(expect.objectContaining({ price: '389.90', changePercent: 12 }));
      // Bought every 7 days, last bought 33 days ago -> running low.
      expect(kitchen.body.runningLow.map((i: { name: string }) => i.name)).toContain('SÜT 1LT TAM YAĞLI');

      await api()
        .post(`/api/v1/homes/${homeId}/shopping-list`)
        .set(auth(tenant))
        .send({ name: 'Milk' })
        .expect(201);
    });

    it('hides market prices with too few households', async () => {
      const res = await api().get('/api/v1/market/prices?q=süt').set(auth(owner)).expect(200);
      expect(res.body).toEqual([]);
      await api().get('/api/v1/market/prices?q=s').set(auth(owner)).expect(400);
    });
  });

  describe('upkeep', () => {
    it('schedules default tasks and reschedules when done', async () => {
      const boiler = await api()
        .post(`/api/v1/homes/${homeId}/appliances`)
        .set(auth(owner))
        .send({ type: 'COMBI_BOILER', name: 'Combi boiler' })
        .expect(201);
      expect(boiler.body.tasks).toEqual([
        expect.objectContaining({ title: 'Yearly service', intervalDays: 365 }),
      ]);
      await api()
        .post(`/api/v1/homes/${homeId}/appliances`)
        .set(auth(owner))
        .send({
          type: 'DISHWASHER',
          name: 'Dishwasher',
          tasks: [{ title: 'Clean filter', intervalDays: 30, lastDoneAt: daysAgo(33) }],
        })
        .expect(201);

      const upkeep = await api().get(`/api/v1/homes/${homeId}/upkeep`).set(auth(tenant)).expect(200);
      expect(upkeep.body.next).toEqual(expect.objectContaining({ title: 'Clean filter', daysLeft: -3 }));

      const done = await api()
        .post(`/api/v1/maintenance-tasks/${upkeep.body.next.id}/done`)
        .set(auth(tenant))
        .send({ note: 'Filter rinsed' })
        .expect(200);
      expect(done.body.daysLeft).toBe(30);

      // Only the owner removes appliances.
      await api().delete(`/api/v1/appliances/${boiler.body.id}`).set(auth(tenant)).expect(403);
    });
  });

  describe('listings & brokers', () => {
    it('links a sahibinden listing and shares chosen data with a broker', async () => {
      await api()
        .post(`/api/v1/homes/${homeId}/listings`)
        .set(auth(owner))
        .send({ reference: 'https://evil.example.com/ilan/123456789/detay' })
        .expect(400);
      await api()
        .post(`/api/v1/homes/${homeId}/listings`)
        .set(auth(tenant))
        .send({ reference: '1234567890' })
        .expect(403);

      const listing = await api()
        .post(`/api/v1/homes/${homeId}/listings`)
        .set(auth(owner))
        .send({
          reference:
            'https://www.sahibinden.com/ilan/emlak-konut-kiralik-cankaya-2-plus1-1234567890/detay?x=1',
        })
        .expect(201);
      expect(listing.body).toEqual(
        expect.objectContaining({ externalId: '1234567890', syncMode: 'link-only' }),
      );

      const broker = await api()
        .post(`/api/v1/listings/${listing.body.id}/brokers`)
        .set(auth(owner))
        .send({ agencyName: 'Çankaya Emlak', email: 'Agent@Example.com' })
        .expect(201);
      const { shareToken } = broker.body;

      await api().get(`/api/v1/shared/listings/${shareToken}`).expect(404);

      await api()
        .patch(`/api/v1/listings/${listing.body.id}`)
        .set(auth(owner))
        .send({ sharePhotos: true, shareRatings: true, shareHeatingBills: true })
        .expect(200);
      const update = await api()
        .post(`/api/v1/listings/${listing.body.id}/send-update`)
        .set(auth(owner))
        .expect(200);
      expect(update.body.recipients).toBe(1);

      const shared = await api().get(`/api/v1/shared/listings/${shareToken}`).expect(200);
      expect(shared.body.home).toEqual(expect.objectContaining({ roomLayout: '2+1' }));
      expect(shared.body.photos).toHaveLength(3);
      expect(shared.body.score.score).toBe(3.3);
      expect(shared.body.heatingBills).toEqual([expect.objectContaining({ total: '1840.50' })]);
      expect(JSON.stringify(shared.body)).not.toContain('tenant@example.com');

      await api()
        .get(`/api/v1/shared/listings/${shareToken}/photos/${shared.body.photos[0].id}`)
        .expect(200);

      await api()
        .delete(`/api/v1/listings/${listing.body.id}/brokers/${broker.body.broker.id}`)
        .set(auth(owner))
        .expect(204);
      await api().get(`/api/v1/shared/listings/${shareToken}`).expect(404);
    });
  });
});

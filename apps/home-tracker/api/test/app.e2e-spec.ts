import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { FakeOcr } from './fake-ocr';

/** A minimal JPEG header plus random bytes: passes magic-number checks, unique hash. */
const jpeg = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    randomBytes(256),
  ]);

/** Photos on disk right now. */
const storedFiles = () =>
  existsSync('./uploads-test')
    ? readdirSync('./uploads-test', { recursive: true, withFileTypes: true }).filter((f) => f.isFile()).length
    : 0;

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
      for (const [token, mine] of [[owner, false], [tenant, true]] as const) {
        const list = await api().get(`/api/v1/homes/${homeId}/ratings`).set(auth(token)).expect(200);
        expect(list.body).toEqual([expect.objectContaining({ mine })]);
        expect(list.body[0].authorId).toBeUndefined();
      }
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

  describe('reports & moderation', () => {
    let moderator: string;
    let shareToken: string;
    let listingId: string;
    let ratingId: string;
    let photoId: string;

    const report = (token: string, targetType: string, targetId: string) =>
      api().post('/api/v1/reports').set(auth(token)).send({ targetType, targetId, reason: 'OFFENSIVE' });
    const resolve = (reportId: string, action: string) =>
      api().post(`/api/v1/moderation/reports/${reportId}/resolve`).set(auth(moderator)).send({ action });
    const shared = () => api().get(`/api/v1/shared/listings/${shareToken}`);

    beforeAll(async () => {
      moderator = await register('moderator@example.com');
      const listings = await api().get(`/api/v1/homes/${homeId}/listings`).set(auth(owner)).expect(200);
      listingId = listings.body[0].id;
      const broker = await api()
        .post(`/api/v1/listings/${listingId}/brokers`)
        .set(auth(owner))
        .send({ agencyName: 'Moda Emlak', email: 'moda@example.com' })
        .expect(201);
      shareToken = broker.body.shareToken;
      await api().post(`/api/v1/listings/${listingId}/send-update`).set(auth(owner)).expect(200);
      const view = await shared().expect(200);
      ratingId = view.body.ratings[0].id;
      photoId = view.body.photos[0].id;
    });

    it('takes reports about visible content, once, and not about your own', async () => {
      const first = await report(owner, 'RATING', ratingId).expect(201);
      const again = await report(owner, 'RATING', ratingId).expect(201);
      expect(again.body.id).toBe(first.body.id);

      await report(tenant, 'RATING', ratingId).expect(400); // their own rating
      await report(moderator, 'RATING', ratingId).expect(404); // not their home
      await report(owner, 'LISTING', listingId).expect(400);
      await report(tenant, 'CONDITION_PHOTO', photoId).expect(201);
    });

    it('takes reports from brokers about what their link shows', async () => {
      const send = (body: object) =>
        api().post(`/api/v1/shared/listings/${shareToken}/reports`).send({ reason: 'SPAM', ...body });
      await send({ targetType: 'LISTING' }).expect(201);
      await send({ targetType: 'RATING', targetId: ratingId }).expect(201);
      await send({ targetType: 'RATING', targetId: photoId }).expect(404);
      await send({ targetType: 'RATING' }).expect(400);
      await api()
        .post('/api/v1/shared/listings/wrong/reports')
        .send({ reason: 'SPAM', targetType: 'LISTING' })
        .expect(404);
    });

    it('is for moderators only', async () => {
      await api().get('/api/v1/moderation/reports').set(auth(owner)).expect(403);
      await api().get(`/api/v1/moderation/photos/${photoId}/file`).set(auth(moderator)).expect(403);
      await app.get(PrismaService).user.update({
        where: { email: 'moderator@example.com' },
        data: { role: 'MODERATOR' },
      });
      const open = await api().get('/api/v1/moderation/reports').set(auth(moderator)).expect(200);
      expect(open.body).toHaveLength(4);
      expect(open.body[0].content.noteForNextTenant).toBe('Bleed the radiators in October.');
      await api().get(`/api/v1/moderation/photos/${photoId}/file`).set(auth(moderator)).expect(200);
      // Nobody reported this one, so it stays private.
      const other = (await shared()).body.photos[1].id as string;
      await api().get(`/api/v1/moderation/photos/${other}/file`).set(auth(moderator)).expect(404);
    });

    it('hides a note, then the rating, also in what was already sent to brokers', async () => {
      const open = await api().get('/api/v1/moderation/reports').set(auth(moderator)).expect(200);
      const { id } = open.body.find((r: { targetType: string }) => r.targetType === 'RATING');
      await resolve(id, 'HIDE_NOTE').expect(200);
      expect((await shared()).body.ratings[0]).toEqual(
        expect.objectContaining({ id: ratingId, noteForNextTenant: null }),
      );
      expect((await shared()).body.score.score).toBe(3.3);

      await resolve(id, 'HIDE').expect(200);
      expect((await shared()).body).toEqual(
        expect.objectContaining({ ratings: [], score: { score: null, ratingCount: 0, categories: {} } }),
      );
      const list = await api().get(`/api/v1/homes/${homeId}/ratings`).set(auth(owner)).expect(200);
      expect(list.body).toEqual([]);
      const home = await api().get(`/api/v1/homes/${homeId}`).set(auth(owner)).expect(200);
      expect(home.body.score.score).toBeNull();

      // Both reports about the rating are closed by one decision.
      const left = await api().get('/api/v1/moderation/reports').set(auth(moderator)).expect(200);
      expect(left.body.map((r: { targetType: string }) => r.targetType).sort()).toEqual([
        'CONDITION_PHOTO',
        'LISTING',
      ]);

      await resolve(id, 'RESTORE').expect(200);
      expect((await shared()).body.ratings[0].noteForNextTenant).toBe('Bleed the radiators in October.');
    });

    it('hides photos and listings', async () => {
      const open = await api().get('/api/v1/moderation/reports').set(auth(moderator)).expect(200);
      const of = (type: string) =>
        open.body.find((r: { targetType: string }) => r.targetType === type).id as string;

      await resolve(of('CONDITION_PHOTO'), 'HIDE_NOTE').expect(400);
      await resolve(of('CONDITION_PHOTO'), 'HIDE').expect(200);
      await api().get(`/api/v1/condition-photos/${photoId}/file`).set(auth(owner)).expect(404);
      await api().get(`/api/v1/shared/listings/${shareToken}/photos/${photoId}`).expect(404);
      const view = await shared().expect(200);
      expect(view.body.photos).toHaveLength(2);
      expect(view.body.coverPhotoId).not.toBe(photoId);

      await resolve(of('LISTING'), 'HIDE').expect(200);
      await shared().expect(404);
      await api().post(`/api/v1/listings/${listingId}/send-update`).set(auth(owner)).expect(403);
      await resolve(of('LISTING'), 'RESTORE').expect(200);
      await shared().expect(200);
    });
  });

  describe('account deletion', () => {
    let landlord: string;

    const remove = (token: string) => api().delete('/api/v1/me').set(auth(token)).expect(204);
    const prisma = () => app.get(PrismaService);
    const homesOf = async (token: string) =>
      (await api().get('/api/v1/me').set(auth(token)).expect(200)).body.homes as { home: { id: string } }[];

    it('needs a signed-in user', () => api().delete('/api/v1/me').expect(401));

    it('deletes a home nobody else lives in, with its photos', async () => {
      const before = storedFiles();
      const leaver = await register('leaver@example.com');
      const home = await api()
        .post('/api/v1/homes')
        .set(auth(leaver))
        .send({ city: 'İzmir', district: 'Konak', addressLine: 'Kordon 5', roomLayout: '1+1' })
        .expect(201);
      const session = await api()
        .post(`/api/v1/homes/${home.body.id}/condition-sessions`)
        .set(auth(leaver))
        .send({ type: 'PERIODIC' })
        .expect(201);
      await api()
        .post(`/api/v1/condition-sessions/${session.body.id}/photos`)
        .set(auth(leaver))
        .field('room', 'KITCHEN')
        .field('capturedAt', new Date().toISOString())
        .attach('file', jpeg(), { filename: 'p.jpg', contentType: 'image/jpeg' })
        .expect(201);
      const receipt = await scan(leaver, 'OTHER').expect(201);
      await scan(leaver, 'OTHER').expect(201);
      expect(storedFiles()).toBe(before + 3);
      await api().delete(`/api/v1/receipts/${receipt.body.id}`).set(auth(leaver)).expect(204);
      expect(storedFiles()).toBe(before + 2);

      await remove(leaver);
      expect(storedFiles()).toBe(before);
      expect(await prisma().home.count({ where: { id: home.body.id } })).toBe(0);
      await api()
        .post('/api/v1/auth/login')
        .send({ email: 'leaver@example.com', password: 'Sup3rSecret' })
        .expect(401);

      // The access token outlives the account; an upload with it must not leave a photo.
      await scan(leaver, 'OTHER').expect(409);
      expect(storedFiles()).toBe(before);
    });

    it('lets an owner go while their tenant keeps the home', async () => {
      const before = storedFiles();
      const ownReceipts = await prisma().receipt.count({ where: { user: { email: 'owner@example.com' } } });
      expect(ownReceipts).toBeGreaterThan(0);
      await prisma().conditionPhoto.updateMany({ data: { latitude: 39.9, longitude: 32.8 } });

      await remove(owner);
      expect(storedFiles()).toBe(before - ownReceipts);
      expect((await homesOf(tenant)).map((h) => h.home.id)).toEqual([homeId]);

      const records = await api().get(`/api/v1/homes/${homeId}/condition-sessions`).set(auth(tenant)).expect(200);
      const detail = await api()
        .get(`/api/v1/condition-sessions/${records.body[0].id}`)
        .set(auth(tenant))
        .expect(200);
      expect(detail.body).toEqual(expect.objectContaining({ status: 'CONFIRMED', createdById: null }));
      expect(detail.body.photos).toHaveLength(3);
      expect(detail.body.photos[0]).toEqual(
        expect.objectContaining({ uploadedById: null, latitude: null, longitude: null }),
      );
      // Sharing with brokers was the owner's choice, so it ends.
      expect(await prisma().listing.count({ where: { homeId } })).toBe(0);
      expect(await prisma().rating.count({ where: { homeId } })).toBe(1);
    });

    it('deletes the home when the last person in it leaves', async () => {
      await remove(tenant);
      expect(await prisma().home.count({ where: { id: homeId } })).toBe(0);
      expect(await prisma().conditionPhoto.count()).toBe(0);
      expect(await prisma().rating.count()).toBe(0);
      expect(storedFiles()).toBe(0);
      expect(await prisma().report.count({ where: { reporterId: { not: null } } })).toBe(0);
    });

    it('lets a tenant go: their rating leaves the home and what was sent to brokers', async () => {
      landlord = await register('landlord@example.com');
      const renter = await register('renter@example.com');
      const { body: home } = await api()
        .post('/api/v1/homes')
        .set(auth(landlord))
        .send({ city: 'Ankara', district: 'Çankaya', addressLine: 'Tunalı 9', roomLayout: '3+1' })
        .expect(201);
      const invite = () =>
        api()
          .post(`/api/v1/homes/${home.id}/tenancies/invite`)
          .set(auth(landlord))
          .send({ startDate: daysAgo(90).slice(0, 10) });
      const { body: tenancy } = await invite().expect(201);
      await api()
        .post('/api/v1/tenancies/accept')
        .set(auth(renter))
        .send({ code: tenancy.inviteCode })
        .expect(200);
      let month = 0;
      ocr.respond = () => {
        month += 1;
        return { status: 200, body: { merchantName: 'Bank', issuedAt: daysAgo(month * 28), total: 777, items: [] } };
      };
      for (const kind of ['RENT', 'RENT', 'UTILITY_GAS']) {
        const { body } = await scan(renter, kind, { homeId: home.id }).expect(201);
        await api().post(`/api/v1/receipts/${body.id}/confirm`).set(auth(renter)).expect(200);
      }
      await api()
        .post(`/api/v1/homes/${home.id}/ratings`)
        .set(auth(renter))
        .send({ scores: [{ category: 'NEIGHBORHOOD', score: 5 }], noteForNextTenant: 'Call me, Renter' })
        .expect(201);
      const { body: listing } = await api()
        .post(`/api/v1/homes/${home.id}/listings`)
        .set(auth(landlord))
        .send({ reference: '9876543210' })
        .expect(201);
      const { body: broker } = await api()
        .post(`/api/v1/listings/${listing.id}/brokers`)
        .set(auth(landlord))
        .send({ agencyName: 'Emlak', email: 'e@example.com' })
        .expect(201);
      await api()
        .patch(`/api/v1/listings/${listing.id}`)
        .set(auth(landlord))
        .send({ shareHeatingBills: true })
        .expect(200);
      const sent = await api().post(`/api/v1/listings/${listing.id}/send-update`).set(auth(landlord)).expect(200);
      expect(JSON.stringify(sent.body)).toContain('777');

      await remove(renter);
      const stored = await prisma().listingUpdate.findMany();
      expect(JSON.stringify(stored)).not.toContain('Call me, Renter');
      expect(JSON.stringify(stored)).not.toContain('777');
      const view = await api().get(`/api/v1/shared/listings/${broker.shareToken}`).expect(200);
      expect(view.body).toEqual(expect.objectContaining({ ratings: [], score: expect.objectContaining({ score: null }) }));
      const history = await api().get(`/api/v1/homes/${home.id}/tenancies`).set(auth(landlord)).expect(200);
      expect(history.body[0]).toEqual(expect.objectContaining({ status: 'ENDED', tenant: null }));
      // The home is free for the next tenant.
      await invite().expect(201);
    });

    it('never leaves an ownerless home behind when owner and tenant leave together', async () => {
      const [a, b] = await Promise.all([register('pair.a@example.com'), register('pair.b@example.com')]);
      const { body: home } = await api()
        .post('/api/v1/homes')
        .set(auth(a))
        .send({ city: 'Bursa', district: 'Nilüfer', addressLine: 'FSM 1', roomLayout: '2+1' })
        .expect(201);
      const { body: tenancy } = await api()
        .post(`/api/v1/homes/${home.id}/tenancies/invite`)
        .set(auth(a))
        .send({ startDate: daysAgo(5).slice(0, 10) })
        .expect(201);
      await api().post('/api/v1/tenancies/accept').set(auth(b)).send({ code: tenancy.inviteCode }).expect(200);
      await Promise.all([remove(a), remove(b)]);
      expect(await prisma().home.count({ where: { id: home.id } })).toBe(0);
    });

    it('deletes an ownerless home when its tenancy ends', async () => {
      const home = await prisma().home.create({
        data: { city: 'Ankara', district: 'X', addressLine: 'Y', roomLayout: '1+1' },
      });
      const { body: me } = await api().get('/api/v1/me').set(auth(landlord)).expect(200);
      await prisma().tenancy.create({
        data: { homeId: home.id, tenantId: me.id, status: 'ACTIVE', startDate: new Date() },
      });
      await api().post(`/api/v1/homes/${home.id}/tenancies/end`).set(auth(landlord)).send({}).expect(200);
      expect(await prisma().home.count({ where: { id: home.id } })).toBe(0);
    });
  });
});

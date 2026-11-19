import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeOcr } from './fake-ocr';
import cityGross from './fixtures/city-gross.json';

/** A minimal JPEG header plus random bytes: passes magic-number checks, unique hash. */
const jpeg = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    randomBytes(256),
  ]);

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe('Raf API (e2e)', () => {
  let app: INestApplication<App>;
  const ocr = new FakeOcr();
  let token: string;

  const api = () => request(app.getHttpServer());
  const auth = (t = token) => ({ Authorization: `Bearer ${t}` });

  const register = async (email: string) => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret', fullName: email.split('@')[0] })
      .expect(201);
    return res.body.accessToken as string;
  };

  const scan = (parts = 1) => {
    const req = api().post('/api/v1/receipts').set(auth());
    for (let i = 0; i < parts; i++) {
      void req.attach('files', jpeg(), { filename: `r${i}.jpg`, contentType: 'image/jpeg' });
    }
    return req;
  };

  beforeAll(async () => {
    await ocr.start(4599);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    token = await register('deniz@example.com');
  });

  afterAll(async () => {
    await app.close();
    await ocr.stop();
  });

  it('rejects unknown fields and weak passwords', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email: 'x@example.com', password: 'weak', fullName: 'X', isAdmin: true })
      .expect(400);
    expect(res.body.message).toEqual(expect.arrayContaining(['property isAdmin should not exist']));
  });

  it('turns Google sign-in off when no client id is configured', async () => {
    await api().post('/api/v1/auth/google').send({ idToken: 'x' }).expect(503);
  });

  it('reads a receipt, matches products, and on save starts countdowns and counts', async () => {
    await api().post('/api/v1/home-items').set(auth()).send({ name: 'Whole milk', count: 1 }).expect(201);
    // Added without a count: starts at 0, so the receipt alone makes it 1.
    const pasta = await api().post('/api/v1/home-items').set(auth()).send({ name: 'Pasta' }).expect(201);
    expect(pasta.body.count).toBe(0);
    // Counted by weight: the weighed bananas and the 500 g pasta pack add kilograms.
    await api().post('/api/v1/home-items').set(auth()).send({ name: 'Bananas', unit: 'KG', count: 0.25 }).expect(201);
    await api().post('/api/v1/home-items').set(auth()).send({ name: 'Pasta 500', unit: 'KG' }).expect(201);
    await api().post('/api/v1/home-items').set(auth()).send({ name: 'Eggs', count: 1.5 }).expect(400);

    ocr.respond = () => ({
      status: 200,
      body: {
        merchantName: 'BİM',
        issuedAt: daysAgo(1),
        total: 349.2,
        items: [
          { name: 'TAM YAGLI SUT 1L', quantity: 2, totalPrice: 112 },
          { name: 'MAKARNA 500G', totalPrice: 34.5 },
          { name: 'MUZ KG', quantity: 1.12, unit: 'kg', totalPrice: 96.3 },
          { name: 'BULASIK DET 750ML', totalPrice: 89.9 },
          { name: 'XQ URUN', totalPrice: 16.5 },
        ],
      },
    });
    const scanned = await scan().expect(201);
    expect(scanned.body.status).toBe('PARSED');
    expect(scanned.body.items.map((i: { name: string }) => i.name)).toEqual([
      'Whole milk 1 L', 'Pasta 500 g', 'Bananas 1.12 kg', 'Dish soap 750 ml', 'Xq Urun',
    ]);
    expect(scanned.body.items[4]).toMatchObject({ category: 'OTHER', needsReview: true });
    expect(scanned.body.items[0]).toMatchObject({ category: 'DAIRY_EGGS', shelfLifeDays: 7 });

    // The user fixes the unknown line before saving.
    const lines = scanned.body.items.map((i: Record<string, unknown>) => ({
      name: i.name, rawName: i.rawName, quantity: Number(i.quantity), unit: i.unit ?? undefined,
      totalPrice: Number(i.totalPrice),
    }));
    lines[4] = { ...lines[4], name: 'Sponges', category: 'HOUSEHOLD', checked: true };
    const edited = await api()
      .patch(`/api/v1/receipts/${scanned.body.id}`)
      .set(auth())
      .send({ items: lines })
      .expect(200);
    expect(edited.body.items[4]).toMatchObject({ name: 'Sponges', needsReview: false });

    await api().post(`/api/v1/receipts/${scanned.body.id}/confirm`).set(auth()).expect(200);

    const home = await api().get('/api/v1/home-items').set(auth()).expect(200);
    const counts = Object.fromEntries(
      home.body.map((h: { name: string; count: number }) => [h.name, h.count]),
    );
    expect(counts).toEqual({ 'Whole milk': 3, Pasta: 1, Bananas: 1.37, 'Pasta 500': 0.5 });
    expect(home.body.find((h: { name: string }) => h.name === 'Bananas')).toMatchObject({
      unit: 'KG',
      lastMatchAdded: 1.12,
    });
    expect(home.body.find((h: { name: string }) => h.name === 'Whole milk')).toMatchObject({
      lastMatchAdded: 2,
      lastMatchMarket: 'BİM',
    });

    const shelf = await api().get('/api/v1/items?expiring=true').set(auth()).expect(200);
    expect(shelf.body[0]).toMatchObject({ name: 'Bananas 1.12 kg', daysLeft: 4, totalDays: 5 });
    expect(shelf.body.some((i: { name: string }) => i.name.startsWith('Dish soap'))).toBe(false);

    // Opening the milk shortens its countdown.
    const milk = shelf.body.find((i: { name: string }) => i.name === 'Whole milk 1 L');
    expect(milk.daysLeft).toBe(6);
    const opened = await api().patch(`/api/v1/items/${milk.id}`).set(auth()).send({ opened: true }).expect(200);
    expect(opened.body.daysLeft).toBe(3);
    expect(opened.body.history).toHaveLength(1);
    await api().patch(`/api/v1/items/${milk.id}`).set(auth()).send({ usedUp: true }).expect(200);
    const after = await api().get('/api/v1/items').set(auth()).expect(200);
    expect(after.body.some((i: { id: string }) => i.id === milk.id)).toBe(false);
  });

  it('matches lines typed in by hand when the reader fails', async () => {
    ocr.respond = () => ({ status: 200, body: { error: 'Too blurry' } });
    const failed = await scan().expect(201);
    expect(failed.body).toMatchObject({ status: 'FAILED', ocrError: 'Too blurry' });
    const typed = await api()
      .patch(`/api/v1/receipts/${failed.body.id}`)
      .set(auth())
      .send({
        merchantName: 'Şok',
        issuedAt: daysAgo(2),
        totalAmount: 128.5,
        items: [{ name: 'KRM PEYN 200G', totalPrice: 72.5 }, { name: 'ZZ URUN', totalPrice: 56 }],
      })
      .expect(200);
    expect(typed.body.status).toBe('PARSED');
    expect(typed.body.items).toEqual([
      expect.objectContaining({ name: 'Cream cheese 200 g', rawName: 'KRM PEYN 200G', needsReview: false }),
      expect.objectContaining({ name: 'Zz Urun', category: 'OTHER', needsReview: true }),
    ]);
    await api().delete(`/api/v1/receipts/${failed.body.id}`).set(auth()).expect(204);
  });

  it('joins the parts of a long receipt', async () => {
    let part = 0;
    ocr.respond = () => {
      part += 1;
      return part === 1
        ? { status: 200, body: { merchantName: 'Migros', issuedAt: daysAgo(3), items: [
            { name: 'YUMURTA 15LI', totalPrice: 139.5 }, { name: 'EKMEK', totalPrice: 20 },
          ] } }
        : { status: 200, body: { total: 199.5, items: [
            { name: 'EKMEK', totalPrice: 20 }, { name: 'DOMATES', totalPrice: 40 },
          ] } };
    };
    const res = await scan(2).expect(201);
    expect(res.body.merchantName).toBe('Migros');
    expect(res.body.totalAmount).toBe('199.5');
    expect(res.body.items.map((i: { name: string }) => i.name)).toEqual(['Eggs 15 pack', 'Bread', 'Tomatoes']);
    await api().post(`/api/v1/receipts/${res.body.id}/confirm`).set(auth()).expect(200);
  });

  it('lists trips by market and reports spending', async () => {
    const all = await api().get('/api/v1/receipts?status=CONFIRMED').set(auth()).expect(200);
    expect(all.body.map((r: { merchantName: string }) => r.merchantName)).toEqual(['BİM', 'Migros']);
    const bim = await api().get(`/api/v1/receipts?market=${encodeURIComponent('BİM')}`).set(auth()).expect(200);
    expect(bim.body).toHaveLength(1);
    expect(bim.body[0]._count.items).toBe(5);

    const markets = await api().get('/api/v1/receipts/markets').set(auth()).expect(200);
    expect(markets.body).toHaveLength(2);

    const spending = await api().get('/api/v1/insights/spending?months=6&utcOffset=180').set(auth()).expect(200);
    expect(spending.body.months).toHaveLength(6);
    const total = spending.body.months.reduce((sum: number, m: { total: string }) => sum + Number(m.total), 0);
    expect(total).toBeCloseTo(548.7, 2);
    expect(spending.body.byCategory[0].category).toBeDefined();

    const home = await api().get('/api/v1/insights/home?utcOffset=180').set(auth()).expect(200);
    expect(home.body.lastTrip).toMatchObject({ merchantName: 'BİM', itemCount: 5 });
    expect(home.body.useSoon.length).toBeGreaterThan(0);
  });

  it('keeps market lists with last prices and running-low suggestions', async () => {
    const list = await api().post('/api/v1/lists').set(auth()).send({ name: 'Weekend shop' }).expect(201);
    const pasta = await api()
      .post(`/api/v1/lists/${list.body.id}/items`)
      .set(auth())
      .send({ name: 'Pasta' })
      .expect(201);
    await api().post(`/api/v1/lists/${list.body.id}/items`).set(auth()).send({ name: 'Saffron' }).expect(201);
    await api().patch(`/api/v1/list-items/${pasta.body.id}`).set(auth()).send({ done: true }).expect(200);
    await api().post('/api/v1/home-items').set(auth()).send({ name: 'Olive oil', count: 1 }).expect(201);

    const res = await api().get('/api/v1/lists').set(auth()).expect(200);
    expect(res.body.lists[0].items).toEqual([
      expect.objectContaining({ name: 'Pasta', done: true, lastPrice: '34.50' }),
      expect.objectContaining({ name: 'Saffron', done: false, lastPrice: null }),
    ]);
    expect(res.body.runningLow).toEqual([
      expect.objectContaining({ name: 'Pasta 500', unit: 'KG', count: 0.5 }),
      expect.objectContaining({ name: 'Pasta', unit: 'PIECE', count: 1 }),
      expect.objectContaining({ name: 'Olive oil', unit: 'PIECE', count: 1 }),
    ]);

    // Switching a kg item to pieces rounds its amount.
    const items = await api().get('/api/v1/home-items').set(auth()).expect(200);
    const bananas = items.body.find((h: { name: string }) => h.name === 'Bananas');
    const switched = await api()
      .patch(`/api/v1/home-items/${bananas.id}`)
      .set(auth())
      .send({ unit: 'PIECE' })
      .expect(200);
    expect(switched.body).toMatchObject({ unit: 'PIECE', count: 1, lastMatchAdded: null });
  });

  it('keeps users apart and deletes accounts', async () => {
    const other = await register('other@example.com');
    const mine = await api().get('/api/v1/receipts').set(auth()).expect(200);
    await api().get(`/api/v1/receipts/${mine.body[0].id}`).set(auth(other)).expect(404);

    const me = await api().get('/api/v1/me').set(auth()).expect(200);
    expect(me.body).toMatchObject({ marketCount: 2, signInMethods: ['password'], reminderLeadDays: 2 });
    const updated = await api().patch('/api/v1/me/settings').set(auth()).send({ reminderLeadDays: 3 }).expect(200);
    expect(updated.body.reminderLeadDays).toBe(3);

    await api().delete('/api/v1/me').set(auth(other)).expect(204);
  });

  describe('at-home counts from the City Gross receipt (reader output of the real photo)', () => {
    let user: string;
    const homeAuth = () => ({ Authorization: `Bearer ${user}` });
    const counts = async () => {
      const res = await api().get('/api/v1/home-items').set(homeAuth()).expect(200);
      return Object.fromEntries(res.body.map((h: { name: string; count: number }) => [h.name, h.count]));
    };
    const saveReceipt = async () => {
      ocr.respond = () => ({ status: 200, body: { ...cityGross, issuedAt: daysAgo(10) } });
      const scanned = await api()
        .post('/api/v1/receipts')
        .set(homeAuth())
        .attach('files', jpeg(), { filename: 'r.jpg', contentType: 'image/jpeg' })
        .expect(201);
      await api().post(`/api/v1/receipts/${scanned.body.id}/confirm`).set(homeAuth()).expect(200);
      return scanned.body.id as string;
    };

    beforeAll(async () => {
      user = await register('counts@example.com');
      await api().post('/api/v1/home-items').set(homeAuth()).send({ name: 'Kefir', count: 1 }).expect(201);
      await api().post('/api/v1/home-items').set(homeAuth()).send({ name: 'Labneh', count: 1 }).expect(201);
    });

    it('adds one kefir for the one kefir line and shows it on that line', async () => {
      const id = await saveReceipt();
      expect(await counts()).toEqual({ Kefir: 2, Labneh: 2 });
      const receipt = await api().get(`/api/v1/receipts/${id}`).set(homeAuth()).expect(200);
      const kefir = receipt.body.items.find((i: { rawName: string }) => i.rawName.includes('KEFIR'));
      expect(kefir.quantity).toBe('1');
      expect(kefir.homeChanges).toEqual([{ amount: '1', homeItem: expect.objectContaining({ name: 'Kefir' }) }]);
    });

    it('takes the counts back when the receipt is deleted', async () => {
      const list = await api().get('/api/v1/receipts').set(homeAuth()).expect(200);
      await api().delete(`/api/v1/receipts/${list.body[0].id}`).set(homeAuth()).expect(204);
      expect(await counts()).toEqual({ Kefir: 1, Labneh: 1 });
      const home = await api().get('/api/v1/home-items').set(homeAuth()).expect(200);
      expect(home.body.find((h: { name: string }) => h.name === 'Kefir').lastMatchAdded).toBeNull();
    });

    it('counts a receipt once when the same photo is sent twice as long-receipt parts', async () => {
      const before = await counts();
      const calls = ocr.calls.length;
      ocr.respond = () => ({ status: 200, body: { ...cityGross, issuedAt: daysAgo(12) } });
      const photo = jpeg();
      const scanned = await api()
        .post('/api/v1/receipts')
        .set(homeAuth())
        .attach('files', photo, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .attach('files', photo, { filename: 'b.jpg', contentType: 'image/jpeg' })
        .expect(201);
      expect(ocr.calls.length - calls).toBe(1);
      expect(scanned.body.items).toHaveLength(cityGross.items.length);
      await api().post(`/api/v1/receipts/${scanned.body.id}/confirm`).set(homeAuth()).expect(200);
      expect(await counts()).toEqual({ Kefir: before.Kefir + 1, Labneh: before.Labneh + 1 });
      await api().delete(`/api/v1/receipts/${scanned.body.id}`).set(homeAuth()).expect(204);
      expect(await counts()).toEqual(before);
    });

    it('never goes below 0 when the count was already lowered by hand', async () => {
      const id = await saveReceipt();
      const home = await api().get('/api/v1/home-items').set(homeAuth()).expect(200);
      const kefir = home.body.find((h: { name: string }) => h.name === 'Kefir');
      await api().patch(`/api/v1/home-items/${kefir.id}`).set(homeAuth()).send({ count: 0 }).expect(200);
      await api().delete(`/api/v1/receipts/${id}`).set(homeAuth()).expect(204);
      expect(await counts()).toEqual({ Kefir: 0, Labneh: 1 });
    });

    it('also takes back counts from receipts saved before changes were recorded', async () => {
      await api().patch('/api/v1/home-items/' + (await api().get('/api/v1/home-items').set(homeAuth())).body.find((h: { name: string }) => h.name === 'Kefir').id).set(homeAuth()).send({ count: 1 }).expect(200);
      const id = await saveReceipt();
      expect(await counts()).toEqual({ Kefir: 2, Labneh: 2 });
      // Make it look like a receipt saved by the previous version.
      const prisma = app.get(PrismaService);
      await prisma.homeItemChange.deleteMany({ where: { receiptId: id } });
      await prisma.receipt.update({ where: { id }, data: { homeCountsRecorded: false } });
      await api().delete(`/api/v1/receipts/${id}`).set(homeAuth()).expect(204);
      expect(await counts()).toEqual({ Kefir: 1, Labneh: 1 });
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { ReaderService } from './reader.service';

jest.mock('node:child_process', () => ({ fork: jest.fn() }));

/** A reader process that answers when the test says so. */
class FakeProcess extends EventEmitter {
  jobs: unknown[] = [];
  killed = false;
  send(job: unknown) {
    this.jobs.push(job);
  }
  kill() {
    this.killed = true;
    this.emit('exit');
  }
}

const tick = () => new Promise((done) => setImmediate(done));

describe('ReaderService', () => {
  let started: FakeProcess[];
  let service: ReaderService;

  beforeEach(() => {
    Logger.overrideLogger(false);
    started = [];
    jest.mocked(fork).mockImplementation((() => {
      const process = new FakeProcess();
      started.push(process);
      setImmediate(() => process.emit('message', { ready: true }));
      return process;
    }) as never);
    service = new ReaderService(new ConfigService({ OCR_MODEL_DIR: 'models', OCR_TIMEOUT_MS: 100 }) as never);
  });

  const running = async () => {
    await tick();
    await tick();
    await tick();
    return started.at(-1)!;
  };

  it('reads one photo at a time with one process', async () => {
    const first = service.readReceipt(Buffer.from('a'));
    const second = service.readLabel(Buffer.from('b'));
    const reader = await running();
    expect(reader.jobs).toMatchObject([{ kind: 'receipt' }]);
    reader.emit('message', { result: { items: [] } });
    expect(await first).toEqual({ items: [] });
    await tick();
    expect(reader.jobs).toMatchObject([{ kind: 'receipt' }, { kind: 'label' }]);
    reader.emit('message', { result: { expiresOn: null } });
    expect(await second).toEqual({ expiresOn: null });
    expect(started).toHaveLength(1);
  });

  it('does not pass the API secrets to the process, and turns telemetry off', async () => {
    const result = service.readReceipt(Buffer.from('a'));
    (await running()).emit('message', { result: {} });
    await result;
    const options = jest.mocked(fork).mock.calls.at(-1)!.at(-1) as { env: object };
    expect(Object.keys(options.env).sort()).toEqual(['ORT_DISABLE_TELEMETRY', 'PATH']);
  });

  it('keeps reading after a photo that failed', async () => {
    const first = service.readReceipt(Buffer.from('a'));
    const reader = await running();
    reader.emit('message', { error: 'broken' });
    await expect(first).rejects.toThrow('broken');
    const second = service.readReceipt(Buffer.from('b'));
    await tick();
    reader.emit('message', { result: { items: [] } });
    expect(await second).toEqual({ items: [] });
    expect(started).toHaveLength(1);
  });

  it('stops a reader that takes too long and starts another', async () => {
    const first = service.readReceipt(Buffer.from('a'));
    const stuck = await running();
    await expect(first).rejects.toThrow('too long');
    expect(stuck.killed).toBe(true);
    const second = service.readReceipt(Buffer.from('b'));
    const reader = await running();
    expect(started).toHaveLength(2);
    reader.emit('message', { result: { items: [] } });
    expect(await second).toEqual({ items: [] });
  });

  it('starts another reader after a crash', async () => {
    const first = service.readReceipt(Buffer.from('a'));
    (await running()).emit('exit');
    await expect(first).rejects.toThrow('stopped');
    const second = service.readReceipt(Buffer.from('b'));
    (await running()).emit('message', { result: {} });
    expect(await second).toEqual({});
    expect(started).toHaveLength(2);
  });

  it('says why the reader could not start, and tries again next time', async () => {
    jest.mocked(fork).mockImplementationOnce((() => {
      const process = new FakeProcess();
      setImmediate(() => process.emit('message', { error: 'no models' }));
      return process;
    }) as never);
    await expect(service.readReceipt(Buffer.from('a'))).rejects.toThrow('no models');
    const second = service.readReceipt(Buffer.from('b'));
    (await running()).emit('message', { result: {} });
    expect(await second).toEqual({});
  });
});

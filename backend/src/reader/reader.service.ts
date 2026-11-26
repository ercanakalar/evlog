import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, fork } from 'node:child_process';
import { join, resolve } from 'node:path';
import type { Env } from '../config/env.validation';
import type { Job, Reply } from './reader.process';

interface Waiting {
  job: Job;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * The built-in receipt reader. Photos are read one at a time, in a separate
 * process, because the OCR models already use every CPU core. A pack label
 * goes before waiting receipts: its user is looking at the screen.
 */
@Injectable()
export class ReaderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReaderService.name);
  private reader?: Promise<ChildProcess>;
  private readonly waiting: Waiting[] = [];
  private busy = false;
  /** Set when the API shuts down: photos that fail from then on were interrupted, not unreadable. */
  stopping = false;

  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Loads the models at start, so the first receipt isn't slow. */
  onApplicationBootstrap() {
    if (this.config.get('OCR_SERVICE_URL', { infer: true })) return;
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.start().catch((error: Error) => this.logger.error(error.message));
  }

  async onModuleDestroy() {
    this.stopping = true;
    const reader = await this.reader?.catch(() => undefined);
    reader?.kill('SIGKILL');
  }

  readReceipt(file: Buffer): Promise<unknown> {
    return this.enqueue({ kind: 'receipt', file });
  }

  readLabel(file: Buffer): Promise<unknown> {
    return this.enqueue({ kind: 'label', file });
  }

  private enqueue(job: Job): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const firstReceipt = this.waiting.findIndex((w) => w.job.kind === 'receipt');
      const at = job.kind === 'label' && firstReceipt >= 0 ? firstReceipt : this.waiting.length;
      this.waiting.splice(at, 0, { job, resolve, reject });
      void this.readNext();
    });
  }

  private async readNext(): Promise<void> {
    if (this.busy) return;
    const next = this.waiting.shift();
    if (!next) return;
    this.busy = true;
    try {
      next.resolve(await this.run(next.job));
    } catch (error) {
      next.reject(error as Error);
    } finally {
      this.busy = false;
    }
    void this.readNext();
  }

  private async run(job: Job): Promise<unknown> {
    const reader = await this.start();
    const started = performance.now();
    reader.send(job);
    const reply = await this.nextReply(reader, this.config.get('OCR_TIMEOUT_MS', { infer: true }));
    if ('error' in reply) throw new Error(reply.error);
    this.logger.log(`Read a ${job.kind} in ${((performance.now() - started) / 1000).toFixed(1)}s`);
    return 'result' in reply ? reply.result : undefined;
  }

  /** The running reader; a new one when there is none (at first, or after it stopped). */
  private start(): Promise<ChildProcess> {
    if (this.reader) return this.reader;
    const starting = this.launch();
    const forget = () => {
      if (this.reader === starting) this.reader = undefined;
    };
    starting.then((reader) => reader.once('exit', forget), forget);
    this.reader = starting;
    return starting;
  }

  private async launch(): Promise<ChildProcess> {
    const modelDir = resolve(this.config.get('OCR_MODEL_DIR', { infer: true }));
    const threads = this.config.get('OCR_THREADS', { infer: true });
    const reader = fork(join(__dirname, 'reader.process.js'), [modelDir, ...(threads ? [String(threads)] : [])], {
      // Sends photos as bytes rather than JSON.
      serialization: 'advanced',
      // Not the API's debugger port, secrets or database address. ONNX Runtime
      // reports usage to Microsoft unless told not to; receipts are read offline.
      execArgv: [],
      env: { PATH: process.env.PATH, ORT_DISABLE_TELEMETRY: '1' },
    });
    reader.on('error', (error) => this.logger.error(error.message));
    const reply = await this.nextReply(reader, 120_000);
    if ('error' in reply) throw new Error(reply.error);
    this.logger.log('Receipt reader is ready');
    return reader;
  }

  /** What the reader says next. A reader that takes too long is stopped: it would hold up every photo after it. */
  private nextReply(reader: ChildProcess, timeoutMs: number): Promise<Reply> {
    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.reader = undefined;
        done(() => reject(new Error('reading took too long')));
        reader.kill('SIGKILL');
      }, timeoutMs);
      const done = (settle: () => void) => {
        clearTimeout(timeout);
        reader.off('message', onMessage).off('exit', onExit);
        settle();
      };
      const onMessage = (reply: unknown) => done(() => resolvePromise(reply as Reply));
      const onExit = () => done(() => reject(new Error('the reader stopped')));
      reader.once('message', onMessage).once('exit', onExit);
    });
  }
}

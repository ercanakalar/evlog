/**
 * Runs the reader in its own process. Preparing images takes seconds of
 * JavaScript, which would stall every other request, and the native OCR
 * library can only be stopped safely by ending the process it runs in.
 */
import { Ocr } from './ocr';
import { readLabel, readReceipt } from './reader';

export interface Job {
  kind: 'receipt' | 'label';
  file: Uint8Array;
}

export type Reply = { ready: true } | { result: unknown } | { error: string };

const reply = (message: Reply, sent: () => void = () => undefined) => process.send?.(message, sent);
const text = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Started by ReaderService with the models' folder and, if limited, the number of threads. */
const [modelDir, threads] = process.argv.slice(2);

// The API stopped, or crashed. A plain exit while the OCR library works ends in a native crash.
process.on('disconnect', () => process.kill(process.pid, 'SIGKILL'));
// Ctrl+C reaches both processes; the API decides when this one ends.
process.on('SIGINT', () => undefined);

Ocr.load(modelDir, threads ? Number(threads) : undefined)
  .then((ocr) => {
    // The API sends one job at a time.
    process.on('message', ({ kind, file }: Job) => {
      (kind === 'receipt' ? readReceipt(ocr, file) : readLabel(ocr, file))
        .then((result) => reply({ result }))
        .catch((error: unknown) => reply({ error: text(error) }));
    });
    reply({ ready: true });
  })
  .catch((error: unknown) => {
    const message = `Could not load the OCR models from ${modelDir} (npm run models): ${text(error)}`;
    reply({ error: message }, () => process.exit(1));
  });

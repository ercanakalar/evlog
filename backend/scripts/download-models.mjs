// Downloads the OCR models the built-in receipt reader uses (about 135 MB),
// once, into ./models or the folder given:  npm run models
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// A copy on your own storage can be used instead; the checksums below still apply.
const BASE =
  process.env.OCR_MODELS_URL ||
  'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv6';
const MODELS = [
  ['det/PP-OCRv6_det_medium.onnx', '92078b7355007ccfffcd4c8cd441a3afd4538904d06881b29a155e1e679907c2'],
  ['rec/PP-OCRv6_rec_medium.onnx', 'eef444829dbbe18d7fea59a3f6eb75647518d2b3a9568d27c92e42940204894b'],
];
/** In a row without receiving anything. */
const ATTEMPTS = 6;

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** Downloads a file, going on from where it stopped when the connection breaks. */
async function download(url, expected) {
  let chunks = [];
  let received = 0;
  let restarted = false;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: received > 0 ? { Range: `bytes=${received}-` } : {},
        signal: AbortSignal.timeout(900_000),
      });
      if (!response.ok) throw new Error(`the server answered ${response.status}`);
      if (received > 0 && response.status !== 206) {
        // The server cannot resume: this is the whole file again.
        chunks = [];
        received = 0;
      }
      for await (const chunk of response.body) {
        chunks.push(chunk);
        received += chunk.length;
        attempt = 1;
      }
      const data = Buffer.concat(chunks);
      if (sha256(data) === expected) return data;
      chunks = [];
      received = 0;
      if (restarted) throw Object.assign(new Error('the file does not match its checksum'), { fatal: true });
      restarted = true;
    } catch (error) {
      if (error.fatal || attempt >= ATTEMPTS) throw error;
      console.warn(`Retrying ${url} at ${received} bytes: ${error.message}`);
    }
    await new Promise((done) => setTimeout(done, attempt * 2000));
  }
}

const dir = process.argv[2] ?? 'models';
await mkdir(dir, { recursive: true });
for (const [path, expected] of MODELS) {
  const file = join(dir, path.split('/').at(-1));
  const existing = await readFile(file).catch(() => undefined);
  if (existing && sha256(existing) === expected) {
    console.log(`${file} is up to date`);
    continue;
  }
  console.log(`Downloading ${file}`);
  // Renamed when complete, so a stopped download is never used.
  await writeFile(`${file}.part`, await download(`${BASE}/${path}`, expected));
  await rename(`${file}.part`, file);
}

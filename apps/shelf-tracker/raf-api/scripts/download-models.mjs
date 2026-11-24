// Downloads the OCR models the built-in receipt reader uses (about 135 MB),
// once, into ./models or the folder given:  npm run models
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv6';
const MODELS = [
  ['det/PP-OCRv6_det_medium.onnx', '92078b7355007ccfffcd4c8cd441a3afd4538904d06881b29a155e1e679907c2'],
  ['rec/PP-OCRv6_rec_medium.onnx', 'eef444829dbbe18d7fea59a3f6eb75647518d2b3a9568d27c92e42940204894b'],
];
const ATTEMPTS = 4;

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

async function download(url, expected) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(600_000) });
      if (!response.ok) throw new Error(`the server answered ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (sha256(data) !== expected) throw new Error('the file does not match its checksum');
      return data;
    } catch (error) {
      if (attempt === ATTEMPTS) throw error;
      console.warn(`Retrying ${url}: ${error.message}`);
      await new Promise((done) => setTimeout(done, attempt * 2000));
    }
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

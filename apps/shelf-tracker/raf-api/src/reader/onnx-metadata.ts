/**
 * The recogniser's characters, which the model file carries as metadata.
 * onnxruntime-node cannot read metadata, so this finds it in the file: an
 * ONNX model is a protobuf message whose field 14 holds key/value pairs.
 */
export function characterList(model: Uint8Array): string[] {
  for (const pair of fields(model, 14)) {
    const [key] = fields(pair, 1);
    const [value] = fields(pair, 2);
    if (key && value && text(key) === 'character') return text(value).replace(/\r?\n$/, '').split(/\r?\n/);
  }
  throw new Error('The text model has no character list');
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** The contents of every length-prefixed field with this number. */
function* fields(message: Uint8Array, wanted: number): Generator<Uint8Array> {
  let at = 0;
  const varint = () => {
    let value = 0;
    let scale = 1;
    let byte: number;
    do {
      byte = message[at++];
      value += (byte & 127) * scale;
      scale *= 128;
    } while (byte & 128);
    return value;
  };
  while (at < message.length) {
    const tag = varint();
    const type = tag % 8;
    if (type === 2) {
      const length = varint();
      if (Math.floor(tag / 8) === wanted) yield message.subarray(at, at + length);
      at += length;
    } else if (type === 0) varint();
    else if (type === 1) at += 8;
    else if (type === 5) at += 4;
    else throw new Error('Not an ONNX model');
  }
}

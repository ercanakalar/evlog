import { createServer, IncomingMessage, Server } from 'node:http';

export interface OcrCall {
  receiptId: string;
  kind: string;
  callbackUrl: string;
  authorization?: string;
}

type Responder = (call: OcrCall) => { status: number; body?: unknown };

/** Stand-in for the YOLO receipt reader, speaking the same HTTP contract. */
export class FakeOcr {
  readonly calls: OcrCall[] = [];
  respond: Responder = () => ({ status: 200, body: { items: [] } });
  private server?: Server;

  start(port: number): Promise<void> {
    this.server = createServer((req, res) => {
      void this.handle(req).then(({ status, body }) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(body === undefined ? '' : JSON.stringify(body));
      });
    });
    return new Promise((resolve) => this.server!.listen(port, '127.0.0.1', resolve));
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server?.close(() => resolve()) ?? resolve());
  }

  private async handle(req: IncomingMessage) {
    const form = await new Request('http://local' + req.url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit).formData();
    const call: OcrCall = {
      receiptId: form.get('receiptId') as string,
      kind: form.get('kind') as string,
      callbackUrl: form.get('callbackUrl') as string,
      authorization: req.headers.authorization,
    };
    this.calls.push(call);
    return this.respond(call);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.validation';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Sends email through any SMTP provider (SMTP_URL). */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport?: Transporter;
  private readonly from?: string;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('SMTP_URL', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    if (url && this.from) {
      this.transport = createTransport(url, {
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      } as object);
    }
  }

  get configured(): boolean {
    return this.transport !== undefined;
  }

  /** Never throws: a message that cannot be sent is logged, without its text. */
  async send(mail: Mail): Promise<void> {
    try {
      await this.transport?.sendMail({ from: this.from, ...mail });
    } catch (error) {
      this.logger.error(`Could not send "${mail.subject}": ${String(error)}`);
    }
  }
}

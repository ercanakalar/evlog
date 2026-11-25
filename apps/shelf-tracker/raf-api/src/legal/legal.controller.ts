import { Controller, Get, Header, Headers, Query, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import type { Env } from '../config/env.validation';
import { legalPage, pickLanguage } from './legal-page';
import type { LegalDocument } from './texts';

/** The pages the app and the store listing link to. `?lang=tr|en` picks the language. */
@ApiTags('legal')
@Public()
@Controller({ version: VERSION_NEUTRAL })
export class LegalController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Get('privacy')
  @Header('content-type', 'text/html; charset=utf-8')
  privacy(@Query('lang') lang?: string, @Headers('accept-language') accept?: string) {
    return this.page('privacy', lang, accept);
  }

  @Get('terms')
  @Header('content-type', 'text/html; charset=utf-8')
  terms(@Query('lang') lang?: string, @Headers('accept-language') accept?: string) {
    return this.page('terms', lang, accept);
  }

  @Get('delete-account')
  @Header('content-type', 'text/html; charset=utf-8')
  deleteAccount(@Query('lang') lang?: string, @Headers('accept-language') accept?: string) {
    return this.page('delete-account', lang, accept);
  }

  private page(document: LegalDocument, lang?: string, accept?: string): string {
    return legalPage(document, pickLanguage(lang, accept), {
      // Both are required in production.
      operator: this.config.get('LEGAL_OPERATOR', { infer: true }) ?? 'LEGAL_OPERATOR',
      email: this.config.get('SUPPORT_EMAIL', { infer: true }) ?? 'SUPPORT_EMAIL',
    });
  }
}

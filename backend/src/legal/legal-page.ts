import { en } from './texts.en';
import { tr } from './texts.tr';
import type { LegalDocument, LegalLanguage } from './texts';

const TEXTS = { en, tr };

export interface LegalContact {
  operator: string;
  email: string;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Turkish for people whose browser or phone asks for it, English for everyone else. */
export function pickLanguage(query: unknown, acceptLanguage: string | undefined): LegalLanguage {
  if (query === 'tr' || query === 'en') return query;
  return /^\s*tr\b/i.test(acceptLanguage ?? '') ? 'tr' : 'en';
}

/** A stand-alone page: no scripts, nothing loaded from elsewhere. */
export function legalPage(document: LegalDocument, lang: LegalLanguage, contact: LegalContact): string {
  const { title, sections } = TEXTS[lang].documents[document];
  const other: LegalLanguage = lang === 'tr' ? 'en' : 'tr';
  const email = escapeHtml(contact.email);
  const fill = (text: string) =>
    escapeHtml(text)
      .replaceAll('{{operator}}', escapeHtml(contact.operator))
      .replaceAll('{{email}}', `<a href="mailto:${email}">${email}</a>`)
      .replaceAll(
        '{{deleteLink}}',
        `<a href="/delete-account?lang=${lang}">${escapeHtml(TEXTS[lang].documents['delete-account'].title)}</a>`,
      )
      .replaceAll('\n', '<br>');
  const body = sections.map((s) => `<h2>${escapeHtml(s.title)}</h2>\n<p>${fill(s.text)}</p>`).join('\n');
  const links = (Object.keys(TEXTS[lang].documents) as LegalDocument[])
    .filter((d) => d !== document)
    .map((d) => `<a href="/${d}?lang=${lang}">${escapeHtml(TEXTS[lang].documents[d].title)}</a>`)
    .join(' · ');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Raf</title>
<style>
:root { color-scheme: light dark; --bg: #f2f3ef; --card: #fcfcfa; --text: #15181a; --muted: #565b5e; --link: #15181a; }
@media (prefers-color-scheme: dark) { :root { --bg: #101213; --card: #1c1f21; --text: #ecede8; --muted: #a9aeaa; --link: #d8f34a; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, sans-serif; }
main { max-width: 680px; margin: 0 auto; padding: 24px 16px 48px; }
article { background: var(--card); border-radius: 12px; padding: 8px 20px 16px; }
h1 { font-size: 26px; line-height: 1.25; margin: 8px 0; }
h2 { font-size: 17px; margin: 24px 0 4px; }
p { margin: 0; overflow-wrap: anywhere; }
a { color: var(--link); }
.muted { color: var(--muted); font-size: 14px; margin: 0 0 16px; }
footer { margin-top: 20px; font-size: 14px; }
</style>
</head>
<body>
<main>
<p class="muted">Raf · <a href="/${document}?lang=${other}" lang="${other}">${TEXTS[other].languageName}</a></p>
<h1>${escapeHtml(title)}</h1>
<p class="muted">${escapeHtml(TEXTS[lang].updated)}</p>
<article>
${body}
</article>
<footer>${links}</footer>
</main>
</body>
</html>
`;
}

export type LegalDocument = 'privacy' | 'terms' | 'delete-account';
export type LegalLanguage = 'en' | 'tr';

/** `{{operator}}`, `{{email}}` and `{{deleteLink}}` are filled in when a page is shown. */
export interface LegalTexts {
  updated: string;
  languageName: string;
  documents: Record<LegalDocument, { title: string; sections: { title: string; text: string }[] }>;
}

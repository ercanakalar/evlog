import type { LegalTexts } from './texts';

/** Keep these true: change them together with what the app and the API do with data. */
export const en: LegalTexts = {
  updated: 'Last updated: 26 November 2026',
  languageName: 'English',
  documents: {
    privacy: {
      title: 'Privacy notice',
      sections: [
        {
          title: 'Who is responsible',
          text: '{{operator}} (“we”) runs the Raf app and is the data controller under Turkish Law No. 6698 on the Protection of Personal Data (KVKK).\nContact: {{email}}',
        },
        {
          title: 'What we store',
          text: '• Account: your email, a name (from Google, or the part of your email before the @), and a one-way hash of your password. With Google sign-in: your Google account number instead of a password.\n• Sign-ins: when each device signed in, its app name, and a hash of its sign-in key.\n• Receipts: the photos you take, and what is read from them, such as market, date, amounts, products and barcodes. Receipts can show other details printed on them, such as a loyalty card number.\n• Your shelf: expiry dates, what you opened or used up, what you have at home, and your market lists.\n• Settings: currency and reminder choices. Language and appearance stay on your phone.',
        },
        {
          title: 'What we do not do',
          text: 'No ads, no advertising identifier, no analytics or tracking by other companies, and we do not sell your data. The app does not ask for your location; photos are re-encoded on your phone before upload, which removes the location stored in them. Photos of pack dates are read and not kept.',
        },
        {
          title: 'Why, and on what legal basis',
          text: '• To provide the service you signed up for: reading receipts, countdowns, lists and spending (KVKK Art. 5/2-c, performance of a contract).\n• To keep Raf safe: sign-in protection and request limits (Art. 5/2-f, legitimate interest).\n• To meet legal duties and to establish or defend legal claims (Art. 5/2-ç and 5/2-e).',
        },
        {
          title: 'How data is collected and processed',
          text: 'Electronically, from what you enter and photograph in the app. Receipts are read automatically by our own software; photos are not sent to an outside recognition service. Expiry reminders are made on your phone. Only you can see your data in the app.',
        },
        {
          title: 'Sharing with others',
          text: '• Our hosting provider stores the data on our behalf.\n• Our email provider delivers password reset codes to your address.\n• If you choose Google sign-in, Google tells us your email, name and account number.\n• Authorities, when the law requires it.\nData is transferred outside Türkiye only as KVKK Art. 9 allows.',
        },
        {
          title: 'How long we keep it',
          text: 'Until you delete it or your account. Receipts can be deleted one by one, with their photos. Sign-ins that can no longer be used are removed. Backups are overwritten within 30 days. Longer only where the law requires it.',
        },
        {
          title: 'Deleting your account',
          text: 'In the app: Settings → Delete account. It works at once, cannot be undone, and deletes everything listed above, including photos. Without the app, see {{deleteLink}}.',
        },
        {
          title: 'Your rights',
          text: 'Under KVKK Art. 11 you can ask whether and why we process your data, who received it, and for it to be corrected, deleted or destroyed and recipients told; object to a result reached only by automated analysis; and claim compensation for damage from unlawful processing. Write to {{email}}. We answer free of charge within 30 days. You can also complain to the Personal Data Protection Board (kvkk.gov.tr).',
        },
        {
          title: 'Security, age and changes',
          text: 'Data travels encrypted, passwords are stored as hashes, photos are only served to their owner, and sign-in keys are kept in your phone’s secure storage. Raf is for people aged 18 or over. If this notice changes in a way that matters, we tell you by email or in the app before the change applies.',
        },
      ],
    },
    terms: {
      title: 'Terms of use',
      sections: [
        {
          title: 'The agreement',
          text: 'These terms are between you and {{operator}} (“we”). By creating an account you accept them. You must be 18 or over and keep your password to yourself.',
        },
        {
          title: 'What Raf is',
          text: 'Raf reads grocery receipts and keeps track of spending, how long products last, what you have at home and market lists. It is for personal use.',
        },
        {
          title: 'Dates are estimates',
          text: 'Countdowns are typical keeping times, not a promise that food is safe. Dates read from packs can be wrong. Always go by the date and instructions on the pack and by how the food looks and smells. Do not eat food because the app says it still keeps.',
        },
        {
          title: 'Amounts can be wrong',
          text: 'Receipts are read automatically. Check the lines before saving. Raf is not bookkeeping and does not replace the receipt itself, for example for a return or a warranty.',
        },
        {
          title: 'Your content',
          text: 'Your photos and data stay yours. You allow us to store and process them as far as needed to run Raf and as described in the privacy notice. Only upload receipts you may use.',
        },
        {
          title: 'Not allowed',
          text: 'Do not upload illegal content, try to get into other people’s accounts, overload the service or copy it automatically. We can close accounts that do.',
        },
        {
          title: 'Availability and liability',
          text: 'Raf may be interrupted, changed or ended; if we end it we tell you in advance by email or in the app. To the extent the law allows, we are not liable for indirect damage. Nothing here limits liability for intent or gross negligence, or your rights as a consumer.',
        },
        {
          title: 'Ending the agreement',
          text: 'You can delete your account at any time in Settings. What is deleted is described in the privacy notice.',
        },
        {
          title: 'Law and changes',
          text: 'Turkish law applies. Consumers can go to the consumer arbitration committee or consumer court where they live. If we change these terms in a way that matters, we tell you by email or in the app beforehand; if you disagree you can delete your account. Questions: {{email}}',
        },
      ],
    },
    'delete-account': {
      title: 'Delete your Raf account',
      sections: [
        {
          title: 'In the app',
          text: '1. Open Raf and tap your initials at the top right.\n2. Scroll down to “Delete account” and confirm.\nYour account is deleted at once.',
        },
        {
          title: 'Without the app',
          text: 'Write to {{email}} from the email address of your account, with the subject “Delete my Raf account”. We delete it within 30 days and confirm by email.',
        },
        {
          title: 'What is deleted',
          text: 'Everything: your account and sign-ins, receipts and their photos, products and expiry dates, what you have at home, and market lists. Copies in backups are overwritten within 30 days.',
        },
        {
          title: 'Delete only some data',
          text: 'You can delete single receipts with their photos (open the trip, then “Delete receipt”), lists and products in the app, without deleting the account.',
        },
      ],
    },
  },
};

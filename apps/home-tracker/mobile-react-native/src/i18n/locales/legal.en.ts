/**
 * Legal texts, shown with the operator's name and contact address filled in
 * (config/env.ts). Both locales must have the same sections. Keep them true:
 * change them together with what the app and the API do with data.
 */
const legal = {
  updated: 'Last updated: 25 November 2026',
  privacy: [
    {
      title: 'Who is responsible',
      text: '{{operator}} (“we”) runs Evlog and is the data controller under Turkish Law No. 6698 on the Protection of Personal Data (KVKK).\nContact: {{email}}',
    },
    {
      title: 'What we store',
      text: '• Account: your name, email and a one-way hash of your password (never the password itself).\n• Sign-ins: when each device signed in, its app or browser name, and a hash of its sign-in key.\n• Homes: address, rooms, area, and who owns or rents the home and since when.\n• Condition records: photos, room, the time your phone and our server recorded, a fingerprint of each photo, notes, and who confirmed the record.\n• Receipts and bills: the photo and what is read from it, such as store, date, amount and items.\n• Ratings: your scores, your note and which of your receipts support them.\n• Listings: the sahibinden.com listing you link, what you chose to share, and the agency name and email of brokers you add.\n• Kitchen and upkeep: products, prices, shopping list, appliances and maintenance.\n• Reports: what you report and why.',
    },
    {
      title: 'Location and device data',
      text: 'Photos are re-encoded on your phone before upload, which removes the location stored in them. The app does not ask for your location, shows no ads and uses no advertising identifier.',
    },
    {
      title: 'Why, and on what legal basis',
      text: '• To provide the service you signed up for: your account, records, receipts, ratings and sharing (KVKK Art. 5/2-c, performance of a contract).\n• To keep Evlog safe: sign-in protection, request limits, and reviewing reported content (Art. 5/2-f, legitimate interest).\n• To meet legal duties and to establish or defend legal claims (Art. 5/2-ç and 5/2-e).\n• Anonymous usage data: only with your explicit consent (Art. 5/1), given and withdrawn in Settings. It records feature names only and is off until you turn it on.',
    },
    {
      title: 'Who can see what',
      text: '• Receipt photos: only you.\n• The home, its condition records, kitchen and upkeep: the owner and the current tenant. Products and prices from grocery receipts you add to a home are part of its kitchen.\n• Ratings: the owner, tenants of the home, and brokers the owner shares them with. Your name is not shown, but an owner can often tell which tenant wrote a rating.\n• Brokers: only people with the link the owner gave them, and only what the owner chose to share, which can include monthly totals of the home’s gas bills. The owner can withdraw access.\n• Price averages: shown without names, and only when at least 3 households contribute.\n• Moderators: content that was reported.',
    },
    {
      title: 'How data is collected and processed',
      text: 'We collect data electronically, from what you enter and photograph in the app. Receipts are read automatically by our own software; they are not sent to an outside recognition service. We do not sell your data.',
    },
    {
      title: 'Sharing with others',
      text: 'Our hosting provider stores the data on our behalf. If sahibinden.com syncing is available, the listing number is sent to sahibinden.com. We give data to authorities when the law requires it. Data is transferred outside Türkiye only as KVKK Art. 9 allows.',
    },
    {
      title: 'How long we keep it',
      text: 'Until you delete it or your account. You can delete a receipt yourself unless it supports a rating you submitted. Reports are kept without your name after you leave, so that decisions stay traceable. Longer only where the law requires it.',
    },
    {
      title: 'Deleting your account',
      text: 'Settings → Delete account works at once and cannot be undone. Your profile, sign-ins, receipts and their photos, ratings and listings are deleted, also from what was already shared with brokers.\nHomes you own are deleted with everything in them, unless a tenant lives there. In that case the tenant keeps the home record, and the home is deleted when they leave.\nCondition photos you took in a home that stays are kept for the other party, without your name or location. Kitchen and upkeep entries of that home stay too.',
    },
    {
      title: 'Your rights',
      text: 'Under KVKK Art. 11 you can ask whether and why we process your data, who received it, and for it to be corrected, deleted or destroyed and recipients told; object to a result reached only by automated analysis; and claim compensation for damage from unlawful processing. Write to {{email}}. We answer free of charge within 30 days. You can also complain to the Personal Data Protection Board (kvkk.gov.tr).',
    },
    {
      title: 'Security, age and changes',
      text: 'Passwords are stored as hashes, files are only served after an access check, and sign-in keys are kept in your phone’s secure storage. Evlog is for people aged 18 or over. If this notice changes in a way that matters, we tell you by email or in the app before the change applies.',
    },
  ],
  terms: [
    {
      title: 'The agreement',
      text: 'These terms are between you and {{operator}} (“we”). By creating an account you accept them. You must be 18 or over, give correct information and keep your password to yourself.',
    },
    {
      title: 'What Evlog is',
      text: 'Evlog helps owners and tenants keep a shared record of a home: condition photos, receipts, ratings, kitchen and upkeep. It is not a party to your lease and does not replace a lease, an inventory signed by both sides, an expert report or legal advice.',
    },
    {
      title: 'Your content',
      text: 'Your content stays yours. You allow us to store, process and show it as far as needed to run Evlog and as described in the privacy notice. You are responsible for it: only upload photos and receipts you are allowed to share, and keep other people’s faces, documents and private belongings out of pictures.',
    },
    {
      title: 'Ratings',
      text: 'Rate only a home you rented, honestly and from your own experience, backed by your own genuine receipts. Stick to the home: notes may not name people or share their contact details. Do not offer or ask for anything in return for a rating.',
    },
    {
      title: 'Not allowed',
      text: 'There is no tolerance for objectionable content or abusive behaviour. Do not post insults, threats, hate, sexual content, other people’s personal data, false statements, forged receipts, advertising or anything illegal. Do not try to get into other people’s accounts, overload the service or copy it automatically.',
    },
    {
      title: 'Reporting and moderation',
      text: 'Use Report next to a rating or photo, or write to {{email}}. We aim to review reports within 24 hours. We can hide notes, ratings, photos or listings, and close accounts that break these terms. If we hid something of yours and you think we were wrong, write to {{email}}.',
    },
    {
      title: 'Sharing with brokers',
      text: 'An owner decides what brokers see and is responsible for having the right to share it. Anyone with a share link can open it until it is withdrawn. Evlog is not affiliated with sahibinden.com.',
    },
    {
      title: 'Automatic reading and estimates',
      text: 'Amounts and items read from receipts, “running low” suggestions, price averages and maintenance dates can be wrong. Check them before relying on them. Follow the manufacturer’s instructions and use a qualified technician for gas and electrical appliances.',
    },
    {
      title: 'Availability and liability',
      text: 'Evlog may be interrupted, changed or ended; if we end it we tell you in advance by email or in the app, so you can keep your records. To the extent the law allows, we are not liable for indirect damage or for content posted by users. Nothing here limits liability for intent or gross negligence, or your rights as a consumer.',
    },
    {
      title: 'Ending the agreement',
      text: 'You can delete your account at any time in Settings. What is deleted and what stays with the other party is described in the privacy notice.',
    },
    {
      title: 'Law and changes',
      text: 'Turkish law applies. Consumers can go to the consumer arbitration committee or consumer court where they live. If we change these terms in a way that matters, we tell you by email or in the app beforehand; if you disagree you can delete your account.',
    },
  ],
  verification: [
    {
      title: 'A verification, not a contract',
      text: 'A condition record shows how a home looked at a point in time and that both sides agreed to the photos. It is not a lease, a signed handover report or an expert report. How much weight it has in a dispute is for the court or authority to decide.',
    },
    {
      title: 'How it works',
      text: 'Photos are taken room by room. When one arrives, our server stores the time and a SHA-256 fingerprint. The time from your phone is kept too, and photos more than 24 hours off are refused. Locking freezes the set and computes one fingerprint over all photos, so the set cannot change without the fingerprint changing.',
    },
    {
      title: 'Confirmation',
      text: 'After locking, the owner and the current tenant each confirm. The record is confirmed once both have. Without a tenant, the owner’s confirmation is enough. If the owner has deleted their account, new records can be locked but no longer confirmed by both sides.',
    },
    {
      title: 'What it does not prove',
      text: 'The fingerprint shows that photos did not change after they arrived. It does not prove where a photo was taken or who is responsible for damage. Keep your own copies of anything important.',
    },
    {
      title: 'Removed photos',
      text: 'If a moderator hides a photo, it stays listed as hidden, so the fingerprint still matches, but it can no longer be opened.',
    },
  ],
} as const;

export default legal;

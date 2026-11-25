# Publishing Raf

Everything for the store: texts ([Turkish](listing.tr.md), [English](listing.en.md)),
[answers for Play Console](play-console.md) and [graphics](graphics). The app's icons are drawn in
[`raf-mobile/assets/source`](../raf-mobile/assets/source).

## Checklist

Accounts and decisions

- [ ] Google Play developer account. A personal one needs a closed test with 12 testers for 14 days before production.
- [ ] Expo account (free) for EAS builds.
- [ ] Check that the name “Raf” is free to use (Play, App Store, the Turkish trademark register).
- [ ] Settle the application id `app.evlog.raf`. It can never change after the first upload.
- [ ] A lawyer reads the legal texts (`raf-api/src/legal/texts.*.ts`) and says whether VERBİS applies.

Server ([`deploy/raf`](../../../deploy/raf))

- [ ] Server, domain and SMTP provider; `.env` filled in; `docker compose up -d --build`.
- [ ] `https://<DOMAIN>/health`, `/privacy`, `/terms`, `/delete-account` open.
- [ ] A password reset email arrives (check spam; set SPF and DKIM at the mail provider).
- [ ] `backup.sh` runs daily, and a restore was tried once.

App

- [ ] `eas login`, `eas init`, and the environment variables (see [raf-mobile](../raf-mobile/README.md#store-builds-with-eas)).
- [ ] A `preview` build on a real phone: sign up, scan a receipt, a long receipt, a pack date, a reminder, password reset, delete account.
- [ ] A `production` build (AAB); the first one is uploaded by hand in Play Console.

Play Console

- [ ] Listing texts and graphics; answers from [play-console.md](play-console.md); a test account for the reviewer.
- [ ] Closed test with the testers; then apply for production access.

iOS later: Google sign-in is hidden there, because Apple would then require Sign in with Apple.
Everything else is ready for a TestFlight build, but untested on an iPhone.

# Google Play Console answers

What to fill in, based on what the app and API do. Check each one again when that changes.

## Store settings

| Field | Value |
| --- | --- |
| App or game | App |
| Category | Food & Drink (alternative: Shopping) |
| Free or paid | Free |
| Ads | No ads |
| Contact email | the same as `SUPPORT_EMAIL` |
| Privacy policy | `https://<DOMAIN>/privacy` |
| Countries | Türkiye first; add others later |

## Graphics

| Field | File |
| --- | --- |
| App icon, 512 × 512 | `graphics/play-icon-512.png` |
| Feature graphic, 1024 × 500 | `graphics/feature-tr.png`, `graphics/feature-en.png` |
| Phone screenshots, 1080 × 1920 | `graphics/phone-tr/*.png` (the English listing shows these too) |

The screenshots come from the web preview with invented markets. Replace them with ones from a
phone when you have them.

## App access

All of the app needs an account. Choose “All or some functionality is restricted” and give a
test account: sign up in the app with an address of yours, save two or three receipts, and enter
its email and password. Do not use the demo account of the seed; its password is in the repository.

Instructions for the reviewer:

> Log in with the email and password above (tab “Log in”). The lime button in the middle scans a
> receipt; “Gallery” picks a photo instead of using the camera. Reading takes about 15 seconds.

## Data safety

Does the app collect or share user data: **yes, collects; does not share**. (Hosting and email
providers work on your behalf, which Google does not count as sharing.)
Encrypted in transit: **yes**. Users can request deletion: **yes**, `https://<DOMAIN>/delete-account`.

| Data type | Collected | Purpose | Required |
| --- | --- | --- | --- |
| Name | yes (from Google, or from the email) | Account management | required |
| Email address | yes | Account management | required |
| User IDs | yes (account id; Google account number with Google sign-in) | Account management | required |
| Purchase history | yes (receipts: markets, products, amounts) | App functionality | required |
| Photos | yes (receipt photos) | App functionality | optional (lines can be typed in) |
| Other user-generated content | yes (market lists, counts at home) | App functionality | optional |

Not collected: location, contacts, messages, audio, files, calendar, web history, app interactions,
crash logs, device or advertising ids. Nothing is used for advertising, analytics or profiling.
Ephemeral processing: photos of pack dates are read and not stored.

## Content rating (IARC questionnaire)

Category “Utility, productivity, communication or other”. No violence, sexual content, language,
drugs or gambling; users cannot talk to each other or see each other’s content; no location
sharing; no purchases.

## Target audience

18 and over (the terms say so). Not designed for children.

## Other declarations

| Declaration | Answer |
| --- | --- |
| Advertising ID | No |
| Government app, financial features, health app | No, none |
| News app | No |
| Photo and video permissions | Not used: photos come from the system picker |
| Exact alarms, foreground services | Not used |
| Permissions | The user is asked for camera (scanning) and notifications (expiry reminders). The libraries add ones nobody is asked for: internet, network state, vibrate, wake lock, start at boot (reminders), biometric (secure storage), install referrer, and launcher badges. None needs a declaration form. |

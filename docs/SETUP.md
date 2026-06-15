# Setup & configuration checklist

Everything you must configure once, in order. Nothing is hardcoded — keys go into a guided in-app
settings screen (or `.dev.vars` / Cloudflare secrets for the platform-level ones). Items are marked
**[instant]**, **[minutes]**, **[hours]**, or **[days]** so you know what to start early.

> **Start the two slow items first:** WhatsApp *business verification* and *display-name approval* can
> take days. Kick those off on day one; everything else can proceed in parallel.

---

## A. WhatsApp Business Cloud API (Meta)

| # | Step | Where | Time |
| --- | --- | --- | --- |
| 1 | Create / pick a **Meta Business Portfolio** (business email) | business.facebook.com | instant |
| 2 | **Start Business Verification** (legal name, address, GST/registration, website) | Business Manager → Security Center | **days** |
| 3 | Choose a **dedicated phone number** — ⚠️ it **cannot** be used in the normal WhatsApp / WA Business app afterward. Use a fresh SIM; if it has WhatsApp now, delete that WhatsApp account first. | — | instant |
| 4 | Create a **Meta Developer App** (type: Business) → get **App ID** + **App Secret** | developers.facebook.com | minutes |
| 5 | Add the **WhatsApp** product → creates your **WhatsApp Business Account (WABA)** | App Dashboard → WhatsApp | minutes |
| 6 | **Register** your number to the WABA, verify via OTP, set the 6-digit two-step PIN → get **Phone Number ID** + **WABA ID** | WhatsApp → API Setup | minutes |
| 7 | Set **Display Name** and submit for approval | WhatsApp Manager → Phone numbers | **hours–days** |
| 8 | Create a **System User (Admin)**, assign WABA + App, generate a **permanent access token** with scopes `whatsapp_business_messaging` + `whatsapp_business_management` | Business Settings → System Users | minutes |
| 9 | Pick a random **webhook Verify Token** (any secret string you invent) | you decide | instant |
| 10 | Configure webhook: enter **Callback URL** (`https://<your-app>/api/webhook`) + Verify Token; subscribe the WABA to the `messages` field | App → WhatsApp → Configuration | minutes |
| 11 | Create & submit your **first-contact template** (for Path B) for approval | WhatsApp Manager → Templates | minutes–24h |
| 12 | Add a **payment method** to the WABA | WhatsApp Manager → Billing | minutes |

**You will paste into the app's settings:** App Secret, Phone Number ID, WABA ID, the permanent
access token, and the Verify Token.

---

## B. Google Sheets (storage)

| # | Step | Time |
| --- | --- | --- |
| 1 | In Google Cloud Console, create (or pick) a project | minutes |
| 2 | Enable the **Google Sheets API** | minutes |
| 3 | Create a **Service Account**, then create a **JSON key** for it | minutes |
| 4 | Create your Google Sheet (or let the app create one) | instant |
| 5 | **Share** the Sheet with the service-account email (`...@<project>.iam.gserviceaccount.com`) as **Editor** | instant |

**You will paste into the app's settings:** the service-account JSON, and the Sheet ID (from its URL).

---

## C. LLM provider (the AI bot + lead structuring)

Any of these — pick one to start, switch anytime from settings:

- **Gemini** (free tier, recommended default for cost): get an API key from Google AI Studio.
- **Anthropic Claude** (e.g. Haiku for cheap quality): get an API key from the Anthropic Console.
- **Any OpenAI-compatible** endpoint (OpenAI, Groq, OpenRouter, Together, local): API key + base URL.

**You will paste into the app's settings:** provider, model, API key, (optional) base URL, system
prompt, thinking mode.

---

## D. Hosting & media (Cloudflare)

| # | Step | Time |
| --- | --- | --- |
| 1 | Create a free **Cloudflare** account | minutes |
| 2 | Create an **R2** bucket for product photos; enable public access on a custom subdomain (e.g. `media.yourdomain.app`) | minutes |
| 3 | Create a **KV namespace** (flags), a **D1 database** (state), a **Queue**, and a **Cron Trigger** | minutes |
| 4 | Deploy the app (`npm run deploy` via the OpenNext Cloudflare adapter) | minutes |
| 5 | Set platform secrets (`SESSION_SECRET`, `ENCRYPTION_KEK`, `WHATSAPP_VERIFY_TOKEN`) via `wrangler secret put` | minutes |

> Local development uses `next dev` and a `.dev.vars` file — no Cloudflare account needed to build &
> test the core loop locally.

---

## E. Android APK (optional, later)

1. `npm run build` the web app.
2. `npx cap add android` and point Capacitor at the deployed URL (or bundle the build).
3. Add the Camera plugin; `npx cap open android` → build the APK/AAB in Android Studio.

---

## Quick reference — secrets the app expects

| Key | Source | Where it lives |
| --- | --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Meta System User (A8) | in-app settings (encrypted) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta (A6) | in-app settings |
| `WHATSAPP_WABA_ID` | Meta (A6) | in-app settings |
| `WHATSAPP_APP_SECRET` | Meta (A4) | in-app settings (encrypted) |
| `WHATSAPP_VERIFY_TOKEN` | you invent (A9) | platform secret |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google (B3) | in-app settings (encrypted) |
| `GOOGLE_SHEET_ID` | Sheet URL (B4) | in-app settings |
| `LLM_API_KEY` + provider/model | C | in-app settings (encrypted) |
| `SESSION_SECRET`, `ENCRYPTION_KEK` | you generate | platform secret |

The app's **Settings → Integrations** screen has a **"Test connection"** button for each of these so
you get instant ✅ / ❌ feedback before an event.

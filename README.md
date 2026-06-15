# Saral CRM — WhatsApp-first CRM for textile fairs

> **Saral** (सरल / સરળ) means *simple*. That's the whole point: take the messy, manual way a textile
> wholesaler captures leads at a fair — a number jotted on paper, a follow-up promised over WhatsApp —
> and make it one tap, automated, organized, and multilingual, without making it any harder to use.

A modular, **multilingual (English / हिंदी / ગુજરાતી)** CRM + WhatsApp automation platform for a
saree / dress-material / embroidery wholesaler who attends a handful of fairs a year. It captures
leads, structures them with an LLM, stores them in **Google Sheets** (swappable for a real database
later), and runs the entire WhatsApp coordination loop — send product photos, let an AI bot chat in
the customer's own language, and let a human salesperson take over at any moment.

The web app is built so it converts cleanly to an **Android APK** with the same workflow.

---

## Why this exists (the problem)

A wholesaler at a textile fair today:

1. Meets a customer, **writes their phone number on paper** (or a WhatsApp chat to self).
2. Later, **manually messages** them product photos and prices.
3. **Coordinates over WhatsApp**, which gets messy — no single source of truth, easy to lose a lead,
   no visibility for other salespeople.

This product keeps step 1 *just as easy* (jot a number, or let the customer scan a QR) but makes
everything after it automatic, organized, and shared across the team.

---

## The two capture paths (designed around how WhatsApp actually works)

The official WhatsApp Business (Cloud) API does **not** let you send marketing photos to a stranger
out of the blue — outside a 24-hour window you may only send pre-approved templates. We turn that
constraint into a clean UX:

- **Path A — Customer messages first (cheapest, preferred).** A QR code on your stall / website
  (and a `wa.me` link) opens WhatsApp with a pre-filled "Hi, I saw your sarees" message. The
  customer's message opens a **free 24-hour window** in which the bot greets them, sends the photos
  you picked, and chats — all at **zero messaging cost**.
- **Path B — You jot the number (the old habit, now automated).** You save the lead and pick photos;
  the system sends an **approved first-contact template** (a small per-message cost). The moment the
  customer replies, the window opens and the queued photos + bot chat fire automatically.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full flow and the cost model.

---

## Core principles

- **Modular everything.** Storage (Sheets now, Supabase later), WhatsApp provider, and LLM provider
  are all behind clean interfaces — swap one without touching the rest.
- **One source of truth for fields.** A single JSON *field schema* drives the form, the Sheet columns,
  and the LLM's structured-output contract. Change what you capture without touching code.
- **Configurable, not hardcoded.** LLM provider/model/prompt, WhatsApp credentials, fields, templates,
  and languages are all configured at runtime, never baked in.
- **Free by default, rock-solid during events.** Scale-to-zero hosting (≈ $0 when idle), with an
  instant **Event Mode** on/off switch for the ~35 event-days a year.
- **Human-in-the-loop.** The AI bot can be paused per-conversation so a salesperson takes over, then
  handed back — with full visibility for the whole team.

---

## Tech stack (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the *why*)

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router) + TypeScript + Tailwind |
| i18n | `next-intl` — English / Hindi / Gujarati, runtime-switchable |
| Forms | React Hook Form + Zod, generated from a dynamic field schema |
| Storage | `StorageProvider` interface → Google Sheets adapter (Supabase adapter later) |
| WhatsApp | `WhatsAppProvider` interface → official Meta **Cloud API** adapter |
| LLM | `LlmProvider` interface → any OpenAI-compatible / Anthropic / Gemini endpoint |
| Hosting | Cloudflare Pages + Workers (OpenNext adapter), R2 (media), KV (flags), D1 (state) |
| Mobile | Capacitor wrapper → Android APK |

---

## Project status

🚧 **Early build — Phase 1 (core loop).** See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's in each
phase and what's done so far.

## What you'll need to configure

Nothing is hardcoded — you supply credentials once via a guided in-app settings screen. The full,
ordered checklist (Meta WhatsApp, Google service account, LLM key, Cloudflare) lives in
[`docs/SETUP.md`](docs/SETUP.md).

## License

MIT — see [`LICENSE`](LICENSE).

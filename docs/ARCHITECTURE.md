# Architecture

This document is the load-bearing design for Saral CRM. Every decision here was verified against
current (2026) WhatsApp / Google / hosting facts. It is the contract the code implements.

---

## 1. System overview

```
                    ┌──────────────────────────────────────────────┐
                    │            Next.js app (App Router)            │
   Admin / sales →  │  multilingual UI · dynamic lead form · photo   │
   (web + APK)      │  library · team inbox · settings · Event Mode  │
                    └───────────────┬───────────────┬────────────────┘
                                    │               │
              ┌─────────────────────┘               └─────────────────────┐
              ▼                                                            ▼
   ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────────────┐
   │  StorageProvider   │   │   LlmProvider      │   │     WhatsAppProvider        │
   │  (interface)       │   │   (interface)      │   │     (interface)             │
   ├────────────────────┤   ├────────────────────┤   ├─────────────────────────────┤
   │ GoogleSheetsAdapter│   │ OpenAI-compatible  │   │ MetaCloudAdapter (official) │
   │ SupabaseAdapter*   │   │ Anthropic · Gemini │   │ UnofficialAdapter* (later)  │
   └────────────────────┘   └────────────────────┘   └─────────────────────────────┘
        * = future, same interface, no rework

   Inbound WhatsApp ─► /api/webhook (always-on, verify+enqueue+200) ─► Queue ─► Bot worker
```

The three provider interfaces are the spine of the system. The UI and business logic depend only on
the interfaces; concrete adapters are chosen by configuration.

---

## 2. WhatsApp: how it really works (and why the flows are shaped this way)

**Verified facts that shape everything:**

- Billing is **per delivered message** since 1 Jul 2025 (not per 24h conversation).
- **Free-form replies inside an open 24-hour service window are free and unlimited** (service messages
  became free Nov 2024).
- **Outside a window, you may only send pre-approved templates.** Marketing templates in India cost
  ~₹0.86/msg (as of Jan 2026); utility templates ~₹0.115/msg.
- A plain **`wa.me` / QR link opens a standard 24h window** (replies free). It does **not** grant the
  72h "all free" window — that only applies to Click-to-WhatsApp ads & FB/IG Page CTA buttons.
- The **WhatsApp number used for the API cannot also be used in the normal WhatsApp / WA Business app.**

### Path A — customer messages first (preferred, ~free)

```
Customer scans stall/website QR → WhatsApp opens with prefilled text → taps Send
        │  (their inbound message = consent + opens 24h window, FREE)
        ▼
/api/webhook receives it → create/update lead → mark window open (now+24h)
        ▼
Bot greets (free) → sends selected product photos (free) → chats in their language (free)
        ▼
Each new customer message extends the window another 24h.
```

### Path B — you jot the number (the old habit, automated)

```
Salesperson saves lead (name, phone, interests) + picks photos → taps Send
        │  number is "cold" → first touch MUST be an approved template (small cost)
        ▼
Approved first-contact template sent  ·  selected photos QUEUED (not yet sent)
        ▼
Customer replies anything → window opens → queued photos auto-send (free) + bot greets
        ▼
…identical to Path A from here.
```

| Moment | Path A | Path B |
| --- | --- | --- |
| First outbound | n/a (customer first) | **TEMPLATE (paid)** |
| After customer's first inbound | free-form (free) | free-form (free) |
| Product photos, bot chat | free | free |
| Re-engage after 24h silence | TEMPLATE (paid) | TEMPLATE (paid) |

### Sending product photos

- WhatsApp has **no native album/carousel** — each photo is a separate message. Send **sequentially**
  (await each message id) to guarantee order; cap a burst at ~5–10 photos.
- Prefer **upload → media id** over hosted-URL sends (faster, dodges proxy rate-limits). Media ids
  live ~30 days; re-upload when stale. Each image message carries an optional caption (price/design).
- Upload rate limit: 25 req/s per number. Throughput governed by your messaging tier (250 → 1k → 10k…).

---

## 3. Provider interfaces (the modular spine)

### `WhatsAppProvider`
Commands: `sendText`, `sendImageByMediaRef`, `sendImagesSequential`, `sendTemplate`, `uploadMedia`,
`getMediaUrl`, `markRead`, `verifyWebhook`, `parseWebhook`, `listTemplates`, `createTemplate`,
`getTemplateStatus`, `getMessagingLimitTier`.
Emits provider-neutral domain events: `InboundMessageReceived`, `MessageStatusChanged`,
`ServiceWindowOpened`, `ServiceWindowExpired`, `TemplateStatusChanged`, `MediaUploaded`, `ProviderError`.
The Meta Cloud adapter maps Meta JSON ↔ these events and verifies the `X-Hub-Signature-256` header.

### `StorageProvider`
Backend-agnostic CRUD for `Lead`, `Interaction`, `PhotoMeta`, `Salesperson`, `Setting`. Two rules keep
the abstraction swap-safe: **the app generates ULIDs** (never the store), and **`upsertLeadByPhone`**
is first-class so idempotency/dedup is the contract, not an afterthought. Returns a discriminated
`WriteResult` (`ok` | `version_conflict` | `rate_limited` | `transport`) so the UI reacts correctly.

### `LlmProvider`
`normalize({ systemPrompt, userText, jsonSchema })` and a chat/tool-use surface. Configurable
`provider` (openai-compatible | anthropic | gemini), `baseURL`, `model`, `temperature`,
`thinkingMode`, `systemPrompt`. Tools: web search, catalog lookup, lead-context fetch, draft/send
WhatsApp; optional MCP servers merged at runtime.

---

## 4. The single field schema → 3 derived artifacts

One `FormSchema` (JSON, admin-editable) is compiled into:

1. **Zod schema** → React Hook Form (renders inputs by `type`, labels by active locale).
2. **Column map** → Google Sheets headers (stored value = stable enum `value`, never localized label).
3. **JSON Schema** → the LLM's strict structured-output contract.

Because all three derive from the same `FieldDef[]`, the form, the spreadsheet, and the LLM output can
never drift apart. Adding a field or an interest option is a schema edit — no code change.

LLM normalization: paste messy text (or voice-to-text) → LLM fills the schema → **human confirms** in
the form → save via `upsertLeadByPhone`. A bounded validate/repair loop (max 2 retries) reuses the
same Zod schema; on failure it returns a partial draft with flagged fields rather than blocking.

---

## 5. Storage: Google Sheets now, honestly

- **Auth:** Google service account; admin shares the Sheet with the service-account email as Editor.
  The APK never holds the key — it calls the backend, which holds the key.
- **Layout:** one worksheet per entity; header row owned by the schema (reconciled on boot — append
  missing columns, never reorder/delete).
- **Idempotency:** in-memory `phone → row` index; upsert updates the row, else appends. Same number
  never duplicates, even across the bot and a salesperson.
- **Quotas:** Sheets API = 300 req/min/project, 60 req/min/user; one `batchUpdate` = one request.
  Mitigation: a **write-coalescing queue** (~300–500ms flush) + client-side token bucket + 429
  backoff. Reads batched per poll tick.
- **Live status:** optimistic UI + write-through + SWR delta polling (15–30s). **Honest limitation:**
  Sheets has no transactions/row-locks → last-write-wins. We minimize damage with cell-scoped writes,
  `version`/`updatedAt` optimistic concurrency, and append-only notes/photos. True multi-writer
  correctness is the reason `SupabaseAdapter` exists for later (DB as source of truth, Sheet as a
  synced view). The swap is a config change behind the same interface.

---

## 6. Hosting, cost, and Event Mode

- **Cloudflare Pages + Workers (OpenNext adapter)** for the Next.js app — V8-isolate model means
  negligible cold start on the always-on webhook (the decisive factor), no "non-commercial" clause,
  $0 at idle, $5/mo flat ceiling if a fair ever exceeds free limits.
- **R2** for product photos (10GB free, **zero egress fees ever** — heavy fair-day fetching stays
  free; Supabase Storage's 7-day idle pause would break links in the off-season).
- **KV** for flags, **D1 (SQLite)** for conversation state, **Queues** for outbound send buffering,
  **Cron Triggers** for follow-ups.
- **Webhook discipline:** verify signature → enqueue → return 200 fast; the LLM/bot work happens in the
  queue consumer so ACKs are never blocked by model latency, and bursts are buffered with retries.

### Event Mode (instant on/off)
A single `event_mode` flag in KV (edge-cached, near-instant propagation).

- **Always on (never gated):** webhook receiver, message persistence, admin UI/auth.
- **Gated by Event Mode = ON:** inbound bot auto-replies, outbound automation, scheduled jobs.
- **Independent kill switches:** a global `automation_halt` panic button, and a per-conversation
  `agent_paused` flag (also used for human takeover). The bot replies only when
  `event_mode && !automation_halt && !agent_paused`.

So in the ~11 idle months: messages are still received and stored, but nothing auto-sends. One tap
flips the whole loop on for a fair.

---

## 7. LLM agent layer

- Runs in the **queue consumer**, not the webhook. CPU-time billing on Workers excludes time awaiting
  the model, so long calls are cheap.
- **Provider-agnostic**: OpenAI-compatible covers OpenAI/Groq/OpenRouter/Together/local via base-URL
  swap; separate Anthropic & Gemini adapters; all normalized to one internal tool-call format.
- **Memory** per conversation in D1: rolling log + compacted summary + extracted lead fields + language.
- **Language**: instruct the model to detect and reply in the user's language/script —
  English / Hindi / Gujarati / **Hinglish & romanized** — no separate classifier.
- **Default brain:** a free-tier Flash-class model (e.g. Gemini Flash) for one wholesaler's volume;
  configurable fallback to a cheap frontier model (e.g. Claude Haiku 4.5) — switchable from settings,
  no redeploy.

---

## 8. Secrets & config

- **Platform secrets** (session key, encryption KEK, webhook verify token) → Cloudflare secrets, set
  once at deploy. The owner never touches these.
- **Owner-supplied keys** (WhatsApp token, Google service-account JSON, LLM key, MCP creds) → an
  authenticated **in-app settings page**, **envelope-encrypted at rest** (KEK in the secret store,
  ciphertext in the DB), shown masked, each with a **"Test connection"** button for instant green/red
  feedback. Long-lived WhatsApp System-User token preferred to avoid mid-fair expiry.

---

## 9. Web → APK

**Capacitor** wraps the responsive web app: native Camera/filesystem (you photograph & upload designs
on the fair floor) and later push notifications for new leads — neither of which a TWA gives cleanly.
Same codebase serves web and the Capacitor shell; `npx cap add android` → build APK/AAB.

---

## 10. Top failure modes & mitigations

| Risk | Mitigation |
| --- | --- |
| Number quality drop / ban even on official API | Prefer Path A volume; throttle Path B; only message plausibly-interested numbers; honor opt-outs; monitor quality rating; warm up gradually |
| Template rejected / reclassified (10× cost) | Submit weeks before a fair; keep 2–3 approved variants; gate Send on `APPROVED`; budget at marketing rate |
| Window expires mid-conversation | Track `window_expires_at`; show live countdown; disable free-form composer when closed; force template re-engagement |
| Media id / URL expiry | Use upload→media id; mark stale at ~25 days; re-upload + retry once on media error |
| Webhook downtime during a fair | Thin always-up receiver (verify→enqueue→200); Meta retries non-200; idempotency table makes replay safe |
| Duplicate / out-of-order events | Idempotency on `wamid` (+`status`); sequential photo sends with client request ids |

---

## 11. Conventions

- TypeScript strict mode; no `any` in domain code. ULIDs for ids. E.164 for phone numbers.
- Domain logic depends on interfaces, never concrete adapters.
- No hardcoded business values — fields, templates, languages, providers all come from config.
- Every external call returns a typed result; errors are values, not surprises.

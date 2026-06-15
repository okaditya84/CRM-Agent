# Roadmap

Delivery is **core loop first, then layer** — each phase is fully working before the next starts, and
each feature ships as its own branch → PR → merge.

---

## Phase 1 — Working core loop (manual, owner-driven) ✅ functionally complete

The core loop — capture → save → catalog → send on WhatsApp → control — is built and
verified (116 tests, live smoke tests). Delivered across PRs #1–#11.

- [x] Project scaffold: Next.js 16 (App Router) + TypeScript strict + Tailwind v4 (PR #1)
- [x] Multilingual shell: `next-intl`, English / Hindi / Gujarati, runtime language switch (PR #1)
- [x] Design system: clean, professional, accessible UI tokens (PR #1)
- [x] Dynamic field schema → Zod / column-map / JSON-schema compilers (single source of truth) (PR #2)
- [x] Lead capture form rendered from the schema, fully validated, multilingual labels (PR #8)
- [x] LLM lead structuring: paste messy text → structured draft → human confirms → save (PR #7, #8)
- [x] `StorageProvider` interface + in-memory + `GoogleSheetsAdapter` (upsert-by-phone, coalescing) (PR #3, #4)
- [x] Product photo library: upload, tag (caption/price), thumbnail grid, multi-select (PR #9)
- [x] `WhatsAppProvider` interface + Meta Cloud adapter (text/image/template, media upload) (PR #5, #6)
- [x] Webhook receiver (always-on): verify signature → parse → dispatch → 200 (PR #6)
- [x] Send selected photos within an open window (PR #10)
- [x] Event Mode + global kill switch (PR #11)
- [x] QR / `wa.me` generator (stall + website), accessible from the app (PR #11)

Carried forward (Phase 1.5 / folded into Phase 2):

- [ ] Admin auth (single user; signed-cookie session)
- [ ] In-app **encrypted** settings entry + per-integration "Test connection" (status panel shipped; secret entry pending)
- [ ] Delivery/read status surfaced in the UI (status events are parsed; UI pending)
- [ ] Per-conversation pause flag wired end-to-end (`isBotAllowed` accepts it; storage wiring pending)

## Phase 2 — AI bot, team inbox, human takeover

- [ ] Queue consumer running the provider-agnostic LLM agent
- [ ] Tools: catalog lookup, lead-context fetch, draft/send, web search; optional MCP
- [ ] Conversation memory in D1; detect-and-reply in user's language (incl. Hinglish)
- [ ] Auto-reply gated by `event_mode && !automation_halt && !agent_paused`
- [ ] Team inbox: all conversations, unread, lead-context side panel
- [ ] Human takeover: "Take over" / "Resume bot" per conversation, visible to the whole team
- [ ] Multiple salespeople with assignment & activity visibility

## Phase 3 — Analytics, automation, APK, polish

- [ ] Analytics: leads/day, response times, most-requested products, WhatsApp cost tracking
- [ ] Outbound automation: language-matched segmented broadcasts, Cron follow-ups (Event-Mode gated)
- [ ] Capacitor Android APK with Camera plugin + push notifications for new leads
- [ ] Onboarding wizard for first-time key setup; backup/export
- [ ] `SupabaseAdapter` + Sheets-as-synced-view migration path

---

## Working agreement

- One feature ≈ one branch ≈ one PR; branches are **not** deleted after merge.
- `main` stays releasable; every PR is self-contained and (where testable) verified before merge.
- No placeholder logic — code works the moment its required keys are configured.

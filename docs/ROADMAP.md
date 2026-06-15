# Roadmap

Delivery is **core loop first, then layer** — each phase is fully working before the next starts, and
each feature ships as its own branch → PR → merge.

---

## Phase 1 — Working core loop (manual, owner-driven) 🚧 in progress

The minimum that delivers value at the next fair, no autonomous bot yet.

- [ ] Project scaffold: Next.js (App Router) + TypeScript + Tailwind, runs with `next dev`
- [ ] Multilingual shell: `next-intl`, English / Hindi / Gujarati, runtime language switch
- [ ] Design system: clean, professional, accessible UI tokens (colors, type, spacing)
- [ ] Admin auth (single user; signed-cookie session)
- [ ] Dynamic field schema → Zod / column-map / JSON-schema compilers (single source of truth)
- [ ] Lead capture form rendered from the schema, fully validated, multilingual labels
- [ ] LLM lead structuring: paste messy text → structured draft → human confirms → save
- [ ] `StorageProvider` interface + `GoogleSheetsAdapter` (service account, upsert-by-phone, coalescing)
- [ ] Product photo library: upload, tag (SKU/price), thumbnail grid, multi-select
- [ ] `WhatsAppProvider` interface + Meta Cloud adapter (send text/image/template, media upload)
- [ ] Webhook receiver (always-on): verify signature → persist → enqueue → 200
- [ ] Send selected photos within an open window; delivery/read status shown in UI
- [ ] Event Mode + global kill switch + per-number pause flags wired in
- [ ] QR / `wa.me` generator (stall + website), accessible from the app
- [ ] In-app encrypted settings page with per-integration "Test connection"

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

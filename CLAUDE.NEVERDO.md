# CLAUDE.NEVERDO.md — Hard Rules & Constraints

Every rule below is non-negotiable. Violating any of them is a bug.

---

1. Never store monetary amounts as floats — always pence integers  <!-- Auto-preserved by update-docs -->
2. Never expose Supabase service role key to the browser  <!-- Auto-preserved by update-docs -->
3. Never skip input validation on API routes  <!-- Auto-preserved by update-docs -->
4. Never use `prisma.$executeRaw` without parameterized queries  <!-- Auto-preserved by update-docs -->
5. Never store passwords — auth is OTP via Supabase  <!-- Auto-preserved by update-docs -->
6. Never expose raw storage paths — always generate signed URLs (60 min expiry)  <!-- Auto-preserved by update-docs -->
7. Never expose stack traces — return user-friendly messages  <!-- Auto-preserved by update-docs -->
8. Never generate legal text from scratch — AI fills pre-approved templates only  <!-- Auto-preserved by update-docs -->
9. Never expose raw AI output to users — always parse, validate, and clean with `cleanSummary()`  <!-- Auto-preserved by update-docs -->
10. Never add tenantName/tenantEmail/tenantPhone to Tenancy — use the Tenant relation (Tenancy = agreement, Tenant = person)  <!-- Auto-preserved by update-docs -->
11. Never create a new Supabase table without immediately enabling RLS and writing policies in the same migration file — pattern: see `supabase/migrations/20260327_add_rls_policies.sql`  <!-- Auto-preserved by update-docs -->
12. Never leave a table with UNRESTRICTED badge in Supabase dashboard — all tables must show globe icon (RLS enabled)  <!-- Auto-preserved by update-docs -->
13. Never add a new email notification without registering it in `lib/notifications/registry.ts` — every notification must have an entry with correct trigger, recipient, status, and templateFn. Without this, the notification will not appear in the admin panel and the task is considered incomplete.  <!-- Auto-preserved by update-docs -->
14. Never define `inputClass`, `buttonClass`, `selectClass`, or card className inline — import from `lib/form-styles.ts` / `lib/ui.tsx`. All `<select>` elements use `appearance-none` + `.select-chevron` CSS class for consistent custom arrow. Never define inline select/input styles per-page — import from form-styles.  <!-- Auto-preserved by update-docs -->
15. Never write inline loading spinners — use `<Spinner />` from `lib/ui.tsx`  <!-- Auto-preserved by update-docs -->
16. Never build modal overlays from scratch — use `<Modal />` from `lib/ui.tsx`  <!-- Auto-preserved by update-docs -->
17. Never define `fmtDate()` locally — import from `lib/utils.ts`  <!-- Auto-preserved by update-docs -->
18. Never write primary button styles inline — use `buttonClass`
19. Fix UI inconsistencies on touch (see UI.md §9) — do not add new instances
20. Never show grade labels, "/100" score, AI summary, or coverage details to candidates — only show neutral reliability messaging. This applies to BOTH single and joint applications — no score, grade, or summary ever shown to applicant  <!-- Auto-preserved by update-docs -->
21. Never restrict score data from unauthenticated polling on `/api/scoring/[reportId]` GET — candidates need their own score  <!-- Auto-preserved by update-docs -->
22. Never call `analyzeStatement()` directly in upload routes — use fire-and-forget `fetch()` to `/api/scoring/process/[reportId]`  <!-- Auto-preserved by update-docs -->
23. Candidate polling must use public invite endpoint (`/api/screening/invite/${token}`), never `/api/scoring/${reportId}` which requires auth. Candidate is not logged in during the apply flow.  <!-- Auto-preserved by update-docs -->
24. Never duplicate CandidateScoreCard/CandidateFooter/scoreMessage inline — use `components/screening-flow/CandidateResultScreen.tsx`  <!-- Auto-preserved by update-docs -->
25. Screening report page (`screening/report/[reportId]`) must always use `params.reportId` directly for the `/api/scoring/` call — never derive the ID from a relation, invite lookup, or other source. All links to this page must pass the FinancialReport ID, not the ScreeningInvite ID.  <!-- Auto-preserved by update-docs -->
26. Never show grade label in applicant list on property detail page — score inline only (`50/100`), landlord-only view  <!-- Auto-preserved by update-docs -->
27. Never use `Sentry.lastEventId()` in render — it races with the `useEffect` that actually captures. Pattern: `useState(fallback)` → `useEffect` captures + `setErrorId(eventId)`  <!-- Auto-preserved by update-docs -->
28. Never call `generatePDF` directly in API routes or page logic — use `lib/pdf-mappers.ts`
29. Never import from `lib/pdf-engine/templates/` or `lib/pdf-engine/components/` — only `generatePDF` from index
30. Never modify `lib/pdf-engine/types.ts` field names or remove fields — additive changes only
31. Never write PDF rendering logic outside `lib/pdf-engine/`
32. Never pass Prisma model instances into `generatePDF` — map to plain payload first (via pdf-mappers.ts)

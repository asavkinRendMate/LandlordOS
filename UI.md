# UI.md — LetSorted Design System

**This document is auto-generated. Do not edit by hand.**
Run `npm run update-ui-docs` to regenerate.
Last updated: 2026-03-11

---

## ⚠️ Rules — Read First

These are absolute. No exceptions.

- **Never define `inputClass`, `selectClass`, or `buttonClass` inline** — import from `lib/form-styles.ts`
- **Never write a loading spinner inline** — use `<Spinner />` from `lib/ui.tsx`
- **Never write the card container className inline** — use `cardClass` from `lib/ui.tsx`
- **Never build a modal from scratch** — use `<Modal />` from `lib/ui.tsx`
- **Never define `fmtDate()` in a page file** — import from `lib/utils.ts`
- **Never create a new photo upload component** — extend `DocumentUploadModal` via props
- **Never write primary button styles inline** — use `buttonClass` from `lib/form-styles.ts`
- **All `<select>` elements must use `appearance-none` + `.select-chevron`** — use `selectClass`

---

## 1. Tokens — Colours, Spacing, Typography

### Brand Colours
```
Primary green:     #16a34a   (buttons, links, active states)
Primary green dark:#15803d   (hover on primary green)
Brand green:       #2D6A4F   (header, logo, brand marks)
Brand green light: #F0F7F4   (subtle green backgrounds)
```

### Semantic Colours
```
Text primary:      #1A1A1A
Text secondary:    #6B7280   (Tailwind gray-500)
Text muted:        #9CA3AF   (Tailwind gray-400)
Border default:    rgba(0,0,0,0.06)  → border-black/[0.06]
Border gray:       #E5E7EB   (Tailwind gray-200)
Page background:   #F9FAFB   (Tailwind gray-50)
Card background:   #FFFFFF
```

### Status Colours
```
Success:           bg-green-100  text-green-700
Warning:           bg-yellow-100 text-yellow-700  (or amber)
Error / Danger:    bg-red-100    text-red-700
Info / Neutral:    bg-gray-100   text-gray-600
Pending:           bg-blue-100   text-blue-700
```

### Priority Colours (Maintenance)
```
URGENT:  bg-red-100    text-red-700
HIGH:    bg-orange-100 text-orange-700
MEDIUM:  bg-yellow-100 text-yellow-700
LOW:     bg-gray-100   text-gray-600
```

---

## 2. Primitive Classes — `lib/form-styles.ts`

Always import from here. Never redefine inline.

```typescript
import { inputClass, selectClass, selectClassCompact, buttonClass, buttonSecondaryClass, buttonDangerClass, textareaClass } from '@/lib/form-styles'
```

| Export | Use case |
|--------|----------|
| `inputClass` | All `<input>` elements |
| `selectClass` | Full-width `<select>` |
| `selectClassCompact` | Fixed-width `<select>` in flex rows (e.g. room type) |
| `textareaClass` | All `<textarea>` elements |
| `buttonClass` | Primary CTA — green, full-width |
| `buttonSecondaryClass` | Secondary action — white/gray border |
| `buttonDangerClass` | Destructive action — red |

### Button usage
```tsx
// Primary
<button className={buttonClass} disabled={loading}>
  {loading ? <Spinner size="sm" /> : 'Save changes'}
</button>

// Secondary
<button className={buttonSecondaryClass}>Cancel</button>

// Danger (destructive actions only)
<button className={buttonDangerClass}>Delete property</button>
```

---

## 3. Shared Components — `lib/ui.tsx`

Single file exporting all shared primitives. Import from here.

```typescript
import { Spinner, cardClass, Modal, StatusBadge, PriorityBadge, EmptyState, AlertBar, TabFilter, ListRow, PageHeader } from '@/lib/ui'
```

---

### `<Spinner />`
**Never write inline spinners.** Always use this.

```tsx
<Spinner />              // default: size md, green-600
<Spinner size="sm" />    // w-4 h-4
<Spinner size="md" />    // w-6 h-6 (default)
<Spinner size="lg" />    // w-12 h-12
<Spinner color="white" /> // for use on green backgrounds
```

---

### `cardClass`
**Never write the card className inline.** Use this constant.

```tsx
import { cardClass } from '@/lib/ui'

<div className={cardClass}>
  ...content
</div>

// With padding override:
<div className={`${cardClass} p-6`}>

// Clickable card:
<div className={`${cardClass} hover:shadow-md transition-shadow cursor-pointer`}>
```

Value: `bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4`

---

### `<Modal />`
**Never build a modal overlay from scratch.** All 6 modal patterns unify here.

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm action"
  size="md"             // "sm" | "md" | "lg" — default "md"
>
  <p>Modal content here</p>
  <div className="flex gap-3 mt-6">
    <button className={buttonSecondaryClass} onClick={onClose}>Cancel</button>
    <button className={buttonClass}>Confirm</button>
  </div>
</Modal>
```

Props:
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string              // renders header with title + close button
  size?: 'sm' | 'md' | 'lg'  // sm=384px, md=480px, lg=640px
  children: React.ReactNode
}
```

Internals: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm`, white card centred, close SVG top-right.

**Destructive modal pattern** (2-step confirm — always use for irreversible actions):
```tsx
// Step 1: summary of consequences
// Step 2: red/rose warning + "This cannot be undone" + confirm button
// Only Step 2 triggers the API call — see DeletePropertyModal for reference
```

---

### `<StatusBadge />`
Maps status strings → coloured pill. Use everywhere a status needs a badge.

```tsx
<StatusBadge status="ACTIVE" />     // green
<StatusBadge status="PENDING" />    // blue
<StatusBadge status="LATE" />       // red
<StatusBadge status="EXPIRED" />    // red
<StatusBadge status="DRAFT" />      // gray

// Custom label override:
<StatusBadge status="AGREED" label="Complete" />
```

Supported statuses (auto-coloured):
`ACTIVE` `VACANT` `AGREED` `RECEIVED` `LIVE` → green
`PENDING` `INVITED` `IN_REVIEW` `EXPECTED` → blue
`LATE` `EXPIRED` `DISPUTED` `PAST_DUE` `FAILED` → red
`DRAFT` `FORMER_TENANT` `PARTIAL` `CANCELED` → gray
`IN_PROGRESS` `NOTICE_GIVEN` → yellow/amber

---

### `<PriorityBadge />`
Maintenance priority only.

```tsx
<PriorityBadge priority="URGENT" />
<PriorityBadge priority="HIGH" />
<PriorityBadge priority="MEDIUM" />
<PriorityBadge priority="LOW" />
```

---

### `<EmptyState />`
Use when a list or section has no items.

```tsx
<EmptyState message="No properties yet" />

<EmptyState
  message="No maintenance requests"
  action={{ label: 'Submit a request', onClick: handleOpen }}
/>
```

---

### `<AlertBar />`
Compliance warnings, errors, info messages.

```tsx
<AlertBar variant="warning" message="Gas certificate expires in 7 days" />
<AlertBar variant="error" message="Subscription payment failed" />
<AlertBar variant="info" message="Tenant has been invited" />
<AlertBar variant="success" message="Report confirmed by both parties" />
```

Props: `variant: 'warning' | 'error' | 'info' | 'success'`, `message: string`, optional `action: { label, onClick }`.

---

### `<TabFilter />`
Horizontal tab switcher. Gray pill background, active tab white + shadow.

```tsx
const [tab, setTab] = useState('all')

<TabFilter
  tabs={[
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
  ]}
  active={tab}
  onChange={setTab}
/>
```

---

### `<ListRow />`
Clickable list item with hover. Use for any linked list (properties, maintenance, invites).

```tsx
<ListRow
  href="/dashboard/properties/123"
  badge={<StatusBadge status="ACTIVE" />}
  title="14 Maple Street, London"
  meta="2 bed · Added 3 Jan 2026"
/>

// Without link (non-navigating row):
<ListRow
  onClick={handleClick}
  title="Upload bank statement"
  meta="Pending"
  badge={<PriorityBadge priority="HIGH" />}
/>
```

---

### `<PageHeader />`
Standard dashboard page header. H1 title + optional action button.

```tsx
<PageHeader
  title="Your properties"
  action={{ label: '+ Add property', href: '/dashboard/properties/new' }}
/>

// Action as button (not link):
<PageHeader
  title="Maintenance"
  action={{ label: '+ New request', onClick: handleOpen }}
/>
```

---

## 4. Utility Functions — `lib/utils.ts`

```typescript
import { fmtDate, fmtCurrency, fmtDateShort } from '@/lib/utils'
```

| Function | Input | Output |
|---|---|---|
| `fmtDate(iso)` | ISO string | "11 Mar 2026" |
| `fmtDateShort(iso)` | ISO string | "11/03/26" |
| `fmtCurrency(pence)` | integer (pence) | "£1,200.00" |

**Never define `fmtDate()` in a page file.** Import from `lib/utils.ts`.

---

## 5. Existing Custom Components

These already exist and must be reused. Never create a new version of any of these.

### `DocumentUploadModal` — `components/shared/DocumentUploadModal.tsx`
Used for all document uploads (property docs + tenant docs).
```tsx
<DocumentUploadModal
  isOpen={isOpen}
  onClose={onClose}
  onUpload={handleUpload}
  types={PROPERTY_DOC_TYPES}  // or TENANT_DOC_TYPES
  propertyId={propertyId}
/>
```

### `ScreeningReportDisplay` — `components/shared/ScreeningReportDisplay.tsx`
Renders the full screening report (landlord or candidate view). Never rebuild this.
```tsx
<ScreeningReportDisplay
  scoring={scoring}
  isLocked={isLocked}
  candidateView={false}
  onUnlock={handleUnlock}
  unlockPriceDisplay="£9.99"
/>
```

### `CandidateResultScreen` — `components/screening-flow/CandidateResultScreen.tsx`
Candidate-facing score display. Never duplicate inline.
```tsx
import { CandidateScoreCard, CandidateFooter, scoreMessage } from '@/components/screening-flow/CandidateResultScreen'
```

### `SectionHelpModal` + `SectionHelpButton` — `components/properties/SectionHelpModal.tsx`
Contextual (i) help on property detail page sections.
```tsx
import { SectionHelpModal, SectionHelpButton, SectionHelpKey } from '@/components/properties/SectionHelpModal'
```

### `DeletePropertyModal` — `components/properties/DeletePropertyModal.tsx`
Type-to-confirm destructive modal. Use as reference for all type-to-confirm patterns.

### `ScreeningLayout` + `ScreeningCard` — `components/screening-flow/`
Wrapper layout for all screening-flow pages (candidate-facing). Always use for `/screening/*` pages.

### `TenantDetailsForm` — `components/shared/TenantDetailsForm.tsx`
Tenant info form with validation. Reuse for any tenant data collection.

### `DashboardShell` — `components/dashboard/shell.tsx`
Main dashboard layout. Already in `app/(dashboard)/layout.tsx` — never add another sidebar.

### `PaymentSetupModal` — `components/shared/PaymentSetupModal.tsx`
Stripe card setup via PaymentElement. The only place card entry happens.

---

## 6. Layout Patterns

### Dashboard page structure
```tsx
// Server component (page.tsx)
export default async function Page() {
  const data = await fetchData()
  return (
    <>
      <PageHeader title="Page title" action={{ label: '+ Add', href: '/new' }} />
      <div className="space-y-4">
        <div className={cardClass}>
          ...
        </div>
      </div>
    </>
  )
}
```

### Step progress indicator
```tsx
// Already exists in onboarding and screening apply flows
// Steps: numbered circles — completed = green check, current = green filled, upcoming = gray
// Copy the pattern from app/(dashboard)/dashboard/properties/new/page.tsx
// Never rebuild from scratch — extract to a shared component if needed again
```

### Compliance dot indicators
```tsx
// Small circles: w-2 h-2 rounded-full
// bg-green-500 = valid | bg-yellow-400 = expiring | bg-red-500 = expired | bg-gray-300 = missing
// Always pair with short text label
```

---

## 7. Animation

### Fade-in on page load
```tsx
// Staggered fade-in for lists/cards — copy from dashboard/page.tsx
style={{ animationDelay: `${index * 75}ms` }}
className="animate-fade-in-up"
```

Defined in `app/globals.css`. Do not add new animation utilities — use this one.

---

## 8. Modal Checklist

Before building any modal, confirm:
- [ ] Using `<Modal />` from `lib/ui.tsx` (not a custom overlay)
- [ ] z-index is `z-50` (NameModal is `z-[100]` — special case, do not copy)
- [ ] Destructive actions use 2-step confirm pattern
- [ ] Type-to-confirm for irreversible deletes (see `DeletePropertyModal`)
- [ ] Close button handled by `Modal` component (not added manually)

---

## 9. Known Inconsistencies (Fix On Touch)

When you edit any of these files, fix the inconsistency in the same PR. Do not introduce new instances.

| ID | Issue | Files |
|----|-------|-------|
| INC-1 | Local `inputClass` redefinition | `screening/apply/[token]/page.tsx`, `screening/client.tsx`, `tenant/join/[token]/page.tsx` |
| INC-2 | Inline spinners | 26 instances across codebase — replace with `<Spinner />` |
| INC-3 | Inline primary button classes | 40+ instances — replace with `buttonClass` |
| INC-5 | Inline form styles in `DocumentUploadModal` | Replace with `inputClass`/`selectClass` imports |
| INC-6 | Inline card class variants | 184 instances — replace with `cardClass` |
| INC-7 | Local `fmtDate()` definitions | Multiple page files — replace with `lib/utils.ts` import |

Fix these **on touch** — when you're already editing the file. Do not leave new instances.

---

*Regenerate this file: `npm run update-ui-docs`*

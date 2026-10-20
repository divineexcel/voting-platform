# Extractable UI patterns

No shared UI component directory currently exists. Entries below are extraction candidates embedded in the named page sources, not already reusable exported components. RootLayout is the only existing shared exported layout. Keep labels, icon choices, CSS and product identity fixed in each extracted design; expose only changing state/navigation/count values. Full root and local header source appear in `layouts.md`; shared status CSS appears in `theme.md`.

## Layout components

### RootLayout
- Source: `src/app/layout.js`
- Category: layout
- Description: Global HTML/body wrapper, font variables and pale green backdrop.
- Extractable props: none for design-state navigation; React children is the implementation slot.
- Hardcoded: language, metadata, font declarations, favicon reference, all CSS classes.

### PortalHeader
- Source: `src/app/page.js` (`renderHeader`) and `src/app/admin/page.js` (`renderHeader`)
- Category: layout
- Description: Duplicated ApexVote brand header, user identity/role and sign-out control.
- Extractable props: `isAdmin` (boolean, default false); `isSuperAdmin` (boolean, default false); `homeHref` (string, default `/`).
- Hardcoded: existing Vote icon/product wordmark, role label text variants, LogOut icon, all CSS. A real school logo has not been supplied.

### AdminTaskTabs
- Source: `src/app/admin/page.js` (Inner Admin Navigation Tabs block)
- Category: layout
- Description: Wrap-capable results, codes, students, applications and subadmin task selector.
- Extractable props: `activeItem` (string, default `results`), `showSubadmins` (boolean, default false), `badgeCount` (number, default 0).
- Hardcoded: tab IDs/labels/icons, green active treatment, all CSS.

### StudentTaskNavigation
- Source: `src/app/page.js` (Welcome Banner Card)
- Category: layout
- Description: Ballot/candidacy state navigation inside welcome panel.
- Extractable props: `activeItem` (string, default `ballot`).
- Hardcoded: existing two labels, button styles and welcome illustration. Live results is an approved future view, not existing implementation.

## Basic components

### PrimaryButton
- Source: `src/app/page.js`, `src/app/admin/page.js` (repeated native buttons)
- Category: basic
- Description: Forest green action control with pending and disabled state.
- Extractable props: `isLoading` (boolean, default false), `isDisabled` (boolean, default false).
- Hardcoded: each extracted variant's action label, icon and CSS; do not turn every visual value into a prop.

### FormField
- Source: `src/app/page.js`, `src/app/admin/page.js` (inline labels and native controls)
- Category: basic
- Description: Repeated pale input with green focus styling; label associations require implementation improvement.
- Extractable props: `isInvalid` (boolean, default false), `isDisabled` (boolean, default false).
- Hardcoded: field-specific label, placeholder and icon per variant, control geometry and CSS.

### StatusBadge
- Source: `src/app/page.js` (My Candidacy History), `src/app/admin/page.js` (candidate registry)
- Category: basic
- Description: Text and color pending/approved/rejected application state.
- Extractable props: `status` (string, default `pending`).
- Hardcoded: state text variants, Check icon and `.badge-*` styling.

### StatusMessage
- Source: `src/app/page.js`, `src/app/admin/page.js` (message banners)
- Category: basic
- Description: Success/error notification with an icon and plain-language action outcome.
- Extractable props: `isError` (boolean, default false), `isVisible` (boolean, default false).
- Hardcoded: icon variants and CSS; generate target-specific message variants without real student data.

### MetricCard
- Source: `src/app/admin/page.js` (Statistics Metric Cards Grid)
- Category: basic
- Description: Compact operational count card.
- Extractable props: `count` (number, default 0).
- Hardcoded: each metric label/icon and CSS; turnout requires its factual denominator and must not be invented.

### CandidateOption
- Source: `src/app/page.js` (Candidates List Inside Accordion)
- Category: basic
- Description: Candidate identity, manifesto and ballot action.
- Extractable props: `isSelected` (boolean, default false), `isSubmitted` (boolean, default false), `isDisabled` (boolean, default false).
- Hardcoded: equal visual structure, control label variants, CSS. Baseline My Choice rendering is incompatible with the proposed durable choice-private receipt model and must not survive unchanged.

### VoteReview
- Source: `src/app/page.js` (Voting confirmation Modal)
- Category: basic
- Description: Final review with cancel/confirm before accepting a ballot.
- Extractable props: `isOpen` (boolean, default false), `isSubmitting` (boolean, default false).
- Hardcoded: finality copy, control labels, ShieldAlert icon and CSS; candidate/office content supplied only for review, never a durable receipt.

## Future components absent from baseline
LiveResults, ConnectionStatus, ResultsTable, accessible dialog focus handling and reusable AdminDataTable are approved design/implementation candidates but have no baseline reusable component source. Do not represent them as extracted source components before they exist.

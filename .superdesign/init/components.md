> Historical context: pre-upgrade UI source used for the baseline draft. The implemented interface now uses shared components in `src/components/`; refresh this context before future source-based design generation.

# Shared UI components — baseline source discovery

Framework: Next.js 14 App Router, React 18, JavaScript JSX. Icons: `lucide-react`. Styling: Tailwind CSS 4 through `@tailwindcss/postcss`, plus `src/app/globals.css`. There is no installed component library, no `src/components/` directory, and no separately exported shared UI primitives. All buttons, fields, cards, badges, alerts, tabs and confirmation overlay are currently inline in two client page files. There are therefore no shared primitive source files to dump. Do not mistake proposed components for existing implementations.

## Existing inline patterns

| Pattern | Actual source | Existing implementation |
| --- | --- | --- |
| Action buttons and input fields | `src/app/page.js`, `src/app/admin/page.js` | Native elements with repeated Tailwind class strings; no reusable props contract |
| Application status badge | Both page files | Conditional inline spans using `.badge-pending`, `.badge-approved`, `.badge-rejected` |
| Success/error notice | Both page files | Conditional div with Lucide status icon and message text; no shared component |
| Loading state | Both page files | Inline `Loader2`, loading copy, full-screen wrapper |
| Candidate rows / vote review | `src/app/page.js` | Inline ballot/candidate rendering and modal |
| Metric cards / results / admin tables | `src/app/admin/page.js` | Inline mapped cards, bars and native tables |

The actual shared CSS implementations are reproduced in `theme.md`; the actual shared root layout is reproduced in `layouts.md`. The complete page files are the source of truth for inline controls and should be passed selectively as context under the design payload budget.

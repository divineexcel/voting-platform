# Baseline theme — actual implemented values

## Part 1: compact token summary

- Canvas `--bg-dark: #f3f6f5`; card `--bg-card: #ffffff`; border `--border-glass: rgba(15,90,71,.08)`.
- Text `--text-primary: #1f2937`; secondary `--text-secondary: #4b5563`.
- Primary `--brand-green` and misleading legacy `--accent-indigo`: `#0F5A47`; hover `--brand-green-hover: #0a4133`.
- Mint `--brand-mint: #e6f2ed`; hover `--brand-mint-hover: #d5e9e0`.
- Accents: `--accent-cyan: #0d9488`, `--accent-emerald: #10b981`, `--accent-rose: #ef4444`.
- Status badges: pending background/text/border `#fef3c7 / #d97706 / #fde68a`; approved `#d1fae5 / #059669 / #a7f3d0`; rejected `#fee2e2 / #dc2626 / #fecaca`.
- No `.dark`, `[data-theme]`, theme provider or dark palette exists.
- Fonts: Next font variables `--font-outfit`, `--font-inter`; body currently prefers Outfit then Inter then system sans. Root HTML declares both. UI uses Tailwind weights light, medium, semibold, bold and extrabold.
- Observed type utilities: arbitrary 10px/11px labels, `text-xs` 12px, `text-sm` 14px, `text-lg` 18px, `text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px (Tailwind defaults, no local overrides). Current small instruction text is an audit issue, not a design recommendation.
- Spacing uses Tailwind's default 4px utility base; common 8,12,16,24,32px, plus half-step controls. Gutters 16px base /24px `sm` /32px `lg`; root header 64px; main max-width `max-w-7xl` (80rem).
- Radius: `rounded-lg` 8px, `rounded-xl` 12px, `rounded-2xl` 16px, `rounded-3xl` 24px, `rounded-full` pills (Tailwind defaults). White panels widely use 24px.
- Glass-panel shadow: `0 4px 20px -2px rgba(15,90,71,.04), 0 2px 8px -1px rgba(15,90,71,.02)`; hover `0 10px 25px -5px rgba(15,90,71,.08), 0 8px 10px -6px rgba(15,90,71,.04)` plus `translateY(-2px)`.
- Breakpoints used: Tailwind default `sm` 40rem, `md` 48rem, `lg` 64rem. No local breakpoint overrides. Existing pages use one/two-column student cards, two/four-column admin stats, wrapping tabs.
- Motion: float 6s infinite ±8px; pulse-slow 4s infinite opacity .1–.25; hover 300ms cubic-bezier(.4,0,.2,1). JSX references `animate-fadeIn` / `animate-scaleIn`, but no matching custom CSS definitions exist. No explicit reduced-motion override in baseline CSS.
- No `tailwind.config.*` exists. Tailwind v4 is loaded with `@import "tailwindcss"`; no `@theme` customization. Proposed audit design tokens are separately documented in `outputs/voting-platform-audit/design-system.md` and must not be confused with actual implementation.

## Part 2: complete raw source

### `src/app/globals.css`

```css
@import "tailwindcss";

@layer base {
  :root {
    --bg-dark: #f3f6f5; /* Light gray-green background */
    --bg-card: #ffffff; /* Clean white card background */
    --border-glass: rgba(15, 90, 71, 0.08); /* Soft brand border */
    --text-primary: #1f2937; /* Dark charcoal text */
    --text-secondary: #4b5563; /* Slate gray text */
    --accent-indigo: #0F5A47; /* Primary brand forest green */
    --accent-cyan: #0d9488; /* Accent teal */
    --accent-emerald: #10b981; /* Status green */
    --accent-rose: #ef4444; /* Status red */

    /* Brand-specific variables */
    --brand-green: #0F5A47;
    --brand-green-hover: #0a4133;
    --brand-mint: #e6f2ed;
    --brand-mint-hover: #d5e9e0;
  }
}

body {
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: var(--font-outfit), var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 90, 71, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(15, 90, 71, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 90, 71, 0.4);
}

/* Glassmorphism Styles (adapted to soft light shadows) */
.glass-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  box-shadow: 0 4px 20px -2px rgba(15, 90, 71, 0.04), 0 2px 8px -1px rgba(15, 90, 71, 0.02);
}

.glass-panel-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-panel-hover:hover {
  border-color: rgba(15, 90, 71, 0.15);
  box-shadow: 0 10px 25px -5px rgba(15, 90, 71, 0.08), 0 8px 10px -6px rgba(15, 90, 71, 0.04);
  transform: translateY(-2px);
}

/* Text Gradients */
.text-gradient-indigo-cyan {
  background: linear-gradient(135deg, #0F5A47 0%, #0d9488 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.text-gradient-rose-orange {
  background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Animations */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.25; }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}

/* Custom badges */
.badge-pending {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}

.badge-approved {
  background: #d1fae5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-rejected {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Background Gradients (adapted to clean green-mesh light theme) */
.bg-gradient-mesh {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -10;
  overflow: hidden;
  background: #f3f6f5;
}

.bg-gradient-mesh::before {
  content: "";
  position: absolute;
  top: -10%;
  left: -5%;
  width: 55%;
  height: 55%;
  background: radial-gradient(circle, rgba(15, 90, 71, 0.08) 0%, rgba(15, 90, 71, 0) 70%);
  filter: blur(60px);
  pointer-events: none;
}

.bg-gradient-mesh::after {
  content: "";
  position: absolute;
  bottom: -5%;
  right: -5%;
  width: 45%;
  height: 45%;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.06) 0%, rgba(13, 148, 136, 0) 70%);
  filter: blur(60px);
  pointer-events: none;
}
```

### `postcss.config.js`

```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

### Font loader / root theme application
The complete `src/app/layout.js` is copied once in `layouts.md`. No other theme provider or token file exists.

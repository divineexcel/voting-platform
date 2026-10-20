# Routes and framework configuration

Next.js App Router derives paths from `src/app`; no explicit router config file exists. All UI uses `src/app/layout.js` and `src/app/globals.css`. `useRouter` comes from `next/navigation`.

| URL | Entry file | Root layout | Rendered states |
| --- | --- | --- | --- |
| `/` | `src/app/page.js` (`Home`, client) | `src/app/layout.js` | Session loader; student login and registration; student ballot dashboard with expandable position/candidate rows; candidacy requirements/form/history; vote confirmation overlay. Nonstudent sessions redirect to `/admin`. |
| `/admin` | `src/app/admin/page.js` (`AdminPortal`, client) | `src/app/layout.js` | Session loader; admin login; dashboard metrics; results, codes, applications, students, subadmin tabs. Student sessions redirect to `/`. |

## Client state navigation
- `/`: `authView` = `login` or `register`; `selectedPosition` = null for ballot or `apply` for candidacy; `applyStep` = 1 or 2; `expandedPositionId` controls one candidate accordion; `voteConfirmation.isOpen` controls overlay.
- `/admin`: `adminActiveTab` = `results`, `codes`, `applications`, `students`, `subadmins`. The final tab is shown only for `user.role === 'admin'`; server authorization must remain authoritative.

## API routes (data, not navigable UI)
- `/api/admin/candidates` → `src/app/api/admin/candidates/route.js`
- `/api/admin/codes` → `src/app/api/admin/codes/route.js`
- `/api/admin/results` → `src/app/api/admin/results/route.js`
- `/api/admin/students` → `src/app/api/admin/students/route.js`
- `/api/admin/subadmins` → `src/app/api/admin/subadmins/route.js`
- `/api/auth/login` → `src/app/api/auth/login/route.js`
- `/api/auth/logout` → `src/app/api/auth/logout/route.js`
- `/api/auth/me` → `src/app/api/auth/me/route.js`
- `/api/auth/register` → `src/app/api/auth/register/route.js`
- `/api/candidates/apply` → `src/app/api/candidates/apply/route.js`
- `/api/positions` → `src/app/api/positions/route.js`
- `/api/votes/cast` → `src/app/api/votes/cast/route.js`

## Module alias configuration
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Package manifest
```json
{
  "name": "voting-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test --test-concurrency=1 tests/*.test.js",
    "check": "node scripts/check-source.js",
    "bootstrap": "node scripts/bootstrap-admin.js",
    "verify:api": "node verify-api.js"
  },
  "dependencies": {
    "next": "16.4.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "sqlite": "^5.1.1",
    "sqlite3": "6.0.1",
    "lucide-react": "^0.379.0"
  },
  "devDependencies": {
    "postcss": "^8.4.38",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  },
  "type": "module",
  "engines": {
    "node": ">=22.13 <25"
  }
}
```

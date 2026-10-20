> Historical context: pre-upgrade UI source used for the baseline draft. The implemented interface now uses shared components in `src/components/`; refresh this context before future source-based design generation.

# Layout implementations

## RootLayout
- Source: `src/app/layout.js`
- Export: `RootLayout({ children })`
- Shared by both `/` and `/admin`; loads font variables and global CSS, metadata, favicon reference and decorative background. No shared navigation, sidebar, footer or breadcrumb component exists.

```jsx
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'ApexVote | Premium Student Voting Platform',
  description: 'Secure, modern, and transparent voting platform for secondary school students.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased min-h-screen text-slate-900 bg-[#f3f6f5]">
        <div className="bg-gradient-mesh" />
        {children}
      </body>
    </html>
  );
}
```

## Student header — page-local extraction candidate
Source: `src/app/page.js`. The following is the complete local `renderHeader` function, not a separately exported layout. Captures `user` and `handleLogout` from its page. Brand and sign-out controls; identity hidden below `md`.

```jsx
  const renderHeader = () => (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0F5A47] rounded-xl shadow-sm">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-wider text-slate-800">
            APEX<span className="text-[#0F5A47]">VOTE</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 mt-0.5 rounded-full bg-[#e6f2ed] text-[#0F5A47] border border-[#0F5A47]/10 capitalize">
              Student Voter
            </span>
          </div>

          <div className="w-[1px] h-8 bg-gray-200 hidden md:block" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-100 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
```

## Administrator header — page-local extraction candidate
Source: `src/app/admin/page.js`. The following is the complete local `renderHeader` function. Duplicates student header; captures `user` and `handleLogout` and changes role label.

```jsx
  const renderHeader = () => (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0F5A47] rounded-xl shadow-sm">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-wider text-slate-800">
            APEX<span className="text-[#0F5A47]">VOTE</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 mt-0.5 rounded-full bg-[#e6f2ed] text-[#0F5A47] border border-[#0F5A47]/10 capitalize">
              {user.role === 'admin' ? 'Super Admin' : 'Admin Officer'}
            </span>
          </div>

          <div className="w-[1px] h-8 bg-gray-200 hidden md:block" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-100 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
```

## Inline dashboard wrappers
Both page functions use `min-h-screen flex flex-col bg-[#f3f6f5]`, with a main container `flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8`. Authentication is a separate centered max-width card state within each same route. Navigation between student ballot/application or administrator tasks is client state rather than URL routes. There is no standalone layout file for these wrappers.

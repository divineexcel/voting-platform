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

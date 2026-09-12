import { cn } from '@repo/design-system/lib/utils';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

/**
 * IBM Plex Sans/Mono (ADR-DS-001 Required Change #3 — the Blueprint's
 * specified typeface, replacing Geist). Loaded once here — the single
 * point of change for every import site (apps/api, apps/web, apps/app's
 * layouts/global-errors) — via next/font/google, which self-hosts the
 * font files at build time (no runtime request to Google Fonts).
 * `variable` names match what packages/design-system/styles/globals.css's
 * `@theme inline` block reads (`--font-sans`/`--font-mono`).
 */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const fonts = cn(
  ibmPlexSans.variable,
  ibmPlexMono.variable,
  'touch-manipulation font-sans antialiased'
);

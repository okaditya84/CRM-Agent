// Next.js 16 "proxy" convention (formerly middleware). next-intl's locale
// negotiation runs here: it redirects "/" to the best locale and rewrites
// locale-prefixed paths.
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except API routes, Next internals, and files with extensions.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

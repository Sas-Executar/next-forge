/**
 * Clerk middleware for apps/api (M08-T03). Every route here before now
 * was either unauthenticated (webhooks verify their own provider
 * signature instead) or gated by CRON_SECRET (the cron routes) — none
 * needed a signed-in user's identity. /notifications/register-device is
 * the first route that does: it's called by apps/mobile with a Clerk
 * session token in the Authorization header, and clerkMiddleware() is
 * what makes auth() resolve that Bearer token for a native/non-browser
 * request (Clerk's own documented behavior for native clients, not
 * just cookie-based browser sessions) — `export default clerkMiddleware`
 * with no callback is Clerk's own simplest documented form.
 */
export { authMiddleware as default } from "@repo/auth/proxy";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

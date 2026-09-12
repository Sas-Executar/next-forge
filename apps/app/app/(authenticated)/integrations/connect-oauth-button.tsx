"use client";

import { Button } from "@repo/design-system/components/ui/button";

/**
 * A plain link to the OAuth connect route, not a server action — the
 * browser needs to actually navigate (redirect to Google/Microsoft's
 * consent screen), which a fetch-based server action can't do.
 */
export const ConnectOAuthButton = ({
  href,
  label,
}: {
  readonly href: string;
  readonly label: string;
}) => (
  <Button asChild size="sm" type="button">
    <a href={href}>{label}</a>
  </Button>
);

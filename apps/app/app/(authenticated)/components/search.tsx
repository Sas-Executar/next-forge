import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { ArrowRightIcon, SearchIcon } from "lucide-react";

/**
 * M16-T04 (accessibility pass): both interactive elements previously had
 * no accessible name — a placeholder is not a substitute for a `<label>`
 * (it disappears on input and most screen readers don't announce it
 * consistently), and the icon-only submit button had neither visible
 * text nor `aria-label`. Fixed with a visually-hidden label + sr-only
 * button text, matching the sr-only pattern this repo already uses for
 * other icon-only buttons (mode-toggle.tsx, sidebar.tsx's
 * SidebarTrigger, language-switcher.tsx).
 */
export const Search = () => (
  <form action="/search" className="flex items-center gap-2 px-4">
    <div className="relative">
      <Label className="sr-only" htmlFor="global-search">
        Search
      </Label>
      <div className="absolute top-px bottom-px left-px flex h-8 w-8 items-center justify-center">
        <SearchIcon className="text-muted-foreground" size={16} />
      </div>
      <Input
        className="h-auto bg-background py-1.5 pr-3 pl-8 text-xs"
        id="global-search"
        name="q"
        placeholder="Search"
        type="text"
      />
      <Button
        className="absolute top-px right-px bottom-px h-8 w-8"
        size="icon"
        variant="ghost"
      >
        <ArrowRightIcon className="text-muted-foreground" size={16} />
        <span className="sr-only">Submit search</span>
      </Button>
    </div>
  </form>
);

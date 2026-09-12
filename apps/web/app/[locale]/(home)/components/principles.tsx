import type { Dictionary } from "@repo/internationalization";
import { ShieldCheck } from "lucide-react";

interface PrinciplesProps {
  dictionary: Dictionary;
}

/**
 * Replaces the stock Next Forge "Testimonials" section (M14-T01) — that
 * component quoted real, named people (Next Forge's own maintainers)
 * as though they were EXECUTAR customers, alongside their real GitHub
 * avatars. EXECUTAR has no real customer quotes yet (pre-launch,
 * Trial-only per PRICING-001) — fabricating attributed testimonials
 * would misrepresent both the product and the people misappropriated
 * for it. This shows the product's own real, already-implemented
 * invariants instead (packages/domain's canTransitionTask, packages/
 * routines' AuthorityGate, packages/mcp's AGENT-actor guard) — true
 * claims, not marketing quotes from nobody.
 */
export const Principles = ({ dictionary }: PrinciplesProps) => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col gap-10">
        <h2 className="text-left font-regular text-3xl tracking-tighter md:text-5xl lg:max-w-xl">
          {dictionary.web.home.principles.title}
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {dictionary.web.home.principles.items.map((item) => (
            <div
              className="flex flex-col gap-4 rounded-md bg-muted p-6"
              key={item.title}
            >
              <ShieldCheck className="h-8 w-8 stroke-1" />
              <div className="flex flex-col gap-1">
                <h3 className="text-xl tracking-tight">{item.title}</h3>
                <p className="text-base text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

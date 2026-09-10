"use client";

import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import {
  AnchorIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  FolderIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  MapIcon,
  PlugIcon,
  PrinterIcon,
  RepeatIcon,
  SunIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "./search";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
}

/*
 * SPEC-WORKSPACE-001 §1 Route Model, in the order given there. Only
 * routes that exist today (M04 + M05 + M06 + M07 + M10 + M11) are
 * linked — /scanner and /projects/:projectId/documents belong to later
 * milestones (M08/M09) and aren't real pages yet, so they're
 * deliberately not listed here rather than added as dead links.
 * /integrations (M11) and /settings/billing (M13) aren't in
 * SPEC-WORKSPACE-001's route list at all (the Blueprint has no
 * settings/integrations or settings/billing surface named anywhere) —
 * code-owned additions, since PRD-OMNI-001's connections and
 * PRICING-001's plans both need somewhere for a human to actually act on
 * them.
 */
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Agora", url: "/now", icon: ZapIcon },
    { title: "Sprint", url: "/sprint", icon: GaugeIcon },
    { title: "Hoje", url: "/today", icon: SunIcon },
    { title: "Amanhã", url: "/tomorrow", icon: ArrowRightIcon },
    { title: "Ontem", url: "/yesterday", icon: ArrowLeftIcon },
    { title: "Projetos", url: "/projects", icon: FolderIcon },
    { title: "Visão Geral", url: "/overview", icon: LayoutDashboardIcon },
    { title: "Roadmap", url: "/roadmap", icon: MapIcon },
    { title: "Calendário", url: "/calendar", icon: CalendarIcon },
    { title: "Copiloto", url: "/copilot", icon: BotIcon },
    { title: "Mapa-OS", url: "/mapa-os", icon: PrinterIcon },
    { title: "Reports", url: "/reports", icon: FileTextIcon },
    { title: "Automações", url: "/automations", icon: RepeatIcon },
    { title: "Workflows", url: "/workflows", icon: WorkflowIcon },
    { title: "Integrações", url: "/integrations", icon: PlugIcon },
    { title: "Cobrança", url: "/settings/billing", icon: CreditCardIcon },
  ],
  navSecondary: [
    {
      title: "Webhooks",
      url: "/webhooks",
      icon: AnchorIcon,
    },
  ],
};

export const GlobalSidebar = ({ children }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  "h-[36px] overflow-hidden transition-all [&>div]:w-full",
                  sidebar.open ? "" : "-mx-1"
                )}
              >
                <OrganizationSwitcher
                  afterSelectOrganizationUrl="/"
                  hidePersonal
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <Search />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: "flex overflow-hidden w-full",
                    userButtonBox: "flex-row-reverse",
                    userButtonOuterIdentifier: "truncate pl-0",
                  },
                }}
                showName
              />
              <div className="flex shrink-0 items-center gap-px">
                <ModeToggle />
                <Button
                  asChild
                  className="shrink-0"
                  size="icon"
                  variant="ghost"
                >
                  <div className="h-4 w-4">
                    <NotificationsTrigger />
                  </div>
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </>
  );
};

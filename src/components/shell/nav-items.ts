/**
 * Shared navigation data for the desktop sidebar AND the mobile drawer.
 *
 * The mobile drawer used to carry its own hardcoded list of 11 links —
 * out of ~226 routes, eight of them sharing a single generic icon — so
 * phone users could reach a tenth of the app, and the two lists were
 * free to drift apart with nothing to catch it. CLAUDE.md notes most
 * SEOs check rankings on a phone, which made that the wrong place to
 * cut corners.
 *
 * One definition, two renderers.
 */

import { VIEWER_PAGES } from "@/lib/permissions";
import {
  PenLine,
  Activity,
  Bot,
  Building,
  ClipboardList,
  FileDown,
  FileSignature,
  FileStack,
  Gauge,
  GitCompare,
  GitMerge,
  Globe,
  BookOpen,
  GraduationCap,
  History,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  Link2,
  ListChecks,
  MapPin,
  Megaphone,
  Network,
  Newspaper,
  Plug,
  Receipt,
  ScanText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Opens in a new tab and is never treated as the current page.
   *
   * For a link to a tool outside this app. No entry uses it today:
   * writing, the one that did, now lives here at /content.
   */
  external?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  /** Pinned groups are always visible and not collapsible. */
  pinned?: boolean;
  /** Default-expanded if true; otherwise collapsed by default. */
  defaultOpen?: boolean;
  items: NavItem[];
};


// Sections follow the order an SEO agency works in: win the client, set
// them up, audit, plan, produce, deliver, then follow up every month.
// Every page stays reachable; only the grouping says where it fits.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "essentials",
    title: "Essentials",
    pinned: true,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/tasks", label: "Tasks", icon: ListChecks },
      { href: "/seo-chat", label: "SEO chat", icon: Bot },
    ],
  },
  {
    id: "prospecting",
    title: "1. Prospecting & sales",
    items: [
      { href: "/leads", label: "Leads", icon: Inbox },
      { href: "/grader", label: "Instant audit", icon: Sparkles },
      { href: "/compare", label: "Site compare", icon: GitCompare },
      { href: "/proposals", label: "Proposals", icon: FileSignature },
    ],
  },
  {
    id: "onboarding",
    title: "2. Client setup",
    items: [
      { href: "/connect", label: "Connect accounts", icon: Plug },
      { href: "/import", label: "Import (all sources)", icon: ScanText },
    ],
  },
  {
    id: "audit",
    title: "3. Audit & diagnosis",
    items: [
      { href: "/audits", label: "Audits", icon: ClipboardList },
      { href: "/cwv", label: "Core Web Vitals", icon: Gauge },
      { href: "/broken-links", label: "Broken links", icon: Link2 },
      { href: "/cannibalization", label: "Cannibalization", icon: GitMerge },
    ],
  },
  {
    id: "strategy",
    title: "4. Strategy & keywords",
    items: [
      { href: "/keywords", label: "Tracked keywords", icon: Search },
      { href: "/competitors", label: "Competitors", icon: Network },
      { href: "/brand-monitor", label: "Brand visibility", icon: Network },
      { href: "/serp-scans", label: "SERP scans archive", icon: Globe },
    ],
  },
  {
    id: "content",
    title: "5. Content production",
    items: [
      // BlogPilot's writing pipeline, ported in (src/lib/content-studio).
      { href: "/content", label: "Writing", icon: PenLine },
      { href: "/title-tests", label: "Title A/B tests", icon: Wand2 },
      { href: "/meta-rewrite", label: "Meta rewrite batch", icon: Wand2 },
    ],
  },
  {
    id: "backlinks",
    title: "6. Link building",
    items: [
      { href: "/backlinks", label: "Backlinks", icon: Link2 },
      { href: "/link-building", label: "Link building", icon: Link2 },
      { href: "/outreach", label: "Outreach", icon: Send },
    ],
  },
  {
    id: "local",
    title: "7. Local SEO",
    items: [
      { href: "/gbp", label: "Google Business Profile", icon: Building },
      { href: "/citations", label: "Citations", icon: MapPin },
      { href: "/local-rank", label: "Local rank tracker", icon: MapPin },
      { href: "/local-grid", label: "Local rank heatmap", icon: MapPin },
    ],
  },
  {
    id: "paid-ads",
    title: "8. Paid ads",
    defaultOpen: true,
    items: [
      // The ⭐ marks this as the newest / most-recommended entry —
      // matches the same treatment on /tools and the per-client launcher.
      {
        href: "/tools/ads-funnel",
        label: "Ad Funnel Architect ⭐",
        icon: Megaphone,
      },
      { href: "/tools/branded-split", label: "Branded vs non-branded", icon: Target },
    ],
  },
  {
    id: "delivery",
    title: "9. Delivery & reporting",
    items: [
      { href: "/reports", label: "Reports", icon: FileDown },
      { href: "/reports/batch", label: "Generate all reports", icon: FileStack },
      { href: "/reports/archive", label: "Report archive", icon: FileDown },
      { href: "/automations", label: "Automations", icon: Workflow },
      { href: "/digest", label: "Weekly digest", icon: Send },
    ],
  },
  {
    id: "monitoring",
    title: "10. Monthly follow-up",
    items: [
      { href: "/monitor", label: "Page monitor", icon: Activity },
      { href: "/snapshots", label: "Snapshots", icon: ImageIcon },
      { href: "/ai-visibility", label: "AI visibility tracker", icon: Sparkles },
      { href: "/chats", label: "AI chat history", icon: Bot },
      { href: "/history", label: "Tool run history", icon: History },
      { href: "/algorithm-updates", label: "Algorithm updates", icon: History },
      { href: "/news", label: "SEO news", icon: Newspaper },
    ],
  },
  {
    id: "agency",
    title: "11. Running the agency",
    items: [
      { href: "/morning", label: "Morning briefing", icon: Activity },
      { href: "/agent", label: "AI agent", icon: Bot },
      // Guided, because "what is this thing doing to my sites while I'm
      // not looking" is a question a beginner needs answered more
      // urgently than an expert does — and the answer, including the
      // undo button, is on this page.
      { href: "/agent/autopilot", label: "Autopilot", icon: ShieldCheck },
      { href: "/capacity", label: "Capacity", icon: Gauge },
      { href: "/activity", label: "Activity log", icon: History },
      { href: "/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    id: "account",
    title: "Account",
    pinned: true,
    items: [
      { href: "/welcome", label: "Get started", icon: Sparkles },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/docs", label: "Docs", icon: BookOpen },
      { href: "/learn", label: "Learn", icon: GraduationCap },
      { href: "/knowledge", label: "Knowledge hub", icon: GraduationCap },
    ],
  },
];

/**
 * The sidebar: seven entries, the agency's own level. Everything else in
 * NAV_GROUPS (some fifty pages, one per tool family) is in the tool
 * catalogue (Settings → Tools, lib/tool-catalog.ts) and found by the
 * search palette. The sidebar used to show all of it, numbered as if it
 * were a circuit, which hid the places a working day actually goes through.
 */
const MAIN_HREFS = ["/", "/clients", "/audits", "/tasks", "/reports", "/leads", "/settings"];

export function mainNavForRole(role: string | null | undefined): NavGroup[] {
  if (role === "viewer") return navGroupsForRole(role);
  const all = NAV_GROUPS.flatMap((g) => g.items);
  return [
    {
      id: "main",
      title: "Agency",
      pinned: true,
      items: MAIN_HREFS.map((h) => all.find((it) => it.href === h)).filter(
        (it): it is NavItem => Boolean(it),
      ),
    },
  ];
}

/** Every nav item, flattened — used by the mobile drawer's filter. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Same list middleware enforces, so the nav never offers a page that
// would bounce a viewer home.
const VIEWER_HREFS = new Set<string>(VIEWER_PAGES);

/**
 * Client viewers (role `viewer`) only see assigned clients in data queries;
 * the nav should not advertise admin surfaces they cannot use.
 */
export function navGroupsForRole(role: string | null | undefined): NavGroup[] {
  if (role !== "viewer") return NAV_GROUPS;

  const items = NAV_GROUPS.flatMap((g) => g.items).filter(
    (it) => !it.external && VIEWER_HREFS.has(it.href),
  );

  return [
    {
      id: "viewer",
      title: "Your workspace",
      pinned: true,
      items,
    },
  ];
}

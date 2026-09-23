import type {NavigationItem} from "@miqo/ui";

export const ADMIN_NAVIGATION: ReadonlyArray<NavigationItem> = [
  {label: "Dashboard", href: "/"},
  {label: "Cases", href: "/admin/cases"},
  {label: "Optimisation", href: "/admin/optimisation"},
  {label: "Scenarios", href: "/admin/scenarios"},
  {label: "Market Routes", href: "/admin/market-routes"},
  {label: "Quote Runs", href: "/admin/quote-runs"},
  {label: "Recommendation Sets", href: "/admin/recommendations"},
  {label: "Integrity", href: "/admin/integrity"},
  {label: "Discrepancies", href: "/admin/discrepancies"},
  {label: "Audit & Trace", href: "/admin/audit"},
  {label: "Providers", href: "/admin/providers"},
  {label: "Certification", href: "/admin/certification"},
  {label: "System", href: "/admin/system"},
];

export type DesktopRouteDisposition =
  | "IMPLEMENT"
  | "READ_ONLY"
  | "TRACE_DERIVED"
  | "DEFERRED"
  | "RESERVED"
  | "NOT_FOUND";

export interface DesktopRouteModel {
  readonly path: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly disposition: DesktopRouteDisposition;
}

const ROUTES: Readonly<Record<string, Omit<DesktopRouteModel, "path">>> = {
  "/": {
    title: "Admin Operations Overview",
    eyebrow: "Windows Admin",
    description: "Operational entry point for authoritative MIQOS evidence. Unsupported aggregates and customer actions remain unavailable.",
    disposition: "IMPLEMENT",
  },
  "/admin/cases": {
    title: "Cases",
    eyebrow: "Read-only foundation",
    description: "Exact profile and profile-version inspection is authorised. Global case listing and search remain deferred until an authoritative resource exists.",
    disposition: "READ_ONLY",
  },
  "/admin/optimisation": {
    title: "Optimisation",
    eyebrow: "Trace-derived foundation",
    description: "Open an exact selection to inspect persisted objective and optimisation lineage. Objective changes and optimisation mutations are not authorised.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/scenarios": {
    title: "Scenarios",
    eyebrow: "Trace-derived foundation",
    description: "Open an exact selection to inspect all persisted scenarios and O-class deltas in its authoritative trace. Scenario generation remains outside Desktop Admin authority.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/market-routes": {
    title: "Market Routes",
    eyebrow: "Trace-derived foundation",
    description: "Open an exact selection to inspect persisted route/provider/channel and quote lineage. Route execution and provider activation are not authorised.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/quote-runs": {
    title: "Quote Runs",
    eyebrow: "Read-only foundation",
    description: "Open an exact selection to inspect quote-request, raw-provider and normalised quotation evidence. Global quote-run listing and quote execution remain deferred.",
    disposition: "READ_ONLY",
  },
  "/admin/recommendations": {
    title: "Recommendation Sets",
    eyebrow: "Read-only foundation",
    description: "Open an exact selection to inspect persisted recommendation-set, explanation and evidence ordering. Desktop does not create, reorder or accept recommendations.",
    disposition: "READ_ONLY",
  },
  "/admin/integrity": {
    title: "Integrity",
    eyebrow: "Read-only foundation",
    description: "Open an exact selection to inspect persisted integrity and governance evidence. Desktop does not evaluate or override integrity.",
    disposition: "READ_ONLY",
  },
  "/admin/discrepancies": {
    title: "Discrepancies",
    eyebrow: "Read-only foundation",
    description: "Discrepancy evidence may be inspected. Factual correction and profile mutation remain outside Desktop Admin authority.",
    disposition: "READ_ONLY",
  },
  "/admin/audit": {
    title: "Audit & Trace",
    eyebrow: "Primary Admin workspace",
    description: "Append-only profile audit plus exact selection-linked decision-lineage reconstruction.",
    disposition: "READ_ONLY",
  },
  "/admin/providers": {
    title: "Providers",
    eyebrow: "Capability closure",
    description: "No authoritative global provider-status resource is admitted to Desktop Admin. Provider identity and route evidence remain available only inside exact persisted decision traces; activation and deactivation are prohibited.",
    disposition: "DEFERRED",
  },
  "/admin/certification": {
    title: "Certification",
    eyebrow: "Capability closure",
    description: "No authoritative certification-status resource is admitted to Desktop Admin. TEST/SYNTHETIC CI, packaging and identity proof are engineering evidence and must not be presented as production certification.",
    disposition: "DEFERRED",
  },
  "/admin/system": {
    title: "System",
    eyebrow: "Desktop diagnostics",
    description: "Safe build, runtime and deployment-profile identity for support and operational verification.",
    disposition: "IMPLEMENT",
  },
};

export function normaliseDesktopPath(pathname: string) {
  const raw = pathname.trim() || "/";
  const withoutQuery = raw.split(/[?#]/, 1)[0] || "/";
  if (withoutQuery === "/index.html") return "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) return withoutQuery.slice(0, -1);
  return withoutQuery;
}

export function resolveDesktopRoute(pathname: string): DesktopRouteModel {
  const path = normaliseDesktopPath(pathname);
  const known = ROUTES[path];
  if (known) return {path, ...known};

  if (/^\/admin\/profiles\/[^/]+$/.test(path)) {
    return {
      path,
      title: "Profile Inspection",
      eyebrow: "Read-only evidence",
      description: "Exact profile evidence route. DB-G2 establishes routing only; authoritative profile loading is delivered in the core evidence gateway.",
      disposition: "READ_ONLY",
    };
  }

  if (/^\/admin\/profile-versions\/[^/]+$/.test(path)) {
    return {
      path,
      title: "Profile Version Inspection",
      eyebrow: "Read-only evidence",
      description: "Exact profile-version evidence route. No factual mutation is authorised.",
      disposition: "READ_ONLY",
    };
  }

  if (/^\/admin\/selections\/[^/]+\/trace$/.test(path)) {
    return {
      path,
      title: "Selection Trace",
      eyebrow: "Read-only lineage",
      description: "Exact selection-lineage route presenting authoritative scenario, route, quote, recommendation and integrity evidence.",
      disposition: "READ_ONLY",
    };
  }

  return {
    path,
    title: "Route not found",
    eyebrow: "Desktop navigation",
    description: "This path is not part of the frozen Desktop Admin information architecture.",
    disposition: "NOT_FOUND",
  };
}

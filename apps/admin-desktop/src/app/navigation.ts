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
    description: "Authoritative optimisation evidence may be presented from approved traces. Objective changes and optimisation mutations are not authorised.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/scenarios": {
    title: "Scenarios",
    eyebrow: "Trace-derived foundation",
    description: "Scenario evidence may be inspected when supplied by authoritative traces. Scenario generation remains outside Desktop Admin authority.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/market-routes": {
    title: "Market Routes",
    eyebrow: "Trace-derived foundation",
    description: "Market-route evidence is inspection-only. Route execution and provider activation are not authorised.",
    disposition: "TRACE_DERIVED",
  },
  "/admin/quote-runs": {
    title: "Quote Runs",
    eyebrow: "Read-only foundation",
    description: "Quote evidence may be inspected through approved trace composition. Global quote-run listing and quote execution remain deferred.",
    disposition: "READ_ONLY",
  },
  "/admin/recommendations": {
    title: "Recommendation Sets",
    eyebrow: "Read-only foundation",
    description: "Recommendation evidence is backend-owned and inspectable. Creation, reordering, acceptance and customer handoff are not authorised.",
    disposition: "READ_ONLY",
  },
  "/admin/integrity": {
    title: "Integrity",
    eyebrow: "Read-only foundation",
    description: "Integrity outcomes are rendered exactly as authoritative evidence supplies them. Desktop does not evaluate or override integrity.",
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
    description: "Foundation route for append-only audit and exact decision-lineage reconstruction. Deep evidence composition is implemented in later gateways.",
    disposition: "READ_ONLY",
  },
  "/admin/providers": {
    title: "Providers",
    eyebrow: "Reserved capability",
    description: "Provider status may be displayed only from authoritative evidence. Activation and deactivation remain separately governed.",
    disposition: "RESERVED",
  },
  "/admin/certification": {
    title: "Certification",
    eyebrow: "Reserved capability",
    description: "Certification evidence may be displayed when authoritative data exists. TEST/SYNTHETIC proof is not production certification.",
    disposition: "RESERVED",
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
      description: "Exact selection-lineage route. Deep trace composition is implemented in DB-G5.",
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

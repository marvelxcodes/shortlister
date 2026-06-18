import Link from "next/link";
import {
  Check,
  Rocket01 as Rocket,
  Stars02 as Sparkles,
  Building07 as Building,
  Lightning01 as Lightning,
  MessageCircle01 as MessageCircle,
  ArrowUpRight,
} from "@untitledui/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Pricing · Shortlister",
};

type Tier = {
  id: "starter" | "pro" | "enterprise";
  name: string;
  tagline: string;
  price: { amount: string; period?: string; note?: string };
  cta: { label: string; href: string };
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  features: { label: string; emphasis?: boolean }[];
};

const tiers: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Evaluate one role end-to-end. No card required.",
    price: { amount: "0", period: "/ month", note: "free forever" },
    cta: { label: "Start free", href: "/jobs/new" },
    icon: Rocket,
    features: [
      { label: "1 active role" },
      { label: "Up to 10 CVs per batch" },
      { label: "Semantic + skill-graph scoring" },
      { label: "Explainable ranking justifications" },
      { label: "Community support" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For recruiters running real cohorts every week.",
    price: { amount: "80", period: "/ month", note: "billed annually · save 12%" },
    cta: { label: "Upgrade to Pro", href: "/jobs/new" },
    icon: Sparkles,
    highlight: true,
    features: [
      { label: "Unlimited active roles", emphasis: true },
      { label: "Up to 50 CVs per batch", emphasis: true },
      { label: "Sub-60s processing SLA" },
      { label: "Delta-RAG tailored interview questions" },
      { label: "Bias audit + non-traditional surfacing" },
      { label: "Blind mode (mask name, school, employer)" },
      { label: "Embedding cache across roles" },
      { label: "Email support · 1 business day" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "On-prem inference, custom ontology, audit-grade compliance.",
    price: { amount: "Custom", note: "annual contract" },
    cta: { label: "Talk to sales", href: "/help" },
    icon: Building,
    features: [
      { label: "Everything in Pro" },
      { label: "Custom skill ontology + JD templates" },
      { label: "SSO (SAML / OIDC) + audit logs" },
      { label: "Self-hosted NIM deployment option" },
      { label: "Dedicated CSM + 24/7 support" },
      { label: "DPA, SOC 2, GDPR documentation" },
    ],
  },
];

const faqs = [
  {
    q: "What counts as an 'active role'?",
    a: "An open job description that is currently accepting candidates. Closed and archived roles never count toward your limit, even if you keep their shortlists for reference.",
  },
  {
    q: "How does the sub-60s SLA work?",
    a: "On Pro, batches of up to 50 CVs complete parse → embed → score → insights inside 60 seconds at the 95th percentile. If a batch breaches the SLA we credit it on the next invoice.",
  },
  {
    q: "Do you store our CVs?",
    a: "Parsed JSON lives in your Supabase project; raw uploads sit in Vercel Blob with 30-day TTL by default. Enterprise customers can route storage to their own S3 bucket.",
  },
  {
    q: "Can I downgrade or cancel?",
    a: "Yes — prorated at the period boundary. Your data and shortlists stay accessible read-only for 60 days after cancellation, in case you want to come back.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Plans & pricing"
        description="One price per recruiter. No per-CV charges, no per-seat traps. Cancel anytime."
        meta={
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-[rgba(14,46,30,0.04)] px-3 py-1 text-[11.5px] font-medium text-ink-2">
            <Lightning className="h-3 w-3 text-brand-700" />
            Annual billing saves 12% on Pro
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {tiers.map((tier) => (
          <PricingCard key={tier.id} tier={tier} />
        ))}
      </div>

      <ComparisonStrip />

      <FAQ />

      <ContactCard />
    </div>
  );
}

function PricingCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[20px] p-6 shadow-[var(--shadow-card)] transition",
        tier.highlight
          ? "bg-ink text-bg ring-1 ring-brand-400/40"
          : "glass",
      )}
    >
      {tier.highlight ? (
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-3 py-1 text-[11px] font-semibold text-ink shadow-[var(--shadow-brand)]">
          <Sparkles className="h-3 w-3" />
          Most popular
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-[10px]",
            tier.highlight
              ? "bg-white/10 text-bg"
              : "bg-brand-500/15 text-brand-700",
          )}
        >
          <Icon className="h-[16px] w-[16px]" />
        </span>
        <div
          className={cn(
            "text-[13.5px] font-semibold tracking-tight",
            tier.highlight ? "text-bg" : "text-ink",
          )}
        >
          {tier.name}
        </div>
      </div>

      <p
        className={cn(
          "mt-3 text-[12.5px]",
          tier.highlight ? "text-bg/70" : "text-muted",
        )}
      >
        {tier.tagline}
      </p>

      <div className="mt-6 flex items-end gap-1.5">
        {tier.price.amount === "Custom" ? (
          <span
            className={cn(
              "text-[40px] font-semibold leading-none tracking-tight",
              tier.highlight ? "text-bg" : "text-ink",
            )}
          >
            Let's talk
          </span>
        ) : (
          <>
            <span
              className={cn(
                "text-[16px] font-medium",
                tier.highlight ? "text-bg/70" : "text-muted",
              )}
            >
              $
            </span>
            <span
              className={cn(
                "text-[44px] font-semibold leading-none tracking-tight tnum",
                tier.highlight ? "text-bg" : "text-ink",
              )}
            >
              {tier.price.amount}
            </span>
            {tier.price.period ? (
              <span
                className={cn(
                  "mb-1 text-[12.5px]",
                  tier.highlight ? "text-bg/70" : "text-muted",
                )}
              >
                {tier.price.period}
              </span>
            ) : null}
          </>
        )}
      </div>
      {tier.price.note ? (
        <div
          className={cn(
            "mt-1.5 text-[11.5px]",
            tier.highlight ? "text-bg/60" : "text-muted-2",
          )}
        >
          {tier.price.note}
        </div>
      ) : null}

      <Link
        href={tier.cta.href}
        className={cn(
          "mt-6 inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[13.5px] font-semibold transition",
          tier.highlight
            ? "bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 text-ink shadow-[var(--shadow-brand)] hover:from-brand-400 hover:to-brand-600"
            : "border border-border-strong bg-bg-2 text-ink hover:bg-[rgba(14,46,30,0.05)]",
        )}
      >
        {tier.cta.label}
        <ArrowUpRight className="h-[14px] w-[14px]" />
      </Link>

      <div
        className={cn(
          "my-6 h-px w-full",
          tier.highlight ? "bg-white/10" : "bg-border-strong",
        )}
      />

      <ul className="space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                tier.highlight
                  ? "bg-brand-400 text-ink"
                  : "bg-brand-500/15 text-brand-700",
              )}
            >
              <Check className="h-[10px] w-[10px]" strokeWidth={3} />
            </span>
            <span
              className={cn(
                "text-[12.5px] leading-snug",
                feature.emphasis
                  ? tier.highlight
                    ? "font-semibold text-bg"
                    : "font-semibold text-ink"
                  : tier.highlight
                    ? "text-bg/85"
                    : "text-ink-2",
              )}
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonStrip() {
  const rows = [
    { label: "Active roles", starter: "1", pro: "Unlimited", enterprise: "Unlimited" },
    { label: "CVs per batch", starter: "10", pro: "50", enterprise: "Unlimited" },
    { label: "Sub-60s SLA", starter: "—", pro: "Yes", enterprise: "Yes · custom" },
    { label: "Blind mode", starter: "—", pro: "Yes", enterprise: "Yes" },
    { label: "Bias audit + non-traditional surfacing", starter: "—", pro: "Yes", enterprise: "Yes" },
    { label: "Custom skill ontology", starter: "—", pro: "—", enterprise: "Yes" },
    { label: "SSO + audit logs", starter: "—", pro: "—", enterprise: "Yes" },
    { label: "Self-hosted NIM", starter: "—", pro: "—", enterprise: "Yes" },
  ];

  return (
    <Card>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="px-6 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
                  Compare features
                </th>
                <th className="px-4 py-3 text-[11.5px] font-semibold text-ink-2">Starter</th>
                <th className="px-4 py-3 text-[11.5px] font-semibold text-ink-2">
                  Pro
                  <Badge tone="brand" className="ml-1.5 align-middle">popular</Badge>
                </th>
                <th className="px-4 py-3 text-[11.5px] font-semibold text-ink-2">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-border-strong/60 last:border-b-0",
                    i % 2 === 1 ? "bg-[rgba(14,46,30,0.015)]" : "",
                  )}
                >
                  <td className="px-6 py-3 text-ink">{row.label}</td>
                  <td className="px-4 py-3 text-ink-2 tnum">{row.starter}</td>
                  <td className="px-4 py-3 font-semibold text-ink tnum">{row.pro}</td>
                  <td className="px-4 py-3 text-ink-2 tnum">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function FAQ() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-ink">
          Questions, answered
        </h2>
        <p className="mt-2 text-[12.5px] text-muted">
          Still on the fence? The four below cover 90% of what teams ask before
          rolling Shortlister out.
        </p>
      </div>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group rounded-[16px] border border-border-strong bg-bg-2 p-4 transition hover:border-brand-400/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] font-semibold text-ink">
              {f.q}
              <span className="text-brand-700 transition group-open:rotate-45">
                <PlusGlyph />
              </span>
            </summary>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="glass relative overflow-hidden rounded-[20px] p-8 shadow-[var(--shadow-card)]">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-[rgba(14,46,30,0.04)] px-2.5 py-1 text-[11px] font-semibold text-ink-2">
            <MessageCircle className="h-3 w-3 text-brand-700" /> Not sure which plan?
          </div>
          <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-ink">
            Walk us through your hiring funnel — we'll size the right tier in 15 minutes.
          </h3>
          <p className="mt-2 text-[12.5px] text-muted">
            No deck, no slides. Bring a real JD and a few CVs and we'll run them live.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/jobs/new"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border-strong bg-bg-2 px-5 text-[13.5px] font-semibold text-ink hover:bg-[rgba(14,46,30,0.05)]"
          >
            Try it yourself
          </Link>
          <Link
            href="/help"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-5 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-brand)] hover:from-brand-400 hover:to-brand-600"
          >
            Book a demo
            <ArrowUpRight className="h-[14px] w-[14px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 1.5v11M1.5 7h11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

import {
  HelpCircle,
  BookOpen01 as BookOpen,
  MessageSquare01 as MessageSquare,
  Beaker01 as Beaker,
} from "@untitledui/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="How Shortlister works"
        description="A quick tour of the multi-agent pipeline behind every job."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Step
          title="1. Parser"
          icon={BookOpen}
          body="The Parser agent runs unpdf/mammoth to extract text, then generateObject (Vercel AI SDK) against a strict Zod schema. On schema violation it retries once with the validator error appended."
        />
        <Step
          title="2. Matcher"
          icon={Beaker}
          body="Deterministic math. Cosine similarity between JD + CV embeddings, plus a one-hop skill-graph expansion via graphology — so 'Next.js' matches a JD asking for 'React'."
        />
        <Step
          title="3. Auditor"
          icon={HelpCircle}
          body="Reasons over measurable proxies only. Flags shortlists where pedigree skews top-quartile while skill skews middle-quartile, and surfaces high-skill non-traditional candidates."
        />
        <Step
          title="4. Insights"
          icon={MessageSquare}
          body="Delta-Based RAG. The LLM sees only the JD requirements + matched skills + missing skills, never the full CV. Output is a justification + tailored interview questions."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={<HelpCircle className="h-3.5 w-3.5" />}>
            Performance target
          </CardTitle>
        </CardHeader>
        <CardBody className="text-[13px] leading-relaxed text-ink-2">
          <p>
            20 CVs processed end-to-end in &lt; 60 s. The per-CV pipeline is
            bounded by Parser (~8 s) + Insights (~6 s), so a fan-out of 20
            comfortably fits inside the budget.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Step({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<Icon className="h-3.5 w-3.5" />}>{title}</CardTitle>
      </CardHeader>
      <CardBody className="text-[13px] leading-relaxed text-muted">
        {body}
      </CardBody>
    </Card>
  );
}

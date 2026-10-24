import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./WorkspaceForms";
import { reportLines } from "./engine";
import type { Alert, SafetyCase, Services } from "./model";
export function FindingsWorkspace({
  c,
  services,
  busy,
  onRun,
  onReview,
  onMedicine,
}: {
  c: SafetyCase;
  services: Services | null;
  busy: boolean;
  onRun: () => void;
  onReview: (
    alert: Alert,
    decision: "acknowledged" | "follow-up" | "dismissed",
    notes: string,
  ) => void;
  onMedicine: (id: string) => void;
}) {
  const [severity, setSeverity] = useState("all"),
    [category, setCategory] = useState("all"),
    [review, setReview] = useState("all"),
    [medicine, setMedicine] = useState("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const a = c.analyses.at(-1);
  if (!a)
    return (
      <div className="py-10 text-center">
        <ShieldCheck className="mx-auto size-12 text-primary" />
        <h3 className="mt-4 text-xl font-semibold">Ready for supported safety checks</h3>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Only verified identities and configured, reviewed evidence rules are evaluated.
          Unavailable checks and uncertainty remain visible.
        </p>
        <Button className="mt-6" disabled={busy || !c.medicines.length} onClick={onRun}>
          <ShieldCheck />
          Run safety analysis
        </Button>
      </div>
    );
  const filtered = a.alerts.filter(
    (f) =>
      (severity === "all" || f.severity === severity) &&
      (category === "all" || f.category === category) &&
      (review === "all" || f.review === review) &&
      (medicine === "all" || f.medicineIds.includes(medicine)),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Prioritized findings</h3>
          <p className="text-xs text-muted-foreground">
            Analysis {a.version} · data v{a.dataVersion} · {new Date(a.at).toLocaleString()}
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={onRun}>
          <ShieldCheck />
          Re-run checks
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y py-5 sm:grid-cols-4">
        {(["Critical", "High", "Moderate", "Unable to Assess"] as const).map((s) => (
          <div key={s}>
            <p className="text-2xl font-semibold">
              {a.alerts.filter((f) => f.severity === s).length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Severity">
          <select
            className="mk-select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="all">All severities</option>
            {["Critical", "High", "Moderate", "Low", "Unable to Assess"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            className="mk-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(a.alerts.map((f) => f.category))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Review status">
          <select className="mk-select" value={review} onChange={(e) => setReview(e.target.value)}>
            <option value="all">All statuses</option>
            {["pending", "acknowledged", "follow-up", "dismissed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Affected medicine">
          <select
            className="mk-select"
            value={medicine}
            onChange={(e) => setMedicine(e.target.value)}
          >
            <option value="all">All medicines</option>
            {c.medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.originalName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {!a.alerts.length && (
        <div className="border-l-2 border-secondary py-3 pl-4">
          <CheckCircle2 className="mb-2 size-5 text-secondary" />
          <p className="font-medium">
            No supported safety alerts were identified by the checks completed.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This does not establish that the regimen is safe. See coverage and unresolved
            information below.
          </p>
        </div>
      )}
      {filtered.map((f) => (
        <article key={f.id} className="rounded-lg border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`mt-0.5 size-5 shrink-0 ${f.severity === "Critical" || f.severity === "High" ? "text-destructive" : "text-primary"}`}
              />
              <div>
                <p className="text-xs font-semibold text-primary">
                  {f.severity} · {f.category}
                </p>
                <h4 className="mt-1 font-semibold">{f.title}</h4>
              </div>
            </div>
            <span className="mk-status">{f.review}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{f.reason}</p>
          <p className="mt-2 text-sm text-muted-foreground">{f.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {f.medicineIds.map((id) => (
              <Button key={id} variant="outline" size="sm" onClick={() => onMedicine(id)}>
                {c.medicines.find((m) => m.id === id)?.originalName || id}
              </Button>
            ))}
          </div>
          {f.ingredients.length > 0 && (
            <p className="mt-3 text-sm">Ingredients: {f.ingredients.join(", ")}</p>
          )}
          {f.missing.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Uncertainty / missing: {f.missing.join("; ")}
            </p>
          )}
          <p className="mt-3 text-sm font-medium">
            Next step: professional review and source clarification; do not change medicines
            autonomously.
          </p>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium">Evidence & rule provenance</summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p>{f.source}</p>
              {/^https:\/\//.test(f.reference) ? (
                <a
                  href={f.reference}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Source reference
                </a>
              ) : (
                <p>{f.reference}</p>
              )}
              <p>
                {f.ruleId}@{f.ruleVersion} · {f.timestamp}
              </p>
              <p>
                Patient inputs:{" "}
                {f.patientInputs.join("; ") || "Recorded medication identities and statuses"}
              </p>
              <p>Alert ID: {f.id}</p>
            </div>
          </details>
          {services?.professional && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <Textarea
                aria-label={`Review notes for ${f.title}`}
                placeholder="Review rationale and follow-up notes"
                value={notes[f.id] ?? f.decisionNotes}
                onChange={(e) => setNotes((old) => ({ ...old, [f.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {(["acknowledged", "follow-up", "dismissed"] as const).map((decision) => (
                  <Button
                    key={decision}
                    size="sm"
                    variant="outline"
                    disabled={busy || !(notes[f.id] ?? f.decisionNotes).trim()}
                    onClick={() => onReview(f, decision, notes[f.id] ?? f.decisionNotes)}
                  >
                    {decision === "follow-up"
                      ? "Requires follow-up"
                      : decision === "dismissed"
                        ? "Dismiss with rationale"
                        : "Acknowledge"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </article>
      ))}
      <section className="border-t pt-5">
        <h3 className="font-semibold">Check coverage & limitations</h3>
        <div className="mt-3 divide-y">
          {a.checks.map((k) => (
            <div key={k.category} className="py-3">
              <p className="text-sm font-semibold">
                {k.category} · <span className="text-primary">{k.status}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{k.reason}</p>
            </div>
          ))}
        </div>
      </section>
      {c.analyses.length > 1 && (
        <details className="border-t pt-5">
          <summary className="cursor-pointer font-semibold">Re-evaluation history</summary>
          <div className="mt-4 space-y-4">
            {[...c.analyses].reverse().map((run) => (
              <div key={run.id} className="border-l-2 border-primary pl-4 text-sm">
                <strong>
                  Analysis {run.version} · {new Date(run.at).toLocaleString()}
                </strong>
                <p className="mt-1 text-muted-foreground">
                  New {run.changes.new.length} · resolved {run.changes.resolved.length} · unchanged{" "}
                  {run.changes.unchanged.length} · still uncertain {run.changes.uncertain.length}
                </p>
                <p className="mt-1">
                  Trigger measurement:{" "}
                  {c.renal.find((r) => r.id === run.renalId)?.date || "No applicable eGFR"}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer">Changed findings and rule versions</summary>
                  <p className="mt-2">
                    New: {run.changes.new.join(", ") || "None"}
                    <br />
                    Resolved: {run.changes.resolved.join(", ") || "None"}
                    <br />
                    Rules: {run.ruleVersions.join(", ")}
                  </p>
                </details>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
export function ReviewWorkspace({
  c,
  services,
  busy,
  onFinal,
  onStep,
}: {
  c: SafetyCase;
  services: Services | null;
  busy: boolean;
  onFinal: (notes: string) => void;
  onStep: (s: number) => void;
}) {
  const [notes, setNotes] = useState("");
  const a = c.analyses.at(-1);
  return (
    <div className="space-y-6">
      <div className="flex gap-3 border-l-2 border-primary pl-4">
        <ShieldCheck className="size-6 shrink-0 text-primary" />
        <div>
          <h3 className="font-semibold">Professional review is central</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {services?.professional
              ? `Signed-in configured role: ${services.role}. Review every source, identity and finding before explicitly completing review.`
              : "Only a configured clinician or pharmacist with case access may record professional decisions. Patient corrections never grant clinical approval."}
          </p>
        </div>
      </div>
      <div className="divide-y border-y">
        {[
          {
            label: "Source prescriptions",
            value: `${c.prescriptions.filter((d) => d.status === "Verified").length} / ${c.prescriptions.length} verified`,
            step: 1,
          },
          {
            label: "Medicine identities & corrections",
            value: `${c.medicines.filter((m) => m.verification === "verified").length} / ${c.medicines.length} verified`,
            step: 2,
          },
          {
            label: "Timeline and ongoing status",
            value: "Historical and uncertain dates remain qualified",
            step: 3,
          },
          {
            label: "Safety findings",
            value: `${a?.alerts.filter((f) => f.review === "pending").length ?? 0} decisions pending`,
            step: 4,
          },
          {
            label: "Incomplete safety categories",
            value: `${a?.checks.filter((k) => k.status !== "completed").length ?? 0} limitations preserved`,
            step: 4,
          },
        ].map((item) => (
          <div key={item.label} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.value}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onStep(item.step)}>
              Open
            </Button>
          </div>
        ))}
      </div>
      <Field label="Final review rationale and unresolved limitations">
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record the professional assessment, unresolved checks and follow-up"
        />
      </Field>
      <Button
        disabled={busy || !services?.professional || !notes.trim() || !a}
        onClick={() => onFinal(notes)}
      >
        <ShieldCheck />
        Complete professional review
      </Button>
      <p className="text-sm text-muted-foreground">
        Completion does not turn unknown identities or unavailable checks into verified facts.
        Server validation enforces access and review requirements.
      </p>
      <details>
        <summary className="cursor-pointer font-semibold">
          Previous decisions & correction history
        </summary>
        <div className="mt-4 space-y-3">
          {c.reviews.map((r, i) => (
            <div key={i} className="border-l pl-3 text-sm">
              <strong>{r.decision}</strong>
              <p>{r.notes}</p>
              <p className="text-xs text-muted-foreground">
                {r.actor} · {r.role} · {r.at} · data v{r.dataVersion}
              </p>
            </div>
          ))}
          {c.audit.map((e) => (
            <p key={e.id} className="text-xs text-muted-foreground">
              {e.at} · {e.action} · {e.detail}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
export function ReportWorkspace({
  c,
  busy,
  onGenerate,
  onDownload,
}: {
  c: SafetyCase;
  busy: boolean;
  onGenerate: () => void;
  onDownload: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const r = c.reports.find((r) => r.id === selected) ?? c.reports.at(-1);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Medication Safety Report</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Versioned snapshots preserve the analysis and review state at generation.
          </p>
        </div>
        <Button disabled={busy || !c.analyses.length} onClick={onGenerate}>
          <FileText />
          Generate report
        </Button>
      </div>
      {c.reports.length > 0 && (
        <Field label="Report version">
          <select
            className="mk-select max-w-md"
            value={r?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {c.reports.map((r) => (
              <option key={r.id} value={r.id}>
                Report {r.version} · data v{r.dataVersion} · {r.status}
              </option>
            ))}
          </select>
        </Field>
      )}
      {r ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => onDownload(r.id)}>
              <Download />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer />
              Print report
            </Button>
          </div>
          <article id="medication-report" className="space-y-3 border-t pt-6">
            <img src="/logo.png" alt="" className="size-10" />
            {reportLines({ ...r.snapshot, reports: [] }, r.id, r.status, r.at).map((line, i) =>
              /^\d\. |MEDIKIOSK/.test(line) ? (
                <h3 key={i} className="break-words pt-5 text-lg font-semibold">
                  {line}
                </h3>
              ) : (
                <p
                  key={i}
                  className={`break-words text-sm leading-relaxed ${line.startsWith("DRAFT") ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                >
                  {line}
                </p>
              ),
            )}
          </article>
        </>
      ) : (
        <div className="py-10 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No report generated yet.</p>
        </div>
      )}
    </div>
  );
}

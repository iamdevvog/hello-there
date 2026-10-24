import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { timeline, type SafetyCase } from "./model";

const sevTone: Record<string, string> = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-destructive/15 text-destructive",
  Moderate: "bg-accent text-accent-foreground",
  Low: "bg-secondary text-secondary-foreground",
};

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid-page space-y-4 border-t pt-8">
      <h3 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
          <dd className="mt-1 text-base">{v || <span className="text-muted-foreground">Not recorded</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-muted px-4 py-3 text-base text-muted-foreground">{children}</p>
);

export function ReportView({
  c,
  reportId,
  status,
  at,
}: {
  c: SafetyCase;
  reportId: string;
  status: string;
  at: string;
}) {
  const a = c.analyses.at(-1);
  const reviewed = status === "reviewed";
  const name = (id: string) => c.medicines.find((m) => m.id === id)?.originalName || id;
  const docLabel = (id: string) => c.prescriptions.find((d) => d.id === id)?.label || "Source";
  const when = new Date(at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  return (
    <article id="medication-report" className="mx-auto max-w-4xl space-y-8 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-10">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="size-12" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">MediKiosk</p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Medication Safety Report</h2>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${reviewed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
          >
            {reviewed ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}
            {reviewed ? "Professionally reviewed" : "Draft — review pending"}
          </span>
        </div>
        <div className="grid gap-3 rounded-xl bg-muted p-4 text-sm sm:grid-cols-4">
          <div><p className="text-muted-foreground">Patient</p><p className="font-semibold">{c.profile.identifier}</p></div>
          <div><p className="text-muted-foreground">Generated</p><p className="font-semibold">{when}</p></div>
          <div><p className="text-muted-foreground">Medicines</p><p className="font-semibold">{c.medicines.length}</p></div>
          <div><p className="text-muted-foreground">Findings</p><p className="font-semibold">{a?.alerts.length ?? "Not run"}</p></div>
        </div>
        <p className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-base">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          Decision support only. Do not start, stop, substitute or change doses based on this report. No alerts does not prove safety.
        </p>
      </header>

      <Section n={1} title="Patient">
        <Facts
          items={[
            ["Identifier", c.profile.identifier],
            ["Age", c.profile.age != null ? `${c.profile.age} years` : ""],
            ["Weight", c.profile.weight != null ? `${c.profile.weight} ${c.profile.weightUnit}` : ""],
            ["Allergies / reactions", c.profile.allergies],
            ["Conditions", c.profile.conditions],
            ["Notes", c.profile.notes],
          ]}
        />
        {c.renal.length > 0 && (
          <ul className="space-y-2">
            {c.renal.map((r, i) => (
              <li key={i} className="rounded-lg bg-muted px-4 py-3">
                <b>{r.kind}:</b> {r.value} {r.unit} · collected {r.date} · {r.source}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section n={2} title="Prescriptions">
        {c.prescriptions.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {c.prescriptions.map((d) => (
              <div key={d.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold">{d.label}</p>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{d.status}</span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{d.name} · {d.pages} page{d.pages === 1 ? "" : "s"}</p>
                <p className="mt-3 text-base">Dr: {d.prescriber || "Not recorded"}</p>
                <p className="text-base">Date: {d.date || "Unknown"}{d.clinic ? ` · ${d.clinic}` : ""}</p>
                {d.error && <p className="mt-2 text-sm text-destructive">{d.error}</p>}
              </div>
            ))}
          </div>
        ) : <Empty>No prescriptions uploaded.</Empty>}
      </Section>

      <Section n={3} title="Medicines">
        {c.medicines.length ? (
          <div className="space-y-4">
            {c.medicines.map((m) => (
              <div key={m.id} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xl font-semibold">
                    {m.originalName} <span className="font-normal text-muted-foreground">{m.strength}</span>
                  </p>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{m.verification}</span>
                </div>
                <p className="mt-2 text-base">“{m.instructions || "No readable instructions"}”</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  {[["Form", m.form], ["Route", m.route], ["How often", m.frequency], ["When", m.timing]].map(([k, v]) => (
                    <div key={k}><p className="text-muted-foreground">{k}</p><p className="font-medium">{v || "—"}</p></div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  From {docLabel(m.documentId)}, page {m.page}
                  {m.ingredients.length > 0 && ` · Ingredients: ${m.ingredients.map((i) => `${i.name} ${i.strength} ${i.unit}`).join(", ")}`}
                </p>
                {m.uncertainty.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-destructive">
                    {m.uncertainty.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : <Empty>No medicines recorded.</Empty>}
      </Section>

      <Section n={4} title="Timeline">
        {c.medicines.length ? (
          <ol className="relative space-y-4 border-l-2 border-primary/30 pl-6">
            {timeline(c).map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1.5 size-3 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">{t.date || "Date unknown"}</p>
                <p className="text-base font-medium">{t.medicine.originalName}</p>
                <p className="text-sm text-muted-foreground">{t.document?.prescriber || "Prescriber unknown"} · {t.document?.label}</p>
              </li>
            ))}
          </ol>
        ) : <Empty>Nothing to show.</Empty>}
      </Section>

      <Section n={5} title="Safety findings">
        {!a ? <Empty>Analysis not run.</Empty> : a.alerts.length ? (
          <div className="space-y-4">
            {a.alerts.map((f) => (
              <div key={f.id} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${sevTone[f.severity] ?? "bg-muted text-muted-foreground"}`}>{f.severity}</span>
                  <p className="text-lg font-semibold">{f.title}</p>
                </div>
                <p className="mt-2 text-base">{f.reason}</p>
                <p className="mt-2 text-sm text-muted-foreground">Medicines: {f.medicineIds.map(name).join(", ")}</p>
                <p className="text-sm text-muted-foreground">Evidence: {f.source} · {f.reference}</p>
                <p className="text-sm text-muted-foreground">Review: {f.review}{f.decisionNotes ? ` — ${f.decisionNotes}` : ""}</p>
              </div>
            ))}
          </div>
        ) : <Empty>No supported safety alerts were found by the checks that ran.</Empty>}
      </Section>

      <Section n={6} title="Checks and limitations">
        {a ? (
          <div className="overflow-hidden rounded-xl border">
            {a.checks.map((k, i) => (
              <div key={i} className="grid gap-1 border-b p-4 last:border-b-0 sm:grid-cols-[180px_120px_1fr] sm:gap-4">
                <p className="font-medium">{k.category}</p>
                <p className="text-sm font-semibold">{k.status}</p>
                <p className="text-sm text-muted-foreground">{k.reason}</p>
              </div>
            ))}
          </div>
        ) : <Empty>Analysis not run.</Empty>}
      </Section>

      <Section n={7} title="Professional review">
        {c.reviews.length ? (
          <ul className="space-y-3">
            {c.reviews.map((r, i) => (
              <li key={i} className="rounded-xl border p-4">
                <p className="text-base font-semibold">{r.decision} <span className="font-normal text-muted-foreground">by {r.actor} ({r.role})</span></p>
                <p className="text-sm text-muted-foreground">{new Date(r.at).toLocaleString()}</p>
                {r.notes && <p className="mt-2 text-base">{r.notes}</p>}
              </li>
            ))}
          </ul>
        ) : <Empty>No professional review recorded yet.</Empty>}
      </Section>

      <details className="border-t pt-6 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">Technical audit details</summary>
        <div className="mt-3 space-y-1 break-all">
          <p>Report ID: {reportId}</p>
          <p>Case ID: {c.id} · Data version {c.version} · Analysis {a?.version ?? "not run"}</p>
          <p>Rules: {a?.ruleVersions.join(", ") || "Not run"}</p>
          {c.audit.map((e, i) => <p key={i}>{e.at} · {e.action} · {e.detail}</p>)}
        </div>
      </details>
    </article>
  );
}

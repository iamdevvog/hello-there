import { useState } from "react";
import { CheckCircle2, CircleHelp, ExternalLink, RefreshCw, ShieldCheck, ShieldQuestion, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Medicine, SafetyCase, Services } from "./model";
import { STATUS_DEFINITIONS, latestRun, type AttributeResult, type IdentityStatus, type VerificationRun } from "./verification";

type Decision = "confirm" | "reject" | "unresolved" | "request-review";
const tone: Record<IdentityStatus, string> = {
  "Verified catalogue match": "bg-primary/10 text-primary border-primary/30",
  "Strong candidate — review required": "bg-accent text-accent-foreground border-border",
  "Partial match": "bg-secondary text-secondary-foreground border-border",
  "Conflicting product details": "bg-destructive/10 text-destructive border-destructive/30",
  "Unknown brand": "bg-muted text-muted-foreground border-border",
  "Insufficient evidence": "bg-muted text-muted-foreground border-border",
};
const resultIcon = (r: AttributeResult) =>
  r === "match" ? <CheckCircle2 className="size-4 text-primary" /> : r === "mismatch" ? <TriangleAlert className="size-4 text-destructive" /> : <CircleHelp className="size-4 text-muted-foreground" />;

export function VerificationBadge({ run }: { run: VerificationRun | null }) {
  if (!run) return <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Not checked</span>;
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone[run.status]}`}>{run.status}</span>;
}

export function VerificationPanel({
  c,
  medicine,
  services,
  busy,
  onRun,
  onDecide,
}: {
  c: SafetyCase;
  medicine: Medicine;
  services: Services | null;
  busy: boolean;
  onRun: () => void;
  onDecide: (catalogueId: string | null, decision: Decision, notes: string) => void;
}) {
  const run = latestRun(c.verifications, medicine.id);
  const history = (c.verifications ?? []).filter((r) => r.medicineId === medicine.id);
  const [pick, setPick] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const chosen = run?.candidates.find((r) => r.entryId === (pick ?? run.bestCandidateId)) ?? run?.candidates[0];
  const pro = Boolean(services?.professional);
  return (
    <section className="space-y-5 border-t pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Medicine identity verification</h3>
          <p className="mt-1 text-sm text-muted-foreground">How well this entry matches a traceable Indian medicine record — not proof the physical product is genuine.</p>
        </div>
        <Button variant="outline" disabled={busy} onClick={onRun}>
          <RefreshCw className={busy ? "animate-spin" : ""} />
          {run ? "Re-verify" : "Verify identity"}
        </Button>
      </div>

      {!run ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">Not verified yet. Verification runs automatically after reading a prescription.</p>
      ) : (
        <>
          <div className={`rounded-xl border p-4 ${tone[run.status]}`}>
            <p className="text-base font-semibold">{run.status}</p>
            <p className="mt-1 text-sm opacity-90">{STATUS_DEFINITIONS[run.status]}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Dim title="Prescription OCR" value={run.dimensions.ocr.label} detail={run.dimensions.ocr.detail} />
            <Dim title="Identity match" value={run.dimensions.identity.score === null ? "Cannot calculate" : `${run.dimensions.identity.score}%`} detail={run.dimensions.identity.label} />
            <Dim title="Evidence completeness" value={run.dimensions.evidence.score === null ? "No record" : `${run.dimensions.evidence.score}%`} detail={run.dimensions.evidence.label} />
            <Dim title="Physical authenticity" value={run.dimensions.physical.status} detail={run.dimensions.physical.detail} icon={<ShieldQuestion className="size-4" />} />
          </div>

          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Written on prescription:</span> <b>{run.originalName}</b></p>
            <p><span className="text-muted-foreground">Normalized search:</span> {run.normalizedName || "—"}{run.searchVariants.length > 1 && ` (also tried: ${run.searchVariants.slice(1).join(", ")})`}</p>
          </div>

          {(run.messages.length > 0 || run.conflicts.length > 0 || run.missing.length > 0) && (
            <ul className="space-y-1.5 text-sm">
              {run.conflicts.map((m) => <li key={m} className="flex gap-2 text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{m}</li>)}
              {run.messages.map((m) => <li key={m} className="flex gap-2 text-muted-foreground"><CircleHelp className="mt-0.5 size-4 shrink-0" />{m}</li>)}
              {run.missing.length > 0 && <li className="text-muted-foreground">Missing on prescription: {run.missing.join(", ")}</li>}
            </ul>
          )}

          {run.candidates.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {run.candidates.map((r) => (
                <Button key={r.entryId} size="sm" variant={chosen?.entryId === r.entryId ? "secondary" : "outline"} onClick={() => setPick(r.entryId)}>
                  {r.entry.brand} · {r.score === null ? "—" : `${r.score}%`}
                </Button>
              ))}
            </div>
          )}

          {chosen && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-3 py-2.5">Attribute</th><th className="px-3 py-2.5">Prescription</th><th className="px-3 py-2.5">Candidate: {chosen.entry.brand}</th><th className="px-3 py-2.5">Result</th></tr>
                </thead>
                <tbody className="divide-y">
                  {chosen.attributes.map((a) => (
                    <tr key={a.attribute}>
                      <td className="px-3 py-3 font-medium">{a.attribute}</td>
                      <td className="max-w-48 px-3 py-3 break-words">{a.prescription}</td>
                      <td className="max-w-48 px-3 py-3 break-words">{a.candidate}</td>
                      <td className="px-3 py-3"><span className="flex items-start gap-1.5">{resultIcon(a.result)}<span><span className="capitalize">{a.result}</span>{a.note && <span className="block text-xs text-muted-foreground">{a.note}</span>}</span></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>{chosen.method} · {chosen.entry.source} · verified {chosen.entry.verifiedAt}{chosen.entry.retrievedAt ? ` · retrieved ${chosen.entry.retrievedAt}` : ""}</span>
                <a href={chosen.entry.reference} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Open source record <ExternalLink className="size-3" /></a>
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">Reviewer decision {!pro && <span className="font-normal text-muted-foreground">— only a configured clinician or pharmacist can confirm</span>}</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes (required)" className="min-h-16" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !pro || !notes.trim() || !chosen || chosen.disqualified.length > 0 || chosen.score === null} onClick={() => onDecide(chosen!.entryId, "confirm", notes)}><ShieldCheck />Confirm match</Button>
              <Button size="sm" variant="outline" disabled={busy || !pro || !notes.trim()} onClick={() => onDecide(chosen?.entryId ?? null, "reject", notes)}><X />Reject candidate</Button>
              <Button size="sm" variant="outline" disabled={busy || !pro || !notes.trim()} onClick={() => onDecide(null, "unresolved", notes)}>Mark unresolved</Button>
              <Button size="sm" variant="ghost" disabled={busy || !notes.trim()} onClick={() => onDecide(chosen?.entryId ?? null, "request-review", notes)}>Request further review</Button>
            </div>
            {run.reviewerDecisions.map((d, i) => (
              <p key={i} className="text-xs text-muted-foreground">{new Date(d.at).toLocaleString()} · {d.role} · {d.decision} — {d.notes}</p>
            ))}
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">Method & history ({history.length} run{history.length === 1 ? "" : "s"})</summary>
            <p className="mt-2">Algorithm {run.algorithmVersion}. Weights: {Object.entries(run.weights).map(([k, v]) => `${k} ${v}`).join(", ")}. Conflicts cap the score at 40; missing information never counts as a match.</p>
            {history.map((h) => <p key={h.id}>{new Date(h.at).toLocaleString()} · {h.status} · {h.dimensions.identity.score ?? "—"}% · catalogue {h.catalogueFingerprint}</p>)}
          </details>
        </>
      )}
    </section>
  );
}

function Dim({ title, value, detail, icon }: { title: string; value: string; detail: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{title}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

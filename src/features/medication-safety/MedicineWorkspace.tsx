import { useEffect, useState } from "react";
import { Plus, Save, Search, ShieldCheck, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./WorkspaceForms";
import { VerificationBadge, VerificationPanel } from "./VerificationPanel";
import { latestRun } from "./verification";
import {
  emptyMedicine,
  timeline,
  type Medicine,
  type SafetyCase,
  type CatalogueEntry,
  type Services,
} from "./model";
export type Candidate = {
  entry: CatalogueEntry;
  rank: number;
  status: "conflict" | "candidate";
  method: string;
};
export function MedicineWorkspace({
  c,
  focusId,
  busy,
  services,
  onSave,
  onResolve,
  onConfirm,
  onPreview,
}: {
  c: SafetyCase;
  focusId: string | null;
  busy: boolean;
  services: Services | null;
  onSave: (m: Medicine, notes: string) => void;
  onResolve: (id: string) => void;
  onConfirm: (
    m: Medicine,
    catalogueId: string | null,
    decision: "confirm" | "reject" | "unresolved" | "request-review",
    notes: string,
  ) => void;
  onPreview: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(focusId ?? c.medicines[0]?.id ?? null);
  const [draft, setDraft] = useState<Medicine | null>(c.medicines.find(m=>m.id===focusId) ?? c.medicines[0] ?? null);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    const m = c.medicines.find((m) => m.id === selected);
    if (m) setDraft(m);
  }, [c, selected]);
  const update = (key: keyof Medicine, value: string | number | string[]) =>
    setDraft((old) => (old ? { ...old, [key]: value } : null));
  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="space-y-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Medicine inventory</h3>
          <Button
            variant="outline"
            size="icon"
            aria-label="Add manually transcribed medicine"
            disabled={!c.prescriptions.length || busy}
            onClick={() => {
              const source = c.prescriptions[0];
              if (!source) return;
              const m = emptyMedicine(source.id, crypto.randomUUID());
              setSelected(null);
              setDraft(m);
            }}
          >
            <Plus />
          </Button>
        </div>
        {!c.medicines.length && (
          <p className="text-sm text-muted-foreground">
            No extracted medicines yet. Extract a prescription or add a source-backed transcription.
          </p>
        )}
        {c.medicines.map((m) => (
          <Button
            key={m.id}
            variant={selected === m.id ? "secondary" : "ghost"}
            className="h-auto w-full justify-start whitespace-normal py-3 text-left"
            onClick={() => {
              setSelected(m.id);
              setDraft(m);
            }}
          >
            <span>
              <span className="block">{m.originalName}</span>
              <span className="mt-1 block text-xs opacity-75">
                {m.status}
              </span>
              <span className="mt-1.5 block"><VerificationBadge run={latestRun(c.verifications, m.id)} /></span>
            </span>
          </Button>
        ))}
      </div>
      {draft ? (
        <div className="min-w-0 space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave(draft, notes);
            }}
            className="space-y-5"
          >
            <div>
              <h3 className="text-lg font-semibold">What the prescription says</h3>
              <p className="text-sm text-muted-foreground">
                Corrections preserve the previous values and invalidate previous identity
                confirmation.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Original medicine name">
                <Input
                  required
                  value={draft.originalName}
                  onChange={(e) => update("originalName", e.target.value)}
                />
              </Field>
              <Field label="Source prescription">
                <select
                  className="mk-select"
                  value={draft.documentId}
                  disabled={selected !== null}
                  onChange={(e) => update("documentId", e.target.value)}
                >
                  {c.prescriptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Strength exactly as written">
                <Input
                  value={draft.strength}
                  onChange={(e) => update("strength", e.target.value)}
                  placeholder="Missing / unreadable"
                />
              </Field>
              <Field label="Dosage form">
                <Input
                  value={draft.form}
                  onChange={(e) => update("form", e.target.value)}
                  placeholder="Not recorded"
                />
              </Field>
              <Field label="Route">
                <Input value={draft.route} onChange={(e) => update("route", e.target.value)} />
              </Field>
              <Field label="Frequency exactly as written">
                <Input
                  value={draft.frequency}
                  onChange={(e) => update("frequency", e.target.value)}
                />
              </Field>
              <Field label="Timing / food instructions">
                <Input value={draft.timing} onChange={(e) => update("timing", e.target.value)} />
              </Field>
              <Field label="Duration">
                <Input
                  value={draft.duration}
                  onChange={(e) => update("duration", e.target.value)}
                />
              </Field>
              <Field label="Start date (documented only)">
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </Field>
              <Field label="End date (documented only)">
                <Input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </Field>
              <Field label="Known medication status">
                <select
                  className="mk-select"
                  value={draft.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {[
                    "unknown",
                    "prescribed",
                    "dispensed",
                    "reportedly-taking",
                    "reconciled",
                    "discontinued",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source page">
                <Input
                  type="number"
                  min={1}
                  value={draft.page}
                  onChange={(e) => update("page", Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Instructions exactly as written">
              <Textarea
                value={draft.instructions}
                onChange={(e) => update("instructions", e.target.value)}
              />
            </Field>
            <Field label="Literal source excerpt">
              <Textarea value={draft.excerpt} onChange={(e) => update("excerpt", e.target.value)} />
            </Field>
            <Field label="Uncertainty / clarification required (one per line)">
              <Textarea
                value={draft.uncertainty.join("\n")}
                onChange={(e) => update("uncertainty", e.target.value.split("\n").filter(Boolean))}
              />
            </Field>
            <Field label="Correction rationale">
              <Input
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain your source-backed correction"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                <Save />
                Save correction
              </Button>
              <Button type="button" variant="outline" onClick={() => onPreview(draft.documentId)}>
                View original source
              </Button>
            </div>
          </form>
          {selected && c.medicines.some((m) => m.id === selected) ? (
            <VerificationPanel
              key={draft.id}
              c={c}
              medicine={draft}
              services={services}
              busy={busy}
              onRun={() => onResolve(draft.id)}
              onDecide={(catalogueId, decision, n) => onConfirm(draft, catalogueId, decision, n)}
            />
          ) : (
            <p className="border-t pt-5 text-sm text-muted-foreground">Save this medicine to run identity verification.</p>
          )}
          <section className="border-t pt-5">
            <h3 className="text-lg font-semibold">What the safety engine flags</h3>
            {c.analyses
              .at(-1)
              ?.alerts.filter((a) => a.medicineIds.includes(draft.id))
              .map((a) => (
                <p key={a.id} className="mt-3 text-sm">
                  <strong>
                    {a.severity}: {a.title}
                  </strong>
                  <br />
                  {a.reason}
                </p>
              ))}
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium">
                Checks not completed and provenance
              </summary>
              <div className="mt-3 space-y-2">
                {c.analyses.at(-1)?.checks.map((k) => (
                  <p key={k.category}>
                    {k.category}: {k.status} — {k.reason}
                  </p>
                ))}
                <p>
                  Source: {draft.documentId}, page {draft.page}. Common uses and dose interpretation
                  remain unavailable without supporting sources.
                </p>
              </div>
            </details>
          </section>
        </div>
      ) : (
        <div className="grid min-h-56 place-items-center text-center text-muted-foreground">
          <p>Select a medicine or add a source-backed transcription.</p>
        </div>
      )}
    </div>
  );
}
export function TimelineWorkspace({ c, onOpen }: { c: SafetyCase; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState("all"),
    [prescriber, setPrescriber] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const a = c.analyses.at(-1);
  const rows = timeline(c).filter((t) => {
    const m = t.medicine;
    if (filter === "ongoing" && !["reportedly-taking", "reconciled"].includes(m.status))
      return false;
    if (filter === "historical" && (!t.date || t.date >= new Date().toISOString().slice(0, 10)))
      return false;
    if (filter === "discontinued" && m.status !== "discontinued") return false;
    if (filter === "uncertain" && m.verification === "verified") return false;
    if (filter === "flagged" && !a?.alerts.some((f) => f.medicineIds.includes(m.id))) return false;
    return (
      (!prescriber || t.document?.prescriber === prescriber) &&
      (!start || Boolean(t.date && t.date >= start)) &&
      (!end || Boolean(t.date && t.date <= end))
    );
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Medication filter">
          <select className="mk-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All medicines</option>
            <option value="ongoing">Recorded ongoing</option>
            <option value="historical">Historical dated records</option>
            <option value="discontinued">Discontinued</option>
            <option value="uncertain">Uncertain identity</option>
            <option value="flagged">Flagged for review</option>
          </select>
        </Field>
        <Field label="Prescriber">
          <select
            className="mk-select"
            value={prescriber}
            onChange={(e) => setPrescriber(e.target.value)}
          >
            <option value="">All prescribers</option>
            {[...new Set(c.prescriptions.map((d) => d.prescriber).filter(Boolean))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        Historical dates do not establish discontinuation. Similar prescriptions do not establish
        concurrent use.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {[
                "Date / source",
                "Medicine / ingredients",
                "Recorded instructions",
                "Status / verification",
                "",
              ].map((h, i) => (
                <th key={i} className="px-3 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((t) => (
              <tr key={t.medicine.id}>
                <td className="px-3 py-4 align-top">
                  <strong>{t.date || "Date unknown"}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.document?.label}
                    <br />
                    {t.document?.prescriber || "Prescriber not recorded"}
                  </p>
                </td>
                <td className="max-w-64 px-3 py-4 align-top">
                  <strong>{t.medicine.originalName}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.medicine.ingredients.map((i) => i.name).join(" + ") ||
                      "Ingredients unverified"}
                    <br />
                    {t.medicine.strength || "Strength missing"}
                  </p>
                </td>
                <td className="max-w-56 px-3 py-4 align-top">
                  {t.medicine.instructions || "Missing / unreadable"}
                </td>
                <td className="px-3 py-4 align-top">
                  <span className="mk-status">{t.medicine.status}</span>
                  <p className="mt-2"><VerificationBadge run={latestRun(c.verifications, t.medicine.id)} /></p>
                </td>
                <td className="px-3 py-4">
                  <Button variant="ghost" size="sm" onClick={() => onOpen(t.medicine.id)}>
                    Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="py-10 text-center text-muted-foreground">
          No medication entries match these filters.
        </p>
      )}
    </div>
  );
}

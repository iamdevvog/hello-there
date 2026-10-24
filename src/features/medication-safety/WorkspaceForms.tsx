import { useState } from "react";
import { FileUp, Save, Trash2, RefreshCw, FileText, Eye, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  emptyProfile,
  renalSchema,
  type Profile,
  type Renal,
  type SafetyCase,
  type Services,
} from "./model";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
const ALLERGY_CHIPS = ["Penicillin", "Sulfa drugs", "Aspirin / NSAIDs", "Ibuprofen", "Codeine", "Latex", "Peanuts"];
const CONDITION_CHIPS = ["Diabetes", "High blood pressure", "Asthma", "Heart disease", "Kidney disease", "Liver disease", "Thyroid", "Pregnancy"];
const AGE_CHIPS: [string, number][] = [["Child (5)", 5], ["Teen (15)", 15], ["25", 25], ["40", 40], ["55", 55], ["70", 70], ["80+", 80]];
const splitList = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`min-h-12 rounded-full border px-5 text-sm font-medium transition ${on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface hover:border-primary/60"}`}
    >
      {children}
    </button>
  );
}

function ChipList({ value, options, noneLabel, onChange, placeholder }: { value: string; options: string[]; noneLabel: string; onChange: (v: string) => void; placeholder: string }) {
  const items = splitList(value);
  const none = items.length === 1 && items[0] === noneLabel;
  const [other, setOther] = useState("");
  const toggle = (o: string) => {
    const base = items.filter((x) => x !== noneLabel);
    onChange((base.includes(o) ? base.filter((x) => x !== o) : [...base, o]).join(", "));
  };
  const extras = items.filter((x) => x !== noneLabel && !options.includes(x));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Chip on={none} onClick={() => onChange(none ? "" : noneLabel)}>{noneLabel}</Chip>
        {[...options, ...extras].map((o) => (
          <Chip key={o} on={items.includes(o)} onClick={() => toggle(o)}>{o}</Chip>
        ))}
      </div>
      <div className="flex max-w-md gap-2">
        <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" && other.trim()) { e.preventDefault(); toggle(other.trim()); setOther(""); } }} />
        <Button type="button" variant="outline" disabled={!other.trim()} onClick={() => { toggle(other.trim()); setOther(""); }}><Plus />Add</Button>
      </div>
    </div>
  );
}

export function ProfileForm({
  initial = emptyProfile,
  onSave,
  busy,
}: {
  initial?: Profile;
  onSave: (p: Profile) => void;
  busy: boolean;
}) {
  const [p, set] = useState(initial);
  const [i, setI] = useState(0);
  const update = (key: keyof Profile, value: unknown) => set((old) => ({ ...old, [key]: value }));
  const steps: { title: string; hint: string; body: React.ReactNode; ok: boolean; optional?: boolean }[] = [
    { title: "Who is this for?", hint: "A name or record number is enough.", ok: Boolean(p.identifier.trim()), body: (
      <Input autoFocus required maxLength={120} className="h-14 max-w-md text-lg" value={p.identifier} onChange={(e) => update("identifier", e.target.value)} placeholder="e.g. Aryan Garg" />
    ) },
    { title: "How old are they?", hint: "Tap a close value or type the exact age.", ok: true, optional: true, body: (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{AGE_CHIPS.map(([l, v]) => <Chip key={l} on={p.age === v} onClick={() => update("age", p.age === v ? null : v)}>{l}</Chip>)}</div>
        <Input type="number" inputMode="numeric" min={0} max={130} className="h-12 w-40" placeholder="Exact age" value={p.age ?? ""} onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)} />
      </div>
    ) },
    { title: "Sex", hint: "Only used where a supported rule needs it.", ok: true, optional: true, body: (
      <div className="flex flex-wrap gap-2">
        {([["female", "Female"], ["male", "Male"], ["other", "Other"], ["not-recorded", "Prefer not to say"]] as const).map(([v, l]) => (
          <Chip key={v} on={p.sex === v} onClick={() => update("sex", v)}>{l}</Chip>
        ))}
      </div>
    ) },
    { title: "Weight", hint: "Skip if you don't know it.", ok: true, optional: true, body: (
      <div className="flex max-w-xs gap-2">
        <Input type="number" inputMode="decimal" min={0.1} step="any" className="h-12" placeholder="Weight" value={p.weight ?? ""} onChange={(e) => update("weight", e.target.value ? Number(e.target.value) : null)} />
        <div className="flex gap-1">{(["kg", "lb"] as const).map((u) => <Chip key={u} on={p.weightUnit === u} onClick={() => update("weightUnit", u)}>{u}</Chip>)}</div>
      </div>
    ) },
    { title: "Any allergies?", hint: "Tap all that apply, or add your own.", ok: true, optional: true, body: (
      <ChipList value={p.allergies} options={ALLERGY_CHIPS} noneLabel="No known allergies" placeholder="Other allergy" onChange={(v) => update("allergies", v)} />
    ) },
    { title: "Any health conditions?", hint: "Tap all that apply, or add your own.", ok: true, optional: true, body: (
      <ChipList value={p.conditions} options={CONDITION_CHIPS} noneLabel="No known conditions" placeholder="Other condition" onChange={(v) => update("conditions", v)} />
    ) },
    { title: "Read prescriptions automatically?", hint: "Lets MediKiosk read uploaded prescriptions for you, under your facility's privacy approval.", ok: true, body: (
      <div className="flex flex-wrap gap-2">
        <Chip on={p.consent} onClick={() => update("consent", true)}>Yes, read them for me</Chip>
        <Chip on={!p.consent} onClick={() => update("consent", false)}>No, I'll type them</Chip>
      </div>
    ) },
  ];
  const s = steps[i]!;
  const last = i === steps.length - 1;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!s.ok) return;
        if (last) onSave(p);
        else setI(i + 1);
      }}
      className="rounded-2xl border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{i + 1} of {steps.length}</span>
      </div>
      <h3 className="text-2xl font-semibold sm:text-3xl">{s.title}</h3>
      <p className="mt-2 text-muted-foreground">{s.hint}</p>
      <div className="mt-5 min-h-24">{s.body}</div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {i > 0 && <Button type="button" variant="ghost" size="lg" onClick={() => setI(i - 1)}>Back</Button>}
        <Button type="submit" size="lg" className="min-w-40" disabled={busy || !s.ok}>
          {last ? <><Save /> {busy ? "Saving…" : "Save & add prescriptions"}</> : "Continue"}
        </Button>
        {s.optional && !last && <Button type="button" variant="link" onClick={() => setI(i + 1)}>Skip</Button>}
        {initial.identifier && !last && <Button type="button" variant="outline" className="ml-auto" disabled={busy || !p.identifier.trim()} onClick={() => onSave(p)}><Save />Save now</Button>}
      </div>
    </form>
  );
}
export function RenalForm({
  onSave,
  busy,
  measurements,
}: {
  onSave: (r: Renal) => void;
  busy: boolean;
  measurements: Renal[];
}) {
  const [kind, setKind] = useState<Renal["kind"]>("eGFR");
  const [unit, setUnit] = useState<Renal["unit"]>("mL/min/1.73m²");
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  return (
    <details className="group rounded-2xl border bg-surface p-5 sm:p-6">
      <summary className="cursor-pointer list-none font-semibold">
        + Add a kidney test result <span className="font-normal text-muted-foreground">(optional)</span>
      </summary>
      <div className="mt-5 space-y-5">
      <div>
        <h3 className="sr-only">Kidney-function history</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Missing measurements are not normal results. Every new result is retained and triggers
          re-evaluation.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {measurements.map((m) => (
          <div key={m.id} className="border-l-2 border-primary pl-3 text-sm">
            <strong>
              {m.kind} · {m.value} {m.unit}
            </strong>
            <p className="text-muted-foreground">
              {m.date} · {m.source}
            </p>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const r = renalSchema.safeParse({
            id: "",
            kind,
            unit,
            value: Number(value),
            date,
            source,
          });
          if (!r.success) {
            setError(r.error.issues.map((i) => i.message).join("; "));
            return;
          }
          setError("");
          onSave(r.data);
        }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field label="Measurement">
          <select
            className="mk-select"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as Renal["kind"];
              setKind(k);
              setUnit(k === "eGFR" ? "mL/min/1.73m²" : "mg/dL");
            }}
          >
            <option>eGFR</option>
            <option value="creatinine">Serum creatinine</option>
          </select>
        </Field>
        <Field label="Value">
          <Input
            required
            type="number"
            min={0.01}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Unit">
          <select
            className="mk-select"
            value={unit}
            onChange={(e) => setUnit(e.target.value as Renal["unit"])}
          >
            {kind === "eGFR" ? (
              <option>mL/min/1.73m²</option>
            ) : (
              <>
                <option>mg/dL</option>
                <option>µmol/L</option>
              </>
            )}
          </select>
        </Field>
        <Field label="Collection date">
          <Input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Source">
          <Input
            required
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Laboratory / report reference"
          />
        </Field>
        <div className="self-end">
          <Button disabled={busy} type="submit" className="w-full">
            <Plus />
            Record & re-evaluate
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        )}
      </form>
      </div>
    </details>
  );
}
export interface PendingFile {
  file: File;
  id: string;
  status: "queued" | "uploading" | "failed";
  error: string;
  progress: number;
  label: string;
  prescriber: string;
  date: string;
  clinic: string;
}
export function UploadWorkspace({
  c,
  services,
  busy,
  onUpload,
  onProcess,
  onRemove,
  onPreview,
  onVerify,
}: {
  c: SafetyCase;
  services: Services | null;
  busy: boolean;
  onUpload: (
    files: PendingFile[],
    set: React.Dispatch<React.SetStateAction<PendingFile[]>>,
  ) => void;
  onProcess: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
  onVerify: (id: string) => void;
}) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const add = (incoming: FileList | File[]) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    const accepted: PendingFile[] = [];
    const errors: string[] = [];
    for (const file of Array.from(incoming)) {
      if (!allowed.includes(file.type) || !file.size || file.size > 1024 * 1024) {
        errors.push(`${file.name}: PDF, PNG or JPEG, at most 1 MB`);
        continue;
      }
      if (files.some((p) => p.file.name === file.name && p.file.size === file.size)) continue;
      accepted.push({
        file,
        id: crypto.randomUUID(),
        status: "queued",
        error: "",
        progress: 0,
        label: `Prescription ${c.prescriptions.length + files.length + accepted.length + 1}`,
        prescriber: "",
        date: "",
        clinic: "",
      });
    }
    setFiles((old) => [...old, ...accepted]);
    setError(errors.join("; "));
  };
  const update = (id: string, key: keyof PendingFile, value: string) =>
    setFiles((old) => old.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={`grid min-h-56 place-items-center rounded-lg border-2 border-dashed p-6 text-center ${drag ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
      >
        <div>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileUp className="size-7" />
          </div>
          <h3 className="text-lg font-semibold">Prescriptions from every doctor. One history.</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            PDF, PNG or JPEG · up to 1 MB each · multiple files
          </p>
          <Button variant="outline" className="mt-5" asChild>
            <label htmlFor="prescription-picker">
              <Plus />
              Choose prescriptions
            </label>
          </Button>
          <input
            id="prescription-picker"
            type="file"
            className="sr-only"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files) add(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {files.map((f) => (
        <article key={f.id} className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 shrink-0" />
              <span className="break-all">{f.file.name}</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${f.file.name}`}
              disabled={f.status === "uploading"}
              onClick={() => setFiles((old) => old.filter((x) => x.id !== f.id))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source label">
              <Input
                required
                value={f.label}
                onChange={(e) => update(f.id, "label", e.target.value)}
              />
            </Field>
            <Field label="Prescriber (if known)">
              <Input
                value={f.prescriber}
                onChange={(e) => update(f.id, "prescriber", e.target.value)}
              />
            </Field>
            <Field label="Prescription date (if known)">
              <Input
                type="date"
                value={f.date}
                onChange={(e) => update(f.id, "date", e.target.value)}
              />
            </Field>
            <Field label="Clinic (if known)">
              <Input value={f.clinic} onChange={(e) => update(f.id, "clinic", e.target.value)} />
            </Field>
          </div>
          {f.status === "uploading" && (
            <>
              <progress
                aria-label={`Upload progress ${f.file.name}`}
                value={f.progress}
                max={100}
                className="h-2 w-full"
              />
              <p className="text-sm">
                {f.progress === 100 ? "Saving prescription…" : `Reading file… ${f.progress}%`}
              </p>
            </>
          )}
          {f.error && (
            <p role="alert" className="text-sm text-destructive">
              {f.error}
            </p>
          )}
        </article>
      ))}
      {files.length > 0 && (
        <Button
          disabled={busy || files.some((f) => !f.label.trim())}
          onClick={() => onUpload(files, setFiles)}
        >
          <FileUp />
          Upload {files.length} prescription{files.length === 1 ? "" : "s"}
        </Button>
      )}
      {(!services?.externalProcessingApproved || !c.profile.consent) && (
        <div className="flex gap-3 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
          <ShieldCheck className="size-5 shrink-0" />
          <p>
            External processing is paused. Patient consent and operator privacy approval are
            required; private uploads and manual transcription remain available.
          </p>
        </div>
      )}
      <div className="divide-y border-y">
        {c.prescriptions.map((d) => (
          <article key={d.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-semibold">{d.label}</p>
              <p className="break-all text-sm text-muted-foreground">
                {d.name} · {d.prescriber || "Prescriber not recorded"} · {d.date || "Date unknown"}
              </p>
              <p className="mt-1 text-xs font-medium text-primary">{d.status}</p>
              {d.error && <p className="mt-2 max-w-xl text-sm text-destructive">{d.error}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onPreview(d.id)}>
                <Eye />
                Source
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  busy ||
                  !services?.externalProcessingApproved ||
                  !c.profile.consent ||
                  !services?.ocr ||
                  !services?.extraction
                }
                onClick={() => onProcess(d.id)}
              >
                <RefreshCw />
                {d.status === "Failed" || d.status === "Extracting"
                  ? "Retry extraction"
                  : "Extract"}
              </Button>
              {services?.professional && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => onVerify(d.id)}>
                  <ShieldCheck />
                  Verify source
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={busy || c.analyses.length > 0}
                aria-label={`Remove ${d.label}`}
                onClick={() => onRemove(d.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

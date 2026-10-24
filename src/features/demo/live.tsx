import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, FileText, Loader2, Mic, Search, ShieldAlert, Upload, Globe, Camera } from "lucide-react";
import { demoConversation, demoFindings, demoMedicines, demoPatient, demoStructuredCase, demoVitals } from "./data";

/** Counts 0→max over time; restart by remounting with a new key. */
export function useTick(max: number, ms = 700, delay = 300) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      i += 1;
      setN(i);
      if (i < max) timer = setTimeout(next, ms);
    };
    timer = setTimeout(next, delay);
    return () => clearTimeout(timer);
  }, [max, ms, delay]);
  return n;
}

export function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>;
}
function Appear({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div>;
}
function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}
function Status({ done, label }: { done: boolean; label: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </p>
  );
}
function Wave({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-end gap-1">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-primary ${active ? "animate-pulse" : "opacity-30"}`}
          style={{ height: active ? `${20 + ((i * 37) % 80)}%` : "20%", animationDelay: `${(i % 6) * 120}ms` }}
        />
      ))}
    </div>
  );
}

/* ---------- Identification: fields type in ---------- */
export function LiveIdentification() {
  const fields: [string, string][] = [
    ["Name", demoPatient.name],
    ["Age", `${demoPatient.age} years`],
    ["Gender", demoPatient.sex],
    ["Phone", demoPatient.phone],
  ];
  const n = useTick(fields.length + 2, 800);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Box className="grid gap-3 sm:grid-cols-2">
        {fields.map(([l, v], i) => (
          <div key={l} className={`rounded-xl border px-4 py-3 transition ${n === i + 1 ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="min-h-7 text-lg font-semibold">{n > i ? v : <span className="text-muted-foreground">…</span>}</p>
          </div>
        ))}
      </Box>
      <Box>
        <p className="font-semibold">Record lookup</p>
        <div className="mt-3 space-y-2">
          <Status done={n > 4} label="Searching by phone number" />
          <Appear show={n > 5}>
            <p className="rounded-xl bg-primary-soft p-3 text-sm text-primary">Returning patient found · {demoPatient.id} · last visit 09 Sep</p>
          </Appear>
        </div>
      </Box>
    </div>
  );
}

/* ---------- Voice conversation ---------- */
export function LiveConversation() {
  const n = useTick(demoConversation.length + 1, 1500);
  const speaking = n <= demoConversation.length && demoConversation[n - 1]?.who === "patient";
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Box className="min-h-[360px] space-y-3">
        {demoConversation.slice(0, n).map((m, i) => (
          <div key={i} className={`flex animate-in fade-in slide-in-from-bottom-2 ${m.who === "patient" ? "justify-end" : ""}`}>
            <p className={`max-w-[80%] rounded-2xl px-4 py-3 text-base ${m.who === "patient" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.who === "patient" && <Mic className="mr-2 inline h-4 w-4" />}
              {m.text}
            </p>
          </div>
        ))}
      </Box>
      <div className="space-y-4">
        <Box>
          <p className="flex items-center gap-2 font-semibold"><Mic className="h-4 w-4 text-primary" />{speaking ? "Listening…" : "Kiosk speaking"}</p>
          <div className="mt-3"><Wave active={n <= demoConversation.length} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Speech → text (Whisper) · reply read aloud (ElevenLabs)</p>
        </Box>
        <Box>
          <p className="mb-2 font-semibold">Understood so far</p>
          <div className="space-y-1 text-sm">
            {demoStructuredCase.slice(0, Math.min(5, Math.floor(n / 1.2))).map(([l, v]) => (
              <p key={l} className="animate-in fade-in"><span className="text-muted-foreground">{l}:</span> <b>{v}</b></p>
            ))}
          </div>
        </Box>
      </div>
    </div>
  );
}

/* ---------- Vitals: counting in ---------- */
export function LiveVitals() {
  const n = useTick(demoVitals.length, 600);
  return (
    <Box>
      <p className="mb-3 font-semibold">Vitals recorded by staff / device</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {demoVitals.map(([l, v, u], i) => (
          <div key={l} className={`rounded-xl border px-4 py-4 text-center ${n > i ? "border-primary/40" : "border-border"}`}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold">{n > i ? v : "—"}</p>
            <p className="text-xs text-muted-foreground">{u}</p>
          </div>
        ))}
      </div>
    </Box>
  );
}

/* ---------- Document upload with OCR ---------- */
const reportLines = [
  ["Haemoglobin", "11.8 g/dL", "Low"],
  ["WBC count", "7,200 /µL", "Normal"],
  ["Fasting glucose", "104 mg/dL", "Borderline"],
  ["Creatinine", "0.9 mg/dL", "Normal"],
  ["SGPT (ALT)", "38 U/L", "Normal"],
];
export function LiveDocumentUpload() {
  // phases: 0 idle,1 photo,2 uploading,3 reading,4 classify,5+ fields
  const n = useTick(5 + reportLines.length + 1, 900, 500);
  const progress = n >= 3 ? 100 : n === 2 ? 55 : n === 1 ? 15 : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Box className="relative overflow-hidden">
        <p className="mb-3 flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-primary" />Patient shows blood test report to camera</p>
        <div className="relative rounded-xl border border-border bg-background p-5 font-mono text-sm">
          <p className="font-bold">CITY DIAGNOSTICS LAB (sample)</p>
          <p className="text-muted-foreground">Patient: {demoPatient.name} · {demoPatient.age}F · 09/09/2026</p>
          <div className="mt-3 space-y-1">
            {reportLines.map(([a, b]) => (
              <p key={a} className="flex justify-between"><span>{a}</span><span>{b}</span></p>
            ))}
          </div>
          {n >= 3 && n < 5 && <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-[scan_1.6s_ease-in-out_infinite] bg-primary shadow-[0_0_20px_var(--primary)]" />}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm"><Upload className="h-4 w-4" />Upload {progress}%</div>
          <Bar value={progress} />
        </div>
      </Box>
      <Box>
        <p className="mb-3 font-semibold">What MediKiosk reads</p>
        <div className="space-y-2">
          <Status done={n > 2} label="Photo received & uploaded securely" />
          {n > 2 && <Status done={n > 3} label="Reading text (OCR)" />}
          {n > 3 && <Status done={n > 4} label="Understanding document (Gemini)" />}
          <Appear show={n > 4}>
            <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary">Detected: <b>Lab report · Blood test</b> · 09 Sep 2026</p>
          </Appear>
        </div>
        <div className="mt-4 space-y-2">
          {reportLines.map(([a, b, f], i) => (
            <Appear key={a} show={n > 5 + i}>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
                <span className="font-medium">{a}</span>
                <span className="flex items-center gap-3"><b>{b}</b><span className={`rounded-full px-2 py-0.5 text-xs ${f === "Normal" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>{f}</span></span>
              </div>
            </Appear>
          ))}
          <Appear show={n > 5 + reportLines.length}>
            <p className="text-xs text-muted-foreground">Flags come from the lab's printed range — the clinician decides what they mean.</p>
          </Appear>
        </div>
      </Box>
    </div>
  );
}

/* ---------- Prescription OCR → medicines ---------- */
const rxRaw = [
  { doc: "Dr. A · General · 02 Sep", lines: ["Tab Dolo 650  1-1-1 x 5d", "Tab Pantop 40  1-0-0 BBF"] },
  { doc: "Dr. B · Ortho · 06 Sep", lines: ["Tab Crocin Adv  SOS", "Tab Zerodl P  1-0-1 x 7d"] },
];
export function LivePrescriptionRead() {
  const n = useTick(9, 800, 400);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {rxRaw.map((rx, d) => (
          <Box key={rx.doc}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" />Prescription — {rx.doc}</p>
              <span className="text-xs text-muted-foreground">{n > d * 4 + 1 ? "Read ✓" : "Uploading…"}</span>
            </div>
            <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-4 font-[cursive] text-lg italic">
              {rx.lines.map((l) => <p key={l}>{l}</p>)}
            </div>
          </Box>
        ))}
      </div>
      <Box>
        <p className="mb-3 font-semibold">Medicines extracted</p>
        <div className="space-y-2">
          {demoMedicines.map((m, i) => (
            <Appear key={m.written} show={n > 2 + i * 1.5}>
              <div className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <b className="text-lg">{m.written}</b>
                  <span className="text-xs text-muted-foreground">{m.doctor} · {m.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{m.form} · {m.dose}</p>
              </div>
            </Appear>
          ))}
          {n < 9 && <Status done={false} label="Reading handwriting…" />}
          <Appear show={n >= 9}><p className="text-sm text-muted-foreground">Patient can correct any medicine before it is used.</p></Appear>
        </div>
      </Box>
    </div>
  );
}

/* ---------- Brand verification with web sources ---------- */
export function LiveVerification() {
  const n = useTick(demoMedicines.length * 2 + 1, 900, 400);
  return (
    <div className="space-y-3">
      {demoMedicines.map((m, i) => {
        const searching = n > i * 2 && n <= i * 2 + 1;
        const done = n > i * 2 + 1;
        const ok = m.match > 0.7;
        return (
          <Box key={m.written} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">“{m.written}” <span className="text-muted-foreground">→</span> {done ? m.brand : "…"}</p>
                {done && <p className="text-sm text-muted-foreground">{m.ingredient} · {m.form}</p>}
              </div>
              {searching && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Search className="h-4 w-4 animate-pulse" />Searching live medicine sources…</span>}
              {done && (
                <div className="flex items-center gap-3">
                  <div className="w-32"><Bar value={m.match * 100} /></div>
                  <b>{Math.round(m.match * 100)}%</b>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{m.status}</span>
                </div>
              )}
            </div>
            {done && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(ok ? ["Manufacturer product page", "Pharmacy listing"] : ["Pharmacy listing (partial match)"]).map((s) => (
                  <span key={s} className="flex items-center gap-1 rounded-full border border-border px-3 py-1"><Globe className="h-3 w-3" />{s}</span>
                ))}
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Identity match only — physical authenticity not verified</span>
              </div>
            )}
          </Box>
        );
      })}
    </div>
  );
}

/* ---------- Safety analysis ---------- */
const checks = ["Duplicate ingredients", "Same drug class overlap", "Timeline overlap", "Interactions (needs licensed data)", "Kidney dosing (needs licensed data)"];
export function LiveFindings() {
  const n = useTick(checks.length + demoFindings.length, 700, 400);
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Box>
        <p className="mb-3 font-semibold">Running checks</p>
        <div className="space-y-2">
          {checks.map((c, i) => (n > i ? <Status key={c} done label={c} /> : <p key={c} className="text-sm text-muted-foreground">○ {c}</p>))}
        </div>
      </Box>
      <div className="space-y-3">
        {demoFindings.map((f, i) => (
          <Appear key={f.title} show={n > checks.length + i - 1}>
            <Box>
              <div className="flex items-center gap-3">
                <ShieldAlert className={f.level === "High" ? "text-destructive" : "text-primary"} />
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{f.level}</span>
                <p className="text-lg font-semibold">{f.title}</p>
              </div>
              <p className="mt-2">{f.detail}</p>
              <p className="mt-1 text-sm text-muted-foreground">Next: {f.action}</p>
            </Box>
          </Appear>
        ))}
      </div>
    </div>
  );
}

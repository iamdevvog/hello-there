import { useCallback, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Mic,
  ShieldAlert,
  Stethoscope,
  Activity,
  Users,
  Pill,
  ClipboardList,
  Settings,
  Server,
  HeartPulse,
  Globe,
} from "lucide-react";
import {
  demoConversation,
  demoDocuments,
  demoFindings,
  demoMedicines,
  demoPatient,
  demoQueue,
  demoStructuredCase,
  demoVitals,
} from "./data";

type Step = {
  group: string;
  title: string;
  say: string;
  live?: string;
  icon: typeof Mic;
  body: ReactNode;
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>;
}
function Pill_({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "danger" | "ok" }) {
  const t = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    danger: "bg-destructive/10 text-destructive",
    ok: "bg-primary/10 text-primary",
  }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${t}`}>{children}</span>;
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

const steps: Step[] = [
  {
    group: "Intro",
    title: "MediKiosk — voice-first patient intake",
    icon: HeartPulse,
    say: "Patients speak their problem in Hindi or English. No typing. The clinician receives a clear, structured case — and a safety check of every medicine they already take.",
    live: "/",
    body: (
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Patient kiosk", "Speak, don't type"],
          ["Care team", "Structured cases & queue"],
          ["Medication safety", "Multi-doctor prescription check"],
        ].map(([a, b]) => (
          <Card key={a}>
            <p className="text-xl font-semibold">{a}</p>
            <p className="mt-1 text-muted-foreground">{b}</p>
          </Card>
        ))}
      </div>
    ),
  },
  {
    group: "Patient kiosk",
    title: "1. Language & consent",
    icon: Globe,
    say: "The kiosk greets in Hindi and English together. The patient taps a language and agrees to share information — every screen can be read aloud.",
    live: "/patient-kiosk",
    body: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted-foreground">Chosen language</p>
          <div className="mt-3 flex gap-3">
            <span className="rounded-xl bg-primary px-6 py-4 text-xl font-semibold text-primary-foreground">हिंदी</span>
            <span className="rounded-xl border border-border px-6 py-4 text-xl">English</span>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Consent</p>
          <p className="mt-3 flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="text-primary" /> Patient agreed to share information</p>
          <p className="mt-2 text-sm text-muted-foreground">Read-aloud on · Large text available</p>
        </Card>
      </div>
    ),
  },
  {
    group: "Patient kiosk",
    title: "2. Identification",
    icon: Users,
    say: "Basic details are collected with big tap-friendly fields. A returning patient is matched to their existing record.",
    live: "/patient-kiosk/identification",
    body: (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={demoPatient.name} />
        <Field label="Age" value={`${demoPatient.age} years`} />
        <Field label="Gender" value={demoPatient.sex} />
        <Field label="Phone" value={demoPatient.phone} />
        <div className="sm:col-span-2"><Pill_ tone="primary">Returning patient · {demoPatient.id}</Pill_></div>
      </div>
    ),
  },
  {
    group: "Patient kiosk",
    title: "3. Speak your problem",
    icon: Mic,
    say: "The patient just talks. Speech is transcribed and the kiosk reads back what it understood, so the patient can confirm it.",
    live: "/patient-kiosk/case-taking",
    body: (
      <Card className="space-y-3">
        {demoConversation.map((m, i) => (
          <div key={i} className={`flex ${m.who === "patient" ? "justify-end" : ""}`}>
            <p className={`max-w-[80%] rounded-2xl px-4 py-3 text-base ${m.who === "patient" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.who === "patient" && <Mic className="mr-2 inline h-4 w-4" />}
              {m.text}
            </p>
          </div>
        ))}
      </Card>
    ),
  },
  {
    group: "Patient kiosk",
    title: "4. Vitals & documents",
    icon: Activity,
    say: "Vitals are recorded and old reports or prescriptions are photographed. MediKiosk reads them automatically.",
    live: "/patient-kiosk/vitals",
    body: (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold">Vitals</p>
          <div className="grid grid-cols-2 gap-2">
            {demoVitals.map(([l, v, u]) => <Field key={l} label={l} value={`${v} ${u}`} />)}
          </div>
        </Card>
        <Card>
          <p className="mb-3 font-semibold">Documents uploaded</p>
          <ul className="space-y-2">
            {demoDocuments.map((d) => (
              <li key={d.title} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />{d.title}</span>
                <Pill_ tone="ok">{d.fields} fields read</Pill_>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    ),
  },
  {
    group: "Patient kiosk",
    title: "5. Check-in complete",
    icon: CheckCircle2,
    say: "The patient gets a token number. Behind the scenes, their words became a structured case for the doctor.",
    live: "/patient-kiosk/complete",
    body: (
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <Card className="text-center">
          <p className="text-sm text-muted-foreground">Your token</p>
          <p className="mt-2 text-6xl font-bold text-primary">{demoPatient.token}</p>
          <p className="mt-2 text-sm">Please take a seat</p>
        </Card>
        <Card>
          <p className="mb-3 font-semibold">Structured case sent to clinician</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {demoStructuredCase.map(([l, v]) => <Field key={l} label={l} value={v} />)}
          </div>
        </Card>
      </div>
    ),
  },
  {
    group: "Care team",
    title: "6. Assisted kiosk (reception)",
    icon: ClipboardList,
    say: "Staff can help elderly or low-literacy patients through the same intake and track who is waiting.",
    live: "/assisted-kiosk",
    body: (
      <Card>
        <div className="mb-3 flex gap-2"><Pill_ tone="primary">3 waiting</Pill_><Pill_>2 in progress</Pill_><Pill_ tone="ok">2 ready</Pill_></div>
        <QueueTable />
      </Card>
    ),
  },
  {
    group: "Care team",
    title: "7. Clinician dashboard",
    icon: Stethoscope,
    say: "The doctor sees a prioritised queue. Urgent and priority cases rise to the top, already prepared.",
    live: "/clinician",
    body: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Ready to review" value="6" />
          <Field label="Needs attention" value="4" />
          <Field label="Average wait" value="18 min" />
          <Field label="Completed today" value="9" />
        </div>
        <Card><QueueTable /></Card>
      </div>
    ),
  },
  {
    group: "Care team",
    title: "8. Prepared patient case",
    icon: FileText,
    say: "One click opens the full case: what the patient said (original + translation), vitals, documents and alerts — before the consultation starts.",
    live: "/clinician/patients",
    body: (
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-2xl font-semibold">{demoPatient.name} · {demoPatient.age}F</p>
          <p className="text-muted-foreground">Hindi · Token {demoPatient.token}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {demoStructuredCase.slice(0, 4).map(([l, v]) => <Field key={l} label={l} value={v} />)}
          </div>
        </Card>
        <Card>
          <p className="mb-2 font-semibold">Alerts</p>
          <p className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><ShieldAlert className="h-4 w-4 shrink-0" />Duplicate paracetamol across two prescriptions</p>
          <p className="mt-3 mb-2 font-semibold">Vitals</p>
          <p className="text-sm text-muted-foreground">BP 128/82 · Pulse 78 · SpO₂ 98%</p>
        </Card>
      </div>
    ),
  },
  {
    group: "Medication safety",
    title: "9. Prescriptions from multiple doctors",
    icon: FileText,
    say: "Patients often see several doctors. They upload all prescriptions; MediKiosk reads handwriting and extracts every medicine.",
    live: "/medication-safety",
    body: (
      <div className="grid gap-4 sm:grid-cols-2">
        {demoDocuments.slice(1).map((d) => (
          <Card key={d.title}>
            <FileText className="h-8 w-8 text-primary" />
            <p className="mt-2 text-lg font-semibold">{d.title}</p>
            <p className="text-sm text-muted-foreground">{d.date}</p>
            <div className="mt-3"><Pill_ tone="ok">Read · {d.fields} medicines found</Pill_></div>
          </Card>
        ))}
      </div>
    ),
  },
  {
    group: "Medication safety",
    title: "10. Indian brand verification",
    icon: Pill,
    say: "Each brand is matched to its active ingredient using live web sources with links. Low-confidence matches go to a pharmacist — and 'not found' never means fake.",
    live: "/medication-safety",
    body: (
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted-foreground"><tr><th className="py-2">Written</th><th>Matched product</th><th>Ingredient</th><th>Match</th><th>Status</th></tr></thead>
          <tbody>
            {demoMedicines.map((m) => (
              <tr key={m.written} className="border-t border-border">
                <td className="py-3 font-semibold">{m.written}</td>
                <td>{m.brand}</td>
                <td>{m.ingredient}</td>
                <td>{Math.round(m.match * 100)}%</td>
                <td><Pill_ tone={m.match > 0.7 ? "ok" : "danger"}>{m.status}</Pill_></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    ),
  },
  {
    group: "Medication safety",
    title: "11. One medication timeline",
    icon: Activity,
    say: "All doctors' medicines are combined into one chronological timeline so overlaps are obvious.",
    live: "/medication-safety",
    body: (
      <Card className="space-y-3">
        {demoMedicines.map((m) => (
          <div key={m.written} className="flex items-center gap-4">
            <span className="w-16 text-sm font-semibold text-muted-foreground">{m.date}</span>
            <span className="h-3 w-3 rounded-full bg-primary" />
            <div className="flex-1 rounded-xl border border-border px-4 py-2">
              <span className="font-semibold">{m.brand}</span> <span className="text-muted-foreground">· {m.dose} · {m.doctor}</span>
            </div>
          </div>
        ))}
      </Card>
    ),
  },
  {
    group: "Medication safety",
    title: "12. Safety findings",
    icon: ShieldAlert,
    say: "Findings are ranked by priority, each with a plain explanation and the next action. Checks without a licensed source are shown as unavailable — never guessed.",
    live: "/medication-safety",
    body: (
      <div className="space-y-3">
        {demoFindings.map((f) => (
          <Card key={f.title}>
            <div className="flex items-center gap-3"><Pill_ tone={f.level === "High" ? "danger" : f.level === "Review" ? "primary" : "muted"}>{f.level}</Pill_><p className="text-lg font-semibold">{f.title}</p></div>
            <p className="mt-2">{f.detail}</p>
            <p className="mt-1 text-sm text-muted-foreground">Next: {f.action}</p>
          </Card>
        ))}
      </div>
    ),
  },
  {
    group: "Medication safety",
    title: "13. Professional review & report",
    icon: CheckCircle2,
    say: "A pharmacist or clinician signs off, and a clean PDF report is generated for the patient's next doctor.",
    live: "/medication-safety",
    body: (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div><p className="text-xs uppercase text-primary">MediKiosk · Medication safety report</p><p className="text-2xl font-semibold">{demoPatient.name}</p></div>
          <Pill_ tone="ok">Reviewed by pharmacist</Pill_>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Prescriptions" value="2" />
          <Field label="Medicines" value="4" />
          <Field label="High priority" value="1" />
          <Field label="Needs confirmation" value="1" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Decision support only — not a diagnosis. Physical authenticity of medicines is not verified.</p>
      </Card>
    ),
  },
  {
    group: "Patient & platform",
    title: "14. Patient health home",
    icon: HeartPulse,
    say: "Patients get their own portal: consultations, reports, documents, timeline and an assistant to answer simple questions.",
    live: "/patient",
    body: (
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Latest visit</p><p className="text-lg font-semibold">Ayurveda OPD · 09 Sep</p></Card>
        <Card><p className="text-sm text-muted-foreground">Documents</p><p className="text-lg font-semibold">3 available</p></Card>
        <Card><p className="text-sm text-muted-foreground">Assistant</p><p className="text-lg font-semibold">“When is my next visit?”</p></Card>
      </div>
    ),
  },
  {
    group: "Patient & platform",
    title: "15. Operations & admin",
    icon: Settings,
    say: "Operators monitor processing health and audit trails; admins manage facilities, users and roles.",
    live: "/admin",
    body: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><Server className="text-primary" /><p className="mt-2 text-lg font-semibold">Operations</p><p className="text-muted-foreground">Outbox, retries, manual review, audit trail</p></Card>
        <Card><Settings className="text-primary" /><p className="mt-2 text-lg font-semibold">Admin</p><p className="text-muted-foreground">Facilities, users, roles, configuration</p></Card>
      </div>
    ),
  },
  {
    group: "Close",
    title: "Thank you",
    icon: CheckCircle2,
    say: "From a patient's spoken words to a reviewed, safer medication plan — in one MediKiosk flow.",
    live: "/",
    body: (
      <Card className="text-center">
        <p className="text-3xl font-semibold">Speak → Structure → Safer care</p>
        <p className="mt-2 text-muted-foreground">Hindi & English · Voice-first · Professional review built in</p>
      </Card>
    ),
  },
];

function QueueTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-muted-foreground"><tr><th className="py-2">Patient</th><th>Concern</th><th>Wait</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          {demoQueue.map((p) => (
            <tr key={p.name} className="border-t border-border">
              <td className="py-3 font-semibold">{p.name} · {p.age}</td>
              <td>{p.concern}</td>
              <td>{p.wait} min</td>
              <td><Pill_ tone={p.priority === "Urgent" ? "danger" : p.priority === "Priority" ? "primary" : "muted"}>{p.priority}</Pill_></td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DemoTour() {
  const { step: raw } = useSearch({ from: "/demo" });
  const navigate = useNavigate({ from: "/demo" });
  const step = Math.min(raw, steps.length - 1);
  const s = steps[step];
  const go = useCallback(
    (n: number) => navigate({ search: { step: Math.max(0, Math.min(steps.length - 1, n)) }, replace: true }),
    [navigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(step + 1); }
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    document.title = `${step + 1}/${steps.length} — ${s.title} · MediKiosk Demo`;
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, s.title]);

  const Icon = s.icon;
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <Link to="/" className="text-lg font-bold">MediKiosk <span className="font-normal text-muted-foreground">· Demo</span></Link>
        <span className="text-xs text-muted-foreground">Sample data only</span>
      </header>
      <div className="h-1 bg-muted"><div className="h-1 bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-5 py-6">
        <nav className="hidden w-56 shrink-0 space-y-1 lg:block">
          {steps.map((x, i) => (
            <button key={i} onClick={() => go(i)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${i === step ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {x.title}
            </button>
          ))}
        </nav>

        <main className="flex-1 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{s.group} · {step + 1} of {steps.length}</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-semibold sm:text-4xl"><Icon className="h-8 w-8 text-primary" />{s.title}</h1>
            <p className="mt-3 max-w-3xl text-lg text-muted-foreground">{s.say}</p>
          </div>
          <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">{s.body}</div>
        </main>
      </div>

      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <button onClick={() => go(step - 1)} disabled={step === 0} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {s.live ? <a href={s.live} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open real page ↗</a> : <span />}
        <button onClick={() => go(step + 1)} disabled={step === steps.length - 1} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-40">
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import {
  CheckCircle2, FileText, Mic, ShieldAlert, Stethoscope, Users, Pill, Clock, Bell, Download,
  PenLine, Volume2, Type, Globe, Server, Settings, Activity, HeartPulse, MessageCircle, Building2, KeyRound, AlertTriangle, RefreshCw, Search,
} from "lucide-react";
import { Box, useTick } from "./live";
import { demoFindings, demoMedicines, demoPatient, demoQueue, demoStructuredCase, demoVitals } from "./data";

function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "danger" }) {
  const t = { muted: "bg-muted text-muted-foreground", primary: "bg-primary-soft text-primary", danger: "bg-destructive/10 text-destructive" }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${t}`}>{children}</span>;
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
function H({ icon: I, children }: { icon: typeof Mic; children: ReactNode }) {
  return <p className="mb-3 flex items-center gap-2 font-semibold"><I className="h-4 w-4 text-primary" />{children}</p>;
}
function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return show ? <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div> : null;
}

/* Intro */
export function IntroDetail() {
  const flow = [
    [Mic, "Patient speaks", "Hindi / English, no typing"],
    [FileText, "Papers read", "Reports & prescriptions"],
    [Stethoscope, "Doctor gets a case", "Structured & prioritised"],
    [Pill, "Medicines checked", "Across all doctors"],
    [CheckCircle2, "Reviewed report", "Signed by a professional"],
  ] as const;
  const n = useTick(flow.length, 450);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {flow.map(([I, a, b], i) => (
          <div key={a} className={`rounded-2xl border p-4 transition-all duration-500 ${n > i ? "border-primary/40 bg-card opacity-100" : "border-border opacity-30"}`}>
            <I className="h-6 w-6 text-primary" /><p className="mt-2 font-semibold">{a}</p><p className="text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Box><H icon={AlertTriangle}>The problem</H><ul className="space-y-2 text-sm"><li>• Long OPD queues, little time per patient</li><li>• Many patients can't fill forms or type</li><li>• Prescriptions from several doctors are never compared</li></ul></Box>
        <Box><H icon={HeartPulse}>Our answer</H><ul className="space-y-2 text-sm"><li>• Voice-first kiosk in the patient's language</li><li>• Every paper read automatically</li><li>• Medicine overlaps flagged before harm</li></ul></Box>
        <Box><H icon={Users}>Who uses it</H><div className="flex flex-wrap gap-2"><Tag tone="primary">Patients</Tag><Tag tone="primary">Reception</Tag><Tag tone="primary">Doctors</Tag><Tag tone="primary">Pharmacists</Tag><Tag>Operators</Tag><Tag>Admins</Tag></div></Box>
      </div>
    </div>
  );
}

/* Language & consent */
export function LanguageConsent() {
  const n = useTick(5, 900);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Box>
        <H icon={Globe}>Choose language</H>
        <p className="text-sm text-muted-foreground">नमस्ते · Welcome</p>
        <div className="mt-3 grid gap-2">
          <span className={`rounded-xl px-5 py-4 text-xl font-semibold transition ${n > 0 ? "bg-primary text-primary-foreground" : "border border-border"}`}>हिंदी</span>
          <span className="rounded-xl border border-border px-5 py-4 text-xl">English</span>
        </div>
      </Box>
      <Box>
        <H icon={CheckCircle2}>Consent, in plain words</H>
        <ul className="space-y-2 text-sm">
          {["Your answers go only to your care team", "Papers you show are read to help your doctor", "You can stop at any time", "A staff member can help you"].map((t, i) => (
            <li key={t} className="flex gap-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${n > i + 1 ? "text-primary" : "text-muted-foreground/40"}`} />{t}</li>
          ))}
        </ul>
        <Fade show={n > 4}><p className="mt-3 rounded-xl bg-primary-soft p-3 text-sm font-semibold text-primary">✓ मैं सहमत हूँ — I agree (09:58 AM)</p></Fade>
      </Box>
      <Box>
        <H icon={Volume2}>Accessibility built in</H>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><Volume2 className="h-4 w-4" />Every screen read aloud</p>
          <p className="flex items-center gap-2"><Type className="h-4 w-4" />Large text & high contrast</p>
          <p className="flex items-center gap-2"><Mic className="h-4 w-4" />Answer by voice or by tapping</p>
          <p className="flex items-center gap-2"><Users className="h-4 w-4" />Call staff button on every screen</p>
        </div>
      </Box>
    </div>
  );
}

/* Check-in complete */
export function CheckinComplete() {
  const n = useTick(4, 700);
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
      <Box className="text-center">
        <p className="text-sm text-muted-foreground">आपका टोकन · Your token</p>
        <p className="mt-2 text-7xl font-bold text-primary">{demoPatient.token}</p>
        <p className="mt-2">Ayurveda OPD · Room 3</p>
        <p className="text-sm text-muted-foreground">Estimated wait ~12 min</p>
      </Box>
      <Box>
        <H icon={FileText}>Structured case sent to clinician</H>
        <div className="grid gap-2 sm:grid-cols-2">
          {demoStructuredCase.map(([l, v]) => <Stat key={l} label={l ?? ""} value={v ?? ""} />)}
        </div>
      </Box>
      <Box>
        <H icon={Activity}>Handoff</H>
        <div className="space-y-2 text-sm">
          {["Case saved", "Vitals attached (5)", "Documents attached (3)", "Added to doctor's queue"].map((t, i) => (
            <p key={t} className={`flex items-center gap-2 ${n > i ? "" : "opacity-30"}`}><CheckCircle2 className="h-4 w-4 text-primary" />{t}</p>
          ))}
        </div>
      </Box>
    </div>
  );
}

/* Assisted kiosk */
export function AssistedDetail() {
  const [started, setStarted] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Box>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Reception queue · Today</p>
          <div className="flex gap-2"><Tag tone="primary">3 waiting</Tag><Tag>2 in progress</Tag><Tag tone="primary">2 ready</Tag><Tag>1 done</Tag></div>
        </div>
        <div className="space-y-2">
          {demoQueue.map((p, i) => (
            <div key={p.name} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${i === 0 ? "border-primary bg-primary-soft/40" : "border-border"}`}>
              <div><p className="font-semibold">{p.name} · {p.age}</p><p className="text-sm text-muted-foreground">{p.concern} · arrived {p.wait} min ago</p></div>
              <Tag tone={p.priority === "Urgent" ? "danger" : "muted"}>{i === 0 && started ? "In progress" : p.status}</Tag>
            </div>
          ))}
        </div>
      </Box>
      <Box>
        <H icon={Users}>Selected: {demoPatient.name}</H>
        <div className="space-y-1 text-sm"><p>Language: Hindi · Needs help reading</p><p>Vitals: not recorded</p><p>Documents: 0</p></div>
        <button onClick={() => setStarted(true)} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">{started ? "✓ Assisted intake started" : "Start assisted intake"}</button>
        {started && (
          <div className="mt-4 space-y-2 animate-in fade-in">
            <p className="text-sm font-semibold">Progress</p>
            <div className="h-2 rounded-full bg-muted"><div className="h-2 w-1/8 rounded-full bg-primary" style={{ width: "12%" }} /></div>
            <p className="text-xs text-muted-foreground">Step 1 of 8 · Introduction — staff reads questions with the patient</p>
          </div>
        )}
      </Box>
    </div>
  );
}

/* Clinician dashboard */
export function ClinicianDetail() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ready to review" value="6" sub="+2 in last hour" />
        <Stat label="Needs attention" value="4" sub="1 urgent" />
        <Stat label="Average wait" value="18 min" sub="target 20" />
        <Stat label="Completed today" value="9" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Box>
          <H icon={Stethoscope}>Your clinical queue — sorted by priority</H>
          <div className="space-y-2">
            {[...demoQueue].sort((a, b) => (a.priority === "Urgent" ? -1 : b.priority === "Urgent" ? 1 : 0)).map((p) => (
              <div key={p.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border px-4 py-3">
                <div><p className="font-semibold">{p.name} · {p.age}</p><p className="text-sm text-muted-foreground">{p.concern}</p></div>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3 w-3" />{p.wait}m</span>
                <Tag tone={p.priority === "Urgent" ? "danger" : p.priority === "Priority" ? "primary" : "muted"}>{p.priority}</Tag>
              </div>
            ))}
          </div>
        </Box>
        <div className="space-y-4">
          <Box>
            <H icon={Bell}>Needs your attention</H>
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Anjali Singh — severe headache, waiting 23 min</p>
            <p className="mt-2 rounded-xl bg-primary-soft p-3 text-sm text-primary">Meera Sharma — duplicate paracetamol flagged</p>
          </Box>
          <Box>
            <H icon={FileText}>Next prepared case</H>
            <p className="font-semibold">{demoPatient.name} · {demoPatient.age}F</p>
            <p className="text-sm text-muted-foreground">Abdominal pain · 4 days · 3 documents</p>
          </Box>
        </div>
      </div>
    </div>
  );
}

/* Prepared case */
export function CaseDetail() {
  const [tab, setTab] = useState<"said" | "vitals" | "docs" | "meds">("said");
  const tabs = [["said", "What patient said"], ["vitals", "Vitals"], ["docs", "Documents"], ["meds", "Medicines"]] as const;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Box>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-2xl font-semibold">{demoPatient.name} · {demoPatient.age}F</p><p className="text-muted-foreground">{demoPatient.id} · Hindi · Token {demoPatient.token}</p></div>
          <Tag tone="primary">Priority</Tag>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="mt-4 min-h-[220px]">
          {tab === "said" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Original (Hindi)</p><p>“पिछले चार दिन से पेट में दर्द है, खाने के बाद ज़्यादा होता है। थोड़ी जलन भी होती है।”</p></div>
              <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Translation</p><p>“Stomach pain for the last four days, worse after eating. Some burning too.”</p></div>
              <div className="grid gap-2 sm:grid-cols-3">{demoStructuredCase.slice(0, 6).map(([l, v]) => <Stat key={l} label={l ?? ""} value={v ?? ""} />)}</div>
            </div>
          )}
          {tab === "vitals" && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{demoVitals.map(([l, v, u]) => <Stat key={l} label={l ?? ""} value={`${v} ${u}`} />)}</div>}
          {tab === "docs" && (
            <div className="space-y-2">
              {[["Blood test", "Hb 11.8 g/dL (Low) · Glucose 104 (Borderline)"], ["Prescription — Dr. A", "Dolo 650, Pantop 40"], ["Prescription — Dr. B", "Crocin Advance, Zerodl P"]].map(([a, b]) => (
                <div key={a} className="flex items-center gap-3 rounded-xl border border-border p-3"><FileText className="h-5 w-5 text-primary" /><div><p className="font-semibold">{a}</p><p className="text-sm text-muted-foreground">{b}</p></div></div>
              ))}
            </div>
          )}
          {tab === "meds" && (
            <div className="space-y-2">{demoMedicines.map((m) => <div key={m.written} className="flex justify-between rounded-xl border border-border p-3"><span><b>{m.brand}</b> · {m.dose}</span><span className="text-sm text-muted-foreground">{m.doctor}</span></div>)}</div>
          )}
        </div>
      </Box>
      <div className="space-y-4">
        <Box>
          <H icon={ShieldAlert}>Alerts</H>
          <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Duplicate paracetamol across two prescriptions</p>
          <p className="mt-2 rounded-xl bg-primary-soft p-3 text-sm text-primary">One medicine identity needs confirmation</p>
        </Box>
        <Box>
          <H icon={PenLine}>Clinician notes</H>
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Add assessment, plan and sign the case…</p>
          <p className="mt-2 text-xs text-muted-foreground">Try the tabs above ↑</p>
        </Box>
      </div>
    </div>
  );
}

/* Timeline */
export function TimelineDetail() {
  const days = ["02 Sep", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"];
  const bars = [
    { m: "Dolo 650", d: "Dr. A", s: 0, e: 5, tone: "danger" },
    { m: "Pantop 40", d: "Dr. A", s: 0, e: 12, tone: "primary" },
    { m: "Crocin Advance", d: "Dr. B", s: 4, e: 12, tone: "danger" },
    { m: "Zerodol-P (?)", d: "Dr. B", s: 4, e: 11, tone: "muted" },
  ];
  return (
    <div className="space-y-4">
      <Box className="overflow-x-auto">
        <H icon={Activity}>Combined medication timeline · 2 doctors · 4 medicines</H>
        <div className="min-w-[720px]">
          <div className="ml-44 grid grid-cols-12 text-xs text-muted-foreground">{days.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mt-2 space-y-3">
            {bars.map((b, i) => (
              <div key={b.m} className="flex items-center gap-3">
                <div className="w-40 shrink-0"><p className="font-semibold">{b.m}</p><p className="text-xs text-muted-foreground">{b.d}</p></div>
                <div className="relative h-8 flex-1 rounded-lg bg-muted/50">
                  <div
                    className={`absolute inset-y-1 rounded-md animate-in slide-in-from-left duration-700 ${b.tone === "danger" ? "bg-destructive/70" : b.tone === "primary" ? "bg-primary/70" : "bg-muted-foreground/40"}`}
                    style={{ left: `${(b.s / 12) * 100}%`, width: `${((b.e - b.s) / 12) * 100}%`, animationDelay: `${i * 200}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="ml-44 mt-2 rounded-lg bg-destructive/10 px-3 py-1 text-xs text-destructive" style={{ marginLeft: `calc(11rem + ${(4 / 12) * 100}% * 0.8)`, width: "fit-content" }}>
            06–07 Sep: two paracetamol products overlap
          </div>
        </div>
      </Box>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active now" value="3" sub="Pantop, Crocin, Zerodol-P" />
        <Stat label="Overlapping days" value="2" sub="06–07 Sep" />
        <Stat label="Prescribers" value="2" sub="General · Ortho" />
      </div>
    </div>
  );
}

/* Report */
export function ReportDetail() {
  const n = useTick(4, 900);
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <Box>
          <H icon={PenLine}>Professional sign-off</H>
          <div className="space-y-2 text-sm">
            {["Medicines reviewed (4)", "Identity confirmed (3 of 4)", "Findings accepted (2)", "Signed: Pharm. R. Iyer (sample)"].map((t, i) => (
              <p key={t} className={`flex items-center gap-2 transition ${n > i ? "" : "opacity-30"}`}><CheckCircle2 className="h-4 w-4 text-primary" />{t}</p>
            ))}
          </div>
        </Box>
        <Box>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"><Download className="h-4 w-4" />Download PDF</button>
          <p className="mt-2 text-xs text-muted-foreground">Version 3 · every change is kept in the audit history</p>
        </Box>
      </div>
      <Box className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div><p className="text-xs uppercase tracking-wider text-primary">MediKiosk · Medication safety report</p><p className="text-3xl font-semibold">{demoPatient.name}</p><p className="text-sm text-muted-foreground">{demoPatient.age} y · Female · 64 kg · Allergies: none recorded · Report 10 Sep 2026</p></div>
          <Tag tone="primary">{n > 3 ? "Reviewed by pharmacist" : "Draft — awaiting review"}</Tag>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Prescriptions" value="2" /><Stat label="Medicines" value="4" /><Stat label="High priority" value="1" /><Stat label="Needs confirmation" value="1" />
        </div>
        <section>
          <p className="mb-2 text-lg font-semibold">1. Summary</p>
          <p>Four medicines from two prescribers were reconciled. One high-priority concern was found: <b>paracetamol is prescribed twice</b> (Dolo 650 and Crocin Advance). One product could not be confirmed from handwriting.</p>
        </section>
        <section>
          <p className="mb-2 text-lg font-semibold">2. Medicine list</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="py-1">Medicine</th><th>Ingredient</th><th>Dose</th><th>Prescriber</th><th>Identity</th></tr></thead><tbody>
            {demoMedicines.map((m) => <tr key={m.written} className="border-t border-border"><td className="py-2 font-semibold">{m.brand}</td><td>{m.ingredient}</td><td>{m.dose}</td><td>{m.doctor}</td><td>{m.match > 0.7 ? "Confirmed" : "Unconfirmed"}</td></tr>)}
          </tbody></table></div>
        </section>
        <section>
          <p className="mb-2 text-lg font-semibold">3. Findings & actions</p>
          <div className="space-y-2">{demoFindings.map((f) => <div key={f.title} className="rounded-xl border border-border p-3"><div className="flex items-center gap-2"><Tag tone={f.level === "High" ? "danger" : "muted"}>{f.level}</Tag><b>{f.title}</b></div><p className="mt-1 text-sm text-muted-foreground">Action: {f.action}</p></div>)}</div>
        </section>
        <section className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Decision support only — not a diagnosis or prescription. Product identity is matched from text; physical authenticity of medicines is not verified. Checks needing licensed data are marked unavailable.</section>
      </Box>
    </div>
  );
}

/* Patient home */
export function PatientHomeDetail() {
  const [q, setQ] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Box>
          <p className="text-sm text-muted-foreground">Namaste,</p><p className="text-2xl font-semibold">{demoPatient.name}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Latest visit" value="09 Sep" sub="Ayurveda OPD · Completed" />
            <Stat label="Documents" value="3" sub="1 new" />
            <Stat label="Medication report" value="Ready" sub="Reviewed" />
          </div>
        </Box>
        <Box>
          <H icon={Clock}>My health journey</H>
          <div className="space-y-3 border-l-2 border-primary/30 pl-4">
            {[["10 Sep", "Medication safety report ready"], ["09 Sep", "Consultation completed — Ayurveda OPD"], ["09 Sep", "Blood test added to records"], ["06 Sep", "Prescription from Dr. B uploaded"], ["02 Sep", "Prescription from Dr. A uploaded"]].map(([d, t]) => (
              <div key={t}><p className="text-xs text-muted-foreground">{d}</p><p className="font-medium">{t}</p></div>
            ))}
          </div>
        </Box>
      </div>
      <Box>
        <H icon={MessageCircle}>Health assistant</H>
        <div className="space-y-2 text-sm">
          <button onClick={() => setQ(true)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-muted">“मेरी रिपोर्ट कहाँ है?” — Where is my report?</button>
          {q && <p className="rounded-xl bg-primary-soft p-3 text-primary animate-in fade-in">Your blood test from 09 Sep is in <b>Documents</b>. Your medication report is under <b>Reports</b>. For medical advice, please ask your doctor.</p>}
          <p className="text-xs text-muted-foreground">Answers about your records only — no diagnosis. (Tap the question)</p>
        </div>
      </Box>
    </div>
  );
}

/* Ops & admin */
export function OpsAdminDetail() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Box>
        <H icon={Server}>Operations — system health</H>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Events processed" value="1,284" sub="today" /><Stat label="Pending" value="3" /><Stat label="Failed" value="1" sub="retry ready" />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {[["OCR · prescription DOC-118", "Completed", "muted"], ["Gemini · case summary MK-…001", "Completed", "muted"], ["Web evidence · Zerodl P", "Manual review", "primary"], ["Sync · encounter 7731", "Failed — retry", "danger"]].map(([a, b, t]) => (
            <div key={a} className="flex items-center justify-between rounded-xl border border-border px-3 py-2"><span>{a}</span><Tag tone={t as "muted"}>{b}</Tag></div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3" />Failed jobs can be replayed safely · <Search className="h-3 w-3" />Full audit trail</p>
      </Box>
      <Box>
        <H icon={Settings}>Admin — facility setup</H>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Facilities" value="3" /><Stat label="Staff users" value="42" /><Stat label="Kiosks" value="7" />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {[[Building2, "City OPD — Main building", "Active"], [Users, "Roles: Reception, Clinician, Pharmacist, Operator, Admin", "5 roles"], [KeyRound, "External processing approval", "On"], [Globe, "Languages enabled", "Hindi, English"]].map(([I, a, b]) => {
            const Icon = I as typeof Mic;
            return <div key={a as string} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{a as string}</span><Tag>{b as string}</Tag></div>;
          })}
        </div>
      </Box>
    </div>
  );
}

/* Close */
export function ClosingDetail() {
  return (
    <div className="space-y-4">
      <Box className="text-center">
        <p className="text-4xl font-semibold">Speak → Structure → Safer care</p>
        <p className="mt-2 text-muted-foreground">Hindi & English · Voice-first · Professional review built in</p>
      </Box>
      <div className="grid gap-3 sm:grid-cols-4">
        {[["6", "user roles served"], ["12", "kiosk steps, all voice-guided"], ["2", "languages today"], ["0", "medicines called fake without proof"]].map(([a, b]) => (
          <Box key={b} className="text-center"><p className="text-4xl font-bold text-primary">{a}</p><p className="text-sm text-muted-foreground">{b}</p></Box>
        ))}
      </div>
      <Box>
        <H icon={CheckCircle2}>Built with</H>
        <div className="flex flex-wrap gap-2">{["Gemini — clinical reading", "Groq — assistant, voice & web search", "ElevenLabs — spoken prompts", "OCR.space — document text", "Turso — secure storage", "Clerk — sign-in"].map((t) => <Tag key={t} tone="primary">{t}</Tag>)}</div>
      </Box>
    </div>
  );
}

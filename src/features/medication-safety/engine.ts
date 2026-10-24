import { z } from "zod";
import { normalize, timeline, type Alert, type Analysis, type SafetyCase } from "./model";

export const ruleSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    reviewedBy: z.string().min(1),
    reviewedAt: z.string().min(1),
    category: z.enum(["interaction", "renal", "dose", "allergy", "condition", "age"]),
    ingredients: z.array(z.string()).min(1),
    severity: z.enum(["Critical", "High", "Moderate", "Low"]),
    title: z.string().min(1),
    rationale: z.string().min(1),
    source: z.string().min(1),
    reference: z.string().url(),
    threshold: z.number().optional(),
    maxAgeDays: z.number().int().positive().optional(),
    condition: z.string().optional(),
  })
  .superRefine((r, c) => {
    if (["renal", "dose", "age"].includes(r.category) && r.threshold === undefined)
      c.addIssue({ code: "custom", message: "A reviewed threshold is required" });
    if (r.category === "renal" && !r.maxAgeDays)
      c.addIssue({ code: "custom", message: "Renal rules require a freshness window" });
    if (r.category === "interaction" && r.ingredients.length < 2)
      c.addIssue({ code: "custom", message: "Interaction rules need both ingredients" });
    if (["condition", "allergy"].includes(r.category) && !r.condition)
      c.addIssue({ code: "custom", message: "Exact documented condition required" });
  });
export type SafetyRule = z.infer<typeof ruleSchema>;
const active = (s: string) => s === "reportedly-taking" || s === "reconciled";
export function analyze(
  c: SafetyCase,
  rules: SafetyRule[],
  at = new Date().toISOString(),
): Analysis {
  const previous = c.analyses.at(-1);
  const alerts: Alert[] = [];
  const add = (input: Partial<Alert> & Pick<Alert, "id" | "title" | "reason" | "medicineIds">) => {
    alerts.push({
      ruleId: "IDENTITY-COMPLETENESS",
      ruleVersion: "1.0",
      category: "Uncertainty",
      severity: "Unable to Assess",
      ingredients: [],
      explanation: input.reason,
      source: "Recorded prescription and reconciliation data",
      reference: "Internal structural reconciliation rule; no clinical severity assigned",
      missing: [],
      timestamp: at,
      review: "pending",
      decisionNotes: "",
      patientInputs: [],
      ...input,
    });
  };
  const groups = new Map<string, typeof c.medicines>();
  for (const m of c.medicines) {
    if (m.verification !== "verified" || !m.ingredients.length) {
      add({
        id: `identity:${m.id}`,
        title: `Identity unresolved: ${m.originalName}`,
        medicineIds: [m.id],
        reason:
          "A licensed catalogue identity has not been confirmed. Ingredient-dependent checks are incomplete.",
        missing: ["Verified ingredient identity"],
      });
      continue;
    }
    if (m.uncertainty.length || !m.instructions || !m.strength)
      add({
        id: `instructions:${m.id}`,
        title: `Instructions require clarification: ${m.originalName}`,
        medicineIds: [m.id],
        reason: "Missing or ambiguous fields cannot be interpreted as an intended dose.",
        missing: [
          ...m.uncertainty,
          ...(!m.instructions ? ["Instructions"] : []),
          ...(!m.strength ? ["Strength"] : []),
        ],
      });
    if (m.status === "discontinued") continue;
    for (const i of m.ingredients) {
      const key = normalize(i.name);
      const list = groups.get(key) ?? [];
      if (!list.some((x) => x.id === m.id)) list.push(m);
      groups.set(key, list);
    }
  }
  for (const [ingredient, medicines] of groups) {
    if (medicines.length < 2) continue;
    const concurrent = medicines.every(
      (m) =>
        active(m.status) &&
        (!m.endDate || m.endDate >= at.slice(0, 10)) &&
        (!m.startDate || m.startDate <= at.slice(0, 10)),
    );
    add({
      id: `duplicate:${ingredient}:${medicines
        .map((m) => m.id)
        .sort()
        .join(":")}`,
      ruleId: "INGREDIENT-OVERLAP",
      category: "Duplicate ingredient",
      title: `${concurrent ? "Recorded ongoing" : "Potential"} ingredient overlap: ${ingredient}`,
      medicineIds: medicines.map((m) => m.id),
      ingredients: [ingredient],
      reason: `${medicines.length} distinct prescription entries contain the same catalogue-verified ingredient. ${concurrent ? "All are recorded as ongoing; professional assessment is needed." : "Concurrent use is not established from the recorded dates and statuses."}`,
      missing: concurrent ? [] : ["Confirm dates and current use"],
      explanation:
        "A shared ingredient is a reconciliation finding, not an instruction to stop or change treatment. Clinical severity has not been assigned.",
    });
  }
  const latest = c.renal
    .filter((r) => r.kind === "eGFR" && r.date<=at.slice(0,10))
    .sort((a, b) => b.date.localeCompare(a.date))
    .at(0);
  const checks: Analysis["checks"] = [
    {
      category: "Identity and ingredient overlaps",
      status: !c.medicines.length || c.prescriptions.some(d=>d.status!=="Verified") || c.medicines.some((m) => m.verification !== "verified") ? "incomplete" : "completed",
      reason:
        "Verified combination ingredients are expanded; uncertain current use remains qualified. Structural findings have no clinical severity.",
    },
  ];
  for (const category of ["interaction", "renal", "dose", "allergy", "condition", "age"] as const) {
    const relevant = rules.filter((r) => r.category === category);
    if (!relevant.length) {
      checks.push({
        category,
        status: "unavailable",
        reason: `No reviewed, licensed ${category} knowledge source configured.`,
      });
      continue;
    }
    let incomplete = false;
    for (const r of relevant) {
      const matched = c.medicines.filter(
        (m) =>
          m.verification === "verified" &&
          active(m.status) &&
          (!m.startDate || m.startDate <= at.slice(0, 10)) &&
          (!m.endDate || m.endDate >= at.slice(0, 10)) &&
          m.ingredients.some((i) => r.ingredients.some((x) => normalize(x) === normalize(i.name))),
      );
      const missing: string[] = [];
      let triggered = false;
      if (
        c.medicines.some(
          (m) =>
            m.verification !== "verified" || (!active(m.status) && m.status !== "discontinued"),
        )
      ) {
        incomplete = true;
      }
      if (category === "interaction")
        triggered =
          r.ingredients.every((i) =>
            matched.some((m) => m.ingredients.some((x) => normalize(x.name) === normalize(i))),
          ) && matched.length >= 2;
      if (category === "renal" && matched.length) {
        if (!latest) missing.push("Dated eGFR in mL/min/1.73m²");
        else if ((Date.parse(at) - Date.parse(latest.date)) / 86400000 > (r.maxAgeDays ?? 0))
          missing.push(`eGFR is older than rule freshness window (${r.maxAgeDays} days)`);
        else triggered = latest.value < (r.threshold ?? 0);
      }
      if (category === "dose" && matched.length) {
        missing.push(
          "This engine does not calculate dose totals from free-text instructions; structured validated dosing context is required",
        );
      }
      if (category === "age" && matched.length) {
        if (c.profile.age === null) missing.push("Age");
        else triggered = c.profile.age >= (r.threshold ?? Infinity);
      }
      if (category === "allergy" && matched.length) {
        if (!c.profile.allergies) missing.push("Recorded allergy status and reactions");
        else
          triggered = c.profile.allergies
            .split(/[,;\n]/)
            .some((x) => normalize(x) === normalize(r.condition ?? ""));
      }
      if (category === "condition" && matched.length) {
        if (!c.profile.conditions) missing.push("Recorded conditions");
        else
          triggered = c.profile.conditions
            .split(/[,;\n]/)
            .some((x) => normalize(x) === normalize(r.condition ?? ""));
      }
      if (missing.length) {
        incomplete = true;
        add({
          id: `incomplete:${r.id}`,
          ruleId: r.id,
          ruleVersion: r.version,
          title: `Unable to evaluate: ${r.title}`,
          category,
          medicineIds: matched.map((m) => m.id),
          reason: missing.join("; "),
          source: r.source,
          reference: r.reference,
          missing,
        });
      } else if (triggered)
        add({
          id: `rule:${r.id}:${matched
            .map((m) => m.id)
            .sort()
            .join(":")}`,
          ruleId: r.id,
          ruleVersion: r.version,
          title: r.title,
          category,
          severity: r.severity,
          medicineIds: matched.map((m) => m.id),
          ingredients: r.ingredients,
          reason: r.rationale,
          explanation: r.rationale,
          source: r.source,
          reference: r.reference,
          patientInputs:
            category === "renal" && latest
              ? [`${latest.value} ${latest.unit}, ${latest.date}; ${latest.source}`]
              : category === "age"
                ? [`Age ${c.profile.age}`]
                : [],
        });
    }
    checks.push({
      category,
      status: incomplete ? "incomplete" : "completed",
      reason: incomplete
        ? "Unresolved identities, current status or required patient inputs limit coverage."
        : "Configured reviewed rules evaluated for verified, recorded ongoing medicines only; not comprehensive coverage.",
    });
  }
  if (!c.profile.allergies || !c.profile.conditions || c.profile.age === null)
    add({
      id: "patient-context",
      title: "Patient context incomplete",
      medicineIds: [],
      reason: "Unrecorded information is not a normal result.",
      missing: [
        ...(!c.profile.allergies ? ["Allergies and reactions"] : []),
        ...(!c.profile.conditions ? ["Conditions"] : []),
        ...(c.profile.age === null ? ["Age"] : []),
      ],
    });
  const rank = { Critical: 0, High: 1, Moderate: 2, Low: 3, "Unable to Assess": 4 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title));
  const old = new Map(previous?.alerts.map((a) => [a.id, a]) ?? []);
  const now = new Set(alerts.map((a) => a.id));
  return {
    id: `analysis-${c.analyses.length + 1}`,
    version: c.analyses.length + 1,
    dataVersion: c.version,
    at,
    alerts,
    checks,
    renalId: latest?.id ?? null,
    changes: {
      new: alerts
        .filter((a) => !old.has(a.id) || old.get(a.id)?.severity !== a.severity)
        .map((a) => a.id),
      resolved: [...old.keys()].filter((id) => !now.has(id)),
      unchanged: alerts.filter((a) => old.get(a.id)?.severity === a.severity).map((a) => a.id),
      uncertain: alerts.filter((a) => a.severity === "Unable to Assess").map((a) => a.id),
    },
    ruleVersions: [
      "INGREDIENT-OVERLAP@1.0",
      "IDENTITY-COMPLETENESS@1.0",
      ...rules.map((r) => `${r.id}@${r.version}`),
    ],
  };
}
export function reportLines(c: SafetyCase, reportId: string, status: string, at: string) {
  const a = c.analyses.at(-1);
  return [
    "MEDIKIOSK | MEDICATION SAFETY REPORT",
    status === "reviewed"
      ? "PROFESSIONALLY REVIEWED — LIMITATIONS STILL APPLY"
      : "DRAFT — PROFESSIONAL REVIEW PENDING",
    `Report: ${reportId} | Generated: ${at}`,
    `Case: ${c.id} | Data version: ${c.version} | Analysis: ${a?.version ?? "Not run"}`,
    "1. PATIENT CONTEXT",
    `Identifier: ${c.profile.identifier}; Age: ${c.profile.age ?? "Missing"}; Weight: ${c.profile.weight ?? "Missing"} ${c.profile.weightUnit}`,
    `Allergies / reactions: ${c.profile.allergies || "Not recorded"}`,
    `Conditions: ${c.profile.conditions || "Not recorded"}`,
    `Notes: ${c.profile.notes || "Not recorded"}`,
    ...c.renal.map(
      (r) => `${r.kind}: ${r.value} ${r.unit}; collected ${r.date}; source ${r.source}`,
    ),
    "2. SOURCE PRESCRIPTIONS",
    ...c.prescriptions.flatMap((d) => [
      `${d.label} | ${d.name} | ${d.status}`,
      `Prescriber: ${d.prescriber || "Not recorded"}; Date: ${d.date || "Unknown"}; Clinic: ${d.clinic || "Not recorded"}`,
      `Source ID: ${d.id}; pages: ${d.pages}; ${d.error ?? ""}`,
    ]),
    "3. MEDICATION INVENTORY",
    ...c.medicines.flatMap((m) => [
      `${m.originalName} | ${m.verification} | ${m.status}`,
      `Recorded strength/form: ${m.strength || "Missing"} / ${m.form || "Missing"}`,
      `Verified ingredients: ${m.ingredients.map((i) => `${i.name} ${i.strength} ${i.unit}`).join(", ") || "None verified"}`,
      `Instructions as written: ${m.instructions || "Missing"}`,
      `Route: ${m.route || "Missing"}; frequency: ${m.frequency || "Missing"}; timing: ${m.timing || "Missing"}; duration: ${m.duration || "Missing"}`,
      `Source: ${m.documentId}, page ${m.page}; excerpt: ${m.excerpt || "Missing"}`,
      `Catalogue evidence: ${m.evidence || "Unavailable"}; Uncertainty: ${m.uncertainty.join("; ") || "No extraction uncertainty recorded"}`,
    ]),
    "4. UNIFIED TIMELINE",
    ...timeline(c).map(
      (t) =>
        `${t.date || "Date unknown"}: ${t.medicine.originalName} | ${t.medicine.status} | ${t.document?.prescriber || "Prescriber unknown"} | ${t.document?.label || t.medicine.documentId}`,
    ),
    "5. PRIORITIZED FINDINGS",
    ...(a?.alerts.length
      ? a.alerts.flatMap((f) => [
          `${f.severity} | ${f.title} | ${f.id}`,
          `Affected: ${f.medicineIds.map((id) => c.medicines.find((m) => m.id === id)?.originalName || id).join(", ")}`,
          f.reason,
          `Evidence: ${f.source}; ${f.reference}; rule ${f.ruleId}@${f.ruleVersion}`,
          `Inputs: ${f.patientInputs.join("; ") || "Recorded medicines"}; Missing: ${f.missing.join("; ") || "See coverage limitations"}`,
          `Review: ${f.review}; ${f.decisionNotes}`,
        ])
      : ["No supported safety alerts were identified by the checks completed."]),
    "6. MEDICINE EXPLANATIONS",
    ...c.medicines.flatMap((m) => [
      `${m.originalName}: the prescription records ${m.instructions || "no readable instructions"}.`,
      "Common uses / dosing interpretation: not supplied without a verified source. No diagnosis is inferred.",
      `Related findings: ${
        a?.alerts
          .filter((f) => f.medicineIds.includes(m.id))
          .map((f) => f.title)
          .join("; ") || "None in completed checks"
      }`,
    ]),
    "7. PROFESSIONAL REVIEW",
    ...c.reviews.map(
      (r) =>
        `${r.at} | ${r.actor} (${r.role}) | ${r.decision} | data v${r.dataVersion} | ${r.notes}`,
    ),
    "8. LIMITATIONS AND NEXT STEPS",
    ...(a?.checks.map((k) => `${k.category}: ${k.status} — ${k.reason}`) ?? ["Analysis not run"]),
    "This report supports professional review, not autonomous prescribing. Do not start, stop, substitute or change doses based on this report. Absence of alerts does not prove safety. Clarify unresolved identities and incomplete checks.",
    "9. AUDIT AND SOURCES",
    `Rules: ${a?.ruleVersions.join(", ") || "Not run"}`,
    ...c.analyses.map(
      (r) =>
        `Analysis ${r.version}: ${r.at}; data v${r.dataVersion}; renal trigger ${r.renalId || "none"}; new ${r.changes.new.length}, resolved ${r.changes.resolved.length}, unchanged ${r.changes.unchanged.length}, uncertain ${r.changes.uncertain.length}`,
    ),
    ...c.audit.map((e) => `${e.at} | ${e.actor} | ${e.action} | ${e.detail}`),
  ];
}

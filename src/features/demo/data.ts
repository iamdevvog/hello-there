/** Synthetic showcase data only. No real people, clinics or clinical records. */
export const demoPatient = {
  name: "Meera Sharma",
  age: 46,
  sex: "Female",
  phone: "+91 98XXX XX210",
  language: "Hindi",
  id: "MK-DEMO-001",
  token: "A-27",
};

export const demoConversation = [
  { who: "kiosk", text: "आज आपको क्या परेशानी है? (What is bothering you today?)" },
  { who: "patient", text: "पिछले चार दिन से पेट में दर्द है, खाने के बाद ज़्यादा होता है।" },
  { who: "kiosk", text: "Understood: abdominal pain for 4 days, worse after meals. Is that right?" },
  { who: "patient", text: "हाँ, और थोड़ी जलन भी होती है।" },
  { who: "kiosk", text: "Noted: burning sensation. Any fever or vomiting?" },
  { who: "patient", text: "नहीं, बुखार नहीं है।" },
];

export const demoStructuredCase = [
  ["Chief concern", "Abdominal pain"],
  ["Duration", "4 days"],
  ["Pattern", "Worse after meals"],
  ["Associated", "Burning sensation"],
  ["Denied", "Fever, vomiting"],
  ["Language", "Hindi (spoken)"],
];

export const demoVitals = [
  ["Blood pressure", "128 / 82", "mmHg"],
  ["Pulse", "78", "bpm"],
  ["Temperature", "98.4", "°F"],
  ["SpO₂", "98", "%"],
  ["Weight", "64", "kg"],
];

export const demoDocuments = [
  { title: "Blood test report", type: "Report", date: "09 Sep 2026", fields: 14 },
  { title: "Prescription — Dr. A (General)", type: "Prescription", date: "02 Sep 2026", fields: 3 },
  { title: "Prescription — Dr. B (Ortho)", type: "Prescription", date: "06 Sep 2026", fields: 2 },
];

export const demoQueue = [
  { name: "Meera Sharma", age: 46, concern: "Abdominal pain", wait: 12, priority: "Priority", status: "Ready" },
  { name: "Anjali Singh", age: 34, concern: "Headache", wait: 23, priority: "Urgent", status: "Ready" },
  { name: "Raj Kumar", age: 52, concern: "Joint pain", wait: 18, priority: "Normal", status: "Ready" },
  { name: "Suresh Patel", age: 61, concern: "Persistent cough", wait: 31, priority: "Priority", status: "Waiting" },
  { name: "Vikram Rao", age: 39, concern: "Lower back pain", wait: 15, priority: "Normal", status: "In progress" },
];

export const demoMedicines = [
  { written: "Dolo 650", brand: "Dolo 650", ingredient: "Paracetamol 650 mg", form: "Tablet", dose: "1 tab, thrice daily", doctor: "Dr. A", date: "02 Sep", match: 0.92, status: "Confirmed by reviewer" },
  { written: "Pantop 40", brand: "Pantop 40", ingredient: "Pantoprazole 40 mg", form: "Tablet", dose: "1 tab before breakfast", doctor: "Dr. A", date: "02 Sep", match: 0.88, status: "Confirmed by reviewer" },
  { written: "Crocin Adv", brand: "Crocin Advance", ingredient: "Paracetamol 500 mg", form: "Tablet", dose: "1 tab when needed", doctor: "Dr. B", date: "06 Sep", match: 0.81, status: "Confirmed by reviewer" },
  { written: "Zerodl P", brand: "Possible: Zerodol-P", ingredient: "Aceclofenac + Paracetamol (unconfirmed)", form: "Tablet", dose: "1 tab twice daily", doctor: "Dr. B", date: "06 Sep", match: 0.58, status: "Needs pharmacist confirmation" },
];

export const demoFindings = [
  {
    level: "High",
    title: "Same ingredient from two doctors",
    detail: "Paracetamol appears in Dolo 650 (Dr. A) and Crocin Advance (Dr. B). Taken together, the total daily amount may be higher than intended.",
    action: "Pharmacist to confirm total daily paracetamol and inform both prescribers.",
  },
  {
    level: "Review",
    title: "Medicine identity not confirmed",
    detail: "“Zerodl P” was read from handwriting. The closest web source match is a combination product, but it is not confirmed.",
    action: "Confirm the exact product with the patient's strip or prescriber. Not found ≠ counterfeit.",
  },
  {
    level: "Info",
    title: "Checks not available",
    detail: "Interaction, kidney-dose and allergy rules need a licensed medicine database, so they are shown as unavailable instead of guessed.",
    action: "Connect a licensed dataset to enable these checks.",
  },
];

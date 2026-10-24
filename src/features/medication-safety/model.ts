import { z } from "zod";

export const dateValue = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v && v <= new Date().toISOString().slice(0,10)), "Enter a valid date, not in the future");
export const profileSchema = z.object({
  identifier: z.string().trim().min(1).max(120), age: z.number().int().min(0).max(130).nullable(),
  sex: z.enum(["not-recorded", "female", "male", "other"]), weight: z.number().positive().max(700).nullable(), weightUnit: z.enum(["kg", "lb"]),
  allergies: z.string().max(2000), conditions: z.string().max(2000), notes: z.string().max(2000), consent: z.boolean(),
});
export const renalSchema = z.object({ id: z.string(), kind: z.enum(["eGFR", "creatinine"]), value: z.number().positive().max(3000), unit: z.enum(["mL/min/1.73m²", "mg/dL", "µmol/L"]), date: dateValue.refine(Boolean, "Collection date required"), source: z.string().trim().min(1).max(200) }).superRefine((v,ctx)=>{if ((v.kind === "eGFR") !== (v.unit === "mL/min/1.73m²")) ctx.addIssue({code:"custom", message:"Measurement and unit do not match"});});
export const ingredientSchema = z.object({ name: z.string().min(1).max(200), strength: z.string().max(100), unit: z.string().max(40) });
export const catalogueSchema = z.object({ id: z.string(), brand: z.string().min(1), aliases: z.array(z.string()), ingredients: z.array(ingredientSchema).min(1), form: z.string(), route: z.string(), source: z.string().min(1), reference: z.string().url(), verifiedAt: z.string().min(1), status: z.literal("active"), uses: z.string().optional() });
export type CatalogueEntry = z.infer<typeof catalogueSchema>;
export const medicineSchema = z.object({
  id: z.string(), documentId: z.string(), originalName: z.string().trim().min(1).max(200), brand: z.string().max(200), strength: z.string().max(100), form: z.string().max(100),
  instructions: z.string().max(2000), route: z.string().max(100), frequency: z.string().max(200), timing: z.string().max(200), duration: z.string().max(100), startDate: dateValue, endDate: dateValue,
  page: z.number().int().positive(), excerpt: z.string().max(2000), uncertainty: z.array(z.string().max(300)),
  status: z.enum(["prescribed", "dispensed", "reportedly-taking", "reconciled", "discontinued", "unknown"]),
  verification: z.enum(["unknown", "candidate", "verified", "conflict", "insufficient"]), catalogueId: z.string().nullable(), ingredients: z.array(ingredientSchema), evidence: z.string(),
});
export type Medicine = z.infer<typeof medicineSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Renal = z.infer<typeof renalSchema>;
export interface Prescription { id: string; name: string; mime: string; size: number; digest: string; label: string; prescriber: string; date: string; clinic: string; status: "Uploaded" | "Extracting" | "Needs Review" | "Verified" | "Failed"; error: string | null; rawText: string; pages: number; createdAt: string; }
export interface Alert { id: string; ruleId: string; ruleVersion: string; category: string; severity: "Critical" | "High" | "Moderate" | "Low" | "Unable to Assess"; title: string; medicineIds: string[]; ingredients: string[]; reason: string; explanation: string; source: string; reference: string; missing: string[]; timestamp: string; review: "pending" | "acknowledged" | "follow-up" | "dismissed"; decisionNotes: string; patientInputs: string[]; }
export interface Check { category: string; status: "completed" | "incomplete" | "unavailable"; reason: string; }
export interface Analysis { id: string; version: number; dataVersion: number; at: string; alerts: Alert[]; checks: Check[]; renalId: string | null; changes: {new: string[]; resolved: string[]; unchanged: string[]; uncertain: string[]}; ruleVersions: string[]; }
export interface Review { actor: string; role: string; at: string; decision: string; notes: string; dataVersion: number; analysisId: string | null; }
export interface Audit { id: string; at: string; actor: string; action: string; detail: string; }
export interface Report { id: string; at: string; version: number; dataVersion: number; status: "draft" | "reviewed"; snapshot: Omit<SafetyCase,"reports">; }
export interface SafetyCase { id: string; owner: string; patientId: string | null; version: number; createdAt: string; updatedAt: string; profile: Profile; prescriptions: Prescription[]; medicines: Medicine[]; renal: Renal[]; analyses: Analysis[]; reviews: Review[]; audit: Audit[]; reports: Report[]; approvedVersion: number | null; }
export interface Services { catalogue: boolean; rules: boolean; ocr: boolean; extraction: boolean; externalProcessingApproved: boolean; professional: boolean; role: string; }
export const emptyProfile: Profile = {identifier:"",age:null,sex:"not-recorded",weight:null,weightUnit:"kg",allergies:"",conditions:"",notes:"",consent:false};
export function emptyMedicine(documentId:string, id:string):Medicine {return {id,documentId,originalName:"",brand:"",strength:"",form:"",instructions:"",route:"",frequency:"",timing:"",duration:"",startDate:"",endDate:"",page:1,excerpt:"",uncertainty:["Identity requires verification"],status:"unknown",verification:"unknown",catalogueId:null,ingredients:[],evidence:""};}
export function normalize(v:string){return v.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();}
export function canAccess(owner:string, actor:string){return Boolean(actor) && owner === actor;}
export function isProfessional(role:string){return role === "clinician" || role === "pharmacist";}
export function validateUpload(bytes:Uint8Array,mime:string){
  if(!bytes.length || bytes.length>1024*1024) throw new Error("Each prescription must be nonempty and at most 1 MB");
  const valid = mime === "application/pdf" ? String.fromCharCode(...bytes.slice(0,5)) === "%PDF-" : mime === "image/png" ? [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v) : mime === "image/jpeg" ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : false;
  if(!valid) throw new Error("The file contents do not match a supported PDF, PNG or JPEG");
}
export function timeline(c: Pick<SafetyCase,"medicines"|"prescriptions">){return c.medicines.map(m=>({medicine:m,document:c.prescriptions.find(d=>d.id===m.documentId),date:m.startDate || c.prescriptions.find(d=>d.id===m.documentId)?.date || ""})).sort((a,b)=>(a.date || "9999").localeCompare(b.date || "9999"));}
export function candidates(m:Medicine, catalogue:CatalogueEntry[]){
  const n=normalize(m.originalName);
  return catalogue.map(c=>{const exact=normalize(c.brand)===n;const alias=c.aliases.some(a=>normalize(a)===n);const ingredient=c.ingredients.some(i=>normalize(i.name)===n);const fuzzy=n.length>2&&(normalize(c.brand).includes(n)||n.includes(normalize(c.brand)));const conflict=(m.form && normalize(m.form)!==normalize(c.form)) || (m.strength && !c.ingredients.some(i=>normalize(`${i.strength} ${i.unit}`)===normalize(m.strength)));return {entry:c,rank:exact?4:alias?3:ingredient?2:fuzzy?1:0,status:conflict?"conflict" as const:"candidate" as const,method:exact?"Exact brand":alias?"Known alias":ingredient?"Ingredient candidate":"Name similarity — not identity proof"};}).filter(c=>c.rank>0).sort((a,b)=>b.rank-a.rank).slice(0,12);
}
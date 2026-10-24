import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Pill } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { Bi, Eyebrow, Reveal, Section, SectionHeading } from "./section-kit";
import { cn } from "@/lib/utils";

const journeys = [
  {
    id: "check-in",
    to: "/patient-kiosk",
    icon: ClipboardList,
    eyebrowHi: "आपकी अपॉइंटमेंट के लिए",
    eyebrowEn: "For your visit",
    titleHi: "मरीज़ चेक-इन",
    titleEn: "Patient Check-in",
    bodyHi:
      "कियोस्क पर अपनी तकलीफ़ बोलकर बताएँ — टाइपिंग की ज़रूरत नहीं। आपकी बातें, रिपोर्ट और जाँचें एक साफ़ केस बनकर डॉक्टर तक पहुँचती हैं।",
    bodyEn:
      "Speak your health problem at the kiosk — no typing needed. Your words, reports and vitals become one clear case for your doctor before the visit.",
    points: [
      { hi: "बोलकर बताएँ, हिंदी या अंग्रेज़ी में", en: "Speak instead of typing — Hindi or English" },
      { hi: "ब्लड प्रेशर, नाड़ी और रिपोर्ट जोड़ें", en: "Add vitals and paper reports" },
      { hi: "डॉक्टर आने से पहले ही तैयार केस", en: "The doctor gets a prepared case" },
    ],
    whoHi: "मरीज़ों के लिए",
    whoEn: "For patients",
    accent: false,
  },
  {
    id: "medication-safety",
    to: "/medication-safety",
    icon: Pill,
    eyebrowHi: "आपकी दवाइयों के लिए",
    eyebrowEn: "For your medicines",
    titleHi: "मेडिकेशन सेफ़्टी",
    titleEn: "Medication Safety",
    bodyHi:
      "कई डॉक्टरों के पर्चे अपलोड करें। सिस्टम हर दवा पढ़ता है, ब्रांड को उसकी असली सामग्री से मिलाता है, एक टाइमलाइन बनाता है, और एक जैसी सामग्री वाली दवाओं पर ध्यान दिलाता है — फिर फार्मासिस्ट के लिए रिपोर्ट तैयार करता है।",
    bodyEn:
      "Upload prescriptions from multiple doctors. MediKiosk reads every medicine, matches each Indian brand to its actual ingredients, builds one timeline, and flags when two prescriptions overlap — then prepares a report for a pharmacist to review.",
    points: [
      { hi: "पर्चे की फोटो या PDF अपलोड करें", en: "Upload a photo or PDF of prescriptions" },
      { hi: "ब्रांड और असली सामग्री की जाँच", en: "Brand and ingredient verification" },
      { hi: "फार्मासिस्ट की समीक्षा और रिपोर्ट", en: "Pharmacist review and a full report" },
    ],
    whoHi: "मरीज़ + फार्मासिस्ट के लिए",
    whoEn: "For patients & pharmacists",
    accent: true,
  },
] as const;

export function JourneyChoice() {
  const { hi, en } = useLanguage();

  return (
    <Section labelledBy="journeys-title" id="journeys" tone="sunken">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <div className="flex justify-center">
            <Eyebrow hi="दो अलग काम" en="Two different tools" />
          </div>
          <SectionHeading
            id="journeys-title"
            hi="एक ही ऐप, दो अलग काम।"
            en="One app, two different jobs."
          />
          <Bi
            as="p"
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed"
            hiClassName="text-foreground"
            enClassName="mt-2 text-base"
            hi="चुनें कि आज आपको क्या करना है — डॉक्टर के लिए अपना केस तैयार करना, या अपनी दवाइयों की सुरक्षा जाँच।"
            en="Choose what you need today — prepare your case for the doctor, or check that your medicines are safe together."
          />
        </Reveal>
      </div>

      <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2 lg:gap-8">
        {journeys.map((j, i) => (
          <Reveal key={j.id} delay={i * 120}>
            <Link
              to={j.to}
              className={cn(
                "group flex h-full flex-col rounded-[var(--radius-3xl)] border p-7 transition-all duration-500 ease-[var(--ease-calm)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-9",
                j.accent
                  ? "border-primary/25 bg-primary-soft/30"
                  : "border-border bg-surface",
              )}
              data-speak
              data-speak-text={j.titleEn}
            >
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-13 shrink-0 place-items-center rounded-2xl",
                    j.accent ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                  )}
                >
                  <j.icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {hi && <span lang="hi" className="deva mr-2 text-[0.7rem] tracking-normal">{j.eyebrowHi}</span>}
                    <span lang="en">{j.eyebrowEn}</span>
                  </p>
                  <Bi
                    className="mt-1 text-2xl font-semibold leading-tight"
                    enClassName="mt-0.5 text-base font-medium text-muted-foreground"
                    hi={j.titleHi}
                    en={j.titleEn}
                  />
                </div>
              </div>

              <Bi
                as="p"
                className="mt-6 text-base leading-relaxed"
                hiClassName="text-foreground"
                enClassName="mt-2 text-sm"
                hi={j.bodyHi}
                en={j.bodyEn}
              />

              <ul className="mt-6 space-y-3">
                {j.points.map((p) => (
                  <li key={p.en} className="flex items-start gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        j.accent ? "bg-primary/70" : "bg-accent",
                      )}
                    />
                    <Bi hi={p.hi} en={p.en} hiClassName="font-medium" enClassName="text-muted-foreground" />
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                <span className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                  {hi ? `${j.whoHi} · ${j.whoEn}` : j.whoEn}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-sm font-semibold",
                    j.accent ? "text-primary" : "text-foreground",
                  )}
                >
                  {hi ? "खोलें" : "Open"}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-300 ease-[var(--ease-calm)] group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          {hi ? (
            <span lang="hi" className="deva">
              चेक-इन केवल आपकी मुलाक़ात के लिए है; मेडिकेशन सेफ़्टी आपकी दवाइयों की जाँच करती है — दोनों अलग-अलग काम हैं। दवा से जुड़ी हर जानकारी एक योग्य फार्मासिस्ट की समीक्षा के लिए है, अंतिम सलाह के लिए नहीं।
            </span>
          ) : (
            <span>
              Check-in is only for your appointment; Medication Safety reviews your medicines — they are separate tools. Any medicine information is prepared for review by a qualified pharmacist, not final advice.
            </span>
          )}
        </p>
      </Reveal>
    </Section>
  );
}

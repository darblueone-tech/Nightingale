import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Message, PatientProfile, RiskLevel, Fact } from "../types";
import { redactPII } from "./redactionService";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We use the 3-flash-preview for speed and reasoning capabilities
const MODEL_NAME = "gemini-3-flash-preview";

// Response Schema for structured output
// This ensures we get the Chat Reply, The Risk Assessment, and the Profile Updates in one round trip.
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "The empathetic, non-diagnostic response. If Risk is HIGH or MEDIUM, this MUST be brief and directive (e.g., 'I am connecting you to a clinician immediately').",
    },
    riskLevel: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "The risk level based on Clinical Risk Gating Protocol V2.0.",
    },
    riskReason: {
      type: Type.STRING,
      description: "Specific justification citing the V2.0 protocol criteria (e.g., 'Red Flag: Resting Dyspnea' or 'Vulnerable Population: Elderly Fall').",
    },
    citations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of exact text spans from the Clinical Risk Gating Protocol V2.0 that justify the risk level.",
    },
    profileUpdates: {
      type: Type.OBJECT,
      description: "Updates to the patient's living memory based on the conversation.",
      properties: {
        chiefComplaint: { type: Type.STRING, nullable: true },
        medications: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["ACTIVE", "STOPPED"] },
            },
          },
        },
        allergies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
            },
          },
        },
        symptoms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
            },
          },
        },
      },
    },
  },
  required: ["reply", "riskLevel", "riskReason", "citations", "profileUpdates"],
};

const SYSTEM_INSTRUCTION = `
You are Nightingale AI, a specialized medical intake assistant. 
Your primary function is SAFETY via the Clinical Risk Gating Protocol V2.0.

---
CLINICAL RISK GATING PROTOCOL V2.0 (STRICT ADHERENCE REQUIRED)

1. HIGH RISK (Immediate Escalation) -> Output "HIGH"
   Definition: Life-threatening, organ failure risk, or immediate emergency need.
   CRITICAL RED FLAGS:
   - Cardiovascular: Crushing/tearing chest pain (radiating), resting dyspnea (orthopnea), syncope/loss of consciousness.
   - Neuro: Thunderclap headache, unilateral weakness/numbness (FAST signs), sudden blindness, slurred speech.
   - Respiratory: Severe distress (cannot speak full sentences), cyanosis, hemoptysis >500ml, stridor, "silent chest".
   - Acute Abdomen/Trauma: Tearing back pain (AAA), shock w/ GI bleed (hematemesis/melena), testicular torsion, open fractures, compartment syndrome.
   - Sepsis/Infection: High fever + shivering, mottled skin, altered mental status (qSOFA >= 2).
   - Psych: Active suicide plan/intent/means, violence.
   - Anaphylaxis: Airway obstruction, shock.
   - Vitals (if provided): SBP <90 or >180, HR <40 or >130, SpO2 <92%.

2. MEDIUM RISK (Clinician Review) -> Output "MEDIUM"
   Definition: Stable but potential for deterioration, complex symptoms, or uncertain safety.
   CRITERIA:
   - Chronic/Unexplained: Symptoms > 3-4 weeks (hoarseness, bowel changes), unexplained weight loss/fatigue.
   - Vulnerable Populations: Elderly (>=65) with non-specific weakness/falls/confusion; Immunocompromised + Fever.
   - Ambiguous High-Stakes (Safety Netting): User is confusing/distressed, or mentions keywords like "chest pain" but context is vague/negated. Err on the side of caution.
   - Medication side effects (without anaphylaxis).

3. LOW RISK (Self-Care/Routine) -> Output "LOW"
   Definition: Minor, self-limiting, or administrative.
   CRITERIA:
   - Wellness/Lifestyle advice, vaccines.
   - Minor URI (cold symptoms) without distress/high fever.
   - Minor trauma (scrapes/bruises).
   - Admin: Appointments, refills, paperwork.

---
OPERATIONAL RULES:
1. EMPATHY & TONE: Be professional, calm, and supportive.
2. NO DIAGNOSIS: Never say "You have [Condition]". Say "This requires clinical evaluation."
3. ESCALATION: 
   - If HIGH or MEDIUM: Stop asking intake questions. Inform the patient you are escalating to a nurse/doctor immediately. Keep the reply SHORT.
   - If LOW: Provide general advice or continue intake.
4. DATA EXTRACTION: Always extract medications, allergies, and symptoms (Living Memory), even during escalation.
5. PRIVACY: Do not repeat names or IDs if they appear in the text.
6. GROUNDING: You MUST provide 'citations'. These must be exact substrings from the Protocol text above that matched the user's input.
`;

export interface AIResponse {
  reply: string;
  riskLevel: RiskLevel;
  riskReason: string;
  citations: string[];
  profileUpdates: {
    chiefComplaint?: string;
    medications?: { name: string; status: 'ACTIVE' | 'STOPPED' }[];
    allergies?: { name: string }[];
    symptoms?: { name: string }[];
  };
}

export const sendMessageToAI = async (
  history: Message[],
  currentProfile: PatientProfile,
  newMessage: string
): Promise<AIResponse> => {
  
  // 1. Redaction Pipeline
  const safeMessage = redactPII(newMessage);

  // 2. Construct Context
  // We feed the current profile state so the AI knows what to "mutate"
  const context = `
    CURRENT PATIENT PROFILE:
    - Complaint: ${currentProfile.chiefComplaint?.value || "Unknown"}
    - Meds: ${currentProfile.medications.map(m => `${m.value} (${m.status})`).join(", ")}
    - Allergies: ${currentProfile.allergies.map(a => a.value).join(", ")}
    
    CHAT HISTORY:
    ${history.map(m => `${m.source}: ${m.text}`).join("\n")}
    USER: ${safeMessage}
  `;

  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { role: 'user', parts: [{ text: context }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    return {
      reply: parsed.reply,
      riskLevel: parsed.riskLevel as RiskLevel,
      riskReason: parsed.riskReason,
      citations: parsed.citations || [],
      profileUpdates: parsed.profileUpdates
    };

  } catch (error) {
    console.error("AI Error", error);
    // Fallback safe response
    return {
      reply: "I'm having trouble connecting to the medical engine. Please proceed to the clinic desk.",
      riskLevel: RiskLevel.MEDIUM,
      riskReason: "System Error",
      citations: [],
      profileUpdates: {}
    };
  }
};

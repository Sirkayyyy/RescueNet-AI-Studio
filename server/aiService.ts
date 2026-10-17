import { GoogleGenAI, Type } from '@google/genai';

export interface TriageResult {
  category: 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  guidance: string;
  source: string;
}

const FALLBACK_TRIAGE: Record<string, { category: 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER'; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; guidance: string }> = {
  FIRE: {
    category: 'FIRE',
    priority: 'CRITICAL',
    guidance: 'Leave the building immediately. Stay low under smoke. Do not use elevators. Close doors behind you if possible and call Fire Emergency once safely outside.'
  },
  SECURITY: {
    category: 'SECURITY',
    priority: 'HIGH',
    guidance: 'Find immediate shelter. Lock or barricade doors, silence your mobile devices, stay away from windows, and do not make sudden noise.'
  },
  MEDICAL: {
    category: 'MEDICAL',
    priority: 'CRITICAL',
    guidance: 'Keep the patient calm and warm. If severe bleeding, apply firm direct pressure with clean cloth. Check breathing and do not move injured persons unless immediate hazard exists.'
  },
  ACCIDENT: {
    category: 'ACCIDENT',
    priority: 'HIGH',
    guidance: 'Turn on hazard indicators. Move clear of passing traffic if safely able. Do not remove helmets or transport injured individuals without professional guidance.'
  },
  OTHER: {
    category: 'OTHER',
    priority: 'MEDIUM',
    guidance: 'Evaluate immediate surroundings for threats. Move towards designated safety zones and keep line open for incoming dispatch instructions.'
  }
};

export const classifyEmergency = async (
  description: string,
  fallbackCategory: 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER' = 'OTHER'
): Promise<TriageResult> => {
  const defaultGuidance = FALLBACK_TRIAGE[fallbackCategory] || FALLBACK_TRIAGE.OTHER;

  if (!description || description.trim().length === 0) {
    return {
      category: fallbackCategory,
      priority: defaultGuidance.priority,
      summary: `${fallbackCategory} emergency signal received.`,
      guidance: defaultGuidance.guidance,
      source: 'Deterministic Fail-Safe'
    };
  }

  // 1. Try Gemini API via @google/genai if API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze this emergency scenario and provide high-speed triage:
"${description}"`,
        config: {
          systemInstruction:
            'You are a high-speed emergency response and triage AI. Analyze the message. Return strictly valid JSON with category (SECURITY, MEDICAL, FIRE, ACCIDENT, OTHER), priority (LOW, MEDIUM, HIGH, CRITICAL), summary (one concise sentence), and guidance (imperative immediate life-saving instruction, maximum 2 sentences; no medical prescriptions).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'One of: SECURITY, MEDICAL, FIRE, ACCIDENT, OTHER'
              },
              priority: {
                type: Type.STRING,
                description: 'One of: LOW, MEDIUM, HIGH, CRITICAL'
              },
              summary: {
                type: Type.STRING,
                description: 'One concise sentence summary of the incident'
              },
              guidance: {
                type: Type.STRING,
                description: 'Immediate procedural safety advice (max 2 sentences)'
              }
            },
            required: ['category', 'priority', 'summary', 'guidance']
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const validCategories = ['SECURITY', 'MEDICAL', 'FIRE', 'ACCIDENT', 'OTHER'];
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

        return {
          category: validCategories.includes(parsed.category) ? parsed.category : fallbackCategory,
          priority: validPriorities.includes(parsed.priority) ? parsed.priority : defaultGuidance.priority,
          summary: parsed.summary || description.slice(0, 100),
          guidance: parsed.guidance || defaultGuidance.guidance,
          source: 'Gemini 3.8 Flash AI Engine'
        };
      }
    } catch (err: any) {
      console.warn(`[AI Service] Gemini call failed (${err?.message}). Trying Gemma / Fallback.`);
    }
  }

  // 2. Try Gemma Inference endpoint if configured
  const gemmaUrl = process.env.GEMMA_API_URL;
  if (gemmaUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(gemmaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.GEMMA_API_KEY ? { Authorization: `Bearer ${process.env.GEMMA_API_KEY}` } : {})
        },
        body: JSON.stringify({
          model: process.env.GEMMA_MODEL_NAME || 'gemma:2b',
          prompt: `Emergency triage JSON: "${description}". Keys: category, priority, summary, guidance.`,
          stream: false,
          format: 'json'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data.response || data.text || (data.choices && data.choices[0]?.message?.content);
        if (rawContent) {
          const parsed = JSON.parse(rawContent.trim());
          return {
            category: parsed.category || fallbackCategory,
            priority: parsed.priority || defaultGuidance.priority,
            summary: parsed.summary || description.slice(0, 100),
            guidance: parsed.guidance || defaultGuidance.guidance,
            source: 'Gemma Local/Remote AI Engine'
          };
        }
      }
    } catch (err: any) {
      console.warn(`[AI Service] Gemma endpoint failed (${err?.message}).`);
    }
  }

  // 3. Rule-based deterministic safety fallback
  const lower = description.toLowerCase();
  let detectedType: 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER' = fallbackCategory;

  if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burning') || lower.includes('flame') || lower.includes('explosion')) {
    detectedType = 'FIRE';
  } else if (lower.includes('bleed') || lower.includes('heart') || lower.includes('unconscious') || lower.includes('breath') || lower.includes('choking') || lower.includes('cpr') || lower.includes('stroke') || lower.includes('pain') || lower.includes('seizure')) {
    detectedType = 'MEDICAL';
  } else if (lower.includes('gun') || lower.includes('knife') || lower.includes('robbery') || lower.includes('intruder') || lower.includes('attack') || lower.includes('shooter') || lower.includes('threat') || lower.includes('assault')) {
    detectedType = 'SECURITY';
  } else if (lower.includes('car') || lower.includes('crash') || lower.includes('collision') || lower.includes('pedestrian') || lower.includes('overturned') || lower.includes('vehicle')) {
    detectedType = 'ACCIDENT';
  }

  const triage = FALLBACK_TRIAGE[detectedType] || FALLBACK_TRIAGE.OTHER;

  return {
    category: detectedType,
    priority: triage.priority,
    summary: `${detectedType} emergency alert: "${description.length > 90 ? description.substring(0, 87) + '...' : description}"`,
    guidance: triage.guidance,
    source: 'Deterministic Safety Triage (Fail-Safe)'
  };
};

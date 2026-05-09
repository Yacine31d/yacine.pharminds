/**
 * AI Service — Arcee (primary) → OpenRouter (fallback)
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
export const CHAT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
export const VISION_MODEL = 'meta-llama/llama-4-maverick:free';

function getArceeConfig() {
  return {
    url: '/arcee-api/v1',        // proxied: /arcee-api/* → https://models.arcee.ai/*
    key: import.meta.env.VITE_ARCEE_API_KEY ?? '',
    model: import.meta.env.VITE_ARCEE_MODEL ?? 'trinity-mini',
  };
}

async function getSmartProvider() {
  const arcee = getArceeConfig();
  if (arcee.key && arcee.key.trim() !== '') {
    return { baseUrl: arcee.url, key: arcee.key, model: arcee.model };
  }
  return {
    baseUrl: OPENROUTER_BASE,
    key: import.meta.env.VITE_OPENROUTER_API_KEY ?? '',
    model: CHAT_MODEL,
  };
}

/* ------------------------------------------------------------------ */
/*  Streaming chat completion (returns a ReadableStream for SSE)       */
/* ------------------------------------------------------------------ */
export async function streamChat(
  messages: { role: string; content: string }[],
  systemPrompt: string,
): Promise<Response> {
  const provider = await getSmartProvider();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'PharMinds Algeria',
  };

  if (provider.key && provider.key !== 'no-key') {
    headers['Authorization'] = `Bearer ${provider.key}`;
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1500,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Service Error (${response.status})`);
  }

  return response;
}

/* ------------------------------------------------------------------ */
/*  Vision-only scan via OpenRouter (fallback when TrOCR unavailable)  */
/*  Model: Llama 4 Maverick (free tier, vision-capable)                */
/* ------------------------------------------------------------------ */
export function hasVisionFallback(): boolean {
  return !!(import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined);
}

export async function scanPrescriptionImage(
  imageBase64: string,
): Promise<Record<string, unknown>> {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
  if (!openRouterKey) {
    throw new Error('VISION_NO_KEY');
  }

  const prompt =
    `You are an expert at reading Algerian medical prescriptions written in French.
Carefully analyze this prescription image and extract all information.

Respond ONLY with valid JSON using this exact structure:
{
  "success": true,
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "prescription_date": "DD/MM/YYYY or null",
  "medications": [
    {
      "name": "exact drug name (e.g. Augmentin 1g)",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. 1 cp x 3/j",
      "duration": "e.g. 7 jours",
      "quantity": "e.g. 01 bte",
      "instructions": "any special note or null"
    }
  ],
  "notes": "string or null"
}

Rules: extract ALL medications listed. Use null for missing fields. Return only the JSON.`;

  const dataUri = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openRouterKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'PharMinds Algeria',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`VISION_API_ERROR_${response.status}`);

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';
  const match = raw.match(/\{[\s\S]*\}/);

  try {
    const parsed = match ? JSON.parse(match[0]) : null;
    if (parsed?.medications?.length) {
      return {
        ...parsed,
        success: true,
        _method: 'vision',          // consumed by scanner UI
        line_crops: [],
        confidence_score: null,
      };
    }
    return { success: false, error: 'Vision returned no medications' };
  } catch {
    return { success: false, error: 'Vision returned invalid JSON' };
  }
}

const ALGERIAN_DRUG_VOCAB = `Doliprane, Augmentin, Clamoxyl, Amoxicilline, Aspegic, Voltarene, Spasfon,
Smecta, Efferalgan, Maxilase, Rhinathiol, Flagyl, Triatec, Crestor, Motilium,
Bipreterax, Lipanthyl, Ibuprofene, Zomax, Sulpiride, Vitamag, Detensiel, Hytacand,
Lomac, Paracetamol, Ciprolon, Fucidine, Antag, Tamsir, Prostamed, Novorapid,
Tresiba, Glucophage, Levothyrox, Profenid, Myorelax, Lisinox, Ostonel, Xydol,
Baclon, Divido, Solupred, Amoclan, Bilaxten, Pyostacine, Diflucan, Telfast,
Sapofen, Toplexil, Sinecod, Nasacort, Duphalac, Meteoxane, Riabal, Naxolin,
Debridat, Supradyn, Calcibronat, Tahor, Atenor, Loxen, Aspirine, Fraxal,
Prostamixon, Diaphag, Novoformine, Diaglinid, Exval`;

export async function structureTextWithAI(rawTextLines: string[]): Promise<Record<string, any>> {
  const provider = await getSmartProvider();

  const rawText = rawTextLines.filter(l => l.trim()).join('\n');

  const prompt = `You are an expert at reading Algerian medical prescriptions written in French.
The text below was extracted by an OCR engine from a handwritten prescription.

OCR TEXT:
${rawText}

Known Algerian drug names for reference:
${ALGERIAN_DRUG_VOCAB}

Algerian posology abbreviations:
- "cp" = comprimé (tablet), "gel" = gélule (capsule), "amp" = ampoule
- "j" = jour (day), "f/j" = fois par jour (times/day), "x 2/j" = twice daily
- "QSP" = pour la durée (for the duration), "bte/bt" = boîte (box)
- Numbers like "01", "02" = quantities, "03 mois" = 3 months

Task: Extract structured data and return ONLY valid JSON with this exact structure:
{
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "prescription_date": "DD/MM/YYYY or null",
  "medications": [
    {
      "name": "exact drug name",
      "dosage": "e.g. 500mg, 1g",
      "frequency": "e.g. 1 cp x 3/j",
      "duration": "e.g. 7 jours, 03 mois",
      "quantity": "e.g. 01 bte",
      "instructions": "any extra instructions or null"
    }
  ],
  "notes": "string or null"
}

Rules:
1. Extract ALL medications listed (numbered 1/, 2/, 1-, 2- etc.)
2. Preserve exact drug names including dosage in name if written together (e.g. "Augmentin 1g")
3. If a field is missing or unclear, use null — never guess
4. Date: keep original format from prescription
5. Respond ONLY with the JSON object, no explanation`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.key && provider.key !== 'no-key') {
    headers['Authorization'] = `Bearer ${provider.key}`;
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return { success: false, error: "Reasoning failed" };

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const match = content.match(/\{[\s\S]*\}/);

  try {
    return match ? { success: true, ...JSON.parse(match[0]) } : { success: false };
  } catch {
    return { success: false };
  }
}

/* ------------------------------------------------------------------ */
/*  OCR pipeline                                                        */
/*  dev:  Vite proxy /ocr-api → localhost:8001                         */
/*  prod: Vercel proxy /ocr-api → HuggingFace Spaces                  */
/*        (vercel.json rewrite — no env-var needed)                    */
/* ------------------------------------------------------------------ */

/** Always use the relative proxy path.  Both Vite (dev) and Vercel
 *  (prod) rewrite /ocr-api/* to the real backend. */
const OCR_BASE = '/ocr-api';

export const OCR_FEEDBACK_URL = `${OCR_BASE}/feedback`;

export class OcrSleepingError extends Error {
  constructor() { super('OCR_SLEEPING'); this.name = 'OcrSleepingError'; }
}
export class OcrUnavailableError extends Error {
  constructor(public readonly status?: number) {
    super(`OCR_UNAVAILABLE${status ? `_${status}` : ''}`);
    this.name = 'OcrUnavailableError';
  }
}

export async function scanPrescriptionLocal(
  fileOrBase64: File | string,
  onStep?: (step: 'detecting' | 'recognizing' | 'structuring') => void,
): Promise<Record<string, unknown>> {
  const LOCAL_OCR_PROXY = `${OCR_BASE}/scan`;

  onStep?.('detecting');

  // Build form data
  const formData = new FormData();
  if (typeof fileOrBase64 === 'string') {
    const base64Data = fileOrBase64.includes(',') ? fileOrBase64.split(',')[1] : fileOrBase64;
    const blob = await (await fetch(`data:image/jpeg;base64,${base64Data}`)).blob();
    formData.append('file', blob, 'prescription.jpg');
  } else {
    formData.append('file', fileOrBase64);
  }

  onStep?.('recognizing');

  // Call OCR backend with a 45-second timeout
  let response: Response;
  try {
    response = await fetch(LOCAL_OCR_PROXY, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err: any) {
    // Network error or timeout
    throw new OcrUnavailableError();
  }

  if (response.status === 503 || response.status === 502) {
    // HuggingFace Space is sleeping / cold-starting
    throw new OcrSleepingError();
  }

  if (!response.ok) {
    throw new OcrUnavailableError(response.status);
  }

  const data = await response.json();
  if (!data.success || !data.raw_ocr) {
    throw new OcrUnavailableError();
  }

  let finalResult: any = {
    success: true,
    doctor_name: data.extracted_data?.doctor_name ?? null,
    patient_name: data.extracted_data?.patient_name ?? null,
    prescription_date: data.extracted_data?.prescription_date ?? null,
    medications: data.extracted_data?.medications || [],
    confidence_score: data.confidence_score ?? null,
    line_crops: data.line_crops || [],
  };

  // Enhance with AI structuring (best-effort — never crashes the scan)
  try {
    onStep?.('structuring');
    const aiResult = await structureTextWithAI(data.raw_ocr);
    if (aiResult.success) {
      finalResult = {
        ...finalResult,
        doctor_name: aiResult.doctor_name || finalResult.doctor_name,
        patient_name: aiResult.patient_name || finalResult.patient_name,
        prescription_date: aiResult.prescription_date || finalResult.prescription_date,
        medications: aiResult.medications?.length ? aiResult.medications : finalResult.medications,
        notes: aiResult.notes ?? null,
      };
    }
  } catch (err) {
    console.warn('AI structuring failed, using raw TrOCR output.', err);
  }

  return finalResult;
}

/** OCR health states */
export type OcrHealthStatus = 'ok' | 'loading' | 'sleeping' | 'error';

/**
 * Ping the OCR health endpoint.
 * - 'ok'      → ready to accept /scan
 * - 'loading' → container up, models still downloading (retry in ~30s)
 * - 'sleeping' → container sleeping / 503 from HF proxy
 * - 'error'   → fetch failed / unrecognised response
 */
export async function pingOcrHealth(): Promise<OcrHealthStatus> {
  try {
    const res = await fetch(`${OCR_BASE}/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 503 || res.status === 502) return 'sleeping';
    if (!res.ok) return 'error';
    const data = await res.json();
    return data?.status === 'ok' ? 'ok' : 'loading';
  } catch {
    return 'sleeping';
  }
}

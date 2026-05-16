import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strip markdown code fences that Gemini sometimes adds around JSON responses
function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

// Safely ensure we have a clean base64 string (no data URI prefix)
function extractRawBase64(input: string): string {
  // If the client sent a full data URI like "data:image/jpeg;base64,/9j/..."
  // strip everything before and including the first comma
  if (input.startsWith('data:')) {
    const commaIdx = input.indexOf(',');
    if (commaIdx !== -1) return input.slice(commaIdx + 1);
  }
  return input;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageUrl, test } = body;

    // Health check / test ping
    if (test) {
      return new Response(JSON.stringify({ success: true, status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GEMINI_API_KEY is not configured. Go to Supabase Dashboard → Edge Functions → Secrets and add GEMINI_API_KEY.'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!imageBase64 && !imageUrl) {
      throw new Error('No image provided. Send either imageBase64 or imageUrl.');
    }

    console.log('Scanning prescription image...');

    let imagePart: Record<string, unknown>;

    if (imageBase64) {
      // Use Gemini native API with inlineData — most reliable for base64 images
      const rawBase64 = extractRawBase64(imageBase64);
      imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: rawBase64,
        },
      };
    } else {
      // Use a file URI part for public image URLs
      imagePart = {
        fileData: {
          mimeType: 'image/jpeg',
          fileUri: imageUrl,
        },
      };
    }

    // Use Gemini native generateContent API — more reliable for image inputs
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                imagePart,
                {
                  text: `You are an expert medical prescription analyzer specializing in Algerian prescriptions.

Analyze this prescription image and extract all medication information.

IMPORTANT: Respond ONLY with valid JSON — no markdown, no code fences, no explanation. Use this exact structure:
{
  "success": true,
  "doctor_name": "string or null",
  "patient_name": "string or null",
  "prescription_date": "YYYY-MM-DD or null",
  "medications": [
    {
      "name": "medication name in French",
      "name_ar": "medication name in Arabic if visible or null",
      "dosage": "dosage information or null",
      "frequency": "how often to take or null",
      "duration": "treatment duration or null",
      "quantity": "number of units or null",
      "instructions": "special instructions or null"
    }
  ],
  "confidence_score": 0.0,
  "notes": "any additional observations or null"
}

Rules:
- Focus on Algerian medication names (generic and brand names)
- Dosage: extract mg, ml, units, etc.
- Frequency: 1x/day, 2x/day, morning/evening, etc.
- Duration: 7 days, 1 month, etc.
- If you cannot read a field clearly, set it to null
- confidence_score is between 0.0 and 1.0 based on image readability`
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please wait a moment and try again.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 400) {
        // Often means bad image format or empty image
        return new Response(JSON.stringify({
          success: false,
          error: 'Could not process image. Please try a clearer photo (JPG or PNG, well-lit).'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({
          success: false,
          error: 'API key invalid or quota exceeded. Contact the administrator.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Gemini API returned ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    console.log('AI Raw Response:', rawContent?.slice(0, 300));

    // Strip markdown code fences if Gemini wrapped the JSON
    const cleanContent = stripMarkdownFences(rawContent);

    // Parse JSON
    let extractedData: Record<string, unknown>;
    try {
      // Try direct parse first
      extractedData = JSON.parse(cleanContent);
    } catch {
      // Try to extract first JSON object in the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to parse extracted JSON:', e2);
          extractedData = {
            success: false,
            error: 'AI responded but data could not be parsed. Try a clearer image.',
            raw_response: rawContent?.slice(0, 500),
          };
        }
      } else {
        extractedData = {
          success: false,
          error: 'No prescription data found in image. Ensure the image is a clear, well-lit photo of a prescription.',
          raw_response: rawContent?.slice(0, 500),
        };
      }
    }

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Prescription scan error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

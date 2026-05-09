import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es PharmaAssist AI, un assistant intelligent spécialisé dans le domaine pharmaceutique algérien. 

Tes compétences:
- Expliquer les interactions médicamenteuses et les risques associés
- Fournir des informations sur les médicaments (posologie, effets secondaires, contre-indications)
- Aider les patients à comprendre leurs ordonnances
- Guider les pharmaciens dans la vérification des prescriptions
- Répondre aux questions sur la carte Chifa et le système de santé algérien

Règles:
- Réponds toujours de manière professionnelle et empathique
- Pour les questions médicales sérieuses, recommande de consulter un professionnel de santé
- Utilise le français par défaut, mais tu peux répondre en arabe si demandé
- Sois concis mais complet dans tes réponses
- N'invente jamais d'informations médicales - si tu ne sais pas, dis-le

Tu es un outil d'aide à la décision, pas un substitut à l'avis médical professionnel.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY n'est pas configuré. Contactez l'administrateur." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (context?.drugs) {
      systemPrompt += `\n\nMédicaments disponibles dans la base de données: ${context.drugs.map((d: any) => d.name_fr).join(", ")}`;
    }
    if (context?.userRole) {
      systemPrompt += `\n\nL'utilisateur est un(e) ${context.userRole}. Adapte tes réponses à son niveau de connaissance.`;
    }

    console.log("Sending request to Google Gemini API...");
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Clé API invalide ou quota épuisé. Veuillez contacter l'administrateur." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erreur du service AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

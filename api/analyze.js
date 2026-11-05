export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullPrompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured in environment variables." });
  }

  const payload = {
    systemInstruction: {
      parts: [{
        text: "You are an automated code analysis engine. Directly output clean, structured Markdown matching the requested format. Avoid conversational filler or internal thinking."
      }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.1
    }
  };

  // Valid, active Google API models with fallback to bypass high-demand throttles
  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"];
  let lastErrorMessage = "Service temporarily unavailable. Please try again.";

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000)
        }
      );

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // If a model is unavailable, rate-limited, or overloaded, immediately try the next model
      if (response.status === 404 || response.status === 429 || response.status === 503) {
        lastErrorMessage = data.error?.message || `Model ${model} unavailable`;
        continue;
      }

      return res.status(response.status).json({ error: data.error?.message || "Upstream model error" });
    } catch (err) {
      lastErrorMessage = err.name === "TimeoutError" ? `Model ${model} timed out` : err.message;
    }
  }

  return res.status(503).json({ error: lastErrorMessage });
}
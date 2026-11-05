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
        text: "You are an automated code analysis engine. Directly output clean, concise, structured Markdown matching the requested format. Avoid redundant prose. Never output internal thought processes or planning drafts."
      }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.1
    }
  };

  // Prioritize flash-lite for near-instant latency and high throughput
  const models = ["gemini-3.8-flash-lite", "gemini-3.8-flash"];
  let lastErrorMessage = "Service temporarily unavailable. Please try again.";

  for (const model of models) {
    try {
      // Set an 8-second cutoff per model to avoid hitting Vercel's serverless timeout
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

      // If high demand or throttled, loop to the next model immediately
      if (response.status === 503 || response.status === 429) {
        lastErrorMessage = data.error?.message || "Model busy, switching...";
        continue;
      }

      return res.status(response.status).json({ error: data.error?.message || "Upstream model error" });
    } catch (err) {
      lastErrorMessage = err.name === "TimeoutError" ? "Request timed out, trying backup..." : err.message;
    }
  }

  return res.status(504).json({ error: lastErrorMessage });
}
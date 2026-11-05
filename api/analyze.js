export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullPrompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured in environment variables." });
  }

  // List of models to try in order if one experiences high demand/capacity limits
  const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash"];

  const payload = {
    systemInstruction: {
      parts: [{
        text: "You are an automated code analysis engine. Directly output clean, structured Markdown matching the requested format. Never output internal thought processes, planning stages, draft revisions, or constraint checklists."
      }]
    },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.1
    }
  };

  let lastErrorMessage = "Service temporarily unavailable. Please try again.";

  for (const model of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // If the model is overloaded (503/429) or not found, save error and try next candidate
      lastErrorMessage = data.error?.message || `Upstream error with ${model}`;
    } catch (err) {
      lastErrorMessage = err.message;
    }
  }

  return res.status(503).json({ error: lastErrorMessage });
}
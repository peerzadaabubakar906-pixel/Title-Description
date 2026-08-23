// Vercel Serverless Function
// Ye function browser se transcript + instructions leta hai,
// OpenAI ko server-side call karta hai (API key kabhi bhi browser mein nahi jati),
// aur title/description JSON wapas bhejta hai.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { instructions, transcript } = req.body || {};

  if (!transcript || !instructions) {
    return res.status(400).json({ error: "instructions aur transcript dono required hain" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server par OPENAI_API_KEY set nahi hai" });
  }

  try {
    const systemPrompt = `${instructions}\n\nRespond ONLY with valid JSON in this exact shape, no markdown fences, no preamble: {"title": "...", "description": "..."}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcript:\n\n${transcript}` },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: "OpenAI request failed", details: errText });
    }

    const data = await openaiRes.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return res.status(200).json({
      title: parsed.title || "",
      description: parsed.description || "",
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
}

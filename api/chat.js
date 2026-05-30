import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, rateLimitResponse } from "./_rateLimit.js";

const PATTERNS = [
  { id: "rings", name: "Rings", file: "rings.png" },
  { id: "voronoi_cells", name: "Voronoi Cells", file: "v2_01_voronoi_cells.png" },
  { id: "turing_spots", name: "Turing Spots", file: "v2_02_turing_spots.png" },
  { id: "lissajous_web", name: "Lissajous Web", file: "v2_03_lissajous_web.png" },
  { id: "flow_field", name: "Flow Field", file: "v2_04_flow_field.png" },
  { id: "hexagonal_grid", name: "Hexagonal Grid", file: "v2_05_hexagonal_grid.png" },
  { id: "moire_interference", name: "Moire Interference", file: "v2_07_moire_interference.png" },
  { id: "diamond_ripple", name: "Diamond Ripple", file: "v2_08_diamond_ripple.png" },
  { id: "islamic_geometry", name: "Islamic Geometry", file: "v2_09_islamic_geometry.png" },
  { id: "mountain_contours", name: "Mountain Contours", file: "v2_10_mountain_contours.png" },
  { id: "rose_curve", name: "Rose Curve", file: "v2_13_rose_curve.png" },
  { id: "stepped_pyramid", name: "Stepped Pyramid", file: "v2_12_stepped_pyramid.png" },
  { id: "warped_checker", name: "Warped Checker", file: "v2_14_warped_checker.png" },
  { id: "soundwave_stack", name: "Soundwave Stack", file: "v2_17_soundwave_stack.png" },
  { id: "hypnotic_eye", name: "Hypnotic Eye", file: "v2_18_hypnotic_eye.png" },
];

const SYSTEM_PROMPT = `You are Mara, the design assistant for the M|R Walls Fin Maker — an architectural Corian fin-wall configurator. The product is made of "fins" (vertical sculpted Corian blades). Always say "fins," never "ribs."

## Your Behavior:
1. **Be proactive — configure first, educate along the way.** When a user describes what they want, make smart design decisions and configure immediately. Use your best judgment for any missing details rather than asking questions. Include brief design notes explaining what you chose and why (e.g., "I went with 40 fins at 5" spacing to cover about 16 feet — adjust the fin count if your wall is wider or narrower.").
2. **Only ask questions when truly critical information is missing** — like if the request is so vague you could go in completely different directions. Limit to 1-2 targeted questions max. Even then, suggest a default: "I'll set this up as a wall install — let me know if it's actually ceiling-mounted."
3. **Educate the user naturally.** Weave in helpful context about fin design as you configure: mention trade-offs, suggest what works well, explain why you picked certain values. Help them learn without lecturing.

## Available Parameters (respond with JSON using these keys):
- count: Number of fins (integer, 10-80, default 30)
- spacing: Center-to-center spacing in inches (0.5 step, MIN 4 — never below 4, max 24, default 5). Below 4" the U-channel hardware won't fit; above ~24" the fins read as separate posts.
- height: Fin height in inches. Snaps to standard sheet-friendly heights: 72 (6'), 96 (8'), 108 (9'), 144 (12'). Default 144. Prefer these values.
- minDepth: Min depth from wall in inches (0.5 step, 2-30, default 2)
- maxDepth: Max depth from wall in inches. Snaps to clean divisors of the 48" sheet: 4, 6, 8, or 12. Default 6. Prefer these values — they cut with zero waste across the sheet width. (Deeper = more dramatic shadow but fewer fins per sheet, so noticeably higher price.)
- thickness: Fin thickness — only 0.5 or 1 (default 0.5)
- frequency: Wave frequency (0.5 step, 0.5-5, default 2)
- phase: Phase offset between fins (0.05 step, 0-1, default 0.25)
- waveType: 0=Sine, 1=Smooth, 2=Sharp (default 0)
- color: Fin hex color (default "#ffffff")
- backdropColor: Wall/ceiling hex color (default "#3a3a40")
- bgColor: Background hex color (default "#1a1a1f")
- installationMode: "wall", "ceiling", or "both" (default "wall"). "both" = fins wrap from wall up and across the ceiling around an inside corner.
- ceilingRun: Ceiling extension length in inches, only used when installationMode="both" (1 step, 24-144, default 96)
- lighting: "standard", "dramatic", "sunset", "cool", or "night" (default "standard")
- ledEnabled: true/false (default false)
- ledColorStart: LED start hex color (default "#ff0066")
- ledColorEnd: LED end hex color (default "#00ffff")
- ledIntensity: LED brightness (0.1-3, default 1)
- imageScale: Pattern image scale (0.1-5, default 1)
- patternImage: One of the pattern IDs listed below, or null for wave mode
- scaleFigure: true/false — show a 5'8" human figure for scale reference (default false). Turn this on when the user asks for a person, human, or scale reference.
- floorEnabled: true/false — show wood floor texture (default true)

## Available Pattern Images:
${PATTERNS.map(p => "- " + p.id + ": " + p.name).join("\n")}

When a user's description suggests a pattern/texture (organic, geometric, etc.), pick the most appropriate patternImage. If they want a wave/sine pattern, leave patternImage as null.

## PRICING — IMPORTANT, READ CAREFULLY:
You do NOT calculate prices. The real price depends on how the fins nest onto Corian sheets (sheet count, CNC clearance, material composing) — this is computed live by the app and shown on the panel to the right. Any number you invent would be wrong and could mislead the customer.

- NEVER state, estimate, or imply a dollar amount — not in your text, not in the JSON.
- The live panel always shows the true price. Point users there.
- If a user gives a **BUDGET**: configure for the look and scale they want, then tell them to watch the price on the right panel and nudge from there. The biggest price levers are: fewer fins, shallower max depth (4" or 6" instead of 8"/12"), shorter height, and LEDs off. Explain those levers in plain language. Example: "I've set up the look you described — keep an eye on the price panel on the right. If it's over budget, the fastest way down is reducing the fin count or dropping max depth to 4–6". Want me to tighten it up?"
- There is a project minimum, so very small walls may not get cheaper past a point — if someone designs a tiny wall and wants it cheaper, gently note that small projects have a minimum and the better value is to make the wall do more.

## You can also point users to:
- The **Gallery** button (top of the panel) — real built M|R Walls installs.
- The **Install** button — step-by-step assembly drawings.
- The **Shop Drawing + Quote** button — generates their drawing and locks in pricing (they enter an email).

## Response Format:
Always respond with a conversational message, then include a JSON block wrapped in \`\`\`json ... \`\`\` with ONLY the parameters you want to change (don't include unchanged defaults). Do NOT include any price numbers anywhere. Prefer the snap values for height (72/96/108/144) and maxDepth (4/6/8/12).

If you truly must ask a question, keep it to 1-2 targeted questions max and still suggest defaults. Always include JSON when you configure.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit: Anthropic Haiku is cheap but unbounded chat could still rack
  // up cost. Cap per-IP to 30/hour — generous for real users, blocks scripts.
  const rl = await checkRateLimit(req, "chat", { limit: 30, windowSec: 3600 });
  if (!rl.allowed) return rateLimitResponse(res, rl);

  // Key priority: env var > header (env var means owner pre-configured it on Vercel)
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key." });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "No message provided." });
  }

  const client = new Anthropic({ apiKey });

  const messages = [];
  if (history && Array.isArray(history)) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: "user", content: message });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock ? textBlock.text : "";

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let params = {};

    if (jsonMatch) {
      try {
        params = JSON.parse(jsonMatch[1]);
      } catch {}
    }

    let patternImageUrl = null;
    if (params.patternImage) {
      const pattern = PATTERNS.find((p) => p.id === params.patternImage);
      if (pattern) {
        patternImageUrl = "/patterns/" + pattern.file;
      }
      delete params.patternImage;
    }

    const displayText = text.replace(/```json\s*[\s\S]*?\s*```/, "").trim();

    res.json({ text: displayText, params, patternImageUrl });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
}

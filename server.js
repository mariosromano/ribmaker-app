import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── Pattern catalog ──────────────────────────────────────────────────
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

const SYSTEM_PROMPT = `You are a design assistant for the M|R Walls Rib Maker — an architectural facade panel configurator.

## Your Behavior:
1. **Be proactive — configure first, educate along the way.** When a user describes what they want, make smart design decisions and configure immediately. Use your best judgment for any missing details rather than asking questions. Include brief design notes in your response explaining what you chose and why (e.g., "I went with 50 ribs at 7" spacing to cover about 29 feet — adjust the rib count if your wall is wider or narrower.").
2. **Only ask questions when truly critical information is missing** — like if the request is so vague you could go in completely different directions. Limit to 1-2 targeted questions max, never a long list. Even then, suggest a default: "I'll set this up as a wall install — let me know if it's actually ceiling-mounted."
3. **Educate the user naturally.** Weave in helpful context about rib design as you configure: mention trade-offs, suggest what works well, explain why you picked certain values. Help them learn without lecturing.
4. When the user specifies a **BUDGET**, reverse-engineer the parameters to hit that target using the pricing formulas below. Optimize the design to stay within budget while maximizing visual impact.

## Available Parameters (respond with JSON using these keys):
- count: Number of ribs (integer, 10-80, default 40)
- spacing: Center-to-center spacing in inches (0.5 step, 1-50, default 7)
- height: Rib height in inches (1 step, 40-144, default 144)
- minDepth: Min depth from wall in inches (0.5 step, 2-30, default 4)
- maxDepth: Max depth from wall in inches (0.5 step, 2-30, default 12)
- thickness: Rib thickness — only 0.5 or 1 (default 0.5)
- frequency: Wave frequency (0.5 step, 0.5-5, default 2)
- phase: Phase offset between ribs (0.05 step, 0-1, default 0.25)
- waveType: 0=Sine, 1=Smooth, 2=Sharp (default 0)
- controlPoints: Curve control points (5-100, default 20)
- displayResolution: Curve smoothness (50-500, default 200)
- color: Rib hex color (default "#ffffff")
- backdropColor: Wall/ceiling hex color (default "#3a3a40")
- bgColor: Background hex color (default "#1a1a1f")
- installationMode: "wall", "ceiling", or "both" (default "wall"). "both" = ribs wrap from wall up and across the ceiling around an inside corner.
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

## Pricing Formulas (CRITICAL — you MUST calculate step by step before choosing parameters for budget requests):
1. Rib length = height (for wall or ceiling mode) OR height + ceilingRun (for "both" mode)
2. Rib surface area (sf) = (ribLength × maxDepth / 144) × count
3. Rib cost = surface area × 45
4. LED cost = (ribLength / 12) × count × 30  (only if ledEnabled = true, otherwise 0)
5. Total = rib cost + LED cost

### How to reverse-engineer from a budget:
ALWAYS do the math BEFORE picking parameters. Work backwards:

Step 1: Decide if LEDs are wanted. If yes, note that LED cost = (height/12) × count × 30.
Step 2: Subtract LED cost from budget to get remaining budget for ribs.
Step 3: Rib budget = (height × maxDepth / 144) × count × 45. Solve for the parameters.

### Worked example — "$37,000 budget with LEDs":
- Try count=40, height=144 (12ft), maxDepth=12:
  - Rib area = (144 × 12 / 144) × 40 = 12 × 40 = 480 sf
  - Rib cost = 480 × 45 = $21,600
  - LED cost = (144/12) × 40 × 30 = 12 × 40 × 30 = $14,400
  - Total = $21,600 + $14,400 = $36,000 ✓ (under $37K)

### Worked example — "$37,000 budget, no LEDs":
- Try count=50, height=144, maxDepth=12:
  - Rib area = (144 × 12 / 144) × 50 = 600 sf
  - Rib cost = 600 × 45 = $27,000 ✓
- Or count=40, height=144, maxDepth=18:
  - Rib area = (144 × 18 / 144) × 40 = 720 sf
  - Rib cost = 720 × 45 = $32,400 ✓

### Common gotcha:
- 50 ribs × 144" height × 18" maxDepth with LEDs = (144×18/144)×50×45 + (144/12)×50×30 = 40,500 + 18,000 = $58,500. That's WAY over $37K!
- ALWAYS verify your total before responding. If it exceeds the budget, reduce count, height, or maxDepth.

The real-time price is shown on the Rib Maker panel to the right, so do NOT include dollar amounts in your chat response. Instead, briefly mention what trade-offs you made to fit the budget (e.g., "Kept ribs at 12" depth instead of 18" to stay within budget").

## Response Format:
Always respond with a conversational message, then include a JSON block wrapped in \`\`\`json ... \`\`\` with ONLY the parameters you want to change (don't include unchanged defaults). Do NOT include any price numbers in the JSON or your text — the user sees the live price on the right panel.

If you truly must ask a question, keep it to 1-2 targeted questions max and still suggest defaults. Always include JSON when you configure.

Example 1 — Clear request:
User: "I want a dramatic lobby piece with 60 tall ribs, deep waves, and red LED lighting"

Response: "Setting up a dramatic lobby installation with 60 ribs at full height. I'm going deep — 24" max depth with a slow 1.5 frequency wave to create bold, sweeping curves that catch the light. Red LEDs will glow from behind each rib. The dramatic lighting preset will really make those shadows pop."

\`\`\`json
{
  "count": 60,
  "height": 144,
  "minDepth": 4,
  "maxDepth": 24,
  "frequency": 1.5,
  "phase": 0.3,
  "lighting": "dramatic",
  "ledEnabled": true,
  "ledColorStart": "#ff0000",
  "ledColorEnd": "#ff3300",
  "ledIntensity": 1.5
}
\`\`\`

Example 2 — Vague request (configure anyway + educate):
User: "I need a wall for my restaurant"

Response: "Here's a great starting point for a restaurant feature wall — 40 ribs at full 12ft height with a flowing wave pattern. I went with sunset lighting since it creates a warm, inviting atmosphere that works well in dining spaces. The wave frequency of 2 gives a nice organic rhythm without being too busy.

This covers about 23 feet of wall at 7" rib spacing. If your wall is wider or narrower, just tell me the width and I'll adjust the count. You can also add LED accent lighting for extra impact — just say the word."

\`\`\`json
{
  "count": 40,
  "height": 144,
  "maxDepth": 12,
  "minDepth": 4,
  "frequency": 2,
  "phase": 0.25,
  "lighting": "sunset"
}
\`\`\`

Example 3 — Budget-targeted:
User: "Design something dramatic for under $25,000, no LEDs"

Response: "Going for maximum drama within budget. I've configured 40 ribs at 96" (8ft) height with deep 20" waves — this creates really dramatic shadow play. Using the diamond ripple pattern for added texture, and dramatic lighting to amplify the depth. At $45/sf this should land right around your target. If you want to go taller, we'd need to reduce the rib count or depth to stay under $25K."

\`\`\`json
{
  "count": 40,
  "height": 96,
  "maxDepth": 20,
  "minDepth": 4,
  "frequency": 1.5,
  "phase": 0.3,
  "lighting": "dramatic",
  "patternImage": "diamond_ripple",
  "ledEnabled": false
}
\`\`\``;

// ── Config (tells frontend which keys are pre-configured) ───────────
app.get('/api/config', (req, res) => {
  res.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasFalKey: !!process.env.FAL_API_KEY,
  });
});

// ── Chat API ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key.' });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  const client = new Anthropic.default({ apiKey });

  const messages = [];
  if (history && Array.isArray(history)) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock ? textBlock.text : '';

    // Extract JSON block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let params = {};

    if (jsonMatch) {
      try {
        params = JSON.parse(jsonMatch[1]);
      } catch {}
    }

    // Resolve pattern image
    let patternImageUrl = null;
    if (params.patternImage) {
      const pattern = PATTERNS.find((p) => p.id === params.patternImage);
      if (pattern) {
        patternImageUrl = '/patterns/' + pattern.file;
      }
      delete params.patternImage;
    }

    const displayText = text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

    res.json({ text: displayText, params, patternImageUrl });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

// ── Render API (FAL) ─────────────────────────────────────────────────
app.post('/api/render', async (req, res) => {
  const falKey = req.headers['x-fal-key'];
  if (!falKey) {
    return res.status(401).json({ error: 'Missing FAL API key.' });
  }

  const { image, prompt } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No screenshot provided.' });
  }

  try {
    const uploadRes = await fetch(
      'https://fal.run/fal-ai/nano-banana-pro/edit',
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt:
            prompt ||
            'White Corian ribs, realistic architectural photography, luxury interior, accent lighting, keep exact rib geometry and scale, high detail, 8K',
          image_urls: [`data:image/jpeg;base64,${image}`],
          num_images: 1,
          aspect_ratio: 'auto',
          output_format: 'png',
          resolution: '1K',
          safety_tolerance: '6',
        }),
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return res.status(502).json({ error: `FAL API error: ${uploadRes.status} — ${errBody}` });
    }

    const result = await uploadRes.json();
    const outputUrl = result.images?.[0]?.url || result.output?.url || null;

    if (!outputUrl) {
      return res.status(502).json({ error: 'No image returned from FAL.' });
    }

    res.json({ imageUrl: outputUrl, description: result.description || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

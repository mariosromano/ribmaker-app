import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { RibParams, InstallationMode, LightingPreset } from '../engine/types';
import { PATTERNS } from '../engine/patterns';
import { loadImageFromUrl } from '../engine/ribEngine';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

function getSavedKey(key: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) ?? '';
}

interface ChatPanelProps {
  params: RibParams;
  onParamsChange: (params: RibParams) => void;
  onInstallationModeChange: (mode: InstallationMode) => void;
  onLightingPresetChange: (preset: LightingPreset) => void;
  onLedEnabledChange: (enabled: boolean) => void;
  onLedColorStartChange: (color: string) => void;
  onLedColorEndChange: (color: string) => void;
  onLedIntensityChange: (intensity: number) => void;
  onBackdropColorChange: (color: string) => void;
  onBgColorChange: (color: string) => void;
  onImageScaleChange: (scale: number) => void;
  onImageModeChange: (hasImage: boolean) => void;
  onScaleFigureEnabledChange: (enabled: boolean) => void;
  onFloorEnabledChange: (enabled: boolean) => void;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export default function ChatPanel({
  params,
  onParamsChange,
  onInstallationModeChange,
  onLightingPresetChange,
  onLedEnabledChange,
  onLedColorStartChange,
  onLedColorEndChange,
  onLedIntensityChange,
  onBackdropColorChange,
  onBgColorChange,
  onImageScaleChange,
  onImageModeChange,
  onScaleFigureEnabledChange,
  onFloorEnabledChange,
  rendererRef,
  sceneRef,
  cameraRef,
}: ChatPanelProps) {
  const [apiKey, setApiKey] = useState(() => getSavedKey('ribmaker_api_key'));
  const [falKey, setFalKey] = useState(() => getSavedKey('ribmaker_fal_key'));
  const [serverHasAnthropicKey, setServerHasAnthropicKey] = useState(false);
  const [serverHasFalKey, setServerHasFalKey] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Describe the rib wall you want — style, size, lighting, colors, patterns — and I\'ll configure it live. Try: "dramatic lobby with 60 deep ribs and red LEDs"',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPatterns, setShowPatterns] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showRenderPanel, setShowRenderPanel] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [scenePrompt, setScenePrompt] = useState(
    'White Corian ribs, realistic architectural photography, accent lighting, keep exact rib geometry and scale'
  );
  const [renderResult, setRenderResult] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check if server has pre-configured keys
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.hasAnthropicKey) setServerHasAnthropicKey(true);
        if (cfg.hasFalKey) setServerHasFalKey(true);
      })
      .catch(() => {});
  }, []);

  // Save keys to localStorage
  const handleKeyChange = useCallback((val: string) => {
    setApiKey(val);
    localStorage.setItem('ribmaker_api_key', val);
  }, []);

  const handleFalKeyChange = useCallback((val: string) => {
    setFalKey(val);
    localStorage.setItem('ribmaker_fal_key', val);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply AI-returned params to the React state
  const applyParams = useCallback(
    (aiParams: Record<string, unknown>) => {
      const newParams = { ...params };

      // Direct param mapping
      const numKeys: (keyof RibParams)[] = [
        'count', 'spacing', 'height', 'minDepth', 'maxDepth', 'thickness',
        'frequency', 'phase', 'waveType', 'controlPoints', 'displayResolution', 'ceilingRun',
      ];
      for (const key of numKeys) {
        if (aiParams[key] !== undefined) {
          (newParams as any)[key] = Number(aiParams[key]);
        }
      }
      if (aiParams.color !== undefined) newParams.color = String(aiParams.color);

      onParamsChange(newParams);

      // Non-param state
      if (aiParams.installationMode !== undefined) {
        onInstallationModeChange(aiParams.installationMode as InstallationMode);
      }
      if (aiParams.lighting !== undefined) {
        onLightingPresetChange(aiParams.lighting as LightingPreset);
      }
      if (aiParams.ledEnabled !== undefined) onLedEnabledChange(Boolean(aiParams.ledEnabled));
      if (aiParams.ledColorStart !== undefined) onLedColorStartChange(String(aiParams.ledColorStart));
      if (aiParams.ledColorEnd !== undefined) onLedColorEndChange(String(aiParams.ledColorEnd));
      if (aiParams.ledIntensity !== undefined) onLedIntensityChange(Number(aiParams.ledIntensity));
      if (aiParams.backdropColor !== undefined) onBackdropColorChange(String(aiParams.backdropColor));
      if (aiParams.bgColor !== undefined) onBgColorChange(String(aiParams.bgColor));
      if (aiParams.imageScale !== undefined) onImageScaleChange(Number(aiParams.imageScale));
      if (aiParams.scaleFigure !== undefined) onScaleFigureEnabledChange(Boolean(aiParams.scaleFigure));
      if (aiParams.floorEnabled !== undefined) onFloorEnabledChange(Boolean(aiParams.floorEnabled));
    },
    [params, onParamsChange, onInstallationModeChange, onLightingPresetChange, onLedEnabledChange,
     onLedColorStartChange, onLedColorEndChange, onLedIntensityChange, onBackdropColorChange,
     onBgColorChange, onImageScaleChange, onScaleFigureEnabledChange, onFloorEnabledChange]
  );

  // Load pattern image
  const loadPattern = useCallback(
    async (file: string) => {
      try {
        await loadImageFromUrl(`/patterns/${file}`);
        onImageModeChange(true);
      } catch {
        // Pattern load failed silently
      }
    },
    [onImageModeChange]
  );

  // Capture screenshot from Three.js renderer (downscaled JPEG to stay under Vercel 4.5MB limit)
  const captureScreenshot = useCallback((): string | null => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return null;

    renderer.render(scene, camera);

    // Downscale to max 1536px on longest side and use JPEG for smaller payload
    const canvas = renderer.domElement;
    const maxDim = 1536;
    let w = canvas.width;
    let h = canvas.height;
    if (w > maxDim || h > maxDim) {
      const ratio = maxDim / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/jpeg', 0.85);
    ctx.drawImage(canvas, 0, 0, w, h);
    return offscreen.toDataURL('image/jpeg', 0.85);
  }, [rendererRef, sceneRef, cameraRef]);

  // FAL render
  const handleRender = useCallback(async () => {
    if (!falKey && !serverHasFalKey) {
      setError('Enter your FAL API key first.');
      return;
    }

    setRendering(true);
    setError(null);
    setRenderResult(null);

    try {
      const dataUrl = captureScreenshot();
      if (!dataUrl) throw new Error('Could not capture screenshot');

      const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

      const renderHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (falKey) renderHeaders['x-fal-key'] = falKey;

      const res = await fetch('/api/render', {
        method: 'POST',
        headers: renderHeaders,
        body: JSON.stringify({ image: base64, prompt: scenePrompt }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(data.error || 'Render failed');

      setRenderResult(data.imageUrl);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: 'Render realistic' },
        { role: 'assistant', content: "Here's the photorealistic render:", imageUrl: data.imageUrl },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Render failed');
    } finally {
      setRendering(false);
    }
  }, [falKey, serverHasFalKey, scenePrompt, captureScreenshot]);

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    if (!apiKey && !serverHasAnthropicKey) {
      setError('Enter your Anthropic API key first.');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));

      const chatHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) chatHeaders['x-api-key'] = apiKey;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify({ message: input.trim(), history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.text };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.params && Object.keys(data.params).length > 0) {
        applyParams(data.params);
      }

      if (data.patternImageUrl) {
        setTimeout(async () => {
          await loadPattern(data.patternImageUrl.replace('/patterns/', ''));
        }, 300);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [input, apiKey, serverHasAnthropicKey, messages, applyParams, loadPattern]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handlePatternClick = useCallback(
    (pattern: (typeof PATTERNS)[number]) => {
      loadPattern(pattern.file);
      setShowPatterns(false);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: `Apply ${pattern.name} pattern` },
        { role: 'assistant', content: `Applied the ${pattern.name} pattern. The rib depths are now driven by the image brightness.` },
      ]);
    },
    [loadPattern]
  );

  return (
    <>
      <div className="w-[380px] min-w-[380px] flex flex-col bg-[#2a2a30] border-r border-[#3a3a42] h-screen">
        {/* Header + API Keys */}
        <div className="p-3 px-5 border-b border-[#3a3a42]">
          <div className="text-lg font-bold text-white mb-2">
            M<span className="text-[#7c9bff]">|</span>R Walls
          </div>
          {!serverHasAnthropicKey && (
            <input
              type="password"
              placeholder="Anthropic API Key (sk-ant-...)"
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#1a1a1f] border border-[#3a3a42] rounded text-[#ccc] text-[11px] mb-1.5 outline-none"
            />
          )}
          {!serverHasFalKey && (
            <input
              type="password"
              placeholder="FAL API Key (for realistic renders)"
              value={falKey}
              onChange={(e) => handleFalKeyChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#1a1a1f] border border-[#3a3a42] rounded text-[#ccc] text-[11px] outline-none"
            />
          )}
        </div>

        {/* How to Use */}
        <div className="px-5 pt-2">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className={`w-full py-1.5 border rounded-md text-[11px] cursor-pointer font-medium transition-colors ${
              showAbout ? 'bg-[#3a3a52] border-[#3a3a42] text-[#7c9bff]' : 'bg-transparent border-[#3a3a42] text-[#888]'
            }`}
          >
            {showAbout ? 'Hide Guide' : 'How to Use'}
          </button>
          {showAbout && (
            <div className="p-3 bg-[#1a1a1f] rounded-lg mt-1.5 text-[11px] text-[#bbb] leading-relaxed max-h-[260px] overflow-y-auto">
              <div className="font-bold text-[#7c9bff] mb-1.5 text-xs">M|R Walls Rib Maker</div>
              <p className="mb-2">Design custom architectural rib wall panels by describing what you want in the chat. The AI will configure the 3D preview in real time.</p>
              <div className="font-semibold text-[#ccc] mb-1">What you can do:</div>
              <ul className="mb-2 pl-4 list-disc space-y-0.5">
                <li>Describe a wall style and the AI configures everything</li>
                <li>Set a budget and the AI reverse-engineers parameters</li>
                <li>Choose from 15+ pattern images (Browse Patterns)</li>
                <li>Switch between Wall, Ceiling, or Both modes</li>
                <li>Toggle LED strip lighting with custom colors</li>
                <li>Render photorealistic images (requires FAL API key)</li>
              </ul>
              <div className="font-semibold text-[#ccc] mb-1">Tips:</div>
              <ul className="pl-4 list-disc space-y-0.5">
                <li>Be specific: "40 ribs, 12ft tall, deep waves, sunset lighting"</li>
                <li>Mention budget: "design something dramatic for under $25K"</li>
                <li>Pricing: $45/sf ribs + $30/lf LEDs</li>
              </ul>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-3 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#7c9bff] rounded-[14px_14px_4px_14px]'
                    : 'bg-[#3a3a42] rounded-[14px_14px_14px_4px]'
                } text-white`}
              >
                {msg.content}
              </div>
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Rendered"
                  className="mt-2 max-w-[90%] rounded-lg cursor-pointer border border-[#3a3a42]"
                  onClick={() => setRenderResult(msg.imageUrl!)}
                />
              )}
            </div>
          ))}
          {loading && (
            <div className="px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#3a3a42] text-[#888] text-[13px] inline-block">
              Configuring...
            </div>
          )}
          {rendering && (
            <div className="px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#3a3a42] text-[#c9a0ff] text-[13px] inline-block">
              Rendering photorealistic image...
            </div>
          )}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-[#4a2a2a] text-[#ff6b6b] text-xs">
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Pattern Grid */}
        <div className="px-5">
          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className="w-full py-2 bg-transparent border border-[#555] rounded-md text-[#888] text-[11px] cursor-pointer mb-1"
          >
            {showPatterns ? 'Hide Patterns' : 'Browse Patterns'}
          </button>
          {showPatterns && (
            <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pb-2">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePatternClick(p)}
                  className="p-1 bg-[#1a1a1f] border border-[#3a3a42] rounded cursor-pointer text-center hover:border-[#7c9bff] transition-colors"
                >
                  <img
                    src={`/patterns/${p.file}`}
                    alt={p.name}
                    className="w-full h-[50px] object-cover rounded-sm"
                  />
                  <div className="text-[9px] text-[#888] mt-0.5 truncate">{p.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Render Panel */}
        <div className="px-5 pt-1">
          <button
            onClick={() => setShowRenderPanel(!showRenderPanel)}
            className={`w-full py-2 border rounded-md text-[11px] cursor-pointer font-semibold transition-colors ${
              showRenderPanel
                ? 'bg-[#5a3a7a] border-[#7a5aaa] text-white'
                : 'bg-transparent border-[#7a5aaa] text-[#c9a0ff]'
            }`}
          >
            {showRenderPanel ? 'Hide Render' : 'Render Realistic'}
          </button>
          {showRenderPanel && (
            <div className="py-2">
              <textarea
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                rows={3}
                placeholder="Describe the scene context..."
                className="w-full px-2.5 py-2 bg-[#1a1a1f] border border-[#3a3a42] rounded-md text-white text-[11px] resize-none outline-none font-[inherit] mb-1.5"
              />
              <button
                onClick={handleRender}
                disabled={rendering || (!falKey && !serverHasFalKey)}
                className={`w-full py-2.5 border-none rounded-md text-[13px] font-bold text-white ${
                  rendering || (!falKey && !serverHasFalKey)
                    ? 'bg-[#555] cursor-default'
                    : 'bg-gradient-to-br from-[#7a5aaa] to-[#5a3a8a] cursor-pointer'
                }`}
              >
                {rendering ? 'Rendering...' : (!falKey && !serverHasFalKey) ? 'Enter FAL Key Above' : 'Render'}
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 px-5 border-t border-[#3a3a42]">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your rib wall..."
              rows={2}
              className="flex-1 px-3 py-2.5 bg-[#1a1a1f] border border-[#3a3a42] rounded-lg text-white text-[13px] resize-none outline-none font-[inherit]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`px-5 py-2.5 border-none rounded-lg text-[13px] font-semibold text-white self-end ${
                loading || !input.trim()
                  ? 'bg-[#555] cursor-default'
                  : 'bg-[#7c9bff] cursor-pointer hover:bg-[#6b8aee]'
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Render Result Modal */}
      {renderResult && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] cursor-pointer"
          onClick={() => setRenderResult(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={renderResult}
              alt="Photorealistic Render"
              className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            />
            <div className="flex gap-2 justify-center mt-3">
              <a
                href={renderResult}
                download="mr-walls-render.png"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-[#7c9bff] text-white rounded-md text-[13px] font-semibold no-underline"
              >
                Download
              </a>
              <button
                onClick={() => setRenderResult(null)}
                className="px-6 py-2.5 bg-[#4a4a52] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

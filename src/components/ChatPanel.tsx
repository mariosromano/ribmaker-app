import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { RibParams, InstallationMode, LightingPreset } from '../engine/types';
import { loadImageFromUrl } from '../engine/ribEngine';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  applied?: string[]; // concierge confirmation — human-readable settings Mara changed
}

// Turn Mara's raw param JSON into client-facing "what changed" chips.
function summarizeApplied(p: Record<string, unknown>): string[] {
  const out: string[] = [];
  const lighting: Record<string, string> = {
    standard: 'Standard lighting', dramatic: 'Dramatic lighting',
    sunset: 'Sunset lighting', cool: 'Cool lighting', night: 'Night lighting',
  };
  const waveTypes = ['Sine wave', 'Smooth wave', 'Sharp wave'];
  if (p.count !== undefined) out.push(`${p.count} fins`);
  if (p.spacing !== undefined) out.push(`${p.spacing}″ spacing`);
  if (p.height !== undefined) out.push(`${Math.floor(Number(p.height) / 12)}′ tall`);
  if (p.maxDepth !== undefined) out.push(`${p.maxDepth}″ max depth`);
  if (p.installationMode !== undefined) {
    const m = String(p.installationMode);
    out.push(m === 'both' ? 'Wall + ceiling' : m.charAt(0).toUpperCase() + m.slice(1) + ' mount');
  }
  if (p.waveType !== undefined && waveTypes[Number(p.waveType)]) out.push(waveTypes[Number(p.waveType)]);
  if (p.frequency !== undefined) out.push(`Wave freq ${p.frequency}`);
  if (p.lighting !== undefined && lighting[String(p.lighting)]) out.push(lighting[String(p.lighting)]);
  if (p.ledEnabled === true) out.push('LED lighting on');
  if (p.color !== undefined) out.push('Fin color');
  if (p.patternImage !== undefined && p.patternImage !== null) out.push('Pattern applied');
  return out;
}

function getSavedKey(key: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) ?? '';
}

const SUGGESTIONS = [
  'Dramatic lobby wall with 60 deep flowing fins',
  'Minimal white ceiling fins for a modern office',
  'Organic flowing feature wall with warm sunset lighting',
];

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
  isFloating?: boolean;
  sidebarReady?: boolean;
  onOnboardingComplete?: () => void;
  isDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
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
  isFloating = false,
  sidebarReady = true,
  onOnboardingComplete,
  isDrawer = false,
  isOpen = true,
  onClose,
}: ChatPanelProps) {
  const [apiKey, setApiKey] = useState(() => getSavedKey('ribmaker_api_key'));
  const [serverHasAnthropicKey, setServerHasAnthropicKey] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Describe the fin wall you want — style, size, depth, colors, patterns — and I\'ll configure it live. Try: "dramatic lobby with 60 deep flowing fins" or "minimal white ceiling fins for a modern office."',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [renderResult, setRenderResult] = useState<string | null>(null);
  const [floatingFadingOut, setFloatingFadingOut] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const floatingTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if server has pre-configured keys
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.hasAnthropicKey) setServerHasAnthropicKey(true);
      })
      .catch(() => {});
  }, []);

  // Auto-focus floating textarea
  useEffect(() => {
    if (isFloating && !floatingFadingOut && floatingTextareaRef.current) {
      floatingTextareaRef.current.focus();
    }
  }, [isFloating, floatingFadingOut]);

  // Close drawer on Escape
  useEffect(() => {
    if (!isDrawer || !isOpen || !onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDrawer, isOpen, onClose]);

  // Save keys to localStorage
  const handleKeyChange = useCallback((val: string) => {
    setApiKey(val);
    localStorage.setItem('ribmaker_api_key', val);
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

      // Build the concierge "what I changed" summary from the params + pattern
      const summarySource = { ...(data.params || {}) };
      if (data.patternImageUrl) summarySource.patternImage = data.patternImageUrl;
      const applied = (data.params && Object.keys(data.params).length > 0) || data.patternImageUrl
        ? summarizeApplied(summarySource)
        : [];

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.text, applied };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.params && Object.keys(data.params).length > 0) {
        applyParams(data.params);
      }

      if (data.patternImageUrl) {
        setTimeout(async () => {
          await loadPattern(data.patternImageUrl.replace('/patterns/', ''));
        }, 300);
      }

      // Transition out of floating card after first successful response
      if (isFloating && onOnboardingComplete) {
        setFloatingFadingOut(true);
        setTimeout(() => {
          onOnboardingComplete();
          setFloatingFadingOut(false);
        }, 300);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [input, apiKey, serverHasAnthropicKey, messages, applyParams, loadPattern, isFloating, onOnboardingComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <>
      {/* ── Floating Welcome Card (first-time users) ─────────────── */}
      {isFloating && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.5)',
            animation: floatingFadingOut
              ? 'floatCardOut 0.3s ease-in forwards'
              : 'floatCardIn 0.4s ease-out',
          }}
        >
          <div className="w-[520px] max-w-[90vw] bg-[var(--surface-1)] rounded-2xl border border-[var(--line)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            {/* Branding */}
            <div className="text-center mb-6">
              <div className="text-[28px] font-bold text-white mb-2">
                M<span className="text-[var(--gold)]">|</span>R Walls
              </div>
              <div className="text-[#999] text-sm leading-relaxed">
                Describe the fin wall you want and Mara will configure it live.
                <br />
                Style, size, depth, patterns, budget — just tell her what you need.
              </div>
            </div>

            {/* API key input (only if server doesn't have key and user hasn't saved one) */}
            {!serverHasAnthropicKey && !apiKey && (
              <input
                type="password"
                placeholder="Anthropic API Key (sk-ant-...)"
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-0)] border border-[var(--line)] rounded-lg text-[#ccc] text-[13px] mb-4 outline-none"
              />
            )}

            {/* Suggestion chips */}
            <div className="flex flex-col gap-2 mb-5">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-3.5 py-2.5 rounded-lg text-[13px] cursor-pointer text-left transition-all"
                  style={{
                    background: input === s ? '#3a3a52' : '#1a1a1f',
                    border: `1px solid ${input === s ? '#7c9bff' : '#3a3a42'}`,
                    color: input === s ? '#7c9bff' : '#bbb',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Chat input */}
            <div className="flex gap-2">
              <textarea
                ref={floatingTextareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your fin wall..."
                rows={3}
                className="flex-1 px-3.5 py-3 bg-[var(--surface-0)] border border-[var(--line)] rounded-lg text-white text-[14px] resize-none outline-none font-[inherit] focus:border-[var(--gold)] transition-colors placeholder:text-[#666]"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`px-6 py-3 border-none rounded-lg text-[14px] font-semibold text-white self-end ${
                  loading || !input.trim()
                    ? 'bg-[#555] cursor-default'
                    : 'bg-[var(--gold)] text-[#1a1a14] cursor-pointer hover:bg-[var(--gold-bright)]'
                }`}
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="text-center text-[var(--gold)] text-[13px] mt-4">
                Configuring your fin wall...
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-3 py-2 rounded-lg bg-[#4a2a2a] text-[#ff6b6b] text-xs mt-3">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sidebar / Drawer Chat Panel ─────────────────────────────── */}
      <div
        className={
          isDrawer
            ? "absolute top-0 right-0 h-full flex flex-col bg-[var(--surface-1)] border-l border-[var(--line)] shadow-[-8px_0_32px_rgba(0,0,0,0.4)] z-50"
            : "flex flex-col bg-[var(--surface-1)] border-r border-[var(--line)] h-screen"
        }
        style={
          isDrawer
            ? {
                width: 420,
                transform: isOpen ? 'translateX(0)' : 'translateX(110%)',
                transition: 'transform 0.3s ease',
              }
            : {
                width: sidebarReady ? 420 : 0,
                minWidth: sidebarReady ? 420 : 0,
                opacity: sidebarReady ? 1 : 0,
                overflow: sidebarReady ? undefined : 'hidden',
                borderRight: sidebarReady ? undefined : 'none',
                transition: 'width 0.5s ease, min-width 0.5s ease, opacity 0.5s ease',
              }
        }
      >
        {/* Header + API Keys */}
        <div className="p-4 px-6 border-b border-[var(--line)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(212,175,55,0.4)]">M</div>
              <div>
                <div className="text-[14px] font-semibold text-white leading-none">Ask Mara</div>
                <div className="text-[10px] text-[#888] mt-0.5">Design assistant</div>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-md text-white bg-[var(--surface-3)] hover:bg-[var(--surface-4)] border border-[var(--line-strong)] transition-colors flex items-center justify-center text-2xl leading-none font-bold shrink-0"
                aria-label="Close"
                title="Close (Esc)"
              >
                ×
              </button>
            )}
          </div>
          {!serverHasAnthropicKey && (
            <input
              type="password"
              placeholder="Anthropic API Key (sk-ant-...)"
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[var(--surface-0)] border border-[var(--line)] rounded text-[#ccc] text-[11px] mb-1.5 outline-none"
            />
          )}
        </div>

        {/* How to Use */}
        <div className="px-6 pt-3">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className={`w-full py-1.5 border rounded-md text-[11px] cursor-pointer font-medium transition-colors ${
              showAbout ? 'bg-[var(--surface-3)] border-[var(--gold-deep)] text-[var(--gold-bright)]' : 'bg-transparent border-[var(--line)] text-[#888]'
            }`}
          >
            {showAbout ? 'Hide Guide' : 'How to Use'}
          </button>
          {showAbout && (
            <div className="p-3 bg-[var(--surface-0)] rounded-lg mt-1.5 text-[11px] text-[#bbb] leading-relaxed max-h-[260px] overflow-y-auto">
              <div className="font-bold text-[var(--gold)] mb-1.5 text-xs">M|R Walls Fin Maker</div>
              <p className="mb-2">Design custom architectural fin wall panels by describing what you want in the chat. The AI will configure the 3D preview in real time.</p>
              <div className="font-semibold text-[#ccc] mb-1">What you can do:</div>
              <ul className="mb-2 pl-4 list-disc space-y-0.5">
                <li>Describe a wall style and Mara configures everything</li>
                <li>Mention a budget and Mara dials in the scale to suit</li>
                <li>Choose from 15+ pattern images (Browse Patterns)</li>
                <li>Switch between Wall, Ceiling, or Both modes</li>
              </ul>
              <div className="font-semibold text-[#ccc] mb-1">Tips:</div>
              <ul className="pl-4 list-disc space-y-0.5">
                <li>Be specific: "40 fins, 12ft tall, deep waves, sunset lighting"</li>
                <li>Mention budget and watch the live price on the right panel</li>
                <li>Use Render Realistic on the main panel for a photoreal view</li>
              </ul>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`px-4 py-3 text-[15px] leading-[1.55] max-w-[90%] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[var(--gold)] text-[#1a1a14] rounded-[16px_16px_4px_16px]'
                    : 'bg-[var(--surface-3)] text-[var(--ink)] rounded-[16px_16px_16px_4px]'
                }`}
              >
                {msg.content}
              </div>
              {msg.applied && msg.applied.length > 0 && (
                <div className="mt-2 max-w-[90%] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 animate-fade-in-up">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">Applied to your design</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.applied.map((chip, ci) => (
                      <span key={ci} className="text-[11.5px] text-[var(--ink-soft)] bg-[var(--surface-4)] rounded-md px-2 py-1 leading-none">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Rendered"
                  className="mt-2 max-w-[90%] rounded-lg cursor-pointer border border-[var(--line)]"
                  onClick={() => setRenderResult(msg.imageUrl!)}
                />
              )}
            </div>
          ))}

          {/* Empty-state starter chips — only before the user has chatted */}
          {messages.length <= 1 && !loading && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-[11px] text-[#777] uppercase tracking-wider font-medium mb-1">Try one of these</div>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="text-left px-4 py-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] text-[var(--ink-soft)] text-[14px] leading-snug transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="px-4 py-3 rounded-[16px_16px_16px_4px] bg-[var(--surface-3)] text-[var(--ink-soft)] text-[15px] inline-flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
              Configuring your wall…
            </div>
          )}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-[#4a2a2a] text-[#ff6b6b] text-[13px] mt-2">
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input — primary interaction */}
        <div className="px-5 pt-3 pb-5 border-t border-[#4a4a55] bg-[#2e2e36]">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your fin wall…  e.g. “60 deep flowing fins for a hotel lobby”"
              rows={3}
              className="w-full pl-4 pr-14 py-3.5 bg-[var(--surface-0)] border border-[#4a4a55] rounded-2xl text-white text-[15px] leading-relaxed resize-none outline-none font-[inherit] focus:border-[var(--gold)] transition-colors placeholder:text-[#666]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className={`absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                loading || !input.trim()
                  ? 'bg-[#444] text-[#888] cursor-default'
                  : 'bg-[var(--gold)] text-[#1a1a14] cursor-pointer hover:bg-[var(--gold-bright)] shadow-[0_2px_10px_rgba(201,169,106,0.4)]'
              }`}
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </div>
          <div className="text-[11px] text-[#666] mt-2 text-center">
            Press <span className="text-[#999]">Enter</span> to send · <span className="text-[#999]">Shift+Enter</span> for a new line
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
              <button
                onClick={async () => {
                  try {
                    const r = await fetch(renderResult);
                    const blob = await r.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mr-walls-render.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    window.open(renderResult, '_blank');
                  }
                }}
                className="px-6 py-2.5 bg-[var(--gold)] text-[#1a1a14] rounded-md text-[13px] font-semibold cursor-pointer border-none"
              >
                Download
              </button>
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

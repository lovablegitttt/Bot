import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Download,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Wand2,
  Cpu,
  Loader2,
  Maximize2
} from 'lucide-react';
import { BotStatus } from '../types';
import { SUPPORTED_MODELS } from '../../server/cloudflare';

interface DirectStudioProps {
  status: BotStatus | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', width: 1024, height: 1024 },
  { id: '16:9', label: '16:9 Landscape', width: 1024, height: 576 },
  { id: '9:16', label: '9:16 Story/Reels', width: 576, height: 1024 },
  { id: '4:5', label: '4:5 Instagram Portrait', width: 816, height: 1024 },
];

export const DirectStudio: React.FC<DirectStudioProps> = ({ status, showToast }) => {
  const [prompt, setPrompt] = useState('A majestic cybernetic tiger walking through rain-slicked neon Tokyo, volumetric light rays');
  const [selectedModel, setSelectedModel] = useState(
    status?.config?.defaultModel || '@cf/black-forest-labs/flux-1-schnell'
  );
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, deformed, watermark');

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [enhancedPromptResult, setEnhancedPromptResult] = useState<string | null>(null);
  const [generationDuration, setGenerationDuration] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setEnhancedPromptResult(null);

    const finalRawPrompt = prompt.trim();

    try {
      const res = await fetch('/api/bot/test-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalRawPrompt,
          model: selectedModel,
          enhance: autoEnhance,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setResultImage(data.imageUrl);
        setEnhancedPromptResult(data.enhancedPrompt);
        setGenerationDuration(data.durationMs);
        showToast('Image generated successfully with Cloudflare AI!', 'success');
      } else {
        showToast(data.error || 'Generation failed. Check Cloudflare credentials.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(enhancedPromptResult || prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-sky-400" />
              <h2 className="text-xl font-bold text-slate-100">AI Image Generation Studio</h2>
            </div>
            <p className="text-sm text-slate-300">
              Direct web-based visual crafting engine powered by Cloudflare Workers AI GPU clusters.
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 font-medium">
            GPU Accelerators Online
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGenerate} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            {/* Prompt Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Text Prompt
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const samples = [
                      'A legendary celestial dragon coiled around a floating crystal mountain, volumetric lighting, epic scale',
                      'Futuristic cyberpunk samurai standing in a neon rain alleyway, reflective katana, 8k octane render',
                      'A cozy magical potions greenhouse filled with glowing enchanted flora and cute spirit creatures, Studio Ghibli style',
                      'Astronaut gazing at a surreal hyper-dimensional gateway in deep interstellar space, 35mm lens photorealism',
                    ];
                    setPrompt(samples[Math.floor(Math.random() * samples.length)]);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Random Idea</span>
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Describe your visual concept in detail..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
              />
            </div>

            {/* Model & Aspect Ratio Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Cloudflare AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {SUPPORTED_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.speed})
                    </option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {ASPECT_RATIOS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.width}x{r.height})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Enhancer Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    AI Prompt Detailer & Enhancer
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Expands lighting, 8k render textures, and composition with Llama/Gemini
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-900"
              />
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-slate-950 font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Inference in Progress via Cloudflare AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Canvas Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[460px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Live Visual Output
                </span>
                {generationDuration && (
                  <span className="text-xs text-emerald-400 font-mono">
                    ⚡ {(generationDuration / 1000).toFixed(2)}s
                  </span>
                )}
              </div>

              {/* Canvas viewport */}
              <div className="w-full aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative group">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-sky-500/30 border-t-sky-400 animate-spin flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Synthesizing Latents on Cloudflare GPU...</p>
                  </div>
                ) : resultImage ? (
                  <>
                    <img
                      src={resultImage}
                      alt="AI Result"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <a
                        href={resultImage}
                        download="telecloud-ai-art.png"
                        className="p-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl shadow-lg transition-transform hover:scale-105"
                        title="Download Artwork"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500 p-6 text-center">
                    <Sparkles className="w-10 h-10 opacity-30" />
                    <p className="text-xs">Click Generate to create your first visual asset.</p>
                  </div>
                )}
              </div>

              {/* Enhanced Prompt Display */}
              {enhancedPromptResult && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-purple-400 font-semibold">
                    <span>✨ AI Enhanced Prompt:</span>
                    <button
                      onClick={handleCopyPrompt}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-slate-300 italic">{enhancedPromptResult}</p>
                </div>
              )}
            </div>

            {resultImage && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={resultImage}
                  download="cloudflare-ai-image.png"
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res PNG</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

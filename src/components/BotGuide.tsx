import React from 'react';
import {
  BookOpen,
  Bot,
  Shield,
  Sparkles,
  Terminal,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Code,
  Layers
} from 'lucide-react';

export const BotGuide: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Telegram Bot Master Guide & Commands</h2>
            <p className="text-sm text-slate-400">
              Complete command cheatsheet, prompt crafting blueprints, and architecture reference.
            </p>
          </div>
        </div>
      </div>

      {/* User Commands & Admin Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Commands */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
            <Bot className="w-5 h-5" />
            <span>User Commands Reference</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/start</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                Displays welcome card, active AI model, aspect ratio, prompt enhancer toggle, and quick action buttons.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/imagine &lt;prompt&gt;</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                Generates a high-resolution image using the active Cloudflare AI model. Also works with <code className="text-sky-300 font-mono">/generate</code>, <code className="text-sky-300 font-mono">/draw</code>, or direct chat messages.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/model</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                Interactive inline buttons to switch between FLUX.1 Schnell, SDXL 1.0, SDXL Lightning, and DreamShaper LCM.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/ratio</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                Change aspect ratio: 1:1 Square (1024x1024), 9:16 Story/Reels (576x1024), 16:9 Landscape (1024x576), 4:5 Instagram.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/enhance</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                Toggles AI prompt detailing (expands raw user prompt with cinematic lighting, depth, and 8k detail).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-sky-300">
                <span>/mystats</span>
                <span className="text-[10px] text-slate-500">Public</span>
              </div>
              <p className="text-slate-400">
                View personal generation statistics, account tier, and active model preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Commands */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-base">
            <Shield className="w-5 h-5" />
            <span>Admin-Only Commands (Numeric ID)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-purple-300">
                <span>/admin</span>
                <span className="text-[10px] text-purple-400">Supreme Admin</span>
              </div>
              <p className="text-slate-400">
                Opens the mobile admin control panel inside Telegram with real-time stats, broadcast trigger, and user counters.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-purple-300">
                <span>/stats</span>
                <span className="text-[10px] text-purple-400">Supreme Admin</span>
              </div>
              <p className="text-slate-400">
                Inspect global system health: total registered users, 24h generations, error logs, and engine mode.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-purple-300">
                <span>/broadcast &lt;announcement&gt;</span>
                <span className="text-[10px] text-purple-400">Supreme Admin</span>
              </div>
              <p className="text-slate-400">
                Dispatches a formatted announcement message directly to all registered bot users with delivery metrics.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-purple-300">
                <span>/ban &lt;userId&gt;</span>
                <span className="text-[10px] text-purple-400">Supreme Admin</span>
              </div>
              <p className="text-slate-400">
                Immediately suspends a malicious or spamming user from generating images.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-purple-300">
                <span>/unban &lt;userId&gt;</span>
                <span className="text-[10px] text-purple-400">Supreme Admin</span>
              </div>
              <p className="text-slate-400">
                Restores full generation access to previously banned user.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Crafting Principles */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <span>Core Prompting Principles for Cloudflare AI (FLUX.1 & SDXL)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-sky-300 block">🎯 Clear Subject & Focus</span>
            <p className="text-slate-400 leading-relaxed">
              Describe the main subject clearly at the beginning of your prompt with specific attributes, textures, colors, and positioning.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-indigo-300 block">💡 Lighting & Atmosphere</span>
            <p className="text-slate-400 leading-relaxed">
              Specify ambient conditions: natural daylight, dramatic rim lighting, soft diffused shadows, golden hour warmth, or fog.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-300 block">📐 Framing & Camera</span>
            <p className="text-slate-400 leading-relaxed">
              Mention camera angles and perspective: close-up portrait, wide-angle cinematic shot, top-down view, or depth of field.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Users,
  Image as ImageIcon,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  ArrowUpRight,
  Sparkles,
  Bot,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Sliders,
  ExternalLink,
  Shield,
  Key,
  Terminal,
  RefreshCw,
  Power
} from 'lucide-react';
import { BotStatus, BotLog } from '../types';
import { SUPPORTED_MODELS } from '../../server/cloudflare';

interface DashboardOverviewProps {
  status: BotStatus | null;
  logs: BotLog[];
  onOpenSimulator: () => void;
  onOpenCredentials: () => void;
  onOpenStudio: () => void;
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  status,
  logs,
  onOpenSimulator,
  onOpenCredentials,
  onOpenStudio,
  onRefresh,
  showToast,
}) => {
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isClearingWebhook, setIsClearingWebhook] = useState(false);

  const activeModelObj =
    SUPPORTED_MODELS.find((m) => m.id === status?.activeModel) || SUPPORTED_MODELS[0];

  const handleStartBot = async () => {
    setIsStartingBot(true);
    try {
      const res = await fetch('/api/bot/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${data.message}`, 'success');
        onRefresh();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to start bot'}`, 'error');
        if (data.error?.toLowerCase().includes('token')) {
          onOpenCredentials();
        }
      }
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`, 'error');
    } finally {
      setIsStartingBot(false);
    }
  };

  const handleRestartBot = async () => {
    setIsRestarting(true);
    try {
      const res = await fetch('/api/bot/restart', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('🔄 Bot service restarted and re-synced successfully!', 'success');
        onRefresh();
      } else {
        showToast(`⚠️ ${data.error || 'Failed to restart'}`, 'error');
      }
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`, 'error');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleFixWebhook = async () => {
    setIsClearingWebhook(true);
    try {
      const res = await fetch('/api/bot/delete-webhook', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast('🧹 Cleared Telegram webhook conflict! Long polling resumed.', 'success');
        onRefresh();
      } else {
        showToast(`⚠️ ${data.description || 'Could not clear webhook'}`, 'error');
      }
    } catch (e: any) {
      showToast(`❌ Error: ${e.message}`, 'error');
    } finally {
      setIsClearingWebhook(false);
    }
  };

  const isReady = status?.telegramReady && status?.cloudflareReady;

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6">
      {/* Hero Welcome & Quick Launch Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cloudflare Workers AI Generation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Telegram AI Image Bot Dashboard
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time controller for your professional Telegram art creation bot. Powered by Cloudflare Workers AI (FLUX.1 Schnell & SDXL) with instant generation, prompt enhancements, and admin supervision.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenSimulator}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-sky-500/25 active:scale-95"
            >
              <Bot className="w-4 h-4" />
              <span>Launch Simulator</span>
            </button>
            <button
              onClick={onOpenStudio}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>AI Image Studio</span>
            </button>
            <button
              onClick={onOpenCredentials}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>API Settings</span>
            </button>
          </div>
        </div>

        {/* Ambient subtle decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Bot Diagnostic & Quick Start Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  status?.pollingActive || status?.webhookActive
                    ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50'
                    : 'bg-amber-400'
                }`}
              />
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Bot Engine Status:</span>
                <span
                  className={
                    status?.pollingActive || status?.webhookActive
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }
                >
                  {status?.pollingActive
                    ? `Live Long Polling Active (@${status.botUsername || 'bot'})`
                    : status?.webhookActive
                    ? `Live Webhook Active (@${status.botUsername || 'bot'})`
                    : status?.telegramReady
                    ? 'Standing By (Ready to Start)'
                    : 'Awaiting Bot Token & Configuration'}
                </span>
              </h2>
            </div>

            {/* Diagnostic Checklist Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  status?.telegramReady
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {status?.telegramReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  1. Telegram Bot:{' '}
                  <strong>
                    {status?.botUsername ? `@${status.botUsername}` : status?.telegramReady ? 'Linked' : 'Missing Token'}
                  </strong>
                </span>
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  status?.cloudflareReady
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                {status?.cloudflareReady ? (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  2. Cloudflare AI:{' '}
                  <strong>{status?.cloudflareReady ? 'Configured & Ready' : 'Key Needed'}</strong>
                </span>
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  status?.adminConfigured
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {status?.adminConfigured ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                ) : (
                  <Shield className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  3. Admin ID:{' '}
                  <strong>{status?.adminConfigured ? status.config?.adminId : 'Optional'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {(!status?.pollingActive && !status?.webhookActive) || !status?.telegramReady ? (
              <button
                onClick={status?.telegramReady ? handleStartBot : onOpenCredentials}
                disabled={isStartingBot}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
              >
                {isStartingBot ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-slate-950" />
                )}
                <span>{status?.telegramReady ? 'Start Telegram Bot' : 'Configure & Start Bot'}</span>
              </button>
            ) : (
              <button
                onClick={handleRestartBot}
                disabled={isRestarting}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 text-sky-400 ${isRestarting ? 'animate-spin' : ''}`} />
                <span>Restart Bot Service</span>
              </button>
            )}

            <button
              onClick={handleFixWebhook}
              disabled={isClearingWebhook}
              title="Clears any legacy Webhook conflicts on Telegram server so Long Polling works immediately"
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isClearingWebhook ? 'animate-spin' : ''}`} />
              <span>Fix 409 Conflict</span>
            </button>
          </div>
        </div>

        {/* Quick Setup Guide Step Callout if credentials aren't full */}
        {!isReady && (
          <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">1</span>
                <span>Get Telegram Bot Token</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Open Telegram, message <strong className="text-slate-200">@BotFather</strong>, send <code className="text-sky-300">/newbot</code>, choose a name and username, then copy the API token into Settings.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">2</span>
                <span>Get Cloudflare Workers AI Token</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                In Cloudflare Dashboard, visit <strong className="text-slate-200">Workers & Pages &gt; Workers AI</strong>. Copy your <code className="text-sky-300">Account ID</code> and create an API token with Workers AI Read/Edit permissions.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[11px]">3</span>
                <span>Find Your Numeric Admin ID</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Message <strong className="text-slate-200">@userinfobot</strong> on Telegram to see your numeric ID (e.g. <code className="text-sky-300">123456789</code>) to enable admin commands.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Generations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Generations</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">{status?.totalGenerations || 0}</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center">
              +{status?.todayGenerations || 0} today
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Artwork generated via Telegram & Web</p>
        </div>

        {/* Metric 2: Registered Users */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bot Users</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">{status?.totalUsers || 0}</span>
            <span className="text-xs font-medium text-indigo-400">Active Audience</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Users who initiated conversation</p>
        </div>

        {/* Metric 3: Active AI Engine */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default AI Engine</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-base font-bold text-slate-100 block truncate">
              {activeModelObj.name.split(' ')[0]}
            </span>
            <span className="text-xs text-purple-300 font-mono block truncate">{activeModelObj.speed}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Cloudflare Workers AI</p>
        </div>

        {/* Metric 4: System Health & Admin */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bot & Admin Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.telegramReady && status?.cloudflareReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {status?.telegramReady && status?.cloudflareReady
                  ? 'All Systems Operational'
                  : 'Pending Credentials Setup'}
              </span>
            </div>
            <span className="text-xs text-slate-400 block truncate">
              Admin: {status?.adminConfigured ? `ID: ${status.config?.adminId}` : 'Not Linked'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Real-time status monitor</p>
        </div>
      </div>

      {/* Two Column Layout: Model Gallery & Live Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Supported Models Explorer (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Available Cloudflare Workers AI Models</span>
            </h2>
            <span className="text-xs text-slate-400">Serverless GPU Inferences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUPPORTED_MODELS.map((model) => {
              const isDefault = model.id === status?.activeModel;

              return (
                <div
                  key={model.id}
                  className={`bg-slate-900/80 border rounded-2xl p-5 space-y-3 relative transition-all ${
                    isDefault
                      ? 'border-sky-500/50 bg-sky-950/20 shadow-md shadow-sky-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">{model.name}</h3>
                      <p className="text-xs text-sky-400 font-medium">{model.provider}</p>
                    </div>
                    {isDefault && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-400">
                      Speed: <strong className="text-slate-200">{model.speed}</strong>
                    </span>
                    <span className="text-slate-400">
                      Quality: <strong className="text-slate-200">{model.quality}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity & Log Feed (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Live Bot Event Stream</span>
            </h2>
            <span className="text-xs text-slate-400">Real-time telemetry</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 h-[380px] overflow-y-auto space-y-3 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                <p>No activity recorded yet.</p>
                <p className="text-[11px]">Send a message to the bot or simulator to see real-time logs.</p>
              </div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'text-slate-400 bg-slate-800';
                if (log.type === 'success') badgeColor = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
                if (log.type === 'error') badgeColor = 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
                if (log.type === 'warning') badgeColor = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
                if (log.type === 'admin') badgeColor = 'text-purple-400 bg-purple-500/10 border border-purple-500/20';

                return (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-semibold uppercase ${badgeColor}`}>
                        {log.type}
                      </span>
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs break-words">{log.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

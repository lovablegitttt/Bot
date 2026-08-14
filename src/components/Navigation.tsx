import React from 'react';
import {
  Bot,
  Cpu,
  ShieldCheck,
  Radio,
  Sliders,
  Sparkles,
  Users,
  Image as ImageIcon,
  BookOpen,
  MessageSquareCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BotStatus } from '../types';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: BotStatus | null;
  onRefresh: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  status,
  onRefresh,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Cpu },
    { id: 'simulator', label: 'Telegram Simulator', icon: MessageSquareCode, badge: 'Interactive' },
    { id: 'credentials', label: 'API & Credentials', icon: Sliders },
    { id: 'admin', label: 'Admin Hub', icon: Users, badge: status?.adminConfigured ? 'Active' : 'Setup' },
    { id: 'studio', label: 'AI Image Studio', icon: Sparkles },
    { id: 'gallery', label: 'Creations Gallery', icon: ImageIcon },
    { id: 'guide', label: 'Commands & Setup', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-lg tracking-tight">TeleCloud AI</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Workers AI
                </span>
              </div>
              <p className="text-xs text-slate-400">Telegram AI Image Generation Bot</p>
            </div>
          </div>

          {/* Real-time Status Badges */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            {/* Telegram Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                status?.telegramReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {status?.telegramReady ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {status?.botUsername ? `@${status.botUsername}` : status?.telegramReady ? 'Telegram Ready' : 'Token Needed'}
              </span>
            </div>

            {/* Cloudflare AI Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                status?.cloudflareReady
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>{status?.cloudflareReady ? 'Cloudflare AI Active' : 'Cloudflare API Key Needed'}</span>
            </div>

            {/* Admin Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                status?.adminConfigured
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{status?.adminConfigured ? 'Admin ID Configured' : 'Admin ID Needed'}</span>
            </div>

            {/* Polling / Webhook Engine */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              <Radio className={`w-3.5 h-3.5 ${status?.pollingActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{status?.pollingActive ? 'Polling Active' : status?.webhookActive ? 'Webhook Active' : 'Standby'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-sky-400/20 text-sky-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

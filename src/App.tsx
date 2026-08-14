import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { DashboardOverview } from './components/DashboardOverview';
import { LiveSimulator } from './components/LiveSimulator';
import { CredentialsManager } from './components/CredentialsManager';
import { AdminHub } from './components/AdminHub';
import { DirectStudio } from './components/DirectStudio';
import { GalleryFeed } from './components/GalleryFeed';
import { BotGuide } from './components/BotGuide';
import { BotStatus, BotLog } from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      if (!data.error) {
        setStatus(data);
      }
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/bot/logs?limit=40');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {}
  };

  const refreshAll = () => {
    fetchStatus();
    fetchLogs();
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        onRefresh={refreshAll}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            status={status}
            logs={logs}
            onOpenSimulator={() => setActiveTab('simulator')}
            onOpenCredentials={() => setActiveTab('credentials')}
            onOpenStudio={() => setActiveTab('studio')}
            onRefresh={refreshAll}
            showToast={showToast}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulator
            status={status}
            onOpenSettings={() => setActiveTab('credentials')}
          />
        )}

        {activeTab === 'credentials' && (
          <CredentialsManager
            status={status}
            onRefresh={refreshAll}
            showToast={showToast}
          />
        )}

        {activeTab === 'admin' && (
          <AdminHub
            status={status}
            showToast={showToast}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'studio' && (
          <DirectStudio
            status={status}
            showToast={showToast}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryFeed
            showToast={showToast}
            onRemixPrompt={(p) => {
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'guide' && <BotGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>TeleCloud AI • Professional Telegram Art Bot Powered by Cloudflare Workers AI</p>
          <div className="flex items-center gap-4">
            <span>FLUX.1 Schnell & SDXL</span>
            <span>•</span>
            <span>Telegram Bot API 7.0+</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-sky-500/40 text-sky-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs text-slate-200 leading-relaxed font-medium">
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

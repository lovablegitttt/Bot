import React, { useState, useEffect, useRef } from 'react';
import {
  Key,
  Shield,
  Cpu,
  Bot,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Layers,
  Radio,
  Copy,
  Check,
  Eye,
  EyeOff,
  Database,
  Lock,
  X,
  ClipboardPaste
} from 'lucide-react';
import { BotStatus } from '../types';
import { SUPPORTED_MODELS } from '../../server/cloudflare';

interface CredentialsManagerProps {
  status: BotStatus | null;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'telecloud_credentials_cache_v1';

export const CredentialsManager: React.FC<CredentialsManagerProps> = ({
  status,
  onRefresh,
  showToast,
}) => {
  // Form State
  const [telegramToken, setTelegramToken] = useState(status?.config?.telegramToken || '');
  const [cloudflareAccountId, setCloudflareAccountId] = useState(status?.config?.cloudflareAccountId || '');
  const [cloudflareApiToken, setCloudflareApiToken] = useState(status?.config?.cloudflareApiToken || '');
  const [adminId, setAdminId] = useState(status?.config?.adminId || '');
  const [defaultModel, setDefaultModel] = useState(
    status?.config?.defaultModel || '@cf/black-forest-labs/flux-1-schnell'
  );
  const [autoEnhancePrompt, setAutoEnhancePrompt] = useState(
    status?.config?.autoEnhancePrompt || false
  );
  const [maxDailyQuota, setMaxDailyQuota] = useState(
    status?.config?.maxDailyQuota || 50
  );
  const [customWebhookUrl, setCustomWebhookUrl] = useState(
    status?.config?.webhookUrl || ''
  );

  // Track if initial server config has been loaded into form
  const hasInitialized = useRef(false);

  // Visibility toggles
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showCloudflareToken, setShowCloudflareToken] = useState(false);

  // Populate form fields once when server status arrives, NEVER auto-revert during active edits
  useEffect(() => {
    if (status?.config && !hasInitialized.current) {
      if (status.config.telegramToken) setTelegramToken(status.config.telegramToken);
      if (status.config.cloudflareAccountId) setCloudflareAccountId(status.config.cloudflareAccountId);
      if (status.config.cloudflareApiToken) setCloudflareApiToken(status.config.cloudflareApiToken);
      if (status.config.adminId) setAdminId(status.config.adminId);
      if (status.config.defaultModel) setDefaultModel(status.config.defaultModel);
      if (status.config.autoEnhancePrompt !== undefined) setAutoEnhancePrompt(status.config.autoEnhancePrompt);
      if (status.config.maxDailyQuota !== undefined) setMaxDailyQuota(status.config.maxDailyQuota);
      if (status.config.webhookUrl) setCustomWebhookUrl(status.config.webhookUrl);
      hasInitialized.current = true;
    }
  }, [status?.config]);

  // Testing & Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTestingCloudflare, setIsTestingCloudflare] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [testResultTelegram, setTestResultTelegram] = useState<any>(null);
  const [testResultCloudflare, setTestResultCloudflare] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePaste = async (setter: (val: string) => void, fieldName: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setter(text.trim());
        showToast(`Pasted into ${fieldName}`, 'info');
      }
    } catch {
      showToast('Please paste manually using Ctrl+V / Cmd+V', 'info');
    }
  };

  const handleResetFromServer = () => {
    if (status?.config) {
      setTelegramToken(status.config.telegramToken || '');
      setCloudflareAccountId(status.config.cloudflareAccountId || '');
      setCloudflareApiToken(status.config.cloudflareApiToken || '');
      setAdminId(status.config.adminId || '');
      setDefaultModel(status.config.defaultModel || '@cf/black-forest-labs/flux-1-schnell');
      setAutoEnhancePrompt(Boolean(status.config.autoEnhancePrompt));
      setMaxDailyQuota(status.config.maxDailyQuota || 50);
      showToast('Form reset to currently active server values', 'info');
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      // Send the exact updated values, including empty strings if user deleted them
      const payload = {
        telegramToken: telegramToken.trim(),
        cloudflareAccountId: cloudflareAccountId.trim(),
        cloudflareApiToken: cloudflareApiToken.trim(),
        adminId: adminId.trim(),
        defaultModel,
        autoEnhancePrompt,
        maxDailyQuota,
      };

      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Cache in localStorage
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              telegramToken: telegramToken.trim(),
              cloudflareAccountId: cloudflareAccountId.trim(),
              cloudflareApiToken: cloudflareApiToken.trim(),
              adminId: adminId.trim(),
            })
          );
        } catch {}

        showToast('Credentials synchronized to engine, server storage, and .env file!', 'success');
        onRefresh();
      } else {
        showToast(data.error || 'Failed to save configuration', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestResultTelegram(null);

    try {
      const res = await fetch('/api/bot/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramToken: telegramToken.trim() || undefined,
          adminId: adminId.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResultTelegram(data);
      if (data.success) {
        showToast(`Telegram verified: @${data.bot.username}`, 'success');
        onRefresh();
      } else {
        showToast(data.error || 'Telegram verification failed', 'error');
      }
    } catch (err: any) {
      setTestResultTelegram({ success: false, error: err.message });
      showToast(err.message, 'error');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestCloudflare = async () => {
    setIsTestingCloudflare(true);
    setTestResultCloudflare(null);

    try {
      const res = await fetch('/api/bot/test-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudflareAccountId: cloudflareAccountId.trim() || undefined,
          cloudflareApiToken: cloudflareApiToken.trim() || undefined,
          model: defaultModel,
          prompt: 'A futuristic cybernetic tiger in neon Tokyo, 8k resolution octane render',
        }),
      });
      const data = await res.json();
      setTestResultCloudflare(data);
      if (data.success) {
        showToast('Cloudflare Workers AI test generated image successfully!', 'success');
        onRefresh();
      } else {
        showToast(data.error || 'Cloudflare AI test failed', 'error');
      }
    } catch (err: any) {
      setTestResultCloudflare({ success: false, error: err.message });
      showToast(err.message, 'error');
    } finally {
      setIsTestingCloudflare(false);
    }
  };

  const handleTogglePolling = async () => {
    try {
      const res = await fetch('/api/bot/toggle-polling', { method: 'POST' });
      const data = await res.json();
      showToast(`Polling mode: ${data.pollingActive ? 'Active' : 'Stopped'}`, 'info');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetWebhook = async () => {
    if (!customWebhookUrl.trim()) {
      showToast('Please provide a valid HTTPS webhook URL', 'error');
      return;
    }
    setIsSettingWebhook(true);
    try {
      const res = await fetch('/api/bot/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: customWebhookUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Webhook registered with Telegram!', 'success');
        onRefresh();
      } else {
        showToast(data.description || 'Failed to set webhook', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleDeleteWebhook = async () => {
    try {
      const res = await fetch('/api/bot/delete-webhook', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast('Webhook deleted. Switched back to polling runner.', 'info');
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      {/* Top Banner Guide & Status Confirmation */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/20 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="w-6 h-6 text-sky-400" />
              <h2 className="text-xl font-bold text-slate-100">API & Bot Credentials Manager</h2>
            </div>
            <p className="text-sm text-slate-300">
              Your credentials are saved directly into persistent server storage and stay permanently filled below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Live Active Indicators Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Telegram Bot</span>
              <span className={`text-xs font-semibold truncate block ${status?.telegramReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.telegramReady ? (status?.botUsername ? `@${status.botUsername}` : 'Active & Saved') : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Cloudflare AI</span>
              <span className={`text-xs font-semibold truncate block ${status?.cloudflareReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.cloudflareReady ? 'Connected & Ready' : 'Credentials Needed'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Admin ID</span>
              <span className={`text-xs font-semibold truncate block ${status?.adminConfigured ? 'text-purple-300' : 'text-slate-400'}`}>
                {status?.adminConfigured ? `${status.config?.adminId || 'Configured'}` : 'Not Set'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Storage State</span>
              <span className="text-xs font-semibold text-emerald-400 block">
                Saved to Disk 💾
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Credentials Form Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            {/* Telegram Bot Token Section */}
            <div className="space-y-3 pb-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>Telegram Bot Token</span>
                </label>
                <div className="flex items-center gap-2">
                  {telegramToken && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Loaded</span>
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      status?.telegramReady
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {status?.telegramReady ? 'Verified & Ready' : 'Token Required'}
                  </span>
                </div>
              </div>
              {/* Telegram Bot Token Input Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">HTTP API Token from @BotFather</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaste(setTelegramToken, 'Telegram Bot Token')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    {telegramToken && (
                      <button
                        type="button"
                        onClick={() => setTelegramToken('')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="Paste new Telegram Bot Token (e.g. 7123456789:AAHq_m...)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {telegramToken && (
                      <button
                        type="button"
                        onClick={() => handleCopy(telegramToken, 'tgToken')}
                        title="Copy Token"
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        {copiedField === 'tgToken' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTelegramToken(!showTelegramToken)}
                      title={showTelegramToken ? 'Hide Token' : 'Show Token'}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {showTelegramToken ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Obtained from Telegram @BotFather</span>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  {isTestingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Test Telegram Connection</span>
                </button>
              </div>

              {testResultTelegram && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    testResultTelegram.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  }`}
                >
                  {testResultTelegram.success ? (
                    <div className="space-y-1">
                      <p className="font-semibold">✅ Telegram Bot Verified: @{testResultTelegram.bot?.username} ({testResultTelegram.bot?.first_name})</p>
                      {testResultTelegram.adminMessageSent && (
                        <p className="text-emerald-400">📲 Test ping message dispatched to Admin ID!</p>
                      )}
                    </div>
                  ) : (
                    <p>❌ Error: {testResultTelegram.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Cloudflare Account ID & API Token */}
            <div className="space-y-4 pb-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Cloudflare Workers AI Credentials</span>
                </label>
                <div className="flex items-center gap-2">
                  {cloudflareAccountId && cloudflareApiToken && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Loaded</span>
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      status?.cloudflareReady
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {status?.cloudflareReady ? 'Cloudflare AI Connected' : 'Credentials Needed'}
                  </span>
                </div>
              </div>

              {/* Account ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Cloudflare Account ID (32 hex characters)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaste(setCloudflareAccountId, 'Cloudflare Account ID')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    {cloudflareAccountId && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(cloudflareAccountId, 'cfAccount')}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {copiedField === 'cfAccount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloudflareAccountId('')}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
                        >
                          <X className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={cloudflareAccountId}
                  onChange={(e) => setCloudflareAccountId(e.target.value)}
                  placeholder="Paste Cloudflare Account ID (e.g. c242b6...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              {/* API Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Cloudflare API Token (with Workers AI Read/Write)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaste(setCloudflareApiToken, 'Cloudflare API Token')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    {cloudflareApiToken && (
                      <button
                        type="button"
                        onClick={() => setCloudflareApiToken('')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showCloudflareToken ? 'text' : 'password'}
                    value={cloudflareApiToken}
                    onChange={(e) => setCloudflareApiToken(e.target.value)}
                    placeholder="Paste Cloudflare API Token"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {cloudflareApiToken && (
                      <button
                        type="button"
                        onClick={() => handleCopy(cloudflareApiToken, 'cfToken')}
                        title="Copy API Token"
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        {copiedField === 'cfToken' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCloudflareToken(!showCloudflareToken)}
                      title={showCloudflareToken ? 'Hide Token' : 'Show Token'}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {showCloudflareToken ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>From Cloudflare Dashboard → Workers & Pages → AI</span>
                <button
                  type="button"
                  onClick={handleTestCloudflare}
                  disabled={isTestingCloudflare}
                  className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  {isTestingCloudflare ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Test Cloudflare AI Inference</span>
                </button>
              </div>

              {testResultCloudflare && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    testResultCloudflare.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  }`}
                >
                  {testResultCloudflare.success ? (
                    <div className="space-y-2">
                      <p className="font-semibold">
                        ✅ Cloudflare Workers AI Generated in {(testResultCloudflare.durationMs / 1000).toFixed(1)}s!
                      </p>
                      {testResultCloudflare.imageUrl && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden border border-emerald-700">
                          <img
                            src={testResultCloudflare.imageUrl}
                            alt="Test generation"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>❌ Error: {testResultCloudflare.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin Telegram ID */}
            <div className="space-y-3 pb-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Admin Telegram User ID (Numeric)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaste(setAdminId, 'Admin ID')}
                    className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 hover:underline"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                  {adminId && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopy(adminId, 'adminId')}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiedField === 'adminId' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminId('')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                      <span className="text-[11px] text-purple-300 flex items-center gap-1 font-medium bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Loaded</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="e.g. 1234567890 (your numeric Telegram User ID from @userinfobot)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono"
              />
              <p className="text-xs text-slate-400">
                Unlocks `/admin`, `/broadcast`, `/ban`, `/stats`, and unlimited bot privileges in Telegram.
              </p>
            </div>

            {/* Bot Model & Enhancer Defaults */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>AI Engine Defaults</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Default Diffusion Engine</label>
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {SUPPORTED_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.speed})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Max Daily Free Quota</label>
                  <input
                    type="number"
                    value={maxDailyQuota}
                    onChange={(e) => setMaxDailyQuota(Number(e.target.value))}
                    min="1"
                    max="1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoEnhance"
                  checked={autoEnhancePrompt}
                  onChange={(e) => setAutoEnhancePrompt(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
                />
                <label htmlFor="autoEnhance" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Enable Global AI Prompt Enhancer (Automatically expand short user prompts with 8k details & lighting)
                </label>
              </div>
            </div>

            {/* Save & Reset Buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetFromServer}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Active Server State</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                <span>Save All Credentials</span>
              </button>
            </div>
          </form>
        </div>

        {/* Setup Guides & Helpful Links (1 Col) */}
        <div className="space-y-6">
          {/* Guide Card 1: Telegram Bot Token */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <Bot className="w-4 h-4" />
              <span>1. Get Telegram Bot Token</span>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open Telegram and search for <strong className="text-slate-100">@BotFather</strong>.</li>
              <li>Send the command <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-300 font-mono">/newbot</code>.</li>
              <li>Give your bot a display name and a username ending in <code className="text-sky-300">bot</code>.</li>
              <li>Copy the HTTP API Token and paste it on the left.</li>
            </ol>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 pt-1"
            >
              <span>Open @BotFather in Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Guide Card 2: Cloudflare Workers AI Token */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <span>2. Cloudflare API Key & Account ID</span>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Sign in to your <strong className="text-slate-100">Cloudflare Dashboard</strong>.</li>
              <li>Your <strong className="text-slate-100">Account ID</strong> is in the right sidebar under API.</li>
              <li>Go to <strong className="text-slate-100">My Profile → API Tokens</strong>.</li>
              <li>Create token with <code className="text-sky-300">Workers AI: Read & Edit</code> permissions.</li>
              <li>Copy and paste your Account ID & API Token.</li>
            </ol>
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 pt-1"
            >
              <span>Cloudflare API Tokens Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Guide Card 3: Find Admin ID */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Shield className="w-4 h-4" />
              <span>3. Find Your Admin User ID</span>
            </div>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open Telegram and message <strong className="text-slate-100">@userinfobot</strong>.</li>
              <li>The bot will reply with your numerical <strong className="text-slate-100">Id</strong> (e.g. <code className="text-purple-300 font-mono">123456789</code>).</li>
              <li>Paste that number into the <strong className="text-purple-300">Admin ID</strong> field.</li>
            </ol>
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 pt-1"
            >
              <span>Open @userinfobot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Webhook & Polling Manager */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Engine Runtime Mode</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                {status?.pollingActive ? 'Long Polling 🟢' : status?.webhookActive ? 'Webhook 🟢' : 'Standby 🟡'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePolling}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  status?.pollingActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {status?.pollingActive ? 'Stop Polling' : 'Start Long Polling'}
              </button>

              {status?.webhookActive && (
                <button
                  type="button"
                  onClick={handleDeleteWebhook}
                  className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  Remove Webhook
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-400 font-medium">Custom HTTPS Webhook URL (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customWebhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/api/telegram/webhook"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={handleSetWebhook}
                  disabled={isSettingWebhook}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

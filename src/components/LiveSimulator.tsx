import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCw,
  Sliders,
  Image as ImageIcon,
  Loader2,
  Trash2,
  CheckCircle2,
  Shield,
  Download,
  Share2
} from 'lucide-react';
import { TelegramMessage, TelegramInlineButton, BotStatus } from '../types';

interface LiveSimulatorProps {
  status: BotStatus | null;
  onOpenSettings: () => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ status, onOpenSettings }) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `✨ *Welcome to Telegram AI Image Studio* 🎨\n\nGenerate breathtaking, ultra-detailed artworks powered by *Cloudflare Workers AI* and state-of-the-art diffusion transformers.\n\n⚡ *Active Model:* \`FLUX.1 Schnell\`\n📐 *Aspect Ratio:* \`1:1\`\n✨ *AI Enhancer:* \`OFF ❌\`\n\n💡 *How to generate:*\n• Just send any prompt, e.g.:\n  _"A majestic neon cyberpunk phoenix soaring over Tokyo 8k octane"_\n• Or use: \`/imagine <prompt>\``,
      buttons: [
        [
          { text: '✨ Example Prompt', callback_data: 'sample_prompt' },
          { text: '⚙️ Change Model', callback_data: 'menu_model' },
        ],
        [
          { text: '📐 Aspect Ratio', callback_data: 'menu_ratio' },
          { text: '✨ Enhancer: OFF', callback_data: 'toggle_enhancer' },
        ],
        [
          { text: '📊 My Stats', callback_data: 'action_mystats' },
        ],
        [{ text: '👑 Admin Dashboard', callback_data: 'menu_admin' }],
      ],
      timestamp: Date.now() - 60000,
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [typingStatusText, setTypingStatusText] = useState('typing...');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotTyping]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputPrompt).trim();
    if (!textToSend || isBotTyping) return;

    if (!customText) {
      setInputPrompt('');
    }

    // Add user message
    const userMsg: TelegramMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsBotTyping(true);
    setTypingStatusText('typing...');

    try {
      // Send to simulation endpoint
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: textToSend,
          simUserId: status?.adminConfigured ? 'admin_simulator' : 'user_sim_1',
          simUsername: 'tester',
        }),
      });

      const data = await response.json();

      if (data.type === 'generation') {
        setTypingStatusText('uploading photo...');
        // Perform real or simulated image generation
        await executeGeneration(data.prompt, data.model, data.aspectRatio);
      } else if (data.type === 'text') {
        setTimeout(() => {
          setIsBotTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              sender: 'bot',
              text: data.text,
              buttons: data.buttons,
              timestamp: Date.now(),
            },
          ]);
        }, 500);
      }
    } catch (e: any) {
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: `⚠️ *Error:* \`${e.message || 'Failed to process prompt'}\``,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const executeGeneration = async (promptText: string, modelId?: string, ratio = '1:1') => {
    try {
      const res = await fetch('/api/bot/test-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: modelId || status?.activeModel || '@cf/black-forest-labs/flux-1-schnell',
        }),
      });

      const data = await res.json();
      setIsBotTyping(false);

      if (data.success && data.imageUrl) {
        const seed = Math.floor(Math.random() * 999999);
        const durationSec = (data.durationMs / 1000).toFixed(1);
        const caption =
          `✨ *Prompt:* ${promptText}\n\n` +
          `🤖 *Model:* \`${data.model || 'FLUX.1 Schnell'}\`\n` +
          `📐 *Size:* \`1024x1024\` (${ratio}) • ⏱️ \`${durationSec}s\` • 🌱 \`${seed}\``;

        const encoded = btoa(promptText.slice(0, 80));

        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'bot',
            imageUrl: data.imageUrl,
            caption,
            buttons: [
              [
                { text: '🔄 Re-roll', callback_data: `reroll:${encoded}` },
                { text: '🎨 New Prompt', callback_data: 'sample_prompt' },
              ],
              [
                { text: '⚙️ Settings', callback_data: 'menu_model' },
                { text: '📐 Aspect Ratio', callback_data: 'menu_ratio' },
              ],
            ],
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: 'bot',
            text:
              `❌ *Image Generation Failed*\n\n` +
              `⚠️ *Error:* \`${data.error || 'Cloudflare API Key or Account ID not set'}\`\n\n` +
              `💡 Configure your Cloudflare credentials in the **API & Credentials** tab to enable live GPU generation.`,
            buttons: [[{ text: '⚙️ Open Credentials Tab', callback_data: 'open_settings' }]],
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err: any) {
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: `❌ *Connection Error:* ${err.message}`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleButtonClick = async (button: TelegramInlineButton) => {
    if (button.callback_data === 'open_settings') {
      onOpenSettings();
      return;
    }

    if (button.callback_data === 'sample_prompt') {
      handleSend('/imagine A majestic cosmic tiger in neon Tokyo, 8k octane render');
      return;
    }

    if (button.callback_data === 'menu_start') {
      handleSend('/start');
      return;
    }

    if (button.callback_data === 'menu_model') {
      handleSend('/model');
      return;
    }

    if (button.callback_data === 'menu_ratio') {
      handleSend('/ratio');
      return;
    }

    if (button.callback_data === 'action_mystats') {
      handleSend('/mystats');
      return;
    }

    if (button.callback_data === 'menu_admin') {
      handleSend('/admin');
      return;
    }

    if (button.callback_data?.startsWith('select_model:')) {
      const modelId = button.callback_data.replace('select_model:', '');
      setIsBotTyping(true);
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackData: button.callback_data }),
      });
      const data = await res.json();
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.text,
          buttons: [[{ text: '🎨 Create with this model', callback_data: 'sample_prompt' }]],
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (button.callback_data?.startsWith('select_ratio:')) {
      const ratio = button.callback_data.replace('select_ratio:', '');
      setIsBotTyping(true);
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackData: button.callback_data }),
      });
      const data = await res.json();
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.text,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (button.callback_data === 'toggle_enhancer') {
      setIsBotTyping(true);
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackData: 'toggle_enhancer' }),
      });
      const data = await res.json();
      setIsBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'bot',
          text: data.text,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (button.callback_data?.startsWith('reroll:')) {
      try {
        const decoded = atob(button.callback_data.replace('reroll:', ''));
        handleSend(`/imagine ${decoded}`);
      } catch {
        handleSend('/imagine A futuristic cybernetic city');
      }
      return;
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: `✨ *Telegram AI Image Bot Simulator Reset*\n\nSend any prompt or command to start creating.`,
        buttons: [[{ text: '✨ Start with /start', callback_data: 'menu_start' }]],
        timestamp: Date.now(),
      },
    ]);
  };

  // Simple Markdown Formatter for Telegram Simulator
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      // Replace *bold* with <strong>
      let formatted = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      // Replace _italic_ with <em>
      formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
      // Replace `code` with <code>
      formatted = formatted.replace(
        /`(.*?)`/g,
        '<code class="px-1 py-0.5 rounded bg-slate-900/60 text-sky-300 font-mono text-[13px]">$1</code>'
      );

      return (
        <p
          key={lIdx}
          className="min-h-[1.25rem]"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Simulator Device Frame */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[740px]">
        {/* Telegram Chat Header */}
        <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  {status?.botFirstName || 'TeleCloud AI Bot'}
                </h3>
                <span className="text-[10px] font-medium bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded">
                  bot
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isBotTyping ? (
                  <span className="text-sky-400 font-medium animate-pulse">
                    {typingStatusText}
                  </span>
                ) : (
                  status?.botUsername ? `@${status.botUsername} • online` : 'Cloudflare Workers AI • online'
                )}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              title="Clear chat log"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={() => handleSend('/start')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              /start
            </button>
            <button
              onClick={() => handleSend('/help')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              /help
            </button>
          </div>
        </div>

        {/* Telegram Chat Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
          {/* Telegram Date Chip */}
          <div className="flex justify-center">
            <span className="text-[11px] font-medium bg-slate-800/60 text-slate-400 px-3 py-1 rounded-full border border-slate-800">
              Live Telegram Bot Sandbox
            </span>
          </div>

          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] sm:max-w-[78%] ${
                  isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isBot
                      ? 'bg-sky-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-md ${
                      isBot
                        ? 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-sm'
                        : 'bg-sky-600 text-white rounded-tr-sm'
                    }`}
                  >
                    {/* Render Image if exists */}
                    {msg.imageUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900">
                        <img
                          src={msg.imageUrl}
                          alt="AI generated artwork"
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-cover max-h-[380px] hover:scale-[1.01] transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* Render Text / Caption */}
                    {msg.text && (
                      <div className="space-y-1 leading-relaxed text-slate-200">
                        {renderFormattedText(msg.text)}
                      </div>
                    )}

                    {msg.caption && (
                      <div className="space-y-1 leading-relaxed text-slate-200 text-xs">
                        {renderFormattedText(msg.caption)}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        isBot ? 'text-slate-400' : 'text-sky-200'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Telegram Inline Keyboards */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {msg.buttons.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1.5 flex-wrap">
                          {row.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn)}
                              className="flex-1 min-w-[120px] bg-slate-800/90 hover:bg-sky-600/30 text-slate-200 hover:text-sky-200 text-xs font-medium px-3 py-2 rounded-xl border border-slate-700/80 hover:border-sky-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                            >
                              <span>{btn.text}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isBotTyping && (
            <div className="flex gap-2.5 max-w-[80%] mr-auto">
              <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2 text-xs text-sky-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>TeleCloud AI is {typingStatusText}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Type /imagine prompt or command (e.g. Cyberpunk samurai in rain)..."
                disabled={isBotTyping}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isBotTyping}
              className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* Quick Command Chips */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Quick:</span>
            {[
              { label: '/imagine Neon dragon', cmd: '/imagine Majestic neon dragon 8k render' },
              { label: '/model', cmd: '/model' },
              { label: '/ratio', cmd: '/ratio' },
              { label: '/enhance', cmd: '/enhance' },
              { label: '/mystats', cmd: '/mystats' },
              { label: '/admin', cmd: '/admin' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.cmd)}
                disabled={isBotTyping}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 whitespace-nowrap transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

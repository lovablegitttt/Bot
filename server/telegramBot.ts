import { botStorage } from './storage.js';
import { generateCloudflareImage, enhancePromptWithAI, SUPPORTED_MODELS } from './cloudflare.js';
import { GenerationItem } from '../src/types.js';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    date: number;
    text?: string;
    caption?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
      text?: string;
      caption?: string;
    };
    data?: string;
  };
}

export class TelegramBotService {
  private pollingActive = false;
  private isPollingInProgress = false;
  private pollingTimeout: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private botInfo: any = null;
  private bootTime = Math.floor(Date.now() / 1000) - 10; // Ignore updates older than 10 seconds before start
  private processedUpdateIds = new Set<number>();

  constructor() {
    // Initial start if token is present
    setTimeout(() => {
      this.initBot();
    }, 1000);
  }

  public async initBot() {
    this.stopPolling();
    const config = botStorage.getConfig();
    if (!config.telegramToken) {
      botStorage.addLog('info', 'Telegram Bot Token not configured yet. Bot standing by.');
      return;
    }

    try {
      const me = await this.getMe();
      if (me.ok) {
        this.botInfo = me.result;
        botStorage.addLog('success', `Telegram Bot authenticated: @${this.botInfo.username} (${this.botInfo.first_name})`);
        
        // Discard any accumulated old messages on Telegram servers so the bot doesn't spam historical replies
        try {
          await fetch(`https://api.telegram.org/bot${config.telegramToken}/deleteWebhook?drop_pending_updates=true`);
          
          // Fast forward lastUpdateId to the very latest update
          const latestRes = await fetch(`https://api.telegram.org/bot${config.telegramToken}/getUpdates?offset=-1&limit=1`);
          if (latestRes.ok) {
            const latestData = await latestRes.json() as any;
            if (latestData.ok && Array.isArray(latestData.result) && latestData.result.length > 0) {
              this.lastUpdateId = latestData.result[0].update_id;
              // Acknowledge this update so Telegram clears the queue
              await fetch(`https://api.telegram.org/bot${config.telegramToken}/getUpdates?offset=${this.lastUpdateId + 1}&limit=1`);
            }
          }
        } catch (dropErr) {
          console.warn('Could not drop pending updates:', dropErr);
        }

        if (config.pollingEnabled && !config.isWebhookActive) {
          this.startPolling();
        }
      } else {
        botStorage.addLog('error', `Failed to authenticate Telegram Bot: ${me.description || 'Invalid token'}`);
      }
    } catch (e: any) {
      botStorage.addLog('error', `Telegram Bot initialization error: ${e.message}`);
    }
  }

  public getBotInfo() {
    return this.botInfo;
  }

  public isPolling() {
    return this.pollingActive;
  }

  public async getMe(): Promise<any> {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return { ok: false, description: 'No token' };

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      return await res.json();
    } catch (err: any) {
      return { ok: false, description: err.message };
    }
  }

  public async setWebhook(url: string): Promise<any> {
    const token = botStorage.getConfig().telegramToken;
    if (!token) throw new Error('Telegram Bot Token required');

    this.stopPolling();
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, drop_pending_updates: true }),
    });
    const result = await res.json() as any;
    if (result.ok) {
      botStorage.updateConfig({ isWebhookActive: true, webhookUrl: url, pollingEnabled: false });
      botStorage.addLog('success', `Telegram webhook successfully registered to: ${url}`);
    }
    return result;
  }

  public async deleteWebhook(): Promise<any> {
    const token = botStorage.getConfig().telegramToken;
    if (!token) throw new Error('Telegram Bot Token required');

    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    });
    const result = await res.json() as any;
    if (result.ok) {
      botStorage.updateConfig({ isWebhookActive: false, pollingEnabled: true });
      botStorage.addLog('info', 'Telegram webhook removed. Switched to polling mode.');
      this.startPolling();
    }
    return result;
  }

  public async startPolling() {
    if (this.pollingActive) return;
    this.pollingActive = true;
    botStorage.addLog('info', 'Started Telegram long polling runner.');

    const token = botStorage.getConfig().telegramToken;
    if (token) {
      // Ensure no conflicting webhook exists on Telegram server
      try {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
      } catch {}
    }

    this.pollUpdates();
  }

  public stopPolling() {
    this.pollingActive = false;
    this.isPollingInProgress = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    botStorage.addLog('info', 'Stopped Telegram long polling runner.');
  }

  private async pollUpdates() {
    if (!this.pollingActive || this.isPollingInProgress) return;

    const token = botStorage.getConfig().telegramToken;
    if (!token) {
      this.pollingActive = false;
      return;
    }

    this.isPollingInProgress = true;

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=15`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            
            // Deduplicate to avoid repeating updates
            if (this.processedUpdateIds.has(update.update_id)) {
              continue;
            }
            this.processedUpdateIds.add(update.update_id);
            if (this.processedUpdateIds.size > 2000) {
              const ids = Array.from(this.processedUpdateIds);
              ids.slice(0, 1000).forEach(id => this.processedUpdateIds.delete(id));
            }

            // Ignore historical stale messages that arrived prior to startup
            if (update.message && update.message.date && update.message.date < this.bootTime) {
              continue;
            }

            await this.handleUpdate(update);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409 || errData.description?.toLowerCase().includes('webhook')) {
          botStorage.addLog('warning', 'Telegram webhook conflict detected while polling. Auto-clearing webhook...');
          await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
        } else if (res.status === 401 || errData.description?.toLowerCase().includes('unauthorized')) {
          botStorage.addLog('error', 'Telegram Bot Token is unauthorized or revoked. Stopping polling.');
          this.stopPolling();
          this.isPollingInProgress = false;
          return;
        } else {
          console.warn('Polling check non-ok status:', res.status, errData);
        }
      }
    } catch (e: any) {
      // transient network or connection error in polling
      console.warn('Polling check error:', e?.message);
    } finally {
      this.isPollingInProgress = false;
    }

    if (this.pollingActive) {
      this.pollingTimeout = setTimeout(() => this.pollUpdates(), 1000);
    }
  }

  // Telegram API Low-Level Wrappers
  public async sendMessage(chatId: string | number, text: string, options: any = {}) {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return null;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options.parse_mode || 'Markdown',
          reply_markup: options.reply_markup,
          disable_web_page_preview: options.disable_web_page_preview ?? true,
        }),
      });
      return await res.json();
    } catch (e: any) {
      botStorage.addLog('error', `sendMessage failed to ${chatId}: ${e.message}`);
      return null;
    }
  }

  public async sendChatAction(chatId: string | number, action: 'typing' | 'upload_photo' = 'typing') {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action }),
      });
    } catch {}
  }

  public async sendPhoto(
    chatId: string | number,
    photoBufferOrBase64: Buffer | string,
    caption?: string,
    options: any = {}
  ) {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return null;

    try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));

      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', options.parse_mode || 'Markdown');
      }

      if (options.reply_markup) {
        formData.append('reply_markup', JSON.stringify(options.reply_markup));
      }

      if (Buffer.isBuffer(photoBufferOrBase64)) {
        const blob = new Blob([photoBufferOrBase64], { type: 'image/png' });
        formData.append('photo', blob, 'image.png');
      } else if (typeof photoBufferOrBase64 === 'string' && photoBufferOrBase64.startsWith('data:image')) {
        const base64Data = photoBufferOrBase64.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buf], { type: 'image/png' });
        formData.append('photo', blob, 'image.png');
      } else {
        formData.append('photo', photoBufferOrBase64);
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    } catch (e: any) {
      botStorage.addLog('error', `sendPhoto failed to ${chatId}: ${e.message}`);
      return null;
    }
  }

  public async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert,
        }),
      });
    } catch {}
  }

  public async editMessageText(chatId: string | number, messageId: number, text: string, options: any = {}) {
    const token = botStorage.getConfig().telegramToken;
    if (!token) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: options.parse_mode || 'Markdown',
          reply_markup: options.reply_markup,
        }),
      });
    } catch {}
  }

  // Update Processing Engine
  public async handleUpdate(update: TelegramUpdate) {
    try {
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      if (update.message && update.message.text) {
        await this.handleTextMessage(update.message);
      }
    } catch (err: any) {
      botStorage.addLog('error', `Error processing Telegram update: ${err.message}`, err);
    }
  }

  private async handleTextMessage(msg: any) {
    const userId = String(msg.from.id);
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const config = botStorage.getConfig();
    const isAdmin = String(userId) === String(config.adminId);

    // Register/update user record
    const user = botStorage.registerOrUpdateUser(userId, {
      username: msg.from.username,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
    });

    if (user.isBanned) {
      await this.sendMessage(
        chatId,
        `🚫 *Access Restricted*\n\nYour account has been suspended by the administrator. Contact @${this.botInfo?.username || 'support'} for assistance.`
      );
      return;
    }

    // Commands Routing
    if (text.startsWith('/start')) {
      await this.handleStartCommand(chatId, user, isAdmin);
      return;
    }

    if (text.startsWith('/help')) {
      await this.handleHelpCommand(chatId);
      return;
    }

    if (text.startsWith('/model') || text.startsWith('/models')) {
      await this.handleModelCommand(chatId, user);
      return;
    }

    if (text.startsWith('/ratio') || text.startsWith('/aspect')) {
      await this.handleRatioCommand(chatId, user);
      return;
    }

    if (text.startsWith('/enhance')) {
      const newState = !user.enhancePrompt;
      botStorage.updateUserPreferences(userId, { enhancePrompt: newState });
      await this.sendMessage(
        chatId,
        `✨ *AI Prompt Enhancer*: *${newState ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n` +
          (newState
            ? 'Your simple prompts will now be automatically enriched with cinematic lighting, 8K details, and artistic styling.'
            : 'Prompts will be rendered literally without automatic modifications.')
      );
      return;
    }

    if (text.startsWith('/mystats') || text.startsWith('/profile')) {
      await this.handleMyStatsCommand(chatId, user, isAdmin);
      return;
    }

    // Admin commands
    if (text.startsWith('/admin')) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⛔ *Permission Denied*\nThis command is restricted to the bot administrator.`);
        return;
      }
      await this.handleAdminDashboard(chatId);
      return;
    }

    if (text.startsWith('/stats')) {
      if (!isAdmin) {
        await this.handleMyStatsCommand(chatId, user, false);
        return;
      }
      const stats = botStorage.getStats();
      await this.sendMessage(
        chatId,
        `📊 *Telegram Bot System Statistics*\n\n` +
          `👥 *Total Registered Users:* \`${stats.totalUsers}\`\n` +
          `🎨 *Total Generations:* \`${stats.totalGenerations}\`\n` +
          `⚡ *24h Generations:* \`${stats.todayGenerations}\`\n` +
          `🤖 *Active Default Model:* \`${stats.activeModel}\`\n` +
          `⚠️ *24h Errors:* \`${stats.errorCount}\`\n` +
          `📡 *Engine Status:* \`${this.pollingActive ? 'Long Polling 🟢' : config.isWebhookActive ? 'Webhook 🟢' : 'Standby 🟡'}\``
      );
      return;
    }

    if (text.startsWith('/broadcast')) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⛔ *Admin only command.*`);
        return;
      }
      const broadcastContent = text.replace('/broadcast', '').trim();
      if (!broadcastContent) {
        await this.sendMessage(chatId, `⚠️ *Usage:* \`/broadcast Your announcement message here\``);
        return;
      }
      await this.executeBroadcast(chatId, broadcastContent);
      return;
    }

    if (text.startsWith('/ban ') || text.startsWith('/unban ')) {
      if (!isAdmin) {
        await this.sendMessage(chatId, `⛔ *Admin only command.*`);
        return;
      }
      const isBanning = text.startsWith('/ban ');
      const targetId = text.split(' ')[1]?.trim();
      if (!targetId) {
        await this.sendMessage(chatId, `⚠️ *Usage:* \`/${isBanning ? 'ban' : 'unban'} <user_id>\``);
        return;
      }
      const res = botStorage.toggleBan(targetId, isBanning);
      await this.sendMessage(
        chatId,
        `⚙️ User \`${targetId}\` has been ${isBanning ? '🔴 *BANNED*' : '🟢 *UNBANNED*'}.`
      );
      return;
    }

    // Image generation triggers
    let prompt = '';
    if (text.startsWith('/imagine ') || text.startsWith('/generate ') || text.startsWith('/draw ') || text.startsWith('/art ')) {
      prompt = text.replace(/^\/(imagine|generate|draw|art)\s+/i, '').trim();
    } else if (!text.startsWith('/')) {
      // Direct message prompt
      prompt = text;
    }

    if (prompt) {
      await this.processImageGeneration(chatId, user, prompt);
    }
  }

  private async handleStartCommand(chatId: number, user: any, isAdmin: boolean) {
    const config = botStorage.getConfig();
    const model = user.preferredModel || config.defaultModel;
    const modelObj = SUPPORTED_MODELS.find((m) => m.id === model) || SUPPORTED_MODELS[0];

    const welcomeText =
      `✨ *Welcome to Telegram AI Image Studio* 🎨\n\n` +
      `Generate breathtaking, ultra-detailed artworks powered by *Cloudflare Workers AI* and state-of-the-art diffusion transformers.\n\n` +
      `⚡ *Active Model:* \`${modelObj.name}\`\n` +
      `📐 *Aspect Ratio:* \`${user.preferredRatio || '1:1'}\`\n` +
      `✨ *AI Enhancer:* \`${user.enhancePrompt ? 'ON ✅' : 'OFF ❌'}\`\n\n` +
      `💡 *How to generate:*\n` +
      `• Just send any prompt, e.g.:\n` +
      `  _"A majestic neon cyberpunk phoenix soaring over Tokyo 8k octane"_\n` +
      `• Or use: \`/imagine <your detailed idea>\`\n\n` +
      `👇 *Quick Control Center:*`;

    const keyboard = [
      [
        { text: '✨ Example Prompt', callback_data: 'sample_prompt' },
        { text: '⚙️ Change Model', callback_data: 'menu_model' },
      ],
      [
        { text: '📐 Aspect Ratio', callback_data: 'menu_ratio' },
        { text: user.enhancePrompt ? '✨ Enhancer: ON' : '✨ Enhancer: OFF', callback_data: 'toggle_enhancer' },
      ],
      [
        { text: '📊 My Stats', callback_data: 'action_mystats' },
      ],
    ];

    if (isAdmin) {
      keyboard.push([{ text: '👑 Admin Dashboard', callback_data: 'menu_admin' }]);
    }

    await this.sendMessage(chatId, welcomeText, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handleHelpCommand(chatId: number) {
    const helpText =
      `📖 *AI Art Prompt Engineering & Command Guide*\n\n` +
      `🎨 *Available Commands:*\n` +
      `• \`/imagine <prompt>\` - Create image from text\n` +
      `• \`/model\` - Switch AI model (FLUX.1, SDXL, Lightning)\n` +
      `• \`/ratio\` - Change aspect ratio (1:1, 16:9, 9:16, 4:5)\n` +
      `• \`/enhance\` - Toggle automatic prompt detailing\n` +
      `• \`/mystats\` - View your generation count & quota\n` +
      `• \`/help\` - Show this master guide\n\n` +
      `💡 *Pro-Tips for Detailed Results:*\n` +
      `1. *Lighting:* _volumetric lighting, neon refraction, golden hour rim light_\n` +
      `2. *Camera:* _85mm lens, f/1.4 depth of field, wide-angle cinematic shot_\n` +
      `3. *Details:* _hyperdetailed textures, intricate reflections, 8k resolution_`;

    await this.sendMessage(chatId, helpText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✨ Example Prompt', callback_data: 'sample_prompt' },
            { text: '⚙️ Change Model', callback_data: 'menu_model' },
          ],
        ],
      },
    });
  }

  private async handleModelCommand(chatId: number, user: any) {
    const currentModel = user.preferredModel || botStorage.getConfig().defaultModel;

    const keyboard = SUPPORTED_MODELS.map((m) => {
      const isSelected = m.id === currentModel;
      return [
        {
          text: `${isSelected ? '✅ ' : ''}${m.name} (${m.speed})`,
          callback_data: `select_model:${m.id}`,
        },
      ];
    });

    keyboard.push([{ text: '🔙 Back to Menu', callback_data: 'menu_start' }]);

    await this.sendMessage(
      chatId,
      `⚙️ *Select AI Image Generation Model*\n\n` +
        `Current: \`${SUPPORTED_MODELS.find((m) => m.id === currentModel)?.name || currentModel}\`\n\n` +
        `Choose an engine below:`,
      {
        reply_markup: { inline_keyboard: keyboard },
      }
    );
  }

  private async handleRatioCommand(chatId: number, user: any) {
    const currentRatio = user.preferredRatio || '1:1';
    const ratios = [
      { id: '1:1', label: '1:1 Square (1024x1024) - Best for Avatars/Posts' },
      { id: '9:16', label: '9:16 Story/Reels (576x1024) - Mobile Wallpaper' },
      { id: '16:9', label: '16:9 Landscape (1024x576) - Cinematic Desktop' },
      { id: '4:5', label: '4:5 Portrait (816x1024) - Instagram Portrait' },
    ];

    const keyboard = ratios.map((r) => [
      {
        text: `${r.id === currentRatio ? '✅ ' : ''}${r.label}`,
        callback_data: `select_ratio:${r.id}`,
      },
    ]);
    keyboard.push([{ text: '🔙 Back to Menu', callback_data: 'menu_start' }]);

    await this.sendMessage(chatId, `📐 *Choose Image Aspect Ratio:*`, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handleMyStatsCommand(chatId: number, user: any, isAdmin: boolean) {
    const statsText =
      `👤 *User Profile & Settings*\n\n` +
      `🆔 *User ID:* \`${user.id}\`\n` +
      `👤 *Name:* ${user.firstName || 'Anonymous'} ${user.username ? `(@${user.username})` : ''}\n` +
      `🎨 *Total Creations:* \`${user.totalGenerations}\`\n` +
      `⭐ *Account Tier:* \`${isAdmin ? '👑 Supreme Admin' : user.isVip ? '🌟 VIP Unlimited' : '🚀 Standard Member'}\`\n` +
      `⚡ *Preferred Model:* \`${SUPPORTED_MODELS.find((m) => m.id === user.preferredModel)?.name || user.preferredModel || 'FLUX.1 Schnell'}\`\n` +
      `📐 *Aspect Ratio:* \`${user.preferredRatio || '1:1'}\`\n` +
      `✨ *AI Enhancer:* \`${user.enhancePrompt ? 'Enabled' : 'Disabled'}\`\n` +
      `📅 *Joined:* \`${new Date(user.firstSeen).toLocaleDateString()}\``;

    const keyboard = [
      [
        { text: '⚙️ Change Settings', callback_data: 'menu_model' },
        { text: '🎨 Create Image', callback_data: 'sample_prompt' },
      ],
    ];

    await this.sendMessage(chatId, statsText, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handleAdminDashboard(chatId: number) {
    const stats = botStorage.getStats();
    const config = botStorage.getConfig();

    const adminText =
      `👑 *Admin Control Panel*\n\n` +
      `👥 *Registered Users:* \`${stats.totalUsers}\`\n` +
      `🎨 *All-time Generations:* \`${stats.totalGenerations}\`\n` +
      `⚡ *24h Activity:* \`${stats.todayGenerations} images\`\n` +
      `⚠️ *Recent Errors:* \`${stats.errorCount}\`\n` +
      `🤖 *Global Default Model:* \`${config.defaultModel}\`\n` +
      `📡 *Engine Mode:* \`${this.pollingActive ? 'Long Polling 🟢' : config.isWebhookActive ? 'Webhook 🟢' : 'Standby 🟡'}\`\n\n` +
      `Select an administrative action:`;

    const keyboard = [
      [
        { text: '📢 Send Broadcast', callback_data: 'admin_prompt_broadcast' },
        { text: '📊 Full Stats', callback_data: 'admin_refresh_stats' },
      ],
      [
        { text: '🔄 Restart Polling', callback_data: 'admin_restart_polling' },
        { text: '👥 View Top Users', callback_data: 'admin_list_users' },
      ],
      [{ text: '🔙 Exit Admin Panel', callback_data: 'menu_start' }],
    ];

    await this.sendMessage(chatId, adminText, {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async executeBroadcast(chatId: number, messageText: string) {
    const users = botStorage.getAllUsers();
    await this.sendMessage(chatId, `📡 *Starting broadcast to ${users.length} users...*`);

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      if (u.isBanned) continue;
      try {
        const res = await this.sendMessage(
          u.id,
          `📢 *Announcement from Admin*\n\n${messageText}`
        );
        if (res && res.ok) sent++;
        else failed++;
        // avoid hitting telegram rate limits
        await new Promise((r) => setTimeout(r, 40));
      } catch {
        failed++;
      }
    }

    await this.sendMessage(
      chatId,
      `✅ *Broadcast Complete*\n\n• Successfully delivered: \`${sent}\`\n• Failed / Blocked: \`${failed}\``
    );
    botStorage.addLog('admin', `Admin broadcast delivered to ${sent} users (${failed} failed).`);
  }

  // Handle Callback Queries (Button Clicks)
  private async handleCallbackQuery(cb: any) {
    const callbackId = cb.id;
    const data = cb.data || '';
    const userId = String(cb.from.id);
    const chatId = cb.message?.chat.id || cb.from.id;
    const messageId = cb.message?.message_id;
    const config = botStorage.getConfig();
    const isAdmin = String(userId) === String(config.adminId);

    const user = botStorage.registerOrUpdateUser(userId, {
      username: cb.from.username,
      firstName: cb.from.first_name,
    });

    if (data === 'menu_start') {
      await this.answerCallbackQuery(callbackId);
      await this.handleStartCommand(chatId, user, isAdmin);
      return;
    }

    if (data === 'menu_model') {
      await this.answerCallbackQuery(callbackId);
      await this.handleModelCommand(chatId, user);
      return;
    }

    if (data === 'menu_ratio') {
      await this.answerCallbackQuery(callbackId);
      await this.handleRatioCommand(chatId, user);
      return;
    }

    if (data.startsWith('select_model:')) {
      const modelId = data.replace('select_model:', '');
      botStorage.updateUserPreferences(userId, { preferredModel: modelId });
      const modelObj = SUPPORTED_MODELS.find((m) => m.id === modelId);
      await this.answerCallbackQuery(callbackId, `Switched to ${modelObj?.name || modelId}!`);
      if (messageId) {
        await this.handleModelCommand(chatId, { ...user, preferredModel: modelId });
      }
      return;
    }

    if (data.startsWith('select_ratio:')) {
      const ratio = data.replace('select_ratio:', '');
      botStorage.updateUserPreferences(userId, { preferredRatio: ratio });
      await this.answerCallbackQuery(callbackId, `Aspect ratio set to ${ratio}!`);
      if (messageId) {
        await this.handleRatioCommand(chatId, { ...user, preferredRatio: ratio });
      }
      return;
    }

    if (data === 'toggle_enhancer') {
      const newState = !user.enhancePrompt;
      botStorage.updateUserPreferences(userId, { enhancePrompt: newState });
      await this.answerCallbackQuery(callbackId, `AI Enhancer ${newState ? 'Enabled' : 'Disabled'}`);
      await this.handleStartCommand(chatId, { ...user, enhancePrompt: newState }, isAdmin);
      return;
    }

    if (data === 'action_mystats') {
      await this.answerCallbackQuery(callbackId);
      await this.handleMyStatsCommand(chatId, user, isAdmin);
      return;
    }

    if (data === 'menu_admin') {
      if (!isAdmin) {
        await this.answerCallbackQuery(callbackId, 'Admin only!', true);
        return;
      }
      await this.answerCallbackQuery(callbackId);
      await this.handleAdminDashboard(chatId);
      return;
    }

    if (data === 'sample_prompt') {
      const samples = [
        'A majestic cybernetic tiger with glowing azure circuits walking through a neon-lit rain-slicked Tokyo street, 8k resolution, octane render',
        'Astronaut discovering an ancient bioluminescent crystal alien pyramid on a distant planet, dramatic golden lighting, cinematic 35mm photograph',
        'An ethereal fairy queen surrounded by glowing butterflies in an enchanted mystical twilight forest, ultra detailed digital oil painting',
        'Futuristic sports car racing through a synthwave desert sunset with retro neon grid aesthetic, cinematic lighting, 4k concept art',
      ];
      const randomPrompt = samples[Math.floor(Math.random() * samples.length)];
      await this.answerCallbackQuery(callbackId, 'Generating sample artwork...');
      await this.processImageGeneration(chatId, user, randomPrompt);
      return;
    }

    if (data.startsWith('reroll:')) {
      const promptText = Buffer.from(data.replace('reroll:', ''), 'base64').toString('utf-8');
      await this.answerCallbackQuery(callbackId, 'Re-rolling with new seed...');
      await this.processImageGeneration(chatId, user, promptText);
      return;
    }

    if (data === 'admin_refresh_stats') {
      await this.answerCallbackQuery(callbackId, 'Stats updated!');
      await this.handleAdminDashboard(chatId);
      return;
    }

    if (data === 'admin_restart_polling') {
      this.stopPolling();
      this.startPolling();
      await this.answerCallbackQuery(callbackId, 'Polling engine restarted!');
      return;
    }

    if (data === 'admin_list_users') {
      const users = botStorage.getAllUsers().slice(0, 10);
      let list = `👥 *Top Recent Active Users:*\n\n`;
      users.forEach((u, i) => {
        list += `${i + 1}. \`${u.id}\` | @${u.username || u.firstName || 'user'} | 🎨 *${u.totalGenerations}* gens ${u.isBanned ? '🔴' : '🟢'}\n`;
      });
      await this.answerCallbackQuery(callbackId);
      await this.sendMessage(chatId, list, {
        reply_markup: { inline_keyboard: [[{ text: '🔙 Admin Panel', callback_data: 'menu_admin' }]] },
      });
      return;
    }

    await this.answerCallbackQuery(callbackId);
  }

  // Core Image Generation Dispatcher
  public async processImageGeneration(chatId: number | string, user: any, rawPrompt: string) {
    const config = botStorage.getConfig();

    if (!config.cloudflareAccountId || !config.cloudflareApiToken) {
      await this.sendMessage(
        chatId,
        `⚠️ *Cloudflare AI Not Configured*\n\n` +
          `The bot administrator needs to add the **Cloudflare Account ID** and **Cloudflare API Token** in the Web Control Dashboard before AI image generation is active.\n\n` +
          `_If you are the admin, open the Web Dashboard settings._`
      );
      botStorage.addLog('warning', 'Generation requested but Cloudflare credentials missing.');
      return;
    }

    // Send typing & generation status
    await this.sendChatAction(chatId, 'upload_photo');
    const statusMsg = await this.sendMessage(
      chatId,
      `🎨 *Generating artwork...*\n\n` +
        `📝 *Prompt:* _"${rawPrompt.length > 90 ? rawPrompt.slice(0, 90) + '...' : rawPrompt}"_\n` +
        `⚡ *Engine:* \`${SUPPORTED_MODELS.find((m) => m.id === (user?.preferredModel || config.defaultModel))?.name || 'FLUX.1 Schnell'}\`\n` +
        `⏳ _Please wait a moment..._`
    );

    const startTime = Date.now();
    const model = user?.preferredModel || config.defaultModel || '@cf/black-forest-labs/flux-1-schnell';
    const ratio = user?.preferredRatio || '1:1';

    // Dimension calculation based on ratio
    let width = 1024;
    let height = 1024;
    if (ratio === '16:9') {
      width = 1024;
      height = 576;
    } else if (ratio === '9:16') {
      width = 576;
      height = 1024;
    } else if (ratio === '4:5') {
      width = 816;
      height = 1024;
    }

    let finalPrompt = rawPrompt;

    try {
      // Prompt enhancement if enabled
      if (user?.enhancePrompt || config.autoEnhancePrompt) {
        finalPrompt = await enhancePromptWithAI(
          rawPrompt,
          config.cloudflareAccountId,
          config.cloudflareApiToken
        );
      }

      const seed = Math.floor(Math.random() * 2147483647);

      const { buffer, contentType } = await generateCloudflareImage(
        config.cloudflareAccountId,
        config.cloudflareApiToken,
        {
          prompt: finalPrompt,
          model,
          width,
          height,
          seed,
        }
      );

      const durationMs = Date.now() - startTime;
      const durationSec = (durationMs / 1000).toFixed(1);

      // Encode prompt for buttons (safely truncated)
      const promptEncoded = Buffer.from(rawPrompt.slice(0, 100)).toString('base64');

      const caption =
        `✨ *Prompt:* ${rawPrompt}\n\n` +
        `🤖 *Model:* \`${SUPPORTED_MODELS.find((m) => m.id === model)?.name || model}\`\n` +
        `📐 *Size:* \`${width}x${height}\` (${ratio}) • ⏱️ \`${durationSec}s\` • 🌱 \`${seed}\``;

      const keyboard = [
        [
          { text: '🔄 Re-roll', callback_data: `reroll:${promptEncoded}` },
          { text: '🎨 New Prompt', callback_data: 'sample_prompt' },
        ],
        [
          { text: '⚙️ Change Model', callback_data: 'menu_model' },
          { text: '📐 Aspect Ratio', callback_data: 'menu_ratio' },
        ],
      ];

      // Send the photo
      await this.sendPhoto(chatId, buffer, caption, {
        reply_markup: { inline_keyboard: keyboard },
      });

      // Save to gallery
      const base64Img = `data:${contentType};base64,${buffer.toString('base64')}`;
      const genItem: GenerationItem = {
        id: Math.random().toString(36).substring(2, 10),
        prompt: rawPrompt,
        enhancedPrompt: finalPrompt !== rawPrompt ? finalPrompt : undefined,
        model,
        aspectRatio: ratio,
        width,
        height,
        imageUrl: base64Img,
        userId: String(user.id),
        username: user.username,
        firstName: user.firstName,
        timestamp: Date.now(),
        durationMs,
        seed,
        status: 'success',
      };
      botStorage.addGeneration(genItem);
      botStorage.addLog(
        'success',
        `Generated image for @${user.username || user.firstName || user.id} in ${durationSec}s with ${model}`
      );
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown Cloudflare AI error';
      botStorage.addLog('error', `Generation failed for user ${user.id}: ${errorMsg}`);

      await this.sendMessage(
        chatId,
        `❌ *Image Generation Failed*\n\n` +
          `⚠️ *Error:* \`${errorMsg}\`\n\n` +
          `_Please check your prompt or verify Cloudflare Workers AI API token permissions in the admin panel._`
      );
    }
  }
}

export const telegramBot = new TelegramBotService();

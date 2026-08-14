import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { botStorage } from './server/storage.js';
import { telegramBot } from './server/telegramBot.js';
import { generateCloudflareImage, enhancePromptWithAI, SUPPORTED_MODELS } from './server/cloudflare.js';
import { GenerationItem } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded body parser with generous limit for images/base64
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Bot Status & Diagnostics
  app.get('/api/bot/status', async (req, res) => {
    try {
      const config = botStorage.getConfig();
      const stats = botStorage.getStats();
      const botInfo = telegramBot.getBotInfo();
      const isPolling = telegramBot.isPolling();

      const telegramReady = Boolean(config.telegramToken && (botInfo || config.telegramToken.length > 20));
      const cloudflareReady = Boolean(config.cloudflareAccountId && config.cloudflareApiToken);
      const adminConfigured = Boolean(config.adminId);

      res.json({
        isConfigured: telegramReady && cloudflareReady && adminConfigured,
        telegramReady,
        botUsername: botInfo?.username || undefined,
        botFirstName: botInfo?.first_name || undefined,
        cloudflareReady,
        adminConfigured,
        pollingActive: isPolling,
        webhookActive: config.isWebhookActive,
        totalGenerations: stats.totalGenerations,
        todayGenerations: stats.todayGenerations,
        totalUsers: stats.totalUsers,
        activeModel: stats.activeModel,
        errorCount: stats.errorCount,
        config: {
          telegramToken: config.telegramToken || '',
          hasTelegramToken: Boolean(config.telegramToken),
          cloudflareAccountId: config.cloudflareAccountId || '',
          hasCloudflareAccountId: Boolean(config.cloudflareAccountId),
          cloudflareApiToken: config.cloudflareApiToken || '',
          hasCloudflareApiToken: Boolean(config.cloudflareApiToken),
          adminId: config.adminId || '',
          defaultModel: config.defaultModel,
          autoEnhancePrompt: config.autoEnhancePrompt,
          maxDailyQuota: config.maxDailyQuota,
          pollingEnabled: config.pollingEnabled,
          webhookUrl: config.webhookUrl,
          isWebhookActive: config.isWebhookActive,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get raw Bot Configuration
  app.get('/api/bot/config', (req, res) => {
    try {
      const config = botStorage.getConfig();
      res.json({ success: true, config });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update Bot Configuration
  app.post('/api/bot/config', async (req, res) => {
    try {
      const {
        telegramToken,
        cloudflareAccountId,
        cloudflareApiToken,
        adminId,
        defaultModel,
        autoEnhancePrompt,
        maxDailyQuota,
      } = req.body;

      const updates: any = {};
      if (telegramToken !== undefined) updates.telegramToken = telegramToken.trim();
      if (cloudflareAccountId !== undefined) updates.cloudflareAccountId = cloudflareAccountId.trim();
      if (cloudflareApiToken !== undefined) updates.cloudflareApiToken = cloudflareApiToken.trim();
      if (adminId !== undefined) updates.adminId = String(adminId).trim();
      if (defaultModel !== undefined) updates.defaultModel = defaultModel;
      if (autoEnhancePrompt !== undefined) updates.autoEnhancePrompt = Boolean(autoEnhancePrompt);
      if (maxDailyQuota !== undefined) updates.maxDailyQuota = Number(maxDailyQuota);

      const newConfig = botStorage.updateConfig(updates);

      // Re-initialize or stop bot if telegram token changed or cleared
      if (updates.telegramToken !== undefined) {
        if (!updates.telegramToken) {
          telegramBot.stopPolling();
        } else {
          await telegramBot.initBot();
        }
      }

      res.json({ success: true, config: newConfig });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Live Test Cloudflare Image Generation
  app.post('/api/bot/test-cloudflare', async (req, res) => {
    try {
      const config = botStorage.getConfig();
      const accountId = req.body.cloudflareAccountId || config.cloudflareAccountId;
      const apiToken = req.body.cloudflareApiToken || config.cloudflareApiToken;
      const prompt = req.body.prompt || 'A futuristic cybernetic tiger in neon Tokyo, 8k resolution octane render';
      const model = req.body.model || config.defaultModel || '@cf/black-forest-labs/flux-1-schnell';
      const enhance = req.body.enhance ?? config.autoEnhancePrompt;

      if (!accountId || !apiToken) {
        return res.status(400).json({ error: 'Cloudflare Account ID and API Token are required.' });
      }

      let finalPrompt = prompt;
      if (enhance) {
        finalPrompt = await enhancePromptWithAI(prompt, accountId, apiToken);
      }

      const start = Date.now();
      const { buffer, contentType } = await generateCloudflareImage(accountId, apiToken, {
        prompt: finalPrompt,
        model,
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 1000000),
      });
      const durationMs = Date.now() - start;

      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

      // Record to gallery
      const genItem: GenerationItem = {
        id: Math.random().toString(36).substring(2, 9),
        prompt,
        enhancedPrompt: finalPrompt !== prompt ? finalPrompt : undefined,
        model,
        aspectRatio: '1:1',
        width: 1024,
        height: 1024,
        imageUrl: base64,
        userId: config.adminId || 'admin_studio',
        username: 'StudioAdmin',
        timestamp: Date.now(),
        durationMs,
        status: 'success',
      };
      botStorage.addGeneration(genItem);

      res.json({
        success: true,
        imageUrl: base64,
        enhancedPrompt: finalPrompt !== prompt ? finalPrompt : null,
        durationMs,
        model,
      });
    } catch (e: any) {
      botStorage.addLog('error', `Cloudflare test generation failed: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // Live Test Telegram Token & Connection
  app.post('/api/bot/test-telegram', async (req, res) => {
    try {
      const token = req.body.telegramToken || botStorage.getConfig().telegramToken;
      const adminId = req.body.adminId || botStorage.getConfig().adminId;

      if (!token) {
        return res.status(400).json({ error: 'Telegram Bot Token is required.' });
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json() as any;

      if (!data.ok) {
        return res.status(400).json({
          error: data.description || 'Invalid Telegram Bot Token.',
        });
      }

      let messageSent = false;
      if (adminId) {
        try {
          await telegramBot.sendMessage(
            adminId,
            `👑 *Telegram AI Image Bot Admin Alert*\n\n` +
              `Connection verification successful!\n` +
              `🤖 *Bot Handle:* @${data.result.username}\n` +
              `📅 *Timestamp:* \`${new Date().toISOString()}\``
          );
          messageSent = true;
        } catch (mErr) {
          console.warn('Could not send admin test ping:', mErr);
        }
      }

      res.json({
        success: true,
        bot: data.result,
        adminMessageSent: messageSent,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Webhook Registration
  app.post('/api/bot/set-webhook', async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL is required' });
      }
      const result = await telegramBot.setWebhook(webhookUrl);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete Webhook
  app.post('/api/bot/delete-webhook', async (req, res) => {
    try {
      const result = await telegramBot.deleteWebhook();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Start Bot explicitly
  app.post('/api/bot/start', async (req, res) => {
    try {
      const config = botStorage.getConfig();
      if (!config.telegramToken) {
        return res.status(400).json({
          success: false,
          error: 'Telegram Bot Token is not configured. Please add your token first in Settings.'
        });
      }

      // 1. Check getMe
      const me = await telegramBot.getMe();
      if (!me.ok) {
        return res.status(400).json({
          success: false,
          error: `Telegram authentication failed: ${me.description || 'Invalid bot token'}`
        });
      }

      // 2. Clear any active webhook to prevent 409 conflict
      try {
        await fetch(`https://api.telegram.org/bot${config.telegramToken}/deleteWebhook?drop_pending_updates=false`);
      } catch {}

      // 3. Mark polling enabled in config and start polling
      botStorage.updateConfig({ pollingEnabled: true, isWebhookActive: false });
      telegramBot.stopPolling();
      telegramBot.startPolling();

      botStorage.addLog('success', `Bot started and polling active for @${me.result.username}`);
      res.json({
        success: true,
        bot: me.result,
        pollingActive: true,
        message: `Bot @${me.result.username} is now online and listening for messages!`
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Restart Bot explicitly
  app.post('/api/bot/restart', async (req, res) => {
    try {
      const config = botStorage.getConfig();
      telegramBot.stopPolling();

      if (config.telegramToken) {
        try {
          await fetch(`https://api.telegram.org/bot${config.telegramToken}/deleteWebhook?drop_pending_updates=false`);
        } catch {}
      }

      await telegramBot.initBot();
      const isPolling = telegramBot.isPolling();
      const me = await telegramBot.getMe();

      res.json({
        success: true,
        pollingActive: isPolling,
        bot: me.ok ? me.result : null,
        message: 'Bot service reinitialized successfully.'
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Diagnostics
  app.get('/api/bot/diagnostics', async (req, res) => {
    try {
      const config = botStorage.getConfig();
      const tokenPresent = !!config.telegramToken;
      const cfAccountIdPresent = !!config.cloudflareAccountId;
      const cfTokenPresent = !!config.cloudflareApiToken;
      const adminIdPresent = !!config.adminId;

      let tgResult = { ok: false, message: 'Token not provided' };
      if (tokenPresent) {
        const me = await telegramBot.getMe();
        tgResult = {
          ok: me.ok,
          message: me.ok ? `@${me.result?.username} (${me.result?.first_name})` : me.description || 'Invalid token'
        };
      }

      let cfResult = { ok: false, message: 'Cloudflare credentials not provided' };
      if (cfAccountIdPresent && cfTokenPresent) {
        try {
          const testRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/tokens/verify`,
            {
              headers: { Authorization: `Bearer ${config.cloudflareApiToken}` }
            }
          );
          if (testRes.ok) {
            cfResult = { ok: true, message: 'Cloudflare API Token verified' };
          } else {
            cfResult = { ok: false, message: `Cloudflare token check returned HTTP ${testRes.status}` };
          }
        } catch (err: any) {
          cfResult = { ok: false, message: err.message };
        }
      }

      res.json({
        telegram: {
          configured: tokenPresent,
          valid: tgResult.ok,
          details: tgResult.message,
          pollingActive: telegramBot.isPolling(),
          webhookActive: config.isWebhookActive
        },
        cloudflare: {
          configured: cfAccountIdPresent && cfTokenPresent,
          valid: cfResult.ok,
          details: cfResult.message,
          defaultModel: config.defaultModel
        },
        admin: {
          configured: adminIdPresent,
          adminId: config.adminId
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Toggle Polling Runner
  app.post('/api/bot/toggle-polling', (req, res) => {
    try {
      const current = telegramBot.isPolling();
      if (current) {
        telegramBot.stopPolling();
      } else {
        telegramBot.startPolling();
      }
      res.json({ pollingActive: telegramBot.isPolling() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Telegram Webhook Handler
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update = req.body;
      if (update && update.update_id) {
        // Asynchronously process so Telegram doesn't timeout
        telegramBot.handleUpdate(update).catch((err) => {
          console.error('Webhook handleUpdate error:', err);
        });
      }
      res.status(200).send('OK');
    } catch (e) {
      res.status(200).send('OK');
    }
  });

  // Broadcast Message to all Bot Users
  app.post('/api/bot/broadcast', async (req, res) => {
    try {
      const { messageText } = req.body;
      if (!messageText) {
        return res.status(400).json({ error: 'Message text is required.' });
      }

      const users = botStorage.getAllUsers();
      let sentCount = 0;
      let failedCount = 0;

      for (const u of users) {
        if (u.isBanned) continue;
        try {
          const sent = await telegramBot.sendMessage(
            u.id,
            `📢 *Admin Broadcast*\n\n${messageText}`
          );
          if (sent && sent.ok) sentCount++;
          else failedCount++;
          await new Promise((r) => setTimeout(r, 40));
        } catch {
          failedCount++;
        }
      }

      botStorage.addLog('admin', `Broadcast sent to ${sentCount} users from Web Dashboard.`);
      res.json({ success: true, total: users.length, sent: sentCount, failed: failedCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Users List
  app.get('/api/bot/users', (req, res) => {
    try {
      const users = botStorage.getAllUsers();
      res.json({ users });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // User Actions (Ban/Unban/VIP)
  app.post('/api/bot/user-action', (req, res) => {
    try {
      const { userId, action, value } = req.body;
      if (!userId || !action) {
        return res.status(400).json({ error: 'userId and action required' });
      }

      if (action === 'ban') {
        const isBanned = botStorage.toggleBan(userId, value);
        return res.json({ success: true, isBanned });
      } else if (action === 'vip') {
        const isVip = botStorage.toggleVip(userId, value);
        return res.json({ success: true, isVip });
      }

      res.status(400).json({ error: 'Unknown action' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Gallery Feed
  app.get('/api/bot/gallery', (req, res) => {
    try {
      const limit = Number(req.query.limit) || 60;
      const items = botStorage.getGenerations(limit);
      res.json({ items });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Logs
  app.get('/api/bot/logs', (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const logs = botStorage.getLogs(limit);
      res.json({ logs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Interactive Telegram Simulator API (Lets user test full bot flow right in web UI)
  app.post('/api/simulate', async (req, res) => {
    try {
      const { input, callbackData, simUserId, simUsername } = req.body;
      const config = botStorage.getConfig();
      const userId = simUserId || config.adminId || 'sim_999999';
      const username = simUsername || 'SimulatorUser';
      const isAdmin = String(userId) === String(config.adminId);

      const user = botStorage.registerOrUpdateUser(userId, {
        username,
        firstName: 'Simulator Test',
      });

      // Simulation of callback queries
      if (callbackData) {
        if (callbackData === 'sample_prompt') {
          const sample = 'A cybernetic tiger in neon Tokyo, 8k octane render';
          return res.json({
            type: 'generation',
            prompt: sample,
            model: user.preferredModel || config.defaultModel,
          });
        }
        if (callbackData.startsWith('select_model:')) {
          const modelId = callbackData.replace('select_model:', '');
          botStorage.updateUserPreferences(userId, { preferredModel: modelId });
          return res.json({
            type: 'text',
            text: `✅ Model switched to: \`${modelId}\``,
          });
        }
        if (callbackData.startsWith('select_ratio:')) {
          const ratio = callbackData.replace('select_ratio:', '');
          botStorage.updateUserPreferences(userId, { preferredRatio: ratio });
          return res.json({
            type: 'text',
            text: `📐 Aspect ratio set to: \`${ratio}\``,
          });
        }
        if (callbackData === 'toggle_enhancer') {
          const newState = !user.enhancePrompt;
          botStorage.updateUserPreferences(userId, { enhancePrompt: newState });
          return res.json({
            type: 'text',
            text: `✨ AI Prompt Enhancer: *${newState ? 'ENABLED ✅' : 'DISABLED ❌'}*`,
          });
        }
      }

      const text = (input || '').trim();

      if (text === '/start') {
        const welcomeText =
          `✨ *Welcome to Telegram AI Image Studio* 🎨\n\n` +
          `Generate breathtaking, ultra-detailed artworks powered by *Cloudflare Workers AI*.\n\n` +
          `⚡ *Active Model:* \`${user.preferredModel || config.defaultModel}\`\n` +
          `📐 *Aspect Ratio:* \`${user.preferredRatio || '1:1'}\`\n` +
          `✨ *AI Enhancer:* \`${user.enhancePrompt ? 'ON ✅' : 'OFF ❌'}\`\n\n` +
          `💡 Send any text prompt or use \`/imagine <prompt>\`!`;

        return res.json({
          type: 'text',
          text: welcomeText,
          buttons: [
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
            ...(isAdmin ? [[{ text: '👑 Admin Dashboard', callback_data: 'menu_admin' }]] : []),
          ],
        });
      }

      if (text === '/model' || text === '/models') {
        return res.json({
          type: 'text',
          text: `⚙️ *Select AI Image Generation Engine:*\n\nCurrent: \`${user.preferredModel || config.defaultModel}\``,
          buttons: SUPPORTED_MODELS.map((m) => [
            {
              text: `${(user.preferredModel || config.defaultModel) === m.id ? '✅ ' : ''}${m.name}`,
              callback_data: `select_model:${m.id}`,
            },
          ]),
        });
      }

      if (text === '/ratio') {
        return res.json({
          type: 'text',
          text: `📐 *Select Aspect Ratio:*`,
          buttons: [
            [{ text: '1:1 Square (1024x1024)', callback_data: 'select_ratio:1:1' }],
            [{ text: '9:16 Story/Reels (576x1024)', callback_data: 'select_ratio:9:16' }],
            [{ text: '16:9 Landscape (1024x576)', callback_data: 'select_ratio:16:9' }],
            [{ text: '4:5 Instagram Portrait (816x1024)', callback_data: 'select_ratio:4:5' }],
          ],
        });
      }

      if (text === '/admin') {
        if (!isAdmin) {
          return res.json({
            type: 'text',
            text: '⛔ *Permission Denied: Admin ID required.*',
          });
        }
        const stats = botStorage.getStats();
        return res.json({
          type: 'text',
          text: `👑 *Admin Control Panel*\n\n👥 Users: \`${stats.totalUsers}\`\n🎨 Total Images: \`${stats.totalGenerations}\`\n⚡ 24h Activity: \`${stats.todayGenerations}\``,
          buttons: [
            [{ text: '📢 Send Broadcast', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Stats', callback_data: 'admin_refresh_stats' }],
          ],
        });
      }

      if (text === '/help') {
        return res.json({
          type: 'text',
          text: `📖 *Commands Guide*\n\n• \`/imagine <prompt>\` - Create image\n• \`/model\` - Switch engine\n• \`/ratio\` - Change aspect ratio\n• \`/enhance\` - Toggle prompt refiner\n• \`/mystats\` - View your account stats`,
          buttons: [
            [
              { text: '🌆 Cyberpunk', callback_data: 'quick_gen:cyberpunk' },
              { text: '🐉 Dragon', callback_data: 'quick_gen:fantasy' },
            ],
          ],
        });
      }

      // Default prompt generation
      let prompt = text.replace(/^\/(imagine|generate|draw|art)\s+/i, '').trim();
      return res.json({
        type: 'generation',
        prompt,
        model: user.preferredModel || config.defaultModel,
        aspectRatio: user.preferredRatio || '1:1',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram AI Image Bot Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

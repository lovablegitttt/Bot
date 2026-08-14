import fs from 'fs';
import path from 'path';
import { BotConfig, BotUser, GenerationItem, BotLog } from '../src/types.js';

interface StorageState {
  config: BotConfig;
  users: Record<string, BotUser>;
  generations: GenerationItem[];
  logs: BotLog[];
}

const CONFIG_FILE = path.join(process.cwd(), 'bot-data.json');

// Initial defaults
const defaultState: StorageState = {
  config: {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    adminId: process.env.ADMIN_TELEGRAM_ID || '',
    defaultModel: process.env.DEFAULT_AI_MODEL || '@cf/black-forest-labs/flux-1-schnell',
    autoEnhancePrompt: false,
    maxDailyQuota: 50,
    pollingEnabled: true,
    webhookUrl: '',
    isWebhookActive: false,
  },
  users: {},
  generations: [],
  logs: [],
};

class BotStorage {
  private state: StorageState = { ...defaultState };

  constructor() {
    this.load();
    // Synchronize env overrides if set
    if (process.env.TELEGRAM_BOT_TOKEN && !this.state.config.telegramToken) {
      this.state.config.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    }
    if (process.env.CLOUDFLARE_ACCOUNT_ID && !this.state.config.cloudflareAccountId) {
      this.state.config.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    }
    if (process.env.CLOUDFLARE_API_TOKEN && !this.state.config.cloudflareApiToken) {
      this.state.config.cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    }
    if (process.env.ADMIN_TELEGRAM_ID && !this.state.config.adminId) {
      this.state.config.adminId = process.env.ADMIN_TELEGRAM_ID;
    }
    this.addLog('info', 'Telegram AI Image Bot storage initialized.');
  }

  private load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          ...defaultState,
          ...parsed,
          config: {
            ...defaultState.config,
            ...(parsed.config || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load storage state:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
      this.syncToEnvFile();
    } catch (e) {
      console.error('Failed to persist storage state:', e);
    }
  }

  private syncToEnvFile() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const cfg = this.state.config;

      // Update runtime process.env
      process.env.TELEGRAM_BOT_TOKEN = cfg.telegramToken || '';
      process.env.CLOUDFLARE_ACCOUNT_ID = cfg.cloudflareAccountId || '';
      process.env.CLOUDFLARE_API_TOKEN = cfg.cloudflareApiToken || '';
      process.env.ADMIN_TELEGRAM_ID = cfg.adminId || '';
      process.env.DEFAULT_AI_MODEL = cfg.defaultModel || '@cf/black-forest-labs/flux-1-schnell';

      // Build .env content
      const envContent = [
        `# Auto-synchronized credentials and config`,
        `GEMINI_API_KEY="${process.env.GEMINI_API_KEY || ''}"`,
        `APP_URL="${process.env.APP_URL || ''}"`,
        `TELEGRAM_BOT_TOKEN="${cfg.telegramToken || ''}"`,
        `CLOUDFLARE_ACCOUNT_ID="${cfg.cloudflareAccountId || ''}"`,
        `CLOUDFLARE_API_TOKEN="${cfg.cloudflareApiToken || ''}"`,
        `ADMIN_TELEGRAM_ID="${cfg.adminId || ''}"`,
        `DEFAULT_AI_MODEL="${cfg.defaultModel || '@cf/black-forest-labs/flux-1-schnell'}"`,
        ``,
      ].join('\n');

      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (err) {
      console.warn('Could not write .env file:', err);
    }
  }

  public getConfig(): BotConfig {
    return { ...this.state.config };
  }

  public updateConfig(newConfig: Partial<BotConfig>): BotConfig {
    this.state.config = {
      ...this.state.config,
      ...newConfig,
    };
    this.save();
    this.addLog('info', 'Bot configuration updated successfully.');
    return this.getConfig();
  }

  public getUser(userId: string): BotUser | undefined {
    return this.state.users[userId];
  }

  public registerOrUpdateUser(
    userId: string,
    userData: { username?: string; firstName?: string; lastName?: string }
  ): BotUser {
    const existing = this.state.users[userId];
    const now = Date.now();

    if (existing) {
      existing.username = userData.username ?? existing.username;
      existing.firstName = userData.firstName ?? existing.firstName;
      existing.lastName = userData.lastName ?? existing.lastName;
      existing.lastActive = now;
      this.save();
      return existing;
    }

    const newUser: BotUser = {
      id: userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      firstSeen: now,
      lastActive: now,
      totalGenerations: 0,
      isBanned: false,
      isVip: userId === this.state.config.adminId,
      preferredModel: this.state.config.defaultModel,
      preferredRatio: '1:1',
      enhancePrompt: false,
    };

    this.state.users[userId] = newUser;
    this.save();
    this.addLog('info', `New user registered: ${userData.username || userData.firstName || userId} (ID: ${userId})`);
    return newUser;
  }

  public updateUserPreferences(
    userId: string,
    prefs: { preferredModel?: string; preferredRatio?: string; enhancePrompt?: boolean }
  ) {
    if (this.state.users[userId]) {
      if (prefs.preferredModel !== undefined) this.state.users[userId].preferredModel = prefs.preferredModel;
      if (prefs.preferredRatio !== undefined) this.state.users[userId].preferredRatio = prefs.preferredRatio;
      if (prefs.enhancePrompt !== undefined) this.state.users[userId].enhancePrompt = prefs.enhancePrompt;
      this.save();
    }
  }

  public toggleBan(userId: string, ban?: boolean): boolean {
    if (this.state.users[userId]) {
      this.state.users[userId].isBanned = ban !== undefined ? ban : !this.state.users[userId].isBanned;
      this.save();
      this.addLog('admin', `User ${userId} banned state set to: ${this.state.users[userId].isBanned}`);
      return this.state.users[userId].isBanned;
    }
    return false;
  }

  public toggleVip(userId: string, vip?: boolean): boolean {
    if (this.state.users[userId]) {
      this.state.users[userId].isVip = vip !== undefined ? vip : !this.state.users[userId].isVip;
      this.save();
      this.addLog('admin', `User ${userId} VIP status set to: ${this.state.users[userId].isVip}`);
      return this.state.users[userId].isVip;
    }
    return false;
  }

  public getAllUsers(): BotUser[] {
    return Object.values(this.state.users).sort((a, b) => b.lastActive - a.lastActive);
  }

  public addGeneration(gen: GenerationItem) {
    this.state.generations.unshift(gen);
    if (this.state.generations.length > 200) {
      this.state.generations = this.state.generations.slice(0, 200);
    }
    if (this.state.users[gen.userId]) {
      this.state.users[gen.userId].totalGenerations += 1;
      this.state.users[gen.userId].lastActive = Date.now();
    }
    this.save();
  }

  public getGenerations(limit = 60): GenerationItem[] {
    return this.state.generations.slice(0, limit);
  }

  public addLog(type: BotLog['type'], message: string, details?: any) {
    const log: BotLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      message,
      details,
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > 300) {
      this.state.logs = this.state.logs.slice(0, 300);
    }
    this.save();
  }

  public getLogs(limit = 100): BotLog[] {
    return this.state.logs.slice(0, limit);
  }

  public getStats() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const todayGens = this.state.generations.filter((g) => g.timestamp > oneDayAgo);
    const errors = this.state.logs.filter((l) => l.type === 'error' && l.timestamp > oneDayAgo);

    return {
      totalGenerations: this.state.generations.length,
      todayGenerations: todayGens.length,
      totalUsers: Object.keys(this.state.users).length,
      errorCount: errors.length,
      activeModel: this.state.config.defaultModel,
    };
  }
}

export const botStorage = new BotStorage();

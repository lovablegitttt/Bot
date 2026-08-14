export interface BotConfig {
  telegramToken: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  adminId: string;
  defaultModel: string;
  autoEnhancePrompt: boolean;
  maxDailyQuota: number;
  pollingEnabled: boolean;
  webhookUrl: string;
  isWebhookActive: boolean;
}

export interface BotStatus {
  isConfigured: boolean;
  telegramReady: boolean;
  botUsername?: string;
  botFirstName?: string;
  cloudflareReady: boolean;
  adminConfigured: boolean;
  pollingActive: boolean;
  webhookActive: boolean;
  totalGenerations: number;
  totalUsers: number;
  activeModel: string;
  todayGenerations: number;
  errorCount: number;
  config?: BotConfig & {
    hasTelegramToken?: boolean;
    hasCloudflareAccountId?: boolean;
    hasCloudflareApiToken?: boolean;
  };
}

export interface GenerationItem {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  model: string;
  aspectRatio: string;
  width: number;
  height: number;
  imageUrl: string;
  userId: string;
  username?: string;
  firstName?: string;
  timestamp: number;
  durationMs: number;
  seed?: number;
  stylePreset?: string;
  status: 'success' | 'failed' | 'generating';
  error?: string;
}

export interface BotUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  firstSeen: number;
  lastActive: number;
  totalGenerations: number;
  isBanned: boolean;
  isVip: boolean;
  preferredModel?: string;
  preferredRatio?: string;
  enhancePrompt?: boolean;
}

export interface BotLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'admin';
  message: string;
  details?: any;
}

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text?: string;
  imageUrl?: string;
  caption?: string;
  buttons?: TelegramInlineButton[][];
  timestamp: number;
  isLoading?: boolean;
  loadingStep?: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  speed: string;
  quality: string;
  description: string;
  recommendedAspectRatios: string[];
}

const path = require('node:path');

function integer(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const followupMinutes = [
  integer('FOLLOWUP_2H_MINUTES', 120, 1, 10080),
  integer('FOLLOWUP_24H_MINUTES', 1440, 1, 20160),
  integer('FOLLOWUP_72H_MINUTES', 4320, 1, 43200)
].sort((a, b) => a - b);

module.exports = {
  botName: process.env.BOT_NAME || 'Ana',
  productName: process.env.PRODUCT_NAME || 'Pequenos na Fé',
  productPrice: process.env.PRODUCT_PRICE || 'R$ 17,90',
  checkoutUrl:
    process.env.CHECKOUT_URL ||
    'https://pay.cakto.com.br/vm7zb4r_1083277',

  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',

  clientId: process.env.WHATSAPP_CLIENT_ID || 'pequenos-na-fe',
  sessionPath: path.resolve(process.env.SESSION_PATH || '.wwebjs_auth'),
  dataFile: path.resolve(process.env.DATA_FILE || 'data/state.json'),

  inboundWindowMs:
    integer('INBOUND_WINDOW_SECONDS', 60, 10, 3600) * 1000,
  inboundMaxMessages:
    integer('INBOUND_MAX_MESSAGES', 8, 2, 100),
  inboundBlockMs:
    integer('INBOUND_BLOCK_MINUTES', 5, 1, 1440) * 60 * 1000,
  inputDebounceMs:
    integer('INPUT_DEBOUNCE_SECONDS', 8, 1, 60) * 1000,

  outboundContactCooldownMs:
    integer('OUTBOUND_CONTACT_COOLDOWN_SECONDS', 25, 1, 3600) * 1000,
  outboundGlobalIntervalMs:
    integer('OUTBOUND_GLOBAL_INTERVAL_MS', 1500, 250, 60000),
  humanDelayMinMs:
    integer('HUMAN_DELAY_MIN_MS', 1800, 0, 60000),
  humanDelayMaxMs:
    integer('HUMAN_DELAY_MAX_MS', 4200, 0, 120000),

  followupStages: followupMinutes.map((minutes, index) => ({
    stage: index + 1,
    delayMs: minutes * 60 * 1000
  })),
  followupCheckMs:
    integer('FOLLOWUP_CHECK_SECONDS', 60, 10, 3600) * 1000,
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
  followupStartHour:
    integer('FOLLOWUP_START_HOUR', 8, 0, 23),
  followupEndHour:
    integer('FOLLOWUP_END_HOUR', 20, 1, 24)
};

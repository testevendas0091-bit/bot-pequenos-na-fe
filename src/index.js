require('dotenv').config();

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const config = require('./config');
const { Store } = require('./store');
const { AntiSpam } = require('./antiSpam');
const { SafeSender } = require('./sender');
const { FollowupService } = require('./followups');
const { generateReply } = require('./ai');

const store = new Store(config.dataFile);
const antiSpam = new AntiSpam(config);
const inputBuffers = new Map();
const processedIds = new Set();

let ready = false;
let shuttingDown = false;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: config.clientId,
    dataPath: config.sessionPath
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  }
});

const sender = new SafeSender(client, antiSpam, config);
const followups = new FollowupService({ store, sender, config });

function clean(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isPrivateUserMessage(message) {
  const from = String(message.from || '');
  return (
    !message.fromMe &&
    from.endsWith('@c.us') &&
    from !== 'status@broadcast' &&
    !from.endsWith('@g.us') &&
    !from.endsWith('@broadcast')
  );
}

function rememberMessage(id) {
  if (!id || processedIds.has(id)) return false;
  processedIds.add(id);
  if (processedIds.size > 1500) {
    const oldest = processedIds.values().next().value;
    processedIds.delete(oldest);
  }
  return true;
}

function isOptOut(text) {
  return /^(sair|parar|pare|cancelar|nao quero|remover)(\s|$)/.test(clean(text));
}

function isOptIn(text) {
  return /^(voltar|reativar|quero atendimento|quero continuar)(\s|$)/.test(clean(text));
}

function isConverted(text) {
  return /\b(ja comprei|acabei de comprar|pagamento feito|paguei)\b/.test(clean(text));
}

async function sendControlReply(chatId, text) {
  const result = await sender.send(chatId, text, {
    bypassContactCooldown: true
  });
  if (result.sent) store.registerBotReply(chatId, text, result.sentAt);
}

async function processBuffered(chatId) {
  const buffered = inputBuffers.get(chatId);
  if (!buffered) return;
  inputBuffers.delete(chatId);

  const text = buffered.messages.join('\n').slice(0, 3000);
  const contact = store.get(chatId);

  if (contact.optOut || contact.converted) return;
  const sequenceStartedAt = contact.sequenceStartedAt;

  const reply = await generateReply({
    text,
    history: contact.history,
    config
  });

  const result = await sender.send(chatId, reply, {
    beforeSend: () => {
      const current = store.get(chatId);
      return (
        !current.optOut &&
        !current.converted &&
        current.sequenceStartedAt === sequenceStartedAt
      );
    }
  });
  if (result.sent) {
    store.registerBotReply(chatId, reply, result.sentAt);
    console.log(`Resposta enviada para ${chatId}.`);
  } else {
    console.log(`Resposta evitada pelo antispam (${result.reason}) para ${chatId}.`);
  }
}

function bufferInput(chatId, text) {
  const current = inputBuffers.get(chatId) || {
    messages: [],
    timer: null
  };

  current.messages.push(text);
  clearTimeout(current.timer);
  current.timer = setTimeout(() => {
    processBuffered(chatId).catch((error) => {
      console.error('Erro ao responder contato:', error.message);
    });
  }, config.inputDebounceMs);

  inputBuffers.set(chatId, current);
}

client.on('qr', (qr) => {
  console.clear();
  console.log('Escaneie o QR Code abaixo no WhatsApp:');
  console.log('WhatsApp > Aparelhos conectados > Conectar um aparelho\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('WhatsApp autenticado. Preparando o atendimento...');
});

client.on('ready', () => {
  ready = true;
  console.log('✅ Bot Pequenos na Fé conectado e pronto.');
  console.log(
    config.openAiApiKey
      ? `IA ativa com o modelo ${config.openAiModel}.`
      : 'IA sem chave: usando respostas prontas seguras.'
  );
  followups.start();
});

client.on('auth_failure', (message) => {
  console.error('Falha de autenticação:', message);
});

client.on('disconnected', (reason) => {
  ready = false;
  followups.stop();
  console.error('WhatsApp desconectado:', reason);
  if (!shuttingDown) {
    console.error('Reinicie o programa para reconectar.');
  }
});

client.on('message', async (message) => {
  try {
    if (!ready || !isPrivateUserMessage(message)) return;

    const messageId = message.id?._serialized || message.id?.id;
    if (!rememberMessage(messageId)) return;

    const chatId = message.from;
    const body = String(message.body || '').trim();
    if (!body) return;

    // A mensagem recebida cancela imediatamente qualquer relógio antigo
    // de follow-up e inicia uma nova sequência a partir deste momento.
    store.registerInbound(chatId, body);

    if (isOptOut(body)) {
      store.setOptOut(chatId, true);
      await sendControlReply(
        chatId,
        'Tudo certo. Você não receberá mais mensagens automáticas. Se mudar de ideia, envie VOLTAR.'
      );
      return;
    }

    const contact = store.get(chatId);
    if (contact.optOut) {
      if (!isOptIn(body)) return;
      store.setOptOut(chatId, false);
      await sendControlReply(
        chatId,
        'Atendimento reativado 😊 Como posso ajudar sobre o Pequenos na Fé?'
      );
      return;
    }

    if (isConverted(body)) {
      store.setConverted(chatId, true);
      await sendControlReply(
        chatId,
        'Que alegria! Obrigada pela compra 😊 Os follow-ups foram encerrados. Se precisar de ajuda com o acesso, pode me chamar.'
      );
      return;
    }

    const decision = antiSpam.checkInbound(chatId);
    if (!decision.allowed) {
      console.log(`Entrada limitada para ${chatId}: ${decision.reason}.`);
      return;
    }

    bufferInput(chatId, body);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error.message);
  }
});

setInterval(() => antiSpam.cleanup(), 30 * 60 * 1000).unref?.();

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nEncerrando com ${signal}...`);
  followups.stop();
  for (const value of inputBuffers.values()) clearTimeout(value.timer);
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  console.error('Erro assíncrono não tratado:', error);
});

console.log('Iniciando o bot...');
client.initialize().catch((error) => {
  console.error('Não foi possível iniciar:', error.message);
  process.exitCode = 1;
});

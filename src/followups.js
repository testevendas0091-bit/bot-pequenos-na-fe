function currentHour(timezone, date = new Date()) {
  const hour = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false
  }).format(date);

  return Number.parseInt(hour, 10);
}

function isInsideSendWindow(config, date = new Date()) {
  const hour = currentHour(config.timezone, date);
  return (
    hour >= config.followupStartHour &&
    hour < config.followupEndHour
  );
}

function pickDueStage(contact, now, stages) {
  if (
    !contact ||
    contact.optOut ||
    contact.converted ||
    !contact.sequenceStartedAt
  ) {
    return null;
  }

  const elapsed = now - contact.sequenceStartedAt;
  const due = stages.filter(
    ({ stage, delayMs }) =>
      stage > (contact.followupStage || 0) && elapsed >= delayMs
  );

  // Se o programa ficou desligado por muito tempo, envia somente o estágio
  // mais recente devido. Assim nunca dispara várias mensagens de uma vez.
  return due.at(-1) || null;
}

function messageForStage(stage, config) {
  const checkout = config.checkoutUrl;

  const messages = {
    1:
      `Oi! 😊 Ficou alguma dúvida sobre o ${config.productName}? ` +
      `O material custa ${config.productPrice}, é digital e o acesso é enviado após a confirmação do pagamento. Posso te ajudar?`,
    2:
      `Passando para saber se você ainda quer conhecer as atividades bíblicas infantis do ${config.productName}. 📖✨ ` +
      `Se quiser garantir o material, este é o link seguro: ${checkout}`,
    3:
      `Última mensagem para não te incomodar 😊 Se ainda quiser o ${config.productName}, o acesso está aqui: ${checkout} ` +
      'Se não tiver interesse, é só responder SAIR.'
  };

  return messages[stage];
}

class FollowupService {
  constructor({ store, sender, config }) {
    this.store = store;
    this.sender = sender;
    this.config = config;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(
      () => this.run().catch((error) => {
        console.error('Erro ao verificar follow-ups:', error.message);
      }),
      this.config.followupCheckMs
    );
    this.timer.unref?.();
    this.run().catch(() => {});
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async run(now = Date.now()) {
    if (this.running || !isInsideSendWindow(this.config, new Date(now))) return;
    this.running = true;

    try {
      for (const [chatId, contact] of this.store.entries()) {
        const due = pickDueStage(contact, now, this.config.followupStages);
        if (!due) continue;

        const sequenceStartedAt = contact.sequenceStartedAt;
        const text = messageForStage(due.stage, this.config);
        const result = await this.sender.send(chatId, text, {
          beforeSend: () => {
            const current = this.store.get(chatId);
            return (
              !current.optOut &&
              !current.converted &&
              current.sequenceStartedAt === sequenceStartedAt &&
              current.followupStage < due.stage
            );
          }
        });

        if (result.sent) {
          this.store.registerFollowup(
            chatId,
            due.stage,
            text,
            result.sentAt
          );
          console.log(`Follow-up ${due.stage} enviado para ${chatId}.`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

module.exports = {
  FollowupService,
  currentHour,
  isInsideSendWindow,
  pickDueStage,
  messageForStage
};

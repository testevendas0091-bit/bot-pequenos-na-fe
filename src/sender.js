function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  const start = Math.min(min, max);
  const end = Math.max(min, max);
  return Math.floor(start + Math.random() * (end - start + 1));
}

class SafeSender {
  constructor(client, antiSpam, config) {
    this.client = client;
    this.antiSpam = antiSpam;
    this.config = config;
    this.queue = Promise.resolve();
    this.lastGlobalSendAt = 0;
  }

  send(chatId, text, options = {}) {
    const task = async () => {
      const now = Date.now();
      if (!options.bypassContactCooldown && !this.antiSpam.canSend(chatId, now)) {
        return { sent: false, reason: 'contact-cooldown' };
      }

      const globalWait = Math.max(
        0,
        this.config.outboundGlobalIntervalMs -
          (Date.now() - this.lastGlobalSendAt)
      );
      if (globalWait) await wait(globalWait);

      if (!options.skipHumanDelay) {
        await wait(
          randomBetween(
            this.config.humanDelayMinMs,
            this.config.humanDelayMaxMs
          )
        );
      }

      await this.client.sendMessage(chatId, text);
      const sentAt = Date.now();
      this.lastGlobalSendAt = sentAt;
      this.antiSpam.markSent(chatId, sentAt);
      return { sent: true, sentAt };
    };

    const result = this.queue.then(task, task);
    this.queue = result.catch((error) => {
      console.error('Falha na fila de envio:', error.message);
    });
    return result;
  }
}

module.exports = { SafeSender, wait };

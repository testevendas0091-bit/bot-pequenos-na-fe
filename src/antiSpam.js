class AntiSpam {
  constructor(config) {
    this.config = config;
    this.inbound = new Map();
    this.lastOutbound = new Map();
  }

  checkInbound(chatId, now = Date.now()) {
    const previous = this.inbound.get(chatId) || {
      timestamps: [],
      blockedUntil: 0
    };

    if (previous.blockedUntil > now) {
      return { allowed: false, reason: 'temporarily-blocked' };
    }

    const cutoff = now - this.config.inboundWindowMs;
    previous.timestamps = previous.timestamps.filter((time) => time > cutoff);
    previous.timestamps.push(now);

    if (previous.timestamps.length > this.config.inboundMaxMessages) {
      previous.blockedUntil = now + this.config.inboundBlockMs;
      previous.timestamps = [];
      this.inbound.set(chatId, previous);
      return { allowed: false, reason: 'rate-limit' };
    }

    this.inbound.set(chatId, previous);
    return { allowed: true };
  }

  canSend(chatId, now = Date.now()) {
    const lastSentAt = this.lastOutbound.get(chatId) || 0;
    return now - lastSentAt >= this.config.outboundContactCooldownMs;
  }

  markSent(chatId, now = Date.now()) {
    this.lastOutbound.set(chatId, now);
  }

  cleanup(now = Date.now()) {
    const staleBefore = now - Math.max(
      this.config.inboundWindowMs,
      this.config.inboundBlockMs
    ) * 2;

    for (const [chatId, value] of this.inbound.entries()) {
      const newest = value.timestamps.at(-1) || value.blockedUntil || 0;
      if (newest < staleBefore) this.inbound.delete(chatId);
    }

    for (const [chatId, lastSentAt] of this.lastOutbound.entries()) {
      if (lastSentAt < staleBefore) this.lastOutbound.delete(chatId);
    }
  }
}

module.exports = { AntiSpam };

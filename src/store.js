const fs = require('node:fs');
const path = require('node:path');

const EMPTY_STATE = { version: 1, contacts: {} };

function createContact() {
  return {
    optOut: false,
    converted: false,
    lastInboundAt: 0,
    lastBotReplyAt: 0,
    sequenceStartedAt: 0,
    followupStage: 0,
    lastFollowupAt: 0,
    history: []
  };
}

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) return structuredClone(EMPTY_STATE);
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!parsed || typeof parsed.contacts !== 'object') {
        throw new Error('Formato inválido');
      }
      return parsed;
    } catch (error) {
      const backup = `${this.filePath}.corrompido-${Date.now()}`;
      try {
        if (fs.existsSync(this.filePath)) fs.copyFileSync(this.filePath, backup);
      } catch {}
      console.error('Estado inválido; iniciando base nova.', error.message);
      return structuredClone(EMPTY_STATE);
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.state, null, 2));
    try {
      fs.renameSync(temporary, this.filePath);
    } catch {
      fs.copyFileSync(temporary, this.filePath);
      fs.unlinkSync(temporary);
    }
  }

  get(chatId) {
    if (!this.state.contacts[chatId]) {
      this.state.contacts[chatId] = createContact();
    }
    return this.state.contacts[chatId];
  }

  addHistory(chatId, role, content) {
    const contact = this.get(chatId);
    contact.history.push({
      role,
      content: String(content).slice(0, 1500),
      at: Date.now()
    });
    contact.history = contact.history.slice(-12);
  }

  registerInbound(chatId, text, at = Date.now()) {
    const contact = this.get(chatId);
    contact.lastInboundAt = at;
    contact.sequenceStartedAt = at;
    contact.followupStage = 0;
    contact.lastFollowupAt = 0;
    this.addHistory(chatId, 'user', text);
    this.save();
    return contact;
  }

  registerBotReply(chatId, text, at = Date.now()) {
    const contact = this.get(chatId);
    contact.lastBotReplyAt = at;
    this.addHistory(chatId, 'assistant', text);
    this.save();
  }

  registerFollowup(chatId, stage, text, at = Date.now()) {
    const contact = this.get(chatId);
    contact.followupStage = stage;
    contact.lastFollowupAt = at;
    contact.lastBotReplyAt = at;
    this.addHistory(chatId, 'assistant', text);
    this.save();
  }

  setOptOut(chatId, value = true) {
    const contact = this.get(chatId);
    contact.optOut = value;
    if (value) contact.sequenceStartedAt = 0;
    this.save();
  }

  setConverted(chatId, value = true) {
    const contact = this.get(chatId);
    contact.converted = value;
    if (value) contact.sequenceStartedAt = 0;
    this.save();
  }

  entries() {
    return Object.entries(this.state.contacts);
  }
}

module.exports = { Store, createContact };

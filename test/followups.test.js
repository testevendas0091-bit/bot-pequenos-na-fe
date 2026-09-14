const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isInsideSendWindow,
  pickDueStage,
  messageForStage
} = require('../src/followups');

const HOUR = 60 * 60 * 1000;
const stages = [
  { stage: 1, delayMs: 2 * HOUR },
  { stage: 2, delayMs: 24 * HOUR },
  { stage: 3, delayMs: 72 * HOUR }
];

function contact(overrides = {}) {
  return {
    optOut: false,
    converted: false,
    sequenceStartedAt: 1_000,
    followupStage: 0,
    ...overrides
  };
}

test('seleciona o estágio devido', () => {
  assert.equal(pickDueStage(contact(), 1_000 + HOUR, stages), null);
  assert.equal(pickDueStage(contact(), 1_000 + 2 * HOUR, stages).stage, 1);
  assert.equal(
    pickDueStage(contact({ followupStage: 1 }), 1_000 + 24 * HOUR, stages).stage,
    2
  );
});

test('se o bot ficou desligado, não empilha três mensagens', () => {
  assert.equal(
    pickDueStage(contact(), 1_000 + 80 * HOUR, stages).stage,
    3
  );
});

test('não agenda para opt-out ou cliente convertido', () => {
  assert.equal(pickDueStage(contact({ optOut: true }), 1_000 + 80 * HOUR, stages), null);
  assert.equal(pickDueStage(contact({ converted: true }), 1_000 + 80 * HOUR, stages), null);
});

test('respeita a janela de horário', () => {
  const config = {
    timezone: 'UTC',
    followupStartHour: 8,
    followupEndHour: 20
  };
  assert.equal(isInsideSendWindow(config, new Date('2026-01-01T10:00:00Z')), true);
  assert.equal(isInsideSendWindow(config, new Date('2026-01-01T22:00:00Z')), false);
});

test('mensagens comerciais usam os dados configurados', () => {
  const text = messageForStage(2, {
    productName: 'Pequenos na Fé',
    productPrice: 'R$ 17,90',
    checkoutUrl: 'https://exemplo.test/checkout'
  });
  assert.match(text, /Pequenos na Fé/);
  assert.match(text, /https:\/\/exemplo\.test\/checkout/);
});

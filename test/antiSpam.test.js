const test = require('node:test');
const assert = require('node:assert/strict');

const { AntiSpam } = require('../src/antiSpam');

function config() {
  return {
    inboundWindowMs: 60_000,
    inboundMaxMessages: 2,
    inboundBlockMs: 300_000,
    outboundContactCooldownMs: 25_000
  };
}

test('limita excesso de mensagens recebidas por contato', () => {
  const guard = new AntiSpam(config());

  assert.equal(guard.checkInbound('a', 1).allowed, true);
  assert.equal(guard.checkInbound('a', 2).allowed, true);
  assert.equal(guard.checkInbound('a', 3).allowed, false);
  assert.equal(guard.checkInbound('a', 10_000).reason, 'temporarily-blocked');
  assert.equal(guard.checkInbound('a', 300_004).allowed, true);
});

test('aplica intervalo entre envios para o mesmo contato', () => {
  const guard = new AntiSpam(config());

  assert.equal(guard.canSend('a', 10_000), false);
  guard.markSent('a', 10_000);
  assert.equal(guard.canSend('a', 20_000), false);
  assert.equal(guard.canSend('a', 35_000), true);
});

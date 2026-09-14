const test = require('node:test');
const assert = require('node:assert/strict');

const { fallbackReply, extractResponseText } = require('../src/ai');

const config = {
  botName: 'Ana',
  productName: 'Pequenos na Fé',
  productPrice: 'R$ 17,90',
  checkoutUrl: 'https://exemplo.test/checkout'
};

test('resposta pronta de preço contém valor e checkout', () => {
  const reply = fallbackReply('Qual o valor?', config);
  assert.match(reply, /R\$ 17,90/);
  assert.match(reply, /https:\/\/exemplo\.test\/checkout/);
});

test('extrai texto do formato da Responses API', () => {
  assert.equal(
    extractResponseText({
      output: [{ content: [{ type: 'output_text', text: 'Olá!' }] }]
    }),
    'Olá!'
  );
});

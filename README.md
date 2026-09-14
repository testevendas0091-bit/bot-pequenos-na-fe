# Bot Pequenos na Fé — WhatsApp com QR Code

Bot de atendimento para o **Pequenos na Fé**, conectado ao WhatsApp por QR Code. Ele responde somente pessoas que chamam no privado, oferece o checkout quando existe interesse e faz follow-ups controlados em 2h, 24h e 72h.

## O que já está pronto

- Conexão pelo QR Code do WhatsApp, sem API da Meta.
- Sessão salva: normalmente o QR aparece apenas na primeira conexão.
- Respostas com IA quando uma chave OpenAI é configurada.
- Respostas prontas de segurança quando não há chave ou a IA fica indisponível.
- Link de pagamento configurado: <https://pay.cakto.com.br/vm7zb4r_1083277>.
- Preço configurado: **R$ 17,90**.
- Follow-ups persistentes de 2h, 24h e 72h.
- Follow-ups somente entre 08:00 e 20:00 no horário de São Paulo.
- Comando **SAIR** para bloquear mensagens automáticas.
- Frases como **JÁ COMPREI** ou **PAGUEI** encerram os follow-ups.
- Ignora grupos, status, listas de transmissão, mensagens do próprio número e mensagens duplicadas.
- Agrupa mensagens próximas antes de responder.
- Limites por contato, intervalo global e atraso natural antes dos envios.
- Estado salvo em arquivo: reiniciar o programa não recria follow-ups já enviados.
- Testes automáticos no GitHub.

## Aviso importante

Esta conexão usa o WhatsApp Web por uma biblioteca não oficial. Ela é mais simples que a API da Meta, mas pode desconectar quando o WhatsApp muda e não elimina o risco de restrição da conta. Use apenas com contatos que iniciaram a conversa ou autorizaram o atendimento; não use para disparos frios ou listas compradas.

## Instalação fácil no Windows

### 1. Instale o Node.js

Instale o **Node.js 20 ou superior** pelo site oficial:

<https://nodejs.org/>

Durante a instalação, pode deixar as opções padrão marcadas.

### 2. Baixe o projeto

Na página deste repositório:

1. Clique em **Code**.
2. Clique em **Download ZIP**.
3. Extraia o ZIP para uma pasta comum, como a Área de Trabalho.

### 3. Inicie

Dê dois cliques em:

`instalar-e-iniciar.bat`

O arquivo instala as dependências, cria a configuração inicial e inicia o bot.

### 4. Leia o QR Code

No celular usado para atendimento:

1. Abra o WhatsApp.
2. Entre em **Aparelhos conectados**.
3. Toque em **Conectar um aparelho**.
4. Escaneie o QR Code mostrado na janela preta do computador.

Quando aparecer **Bot Pequenos na Fé conectado e pronto**, ele já estará atendendo.

## Ativar as respostas com IA

O bot funciona sem IA, usando respostas prontas. Para ativar respostas mais flexíveis:

1. Abra o arquivo `.env` criado na pasta do projeto.
2. Preencha somente esta linha:

```env
OPENAI_API_KEY=sua_chave_aqui
```

3. Salve e reinicie o bot.

Nunca publique o arquivo `.env` nem envie sua chave para outra pessoa. Ele já está bloqueado pelo `.gitignore`.

## Como os follow-ups funcionam

Os três horários são contados a partir da **última mensagem recebida do cliente**:

| Estágio | Horário padrão | Ação |
| --- | ---: | --- |
| 1 | 2 horas | Pergunta se ficou alguma dúvida |
| 2 | 24 horas | Relembra o material e apresenta o checkout |
| 3 | 72 horas | Último contato e informa o comando SAIR |

Proteções adicionais:

- Uma nova mensagem do cliente cancela o relógio antigo e inicia uma nova sequência.
- **SAIR**, **PARAR**, **CANCELAR** ou **NÃO QUERO** desativam a automação para o contato.
- **VOLTAR** reativa o atendimento.
- **JÁ COMPREI**, **PAGUEI** ou **PAGAMENTO FEITO** encerram a sequência.
- Se o computador ficar desligado até mais de um estágio vencer, o bot envia somente o estágio mais recente, nunca os três juntos.
- Fora da janela de 08:00–20:00, o envio aguarda o próximo horário permitido.

## Testar os follow-ups rapidamente

No arquivo `.env`, troque temporariamente:

```env
FOLLOWUP_2H_MINUTES=1
FOLLOWUP_24H_MINUTES=2
FOLLOWUP_72H_MINUTES=3
FOLLOWUP_CHECK_SECONDS=10
```

Assim, os testes acontecerão em 1, 2 e 3 minutos. Depois, restaure os valores do arquivo `.env.example`.

## Personalização

As opções ficam no arquivo `.env`. Você pode mudar nome da atendente, preço, checkout, horários e limites sem alterar o código.

Para trocar os textos dos follow-ups, edite `src/followups.js`.

## Manter funcionando

O computador precisa continuar ligado, conectado à internet e com a janela do bot aberta. Para parar com segurança, pressione **Ctrl + C**.

Na próxima inicialização, use novamente `instalar-e-iniciar.bat`. A sessão salva será reutilizada.

## Se o QR Code não aparecer

Se já houve uma conexão anterior, isso é normal: a sessão foi salva.

Para vincular outro número:

1. Pare o programa com **Ctrl + C**.
2. Apague a pasta `.wwebjs_auth`.
3. Inicie novamente.

Um novo QR Code será exibido.

## Desenvolvimento

```bash
npm install
npm start
npm test
```

O projeto requer Node.js 20 ou superior.

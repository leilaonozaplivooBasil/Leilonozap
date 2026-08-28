# Deploy — whatsapp-router (Z-API)

## 1. Login e link com o projeto

```bash
supabase login
supabase link --project-ref gezvviyegtxytnwjkrjv
```

## 2. Cadastrar os secrets

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente em toda Edge
Function do projeto — não precisa cadastrar. Os que faltam:

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  ZAPI_BASE_URL=https://api.z-api.io \
  ZAPI_INSTANCE_ID=seu_instance_id \
  ZAPI_TOKEN=seu_token_da_instancia \
  ZAPI_CLIENT_TOKEN=cole_aqui_o_token_de_seguranca_da_conta \
  ADMIN_PHONE_NUMBERS=5521960142766,5521982795387 \
  WEBHOOK_SECRET=8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808
```

- `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN`: painel Z-API → Instâncias → sua instância.
- `ZAPI_CLIENT_TOKEN`: painel Z-API → Segurança → "Token de segurança da conta" → ícone
  de copiar (o painel mostra mascarado, tipo `Fea***` — copie o valor completo de lá,
  não do que aparece na tela).
- `ADMIN_PHONE_NUMBERS` (aceita `ADMIN_PHONE_NUMBER` singular também, por compatibilidade):
  um ou mais números com DDI, só dígitos, **separados por vírgula sem espaço** — decide quem
  vira Heloim ao falar 1:1, e quem pode aprovar/rejeitar solicitação em grupo. Exemplo acima:
  Luiz (`21 96014-2766`) e Ávila (`21 98279-5387`). Sem essa variável, ninguém vira Heloim,
  todo mundo cai no Zeca.
- `WEBHOOK_SECRET`: reaproveitei o mesmo valor gerado na etapa da Evolution API
  (`8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808`) — troque se preferir gerar um novo.
- `EXECUTIVO_VENDEDOR_PHONE` (opcional): número do executivo que recebe os leads de "quero
  ser vendedor" vindos de anúncio (Zeca encaminha automático). Sem configurar, usa o número
  do João Paim (`21984942730`) como padrão — só precisa desse secret se for trocar.
- `OPENAI_API_KEY` (**na prática, obrigatória**): habilita transcrição de áudio de verdade
  (Whisper — mesmo serviço que já era usado no Base44). Sem essa chave, o Zeca continua
  funcionando, só que sem entender o CONTEÚDO de mensagens de voz (reconhece que recebeu
  áudio e pede resumo por texto) — e **em grupo ele fica mudo**, porque lá ele só fala quando
  é chamado e sem transcrição não existe texto pra reconhecer o chamado. Gera em
  https://platform.openai.com/api-keys — custo é por minuto de áudio, bem barato (~R$0,03/min
  na tabela pública da OpenAI em 2026).
  **Como conferir se está valendo:** Logs da function → procure
  `OPENAI_API_KEY não está configurada`. Se essa linha aparece, é só isso; configure e pronto.
  Se em vez dela aparecer `transcrevendo áudio: N bytes`, a chave está OK e o problema (se
  houver) é outro — a linha seguinte diz qual (`Whisper recusou a transcrição`, `falha ao
  baixar áudio do Z-API`).
- `GRUPOS_HELOIM_IDS` (opcional): IDs de grupo de WhatsApp onde a Heloim participa, separados
  por vírgula (formato Z-API, tipo `120363019502650977-group`). Sem essa variável, Heloim
  continua funcionando só 1:1 com os admins — não responde em grupo nenhum. **Como descobrir
  o ID certo:** ver seção 6 abaixo (`waGroupDiagZapi`).
  Desde 27/08/2026 a comparação é por DÍGITOS: `120363019502650977-group`,
  `120363019502650977@g.us` e `120363019502650977` valem todos como o mesmo grupo. Antes era
  string exata, e colar o ID no formato "errado" deixava o bot mudo no grupo inteiro sem
  nenhum log (grupo não autorizado é descartado de propósito antes de qualquer registro).
- `SLACK_BOT_TOKEN` (novo, 28/08/2026, **preferido**): Token OAuth do Slack Bot. Habilita:
  - Postar em **qualquer canal** autorizado (não só webhook fixo)
  - **Editar mensagens** já postadas
  - **Deletar mensagens**
  - Ler histórico de canais
  - Gerenciar reações (emoji)
  - Zeca/Heloim acessam tudo via tool `postar_no_slack` (ações: postar/editar/deletar)

  **Setup (primeira vez):**
  1. Abra https://api.slack.com/apps → **Create New App** → *From scratch* → nome (ex. `Heloim`)
     → escolha o workspace `leilonozap`.
  2. Menu **OAuth & Permissions** → seção **Scopes** → **Bot Token Scopes** → adicione:
     - `chat:write` — postar mensagens
     - `chat:write.public` — postar em canais públicos
     - `conversations:history` — ler histórico
     - `conversations:info` — info de canal
     - `conversations:list` — listar canais
     - `users:read` — info de usuário
     - `reactions:write` — adicionar reações (opcional)
  3. Topo da página: **Install to Workspace** → autorizar.
  4. Copie o **Bot User OAuth Token** (começa com `xoxb-...`).
     🔒 É uma chave — não cole em chat, print, commit, screenshot.
  5. No terminal:
     ```bash
     supabase secrets set SLACK_BOT_TOKEN="xoxb-..." --project-ref gezvviyegtxytnwjkrjv
     supabase functions deploy whatsapp-router --project-ref gezvviyegtxytnwjkrjv --no-verify-jwt
     ```
  6. **Invite o bot** nos canais onde vai postar/gerenciar:
     - Abra cada canal no Slack → `/invite @Heloim` (ou o nome que deu ao app)
     - Pronto — agora o bot consegue postar lá.
  7. Confira: no WhatsApp, mande **"Heloim, postar no slack"** no 1:1 (precisa ser admin).
     Ela pede qual canal e o que escrever, depois publica usando a ferramenta `postar_no_slack`.

- `SLACK_WEBHOOK_URL` (opcional, **legado**, mantido para compatibilidade): Incoming Webhook.
  Se `SLACK_BOT_TOKEN` não estiver configurado, o código tenta webhook como fallback.
  **Você deve preferir Bot Token** — webhook é limitado (só postagem simples, um canal fixo, sem edição).

  **Setup (só se não tiver Bot Token, ou para fallback de emergência):**
  1. Abra https://api.slack.com/apps → **Create New App** → *From scratch* → nome (ex.
     `Heloim-webhook`) → escolha o workspace `leilonozap`.
  2. Menu **Incoming Webhooks** → ligue o botão **Activate Incoming Webhooks**.
  3. **Add New Webhook to Workspace** → escolha o canal `#top-tech-digital` (ou outro).
     ⚠️ Se o canal for **privado**, entre nele primeiro e rode `/invite @Heloim`.
  4. Copie a URL gerada (começa com `https://hooks.slack.com/services/...`).
     🔒 É uma chave — quem tiver ela posta no canal. Não cole em chat nem em print.
  5. No terminal, na pasta do projeto:

     ```powershell
     supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." --project-ref gezvviyegtxytnwjkrjv
     supabase functions deploy whatsapp-router --project-ref gezvviyegtxytnwjkrjv --no-verify-jwt
     ```

  6. Confira: no WhatsApp, mande **"Heloim, testa o Slack"** no 1:1 (precisa ser admin).
     Ela usa a ferramenta `checar_slack`, publica uma mensagem de teste e devolve a resposta.

## 3. Deploy — SEM verificação de JWT

O Z-API não manda `Authorization: Bearer` nenhum. Com a verificação de JWT ligada (o
padrão do Supabase), toda chamada dele leva 401 antes deste código rodar:

```bash
supabase functions deploy whatsapp-router --no-verify-jwt
```

## 4. Configurar o webhook no painel do Z-API

Diferente da Evolution API, aqui não é por `curl` — é pela interface web:

1. Painel Z-API → sua instância → aba **Webhooks** (ou "Configurações" dependendo da
   versão da UI).
2. No campo **"Ao receber"** (o evento de mensagem recebida — não confundir com "Ao
   enviar", "Status da mensagem" ou "Ao conectar/desconectar", que têm campos de URL
   próprios e não devem apontar pra esta function), cole:

```
https://gezvviyegtxytnwjkrjv.supabase.co/functions/v1/whatsapp-router?secret=8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808
```

O segredo vai na própria URL (query string) porque o painel do Z-API normalmente não
deixa configurar headers customizados no webhook — só o campo de URL mesmo.

## 5. Testar sem depender do WhatsApp de verdade

```bash
curl -X POST "https://gezvviyegtxytnwjkrjv.supabase.co/functions/v1/whatsapp-router?secret=8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "fromMe": false,
    "isGroup": false,
    "text": { "message": "oi, como funciona o leilão?" }
  }'
```

Resposta esperada: `{"success":true}` no curl, e a mensagem de verdade chegando no
WhatsApp de quem você testar — prova que o caminho completo (roteamento → Claude →
Z-API) está fechado.

## ⚠️ Se a mensagem não chegar (a parte que exige atenção)

O formato exato do campo de texto no payload do Z-API **não está 100% confirmado** — o
código tenta `text.message`, depois `body`, depois `message`/`message.text`, nessa
ordem. Se depois de mandar uma mensagem de verdade pro número do bot ela não gerar
resposta nenhuma:

1. Vá em Supabase Dashboard → Edge Functions → `whatsapp-router` → Logs.
2. Procure a linha `payload sem texto/áudio/imagem/documento reconhecido` — ela mostra o
   JSON bruto que o Z-API mandou de verdade.
3. Me manda esse JSON (ou o campo que tem o texto da mensagem) que eu ajusto
   `extrairMensagem()` no `index.ts` em minutos.

Mesma ressalva vale pros campos `image`/`document` — se um cliente mandar imagem/documento
e o Zeca não reagir nada, é o mesmo processo: olha o log, me manda o JSON.

`audio` foi conferido na documentação oficial do Z-API em 27/08/2026 e está certo:
`audio.audioUrl` (URL) e `audio.mimeType` (normalmente `audio/ogg; codecs=opus`). Se mesmo
assim o áudio não for entendido, a causa está no log da function, não no nome do campo.

Mesma ressalva vale pro campo `participantPhone` (quem escreveu DENTRO de um grupo — o campo
`phone` em mensagem de grupo é o ID do GRUPO, não da pessoa). Se a Heloim não responder nada
num grupo que já está em `GRUPOS_HELOIM_IDS`, é sinal de que `participantPhone` veio com outro
nome — mesmo processo de sempre: olha o log, me manda o JSON.

## 6. Descobrir o ID dos grupos onde a Heloim vai atuar

O Z-API não tem painel visual pra listar ID de grupo — por isso existe
`api/functions/waGroupDiagZapi.js` (deploy separado, é Vercel/Node, não Supabase — já vai
junto do próximo deploy normal do site). Chame com a mesma `DIAG_KEY` que já existe:

```bash
curl -X POST "https://SEU-DOMINIO-VERCEL/api/functions/waGroupDiagZapi" \
  -H "Content-Type: application/json" \
  -d '{"key": "SUA_DIAG_KEY"}'
```

Resposta: lista de grupos que o número do bot já participa, com `id` (o que copiar pra
`GRUPOS_HELOIM_IDS`) e `nome`. Adicione o bot no grupo "DIGITAL. (TOP TECH DIGITAL)" (ou
outro que quiser que a Heloim atenda) antes de rodar — só aparece grupo que ele já é membro.

Se o Zeca RECONHECER que recebeu áudio mas continuar pedindo pra repetir por texto mesmo com
`OPENAI_API_KEY` configurada, procure no log, nesta ordem:
`chegou áudio mas nenhuma URL reconhecida` (o campo mudou de nome — me manda o `body.audio`),
`falha ao baixar áudio do Z-API` (link expirado: mídia do Z-API vale 30 dias),
`Whisper recusou a transcrição` (o corpo do erro vem junto na mesma linha).

## 7. "Ele parou de responder no grupo" — o que conferir (27/08/2026)

No grupo o bot só fala quando é CHAMADO. São quatro formas, e até 27/08 só a primeira
funcionava de verdade:

| Forma | Como está hoje |
|---|---|
| Escrever o nome dele | Funciona. Vale **"Heloim" e "Zeca"** — antes só "heloim", e o time chama de Zeca |
| @marcar o número dele | Corrigido: lê o `@5521984072064` escrito no texto (o Z-API **não tem** campo de menção) |
| Responder (reply) uma mensagem dele | Corrigido: usa `referenceMessageId` + a tabela `wa_mensagens_bot` |
| Já estar conversando (últimos 5 min) | Funciona |

Se ainda assim ficar mudo, é uma destas três, nesta ordem:

1. O grupo não está em `GRUPOS_HELOIM_IDS` (rode o `waGroupDiagZapi` da seção 6 e confira).
2. `OPENAI_API_KEY` não configurada **e** as mensagens do grupo são por áudio — sem
   transcrição não sobra texto pro bot reconhecer que foi chamado.
3. `ZAPI_NUMERO_BOT` com o número errado (só afeta a @marcação; o nome escrito continua
   funcionando).

A tabela `wa_mensagens_bot` vem da migração `20260827_wa_mensagens_bot.sql` — **rode a
migração antes do deploy**, senão o reply continua não acordando ele (o resto funciona
normalmente; a consulta falha calada de propósito).

Mesma lógica vale se o envio falhar com 401/403 — provavelmente `ZAPI_CLIENT_TOKEN`
errado ou ausente (com a segurança de conta ativada, é obrigatório).

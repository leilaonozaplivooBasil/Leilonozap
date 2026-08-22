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
  ADMIN_PHONE_NUMBER=5511999999999 \
  WEBHOOK_SECRET=8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808
```

- `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN`: painel Z-API → Instâncias → sua instância.
- `ZAPI_CLIENT_TOKEN`: painel Z-API → Segurança → "Token de segurança da conta" → ícone
  de copiar (o painel mostra mascarado, tipo `Fea***` — copie o valor completo de lá,
  não do que aparece na tela).
- `ADMIN_PHONE_NUMBER`: seu número pessoal, com DDI, só dígitos — decide quando VOCÊ
  escreve pro número do bot e cai na Heloim. Pode deixar de fora por enquanto pra focar só
  no Zeca: sem essa variável, ninguém vira Heloim, todo mundo cai no Zeca.
- `WEBHOOK_SECRET`: reaproveitei o mesmo valor gerado na etapa da Evolution API
  (`8e2fdf2d2a026e7dd3cd7e86b1a0d24a0f5aa27af0985808`) — troque se preferir gerar um novo.
- `EXECUTIVO_VENDEDOR_PHONE` (opcional): número do executivo que recebe os leads de "quero
  ser vendedor" vindos de anúncio (Zeca encaminha automático). Sem configurar, usa o número
  do João Paim (`21984942730`) como padrão — só precisa desse secret se for trocar.
- `OPENAI_API_KEY` (opcional): habilita transcrição de áudio de verdade (Whisper — mesmo
  serviço que já era usado no Base44). Sem essa chave, o Zeca continua funcionando, só que
  sem entender o CONTEÚDO de mensagens de voz (reconhece que recebeu áudio e pede resumo por
  texto). Gera em https://platform.openai.com/api-keys — custo é por minuto de áudio, bem
  barato (~R$0,03/min na tabela pública da OpenAI em 2026).

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

Mesma ressalva vale pros campos `audio`/`image`/`document` (22/08/2026, ainda não testados
com payload real do Z-API) — se um cliente mandar áudio/imagem/documento e o Zeca não reagir
nada, é o mesmo processo: olha o log, me manda o JSON.

Se o Zeca RECONHECER que recebeu áudio mas continuar pedindo pra repetir por texto mesmo com
`OPENAI_API_KEY` configurada, o campo de URL do áudio dentro de `body.audio` (tentamos
`audioUrl`/`url`/`audioURL`) também pode não bater com o nome real do Z-API — procure a linha
`falha ao baixar áudio do Z-API` ou `falha ao transcrever áudio` no log, e me manda o JSON de
`body.audio` de novo.

Mesma lógica vale se o envio falhar com 401/403 — provavelmente `ZAPI_CLIENT_TOKEN`
errado ou ausente (com a segurança de conta ativada, é obrigatório).

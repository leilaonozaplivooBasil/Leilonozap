# Deploy — whatsapp-router

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
  EVOLUTION_API_URL=https://evo.seudominio.com \
  EVOLUTION_API_KEY=sua_chave_global_da_evolution \
  EVOLUTION_INSTANCE_NAME=nome_da_instancia \
  ADMIN_PHONE_NUMBER=5511999999999 \
  WEBHOOK_SECRET=um_segredo_forte_qualquer
```

`WEBHOOK_SECRET` é opcional — sem ele a function processa qualquer webhook que chegar
(loga um aviso). Recomendo configurar antes de apontar o webhook de verdade.

## 3. Deploy — SEM verificação de JWT

A Evolution API não manda `Authorization: Bearer` nenhum. Com a verificação de JWT
ligada (o padrão do Supabase), toda chamada dela leva 401 antes deste código rodar:

```bash
supabase functions deploy whatsapp-router --no-verify-jwt
```

## 4. URL pública para o painel do Webhook da Evolution API

```
https://gezvviyegtxytnwjkrjv.supabase.co/functions/v1/whatsapp-router
```

Se configurou `WEBHOOK_SECRET`, mande também o header `webhook-secret: um_segredo_forte_qualquer`
na configuração do webhook (o painel da Evolution API permite headers customizados na
config do webhook da instância — se a versão que você está usando não tiver esse campo,
me avise que ajusto a function pra aceitar o segredo via query string em vez de header).

## 5. Testar sem depender do WhatsApp de verdade

```bash
curl -X POST https://gezvviyegtxytnwjkrjv.supabase.co/functions/v1/whatsapp-router \
  -H "Content-Type: application/json" \
  -H "webhook-secret: um_segredo_forte_qualquer" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false },
      "message": { "conversation": "oi, como funciona o leilão?" }
    }
  }'
```

Resposta esperada: `{"success":true}` no curl, e a mensagem de verdade chegando no
WhatsApp do número configurado em `ADMIN_PHONE_NUMBER` (ou de quem você testar) — prova
que o caminho completo (roteamento → Claude → Evolution API) está fechado.

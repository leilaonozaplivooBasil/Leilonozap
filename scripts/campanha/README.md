# Campanha — disparo de e-mail e SMS

Ferramenta para avisar a base quando um leilão está fechando. Três arquivos de
regra (testados), dois comandos e um link de descadastro.

```
publico.mjs    quem pode receber  (regra pura, sem banco — tests/campanhaPublico.test.mjs)
modelo.mjs     o texto da mensagem (regra pura, sem banco — tests/campanhaModelo.test.mjs)
listar.mjs     comando: monta a lista a partir do banco
disparar.mjs   comando: manda pela Brevo
```

---

## Antes da primeira vez

**1. Suba a migração do descadastro.**
`supabase/migrations/20260911233000_marketing_descadastro.sql`. Sem ela o `listar.mjs`
avisa e segue, mas aí ninguém consegue sair da lista — e é isso que vira denúncia
de spam. Não dispare sem essa tabela no ar.

**2. Crie a caixa `ofertas@leilaonozap.com` na Brevo.**
O código de login sai por `no-reply@leilaonozap.com` (veja `api/functions/sendEmailCode.js`).
Campanha e código de acesso **não podem** dividir o mesmo remetente: se a campanha
levar reclamação, quem para de chegar é o código — e ninguém mais entra na plataforma
para dar lance.

**3. Confira as variáveis de ambiente:**

| variável | para quê |
|---|---|
| `SUPABASE_URL` (ou `VITE_SUPABASE_URL`) | ler contatos e leilões |
| `SUPABASE_SERVICE_ROLE_KEY` | idem, e assinar o link de descadastro |
| `BREVO_API_KEY` | mandar e-mail e SMS |
| `CAMPANHA_SECRET` | opcional; se faltar, usa a service role |

---

## Como disparar

```bash
# 1. monta a lista (não envia nada)
node scripts/campanha/listar.mjs

# 2. ensaio: mostra o plano e grava saida/previa.html — abra no navegador
node scripts/campanha/disparar.mjs

# 3. um e-mail só, para você, e abra no CELULAR antes de liberar
node scripts/campanha/disparar.mjs --teste=voce@exemplo.com --enviar

# 4. o disparo, em lotes
node scripts/campanha/disparar.mjs --canal=email --lote=100 --enviar
```

### Opções do `disparar.mjs`

| opção | o que faz | padrão |
|---|---|---|
| *(nenhuma)* | ensaio: não envia, só gera a prévia | — |
| `--enviar` | manda de verdade | desligado |
| `--lote=N` | **obrigatório** no envio real; teto de destinatários | — |
| `--canal=` | `email`, `sms` ou `ambos` | `email` |
| `--por-minuto=` | ritmo | 60 |
| `--teste=email` | manda só para esse endereço | — |

### As três travas

1. **Sem `--enviar`, nada sai.** O padrão é ensaio.
2. **Sem `--lote=N`, o envio real nem começa.** Ninguém dispara 677 e-mails por
   engano com uma seta pra cima no terminal.
3. **Quem já recebeu não recebe de novo.** Fica gravado em `saida/enviados.jsonl`.
   Rodar o mesmo comando duas vezes continua de onde parou.

---

## Sobre o SMS

O `disparar.mjs` pergunta à Brevo quanto crédito de SMS existe **antes** de tentar
mandar. Se não tiver crédito para todo mundo, ele avisa e pula o SMS em vez de
mandar pela metade.

Para SMS no Brasil pela Brevo é preciso: comprar crédito e registrar o remetente
(`LeilaoNoZap`). Enquanto isso não estiver feito, use `--canal=email`.

**A mensagem cabe em 160 caracteres e sai sem acento** — não é descuido. O alfabeto
do SMS (GSM-7) tem `à` e `é`, mas não tem `ã`, `õ` nem `ç`. Uma dessas letras muda a
codificação da mensagem inteira e o limite cai de 160 para **70** caracteres, ou
seja, cada SMS viraria três — cobrados. Por isso `modelo.mjs` tira todo acento e
encolhe o texto nesta ordem: encurta o nome do produto → tira a saudação → tira o
nome do produto. O link nunca sai.

---

## Melhor horário para disparar

Tem medição real no `CLAUDE.md`, das últimas 30 dias de uso da plataforma:

| horário (BRT) | movimento |
|---|---|
| **03h00 – 06h00** | **pico do dia** — 39 pessoas às 3h |
| 21h00 – 23h00 | segundo pico |
| 09h00 – 17h00 | leilões fechando |
| 01h00 – 02h15 | ninguém |

Disparo de campanha quer o oposto da janela de deploy: mande **perto do pico**, não
longe dele. Quando o leilão fecha durante o dia, porém, manda na hora — de nada
adianta chegar bem entregue depois que o cronômetro zerou.

---

## O que a ferramenta NÃO faz

- **Não manda para quem não pode.** Sintéticos do concurso, contas de QA, domínio
  digitado errado e endereço quebrado ficam de fora — a regra está em `publico.mjs`
  e cada caso tem teste.
- **Não usa o endpoint do código de login.** Remetente separado, de propósito.
- **Não manda sem link de saída.** Todo e-mail leva o link no rodapé e o cabeçalho
  `List-Unsubscribe`, que é o que faz o Gmail mostrar o botão nativo de cancelar.

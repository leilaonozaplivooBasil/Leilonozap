# Avisos por WhatsApp e SMS (Brevo): como ligar

Criado em 29/09/2026. Textos aprovados pelo dono em 29/09 ("textos ok").

O código já está no ar (`api/_lib/avisosPorMensagem.js` e `api/_lib/textosDasMensagens.js`), mas não envia nada até as variáveis abaixo existirem na Vercel. Enquanto isso, os avisos continuam indo por e-mail e pelo sino.

## Os 5 avisos

| Aviso | Tipo no código | Modelo na Brevo |
|---|---|---|
| ⚡ Cobriram seu lance | `superado` | lance_coberto |
| ⏰ Última hora do leilão | `ultima_hora` | ultima_hora |
| 🏆 Você arrematou | `arrematou` | arrematou |
| ⏳ PIX não pago | `pix_pendente` | pix_pendente |
| 🚚 Pedido a caminho | `compra_enviada` | pedido_a_caminho |

Regras que já estão no código:
- Tenta o WhatsApp primeiro. Se não houver modelo aprovado para o aviso, ou se o WhatsApp recusar, manda SMS.
- Só vai para celular válido. Telefone fixo não recebe.
- Respeita a preferência de avisos da pessoa (a mesma do e-mail).
- Nada sai entre 22h e 8h (horário de Brasília).
- Cada aviso sai uma vez. "Cobriram seu lance" sai no máximo a cada 30 min por leilão.
- Cada envio fica registrado em `mensagens_enviadas`, com canal, id da Brevo e erro.

## Passo 1: SMS (não precisa de número novo)

1. Na Brevo, compre créditos de SMS e anote o preço por SMS para o Brasil.
2. Na Vercel, crie a variável `BREVO_SMS_REMETENTE=NOZAP` em Production.
3. Faça um redeploy.

Pronto: os 5 avisos passam a sair por SMS. Quando o WhatsApp entrar, o SMS vira a reserva.

## Passo 2: WhatsApp oficial (quando houver o número novo)

1. O número precisa ser **novo**: não pode estar instalado no aplicativo do WhatsApp nem no WhatsApp Business.
2. Na Brevo, abra **WhatsApp** e conecte a conta Meta Business. A Meta pede a verificação da empresa com o CNPJ.
3. Crie os 5 modelos abaixo, com categoria **Utilidade** e idioma **português (BR)**. As variáveis precisam ter exatamente estes nomes: `NOME`, `PRODUTO`, `VALOR`, `HORA`, `SITUACAO`, `PEDIDO`, `RASTREIO`, `LINK`.
4. Envie os modelos para aprovação. A Meta costuma levar de algumas horas a poucos dias.
5. Na Vercel, em Production:
   - `BREVO_WHATSAPP_REMETENTE=55DDDNUMERO`, só dígitos.
   - `BREVO_WHATSAPP_MODELOS={"superado":ID1,"ultima_hora":ID2,"arrematou":ID3,"pix_pendente":ID4,"compra_enviada":ID5}`
   - Os IDs ficam na Brevo, em Campanhas > WhatsApp.
   - Um modelo que ainda não foi aprovado pode ficar fora do JSON: aquele aviso continua saindo por SMS.
6. Faça um redeploy.

### Textos dos modelos (aprovados)

**lance_coberto**
> Olá, {{NOME}}! Seu lance em {{PRODUTO}} foi coberto. O lance atual é {{VALOR}} e o leilão encerra às {{HORA}}. Para voltar à disputa: {{LINK}}

**ultima_hora**
> {{NOME}}, o leilão de {{PRODUTO}} encerra às {{HORA}}. Lance atual: {{VALOR}}. {{SITUACAO}} Acompanhe: {{LINK}}

`SITUACAO` vira "Você está na frente." ou "Seu lance foi coberto."

**arrematou**
> Parabéns, {{NOME}}! Você arrematou {{PRODUTO}} por {{VALOR}}. Veja os próximos passos: {{LINK}}

**pix_pendente**
> {{NOME}}, seu PIX de {{VALOR}} ainda não foi pago. O código vale 24 horas depois de gerado. Para pagar: {{LINK}}. Se você já pagou, desconsidere esta mensagem.

**pedido_a_caminho**
> {{NOME}}, seu pedido #{{PEDIDO}} saiu para entrega. Rastreio: {{RASTREIO}}. Acompanhe: {{LINK}}

## Como conferir depois de ligar

```sql
select tipo, canal, status, count(*), max(enviado_em)
from mensagens_enviadas
group by 1, 2, 3
order by 5 desc;
```

`status = 'falhou'` traz o motivo na coluna `erro`. O erro mais comum no começo é um nome de variável do modelo que não bate com a lista acima.

## Para desligar

Apague as variáveis na Vercel e faça um redeploy. O e-mail e o sino continuam funcionando normalmente.

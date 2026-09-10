# Instruções para o Claude neste projeto

## Como falar comigo

- **Sempre responda em português do Brasil.**
- Use **linguagem simples, do dia a dia**, como se estivesse explicando para alguém que entende do negócio mas não é programador.
- **Evite jargão técnico.** Quando um termo técnico for mesmo necessário, explique logo em seguida com palavras simples.
- Prefira frases curtas e diretas: o que foi feito, o que funciona e o que ainda falta.
- Pode citar o nome de arquivos e telas quando isso ajudar a localizar as coisas — mas diga também para que servem.

## Merge de Pull Requests

- **Autorização permanente (19/08/2026):** pode mesclar um Pull Request sozinho, sem
  perguntar antes, sempre que o CI estiver verde **e** você mesmo já tiver revisado o
  diff linha por linha. Não precisa esperar revisão de ferramenta externa (ex.:
  CodeRabbit) — ela é conselheira, não é bloqueio técnico do GitHub.
- **Exceção:** PR que toca em qualquer arquivo marcado 🔴 zona vermelha no
  `.coderabbit.yaml` (pagamento, carteira, lances) continua exigindo autorização
  explícita antes de mesclar — não decida sozinho nesses casos.

## Janela de deploy — não atualizar a plataforma em pleno uso

**Decisão do dono (09/09/2026):** deploy não sobe mais a qualquer hora. Toda
publicação em produção espera a **janela de menos movimento**, porque atualizar
enquanto a plataforma está em uso troca a versão do app debaixo da mão de quem
está usando (o auto-update do app recarrega a tela em 4-10s, com contagem
visível) e pode pegar alguém no meio de uma comprovação, de um checkout ou de um
lance.

### A janela: **01h00 às 02h15 de Brasília**, todo dia

Não é chute — é o buraco medido no uso real dos últimos 30 dias (tarefas do
X-GAME, vendas do catálogo e lances):

| horário (BRT) | movimento | serve pra deploy? |
|---|---|---|
| **01h00 – 02h15** | **zero** em todas as fontes, 30 dias | ✅ **é esta** |
| 00h00 – 01h00 | pouco, mas existe (2 pessoas) | ⚠️ só se precisar |
| 02h15 – 03h00 | cron do Melhor Envio às 02h17 | ⚠️ evitar |
| 03h00 – 06h00 | **pico do dia** — 39 pessoas às 3h, 37 às 4h | 🔴 **nunca** |
| 09h00 – 17h00 | leilões fechando (o grosso entre 11h e 16h) | 🔴 **nunca** |
| 21h00 – 23h00 | segundo pico do X-GAME | 🔴 evitar |

### Por que 03h–06h é o pior horário, e não o melhor

Parece madrugada, mas é o **horário nobre desta plataforma**. O Ritual do
Amanhecer abre 04h40 e fecha 05h30 (`RITUAL_INICIO_MIN` / `RITUAL_FIM_MIN` em
`src/lib/xgame.js`), e a Jornada do dia é gerada pelo cron às 04h00. Deploy aí
atinge o time inteiro no momento em que o dia deles vale nota, dinheiro e liga.

### Os crons, em horário de Brasília

O servidor de cron da Vercel roda em **UTC** — o que está no `vercel.json` é
UTC, não Brasília. Traduzido:

| `vercel.json` | Brasília | o que é |
|---|---|---|
| `0 2` | 23h00 | syncNexusSheet |
| `20 3` | 00h20 | purgarAudiosAntigos |
| `17 5` | **02h17** | renovarTokenMelhorEnvio — o motivo da janela fechar 02h15 |
| `0 6` | 03h00 | gerarGastosFixos |
| `0 7` | 04h00 | gerarJornadaDoDia |
| `30 9` | 06h30 | alertaReservasOrfas |
| `* * * * *` | sempre | finalizeExpiredAuctions · activateScheduledAuctions · expirarReservasEstoque |
| `*/10` | sempre | liquidarArrematesPendentes |

### Como isso muda o trabalho (e o que NÃO muda)

- **O PR continua ficando pronto na hora.** Escrever, testar, abrir o PR e
  deixar verde acontece a qualquer momento do dia — preview do Vercel não é
  produção, não atinge ninguém.
- **O que espera é o merge.** É o merge no `main` que dispara o deploy do app e,
  quando o PR toca `supabase/migrations/**`, também o deploy de migração.
- **Fila:** PR pronto e verde fica aguardando, e o dono é avisado de que está na
  fila da janela — não some da conversa.

### Antes de mergear na janela, conferir

1. **Nenhum leilão terminando na hora** — `finalizeExpiredAuctions` roda a cada
   minuto e um deploy no minuto do fechamento é o pior caso possível.
2. **CI verde** e diff revisado linha por linha, como sempre.
3. Se o PR tem migração, conferir depois **no banco** que ela entrou — workflow
   verde não é prova (ver histórico de 09/09).

### A exceção — e ela é estreita

Sobe na hora, fora da janela, só quando **esperar custa mais do que atualizar**:

- produção quebrada ou tela fora do ar;
- dinheiro parado (cliente sem conseguir pagar, comissão travada);
- dado pessoal exposto;
- o canal de migrações travado, que segura o banco de todo mundo.

Nesses casos: sobe, e **diz na mesma hora** que subiu fora da janela e por quê.
Conveniência, melhoria e acabamento **nunca** são exceção.

### Limite honesto desta regra

Isto é uma regra de comportamento, não uma trava técnica. Ela vale para o
Claude nesta conversa. **Não impede** que outro chat, outra pessoa ou um merge
feito direto no GitHub publique fora da janela — quem quiser trancar de verdade
precisa de proteção de branch ou fila de deploy na Vercel, que é outra
conversa.

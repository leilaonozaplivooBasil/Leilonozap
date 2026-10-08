## 🛡️ DIR-211 — Antifraude de depósito: a espera de 1 hora antes do crédito, com a Beatriz decidindo (08/10/2026)

**Dono:** item 6 das oito automações aprovadas ("depósito grande de conta nova, ou vários PIX seguidos, entram em espera de 1 hora com aviso para a Beatriz aprovar") e "vamos seguir o que precisa seguir". Caso que provou: Diogo, 02/10 — 4 PIX aprovados à tarde, R$ 3.300 creditados na hora e devolvidos pelo gateway 2 horas depois; o bloqueio da DIR-198 recuperou só o que ainda não tinha virado lance.

**Como funciona (tudo em `api/_lib/antifraudeDeposito.js`, régua pura + leitura; quem segura e libera é o próprio `mpWebhook.js`):**
- O webhook, com o pagamento aprovado e a venda ainda `pending_payment` (só `kind` wallet_deposit; passaporte, comissão, operação e QR cancelado pago tarde seguem como hoje), pede a avaliação ANTES de virar `paid`. Com motivo, grava `antifraude_motivo/espera_ate/avaliado_em/detalhes` na venda (PATCH filtrado: o webhook em dobro só grava uma vez) e responde 200 `em_espera` — sem crédito, sem os 10% de quem indicou, sem cupom, sem e-mail de "depósito confirmado". O gateway para de reenviar.
- **R1 `conta_nova_valor_alto`** — conta criada há menos de 24h E valor ≥ R$ 1.000. Medido: 5 casos em 60 dias, todos legítimos até hoje (Yuri 1.500, Alberto 1.000, Pedro 1.000, Douglas 1.000, Lucas 2.000), mas é o perfil clássico. **Só sai da espera com decisão humana**; a Beatriz é lembrada 1x/dia pelo cron.
- **R2 `sequencia_de_depositos`** — 3º ou mais depósito pago-ou-em-espera da mesma pessoa (mesmo `buyer_id` ou mesmo CPF em outra conta, nas duas grafias) em 24h, com a soma das 24h ≥ R$ 1.000, e a pessoa ainda sem histórico (menos de 3 depósitos pagos há mais de 7 dias, ou algum contestado). **Decisão sênior, medida no banco:** a regra crua "3º depósito em 24h" pegava 23 depósitos em 60 dias, quase todos recargas de R$ 100–400 de quem está dando lance ao vivo (um cliente, veterano, responde por 11); segurar isso por 1 hora derrubaria o leilão de quem mais usa. Com o piso de R$ 1.000 e a isenção de veterano caem para ~10 em 60 dias, 7 pessoas — e os dois PIX do Diogo (3º e 4º, soma 2.800/3.300) estão entre eles. **Libera sozinha aos 60 min** se ninguém decidir (`AUTO_LIBERA_MOTIVOS`, 1 linha para o dono mudar). A espera é contada do ÚLTIMO depósito suspeito da pessoa: cada novo reinicia os que ainda esperam.
- **Liberar = o próprio webhook chamado por dentro** (`x-interno: Bearer CRON_SECRET`; `conferirAssinatura` aceita — sem isso, com `MP_WEBHOOK_MODO=bloquear`, a liberação da Beatriz morreria num 401 e o gateway nunca reenviaria). Três caminhos: a Beatriz (Painel do Investidor → Conciliação → **Liberar agora**: `resolverPendencia` modo `liberar` grava `antifraude_decisao='liberado'` só se ninguém decidiu antes, e a ação `liberar` da fila `gateway_acoes` dispara o webhook; não marca a pendência como resolvida — o depósito vira uma venda paga comum); o cron da conciliação (a cada 30 min, até 5 por rodada, 15 s de orçamento, só R2 vencida; grava `auto`); o poll da tela (`checkPaymentStatus`, quando a espera venceu). **Devolver pelo Mercado Pago** num depósito em espera grava `recusado` ANTES do pedido ao gateway — e recusa se alguém liberou no meio-tempo (não se devolve dinheiro que já virou saldo). Recusado cuja devolução falhou aparece como `recusado_sem_devolucao` com o botão Devolver de novo.
- **Quem fica sabendo:** Beatriz/Luiz por WhatsApp na hora (🟡 motivo em português, se libera sozinho e a hora, onde decidir), 1x por depósito, esperado antes da resposta ao gateway (a função pode congelar depois dela). O cliente recebe e-mail `deposito_em_analise` (categoria conta) e sino: "Recebemos o seu depósito… em conferência… entra sozinho até HH:MM" (R2: fim da espera + 30 min do cron) ou "a equipe confere e libera; em horário comercial até 1 hora" (R1). A Carteira (extrato e a janela do PIX) e o checkout mostram "em conferência" em vez de "aguardando pagamento"; o poll desacelera para 60 s. `avisoPixPendente` não manda "PIX pendente" para depósito pago em espera.
- **Falha aberta:** erro ao ler o contexto do comprador → o depósito segue sem espera (console.error). Um soluço do banco não pode prender dinheiro de cliente; a conciliação e o bloqueio da DIR-198 continuam de rede.
- **Banco:** migração `20261008210000` (aplicada, versão registrada): 7 colunas `antifraude_*` em `catalog_sales`, check da decisão (`liberado | auto | recusado`), índice parcial. Nenhum status novo: painéis, vigia (regra 8 vê pendente+liberado como ok), fechamento e o flip do webhook seguem iguais.

**Zona vermelha:** `mpWebhook.js` e `createMPWalletDeposit.js` (a chamada interna do cartão aprovado passa a levar `x-interno` e a devolver `em_analise`). Por regra da casa o merge exige autorização explícita do dono e a janela 01h00–02h15. **Fica em PR até o "autorizo" do dono**; os textos novos (e-mail, sino, WhatsApp) saem como estão até o "textos ok".

**Prova:** `tests/antifraudeDeposito.test.mjs` (11: régua R1/R2 com os casos medidos, portão, extrato, textos, migração, pins do webhook, da biblioteca, da conciliação e das telas), `tests/segurancaDoDepositoContestado.test.mjs` e `tests/textosDosAvisos.test.mjs` (16 tipos) ajustados; suíte completa, lint 0 erros, build, colisão, nomes de migração (168). Revisão adversarial da implementação (três lentes + refutadores): três lentes (corridas e dinheiro; regressão nos caminhos antigos; régua e dados), cada achado refutado por um verificador independente. Confirmados e corrigidos antes do PR: (1) o gateway já dizendo que o dinheiro saiu (`approved` com liberação revertida, devolvido em parte, contestado) não libera nem com decisão — `dinheiroSaiu()` vira motivo próprio, o portão responde `retido` e avisa o admin, o cron pula; (2) corrida entre os dois webhooks do mesmo PIX: um avalia "sem motivo" enquanto o irmão grava a espera — o flip de depósito agora exige `antifraude_espera_ate` nulo ou decisão que libera, e 0 linhas por causa da espera responde `em_espera`; (3) o cliente conseguia "excluir" (cancelar) um depósito pago em conferência — `excluirMeuPedido` recusa; e o QR cancelado pago tarde também passa pelo portão (`STATUS_SEGURAVEIS`); (4) Passaporte e carteira de comissões viram o mesmo saldo e ficavam fora — `KINDS_DE_DEPOSITO` cobre os três, na régua e nas listas; (5) decidido liberar e o crédito falhou (CAS, 5xx) ficava invisível — o cron re-dispara os decididos há mais de 5 min, a lista mostra `liberado_sem_credito`, o extrato segue "em conferência"; (6) `recusado` era irreversível se a devolução falhasse — pode voltar a `liberado` quando o gateway não devolveu; (7) PATCH da espera recusado pelo banco não é corrida: falha aberta; (8) 401/403 do próprio webhook na chamada interna é configuração (`CRON_SECRET`) e avisa o admin; (9) "recusado" nunca diz "entra sozinho"; (10) a gaveta limpa o estado ao gerar PIX novo. Refutados: 2 (já cobertos pelo código)..

## ⏳ DIR-210 — Arremate não pago: cancelamento automático 48h depois do encerramento, comissão do martelo estornada, reserva devolvida (08/10/2026)

**Dono:** item 4 das oito automações aprovadas ("arremate não pago: lembretes em 1h e 24h, cancelamento em 48 horas com reoferta, e a comissão do martelo estornada se não pagar") e "vamos seguir o que precisa seguir, vamos lá". A DIR-205 fez os lembretes e tinha registrado "decidido NÃO automatizar o cancelamento"; essa decisão fica revertida aqui, por ordem do dono — o cancelamento passa a ser automático, com interruptor.

**O que muda:**
- `api/functions/liquidarArrematesPendentes.js` (cron de 10 min): quando o banco recusa a liquidação por falta de saldo, o cron agora olha o prazo. Passadas 48h do `end_time` (`ARREMATE_CANCELA_EM_HORAS`: vazio = 48; `0`/`off` desliga só o cancelamento, os lembretes continuam; número ≥ 1 vale como está), chama a função SQL `cancelar_arremate_nao_pago()` — a mesma usada na cadeira de R$ 246 (DIR-208): comissões do martelo (`commission_records` confirmed → reversed, `commission_balance` baixado), reserva do vencedor devolvida (`reserva_ledger` tipo `devolucao_arremate_cancelado`, trava anti-devolução-dupla), `order_status` 'cancelado', vencedor zerado, rastro em `raw_base44.arremate_cancelado` e em `system_logs`.
- Régua pura `decisaoDoArremateSemSaldo` (`api/_lib/regrasDosAvisos.js`), quatro saídas: `esperar` (antes do prazo, ou desligado), `adiar` (o lembrete de 24h saiu neste mesmo tick — cron parado > 24h: não se cancela um minuto depois de avisar), `manual` (o vencedor lidera outro leilão ativo ou tem outro arremate a pagar: a devolução da reserva precisa de olho humano — o admin recebe 🟡 no WhatsApp, 1x/dia, e cancela pelo SQL se for o caso), `cancelar`. Se não der para conferir os outros leilões, cai em `manual`.
- Função SQL v2 (`20261008200000`, aplicada): antes de qualquer efeito confere o saldo do vencedor (disponível + reservado); se já dá para pagar, recusa com `tem_saldo_agora` e o próximo tick liquida — fecha a corrida "depositou no mesmo minuto". O resto é idêntico à v1.
- Vencedor: o lembrete de 1h/24h ganha a linha do prazo ("Prazo: se o saldo não entrar até dd/mm às hh:mm, o arremate é cancelado automaticamente e o que estiver reservado volta para a sua Carteira"), só quando o cancelamento está ligado. Aviso novo `arremate_cancelado` (e-mail + sino, 1x por leilão): valor, prazo, o que voltou, "se foi engano ou você já tinha depositado, responda este e-mail". `arremate_sem_saldo` e `arremate_cancelado` entram no sino de propósito: quem desligou o e-mail de leilão ainda vê o prazo dentro do site.
- Admin: 🔴 no WhatsApp (1x por leilão) com produto, vencedor, valor, comissões estornadas, reserva devolvida, o 2º colocado (maior lance que não é do vencedor) e o link do editor. A reoferta continua decisão humana: **Duplicar** — reativar o mesmo registro re-arremataria o mesmo vencedor pelos lances antigos. `src/pages/EditAuction.jsx`: leilão com `order_status` 'cancelado' mostra esse aviso e esconde o card Reativar. Se o WhatsApp falhar, fica `AVISO_ADMIN_FALHOU` em `system_logs` (o cancelamento em si já está lá pela função).
- O cron em si continua sem PATCH e sem escrever em `app_users`/`auctions`: o dinheiro só anda pela função SQL (pin da DIR-205 mantido).

**Estado ao publicar (conferido no banco):** nenhum arremate real em `awaiting_payment` hoje — a cadeira foi cancelada na DIR-208. O primeiro cancelamento automático será de um arremate novo que passe 48h sem saldo. Os textos novos (e-mail e sino) saem como estão até o "textos ok" do dono.

**Prova:** `tests/arremateCancelado48h.test.mjs` (9: régua, prazo, textos, sino, pins do cron, da função SQL v2 e do editor), `tests/textosDosAvisos.test.mjs` (15 tipos), `tests/arremateSemSaldo.test.mjs`, `tests/sinoDoCliente.test.mjs`; suíte 4165/4165, lint 0 erros, build, colisão, nomes de migração (167).

## 🧾 DIR-209 — Auditoria dos depósitos dos últimos 30 dias: tudo que entrou, as comissões de 10% e de 5%, tudo que foi pago, conferido com o gateway (08/10/2026)

**Dono:** "quero uma auditoria em todos os depósitos dos últimos 30 dias para o leilão: os valores depositados, quem recebeu comissão, quando começamos a pagar os 10%, quanto pagamos de comissão nos 5% de arremate; preciso saber tudo que entrou e todas as comissões pagas; listagem e conferência com a plataforma. Isso é sério e precisa estar tudo batendo."

**Ferramenta nova (só leitura):** `api/functions/auditoriaGateway.js` + régua pura em `api/_lib/auditoriaGateway.js`. Até hoje o sistema só olhava um lado de cada vez: a conciliação (DIR-195) confere cada venda nossa no gateway; a varredura (DIR-206) olha o que o gateway recebeu desde ontem. Faltava a visão inteira de um período: **tudo que o gateway recebeu × tudo que foi pago aqui**, pagamento por pagamento, cada um numa de oito caixas — `bate` (inclusive cartão com a taxa de 4,99% por fora), `dinheiro_saiu`, `pago_la_nao_pago_aqui`, `valor_diferente`, `saida_conta` (a nossa conta pagando alguém: luz, boleto, taxa — descoberto na primeira rodada real), `venda_fora_do_app` (venda do Mercado Livre caindo na mesma conta), `sem_venda`, `sem_dinheiro` — mais o outro lado (`pago_aqui_sem_pagamento_la`). Admin/super_admin com crachá, POST `{ actor_id, de?, ate?, dias? }` (dias de Brasília, teto 62); bruto/líquido/taxas só do que entrou para o aplicativo, por meio e por situação. Nada é criado, creditado ou devolvido. `vercel.json`: 60 s para a função.

**Resultado (08/09 a 08/10, Brasília), listagem completa no doc "Auditoria dos Depósitos — 30 dias":**
- **Entrou:** 91 depósitos pagos, R$ 52.933,00, 28 pessoas (85 PIX R$ 45.433; 6 cartão R$ 7.500, taxa de 4,99% por fora). 60 QR gerados e não pagos (R$ 40.934,19), 3 pendentes (R$ 1.900).
- **Gateway:** os 91 batem um a um. 94 pagamentos "bate" (R$ 52.848,35: depósitos + 6 pedidos da loja + 1 adesão), 4 "dinheiro saiu" (Diogo, R$ 3.300, devolvidos, saldo bloqueado em 03/10), 0 pago lá e não aqui, 0 pago aqui sem pagamento lá. Para o app: bruto R$ 52.848,35, taxas R$ 1.692,54, líquido R$ 51.924,87. Na mesma conta caem vendas do Mercado Livre (6, R$ 10.773,40) e 15 lançamentos sem venda no app (R$ 35.769,14: seis PIX por fora somando R$ 29.845,34 e nove que parecem contas/taxas pagas pela conta) — a identificar pelo dono.
- **10% de quem indicou:** regra desde 23/09 00:00 (`20260923020215`), primeira linha 24/09, primeira liberação 01/10, primeiros pagamentos 05/10. No período: R$ 3.718,70 gerados = R$ 1.120,00 pagos (Verônica 515, Emannuel 260, Iara 220, Luciano 125) + R$ 110,00 disponíveis + R$ 1.651,00 a liberar (14 linhas, 09 a 14/10) + R$ 837,70 cancelados/estornados (conta oficial por regra R$ 507,70; paim pela devolução do Diogo R$ 330). 46 depósitos de antes de 23/09 (R$ 17.646) e 4 de contas sem indicador (R$ 2.550) não geram.
- **5% do martelo:** 42 arremates, R$ 938,68 (R$ 453,54 pagos, R$ 472,84 em saldo, R$ 12,30 estornados da cadeira); R$ 614,74 para pessoas e R$ 311,64 para a conta oficial (vencedor sem indicador). 25% retido: R$ 4.629,50 (+ R$ 61,50 estornados). Nenhum leilão com vencedor ficou sem comissão gravada.
- **Saiu:** 22 lançamentos de pagamento na mão, R$ 3.297,49 (19 pagos de fato pela Beatriz R$ 2.910,09; 3 zerados por ordem do dono em 28/09 R$ 387,40); 3 saques R$ 240. Saldo de comissão das pessoas R$ 1.328,38 = extrato; empresa R$ 5.543,38.
- **Decisões (dono: "decida por mim como sênior"):** (1) os seis PIX por fora (R$ 29.845,34) ficam como movimentação da própria empresa até prova em contrário — nenhum casou com CPF/e-mail de cliente (a rota passou a casar o pagador com os cadastros, DIR-209c) e nenhum cliente gerou QR desses valores; quatro vêm da mesma conta de CNPJ no gateway; a Beatriz confere os nomes em Atividades e só credita (rota manual, com o id do pagamento na nota) se for cliente. (2) A conta do gateway deve ficar só para o aplicativo: contas e taxas passam a sair da conta bancária; separar o Mercado Livre exige outra conta de gateway para o app e fica como próxima etapa. (3) Elenice 28/09: nada a corrigir — R$ 284,73 = três saques de R$ 80 (26/09) pagos por fora + R$ 44,73 de saldo, zerados por ordem do dono. (4) Martelo com executivo (04/10) é a regra do dono de 28/09 (10% ao executivo, sem retroativo), não erro. (5) Vencedor sem indicador: 5% com a conta oficial é a regra oficial de 04/08; mantém. (6) Diogo, Marcelo, depósitos pré-regra e sem indicador, 60 QR não pagos: nada a fazer.
- **Segunda passada independente** (seis leitores + auditor + dois verificadores, só SELECT) recomputou todos os totais e não divergiu em nenhum valor. Trouxe quatro pontos a mais: (a) **Elenice Lima** tinha R$ 240 em `saldo_alocado` sem saque na fila (3 saques de R$ 80 de 26/09 marcados pagos à mão em 28/09, sem a baixa que `approveWithdrawal.js` faz) — corrigido com a função `baixar_saldo_alocado_pago_por_fora()` (migração `20261008190000`, aplicada; rastro em `wallet_ledger` tipo `baixa_saque_pago_por_fora` e `system_logs`): 240 → 0; (b) os R$ 125 do Luciano (10% da Lorranye, 26/09) foram liberados em 28/09, 5 dias antes do prazo, por ordem do dono, e pagos no mesmo dia — única liberação fora do robô, ratificada como exceção; (c) três pagamentos de 05/10 anotados "pago dia 28/09" (Verônica 495, Iara 220, Emannuel 2,16) para linhas que só liberaram em 03/10 — regra para a Beatriz: pagar só o disponível, nunca o a liberar, e anotar a data real do PIX; (d) `relatorio_comissoes()` mostra estornado = 0 para depósito (R$ 2,70) e leilão (R$ 73,80): defeito pequeno da função, entra na fila.

**Prova:** `tests/auditoriaGateway.test.mjs` (4), suíte completa, lint 0 erros, build.

## 🧾 DIR-208 — Cadeira de R$ 246 cancelada, lote de medidas nos leilões ativos, Avila fora dos alertas (08/10/2026)

**Dono:** "pode fazer e tire o número do Avila da lista, ele não faz mais parte do nosso time" (depois de ler o plano escrito antes de executar) e, na sequência, mandou o próprio número para entrar na lista.

**1. Cadeira cancelada** — `cancelar_arremate_nao_pago()` (migração `20261008140000`, aplicada e executada às 12:33 de Brasília): as duas comissões do martelo (R$ 12,30 indicador + R$ 61,50 retido, ambas da conta oficial) viraram `reversed` e saíram do saldo de comissão da empresa; a reserva de R$ 62,93 voltou ao saldo disponível da conta vale-do-recreio (livro-caixa `reserva_ledger`, tipo `devolucao_arremate_cancelado`); `order_status = cancelado`, vencedor limpo, leilão continua `ended` para reativar ou duplicar; rastro em `raw_base44.arremate_cancelado` e `system_logs`. O alerta vermelho do vigia some sozinho (não há mais `awaiting_payment`).

**2. Lote de medidas** — script `rodar.mjs` num sandbox da Vercel chamando as rotas de produção (`importarProdutoPeloLink` + `salvarProdutoDoLeilao`) com o crachá do dono, só para leilões ativos com entrega e produto sem medida (46 dos 51 ativos; a geladeira e outros já tinham sido atualizados pelo botão de 1 clique). Quase nenhum tem link de página de produto (os dois que tinham apontavam para busca do Google Shopping, que não serve), então as medidas vieram como **estimativa da IA pelo nome**, gravadas com `medidas_origem = estimativa_ia`. Resultado: 46/46 gravados, 2 produtos criados na hora para leilões que estavam sem produto (Smart TV LG 65" e iPhone 17 Pro Max). Três ficaram com o comprimento vazio (cabo HDMI de 5 m, rodapé de 5 m e uma placa fina: a estimativa não fechou essa dimensão dentro da régua) e foram completados à mão com a caixa de embalagem (cabo enrolado 20×15×5 cm, placa 20×30×1 cm, rolo 15×15×8 cm), ainda marcados como estimativa. Depois do lote: **0 leilões ativos com entrega sem medida completa** (regra 12 do vigia fica verde). A relação por leilão fica no `medidas_em` de cada produto; a Beatriz confere pelo editar (o card mostra o selo "estimativa da IA" e a caixa que o frete vai cotar) e corrige o que estiver fora.

**3. Alertas** — `ALERTA_WHATSAPP` é variável secreta na Vercel (não dá para ler o valor anterior); regravada inteira com Luiz ((21) 96014-2766) + Beatriz ((21) 97617-3789), Avila fora. Variável nova só vale em deploy novo: redeploy de produção às 12:51 de Brasília (mesmo commit `91cf40d6`), READY. Prova final fica no próximo aviso do vigia: o `system_logs` do passo `AVISO_ZAP_*` passa a mostrar 2 destinos.

**Sem código novo nesta diretiva** — só execução (função SQL já publicada na DIR-207, rotas da DIR-207/207b, variável de ambiente) e este registro.

## 📦 DIR-207 — Medidas, peso, vídeo e importação pelo link: o editar do leilão vira o mesmo importador da gestão (08/10/2026)

**Dono:** "esse botão de editar tem que ter as mesmas funções de quando importo as imagens pela gestão de produtos… a IA tem que pegar todas as medidas e as descrições já prontas… ela não está botando o peso correto… caso eu não importe, tem que ter o espaço manual… o vídeo não está disponível quando clico em editar… um botão de atualizar medidas dentro do editar para puxar e escrever as medidas certas para entrega via Melhor Envio."

**Medido antes de mexer (7 leitores de código + banco):** o único peso que entrava era um chute da IA a partir do nome, sem ler link nenhum, e ele sobrescrevia o valor gravado toda vez que a tela de produto abria; vazio virava 0 e 0 virava caixa padrão de 0,3 kg / 11×4×16 cm em silêncio na cotação e na etiqueta; o editor do leilão gravava só em `auctions` (sem medidas, sem vídeo, sem IA, sem link); o importar do Mercado Livre era um stub e o do Google Shopping lia um formato que a rota nunca devolveu; editar produto pela gestão zerava descrição, categoria, condição e destaque. No banco: 2.819 de 2.858 produtos sem peso; 43 leilões ativos com produto sem medida; 7 sem produto (geladeira, iPhone, TV).

**Feito:**
1. **Régua única** `src/lib/medidasDoProduto.js`: vazio → null (nunca 0); faixas 5 g–80 kg e 0,5–250 cm com aviso de gramas/milímetros; `caixaDoFrete` espelha exatamente a conta do frete; origem da medida (`manual` | `pagina` | `estimativa_ia`) em `products.medidas_origem` + `medidas_em` (migração `20261008120000`, aplicada).
2. **Importar tudo pelo link** (`api/_lib/fichaDaPagina.js` + `api/functions/importarProdutoPeloLink.js`): abre a página do produto no servidor (trava SSRF, 15 s, 2 MB), extrai JSON-LD/og/texto e pede à IA que COPIE a ficha técnica (peso do produto, não da embalagem); se a página bloquear, a IA estima pelo nome e marca `estimativa`. Nunca grava; a tela aplica campo a campo. Preço nunca é tocado.
3. **Editor do leilão** — card "Produto, medidas e vídeo" (`src/components/auction/ProdutoDoLeilaoCard.jsx`): 4 campos manuais com avisos ao vivo; selo da origem; "O frete vai cotar com: …" em vermelho quando está na caixa padrão; **botão de 1 clique "Atualizar medidas para o frete"** (puxa pelo link do produto ou estima pelo nome e grava na hora, com a origem); o mesmo campo de vídeo da gestão (`CampoDeVideo`, grava em `products.video_urls`, que a sala do leilão já lê); importar pelo link com checkboxes descrição/medidas/fotos; "Gerar descrição com IA" só por clique (nunca por efeito); fotos do buscador copiadas para o nosso Storage; Duplicar leva o `product_id`. Rota `salvarProdutoDoLeilao`: lê/grava só medidas, origem e vídeo no produto vinculado; leilão sem produto → cria e vincula.
4. **Gestão de produtos** (`AddCatalogProduct.jsx`): abre com o produto fresco do banco (não do cache); carrega notes/categoria/condição/origem/destaque; IA automática só quando falta; IA nunca sobrescreve medida preenchida; vazio grava null; placeholders certos; fotos do buscador copiadas. `productAdminAction` passa a aceitar os 6 campos de medida.
5. **Criar leilão**: a descrição por IA não sobrescreve mais a importada; importador do Google Shopping lê o formato certo; produto criado ao publicar na loja fica vinculado ao leilão.
6. **Frete**: uso de caixa padrão vai para o log com o id do produto; o pacote enviado à Melhor Envio fica gravado em `raw_base44.melhor_envio.pacote`. A conta do frete NÃO mudou.
7. **Vigia v3** (migração `20261008130000`): regra 12 "leilão encerra em 24h sem peso/medidas"; fechamento do dia ganha `leiloes_ativos_sem_medidas`.

**Preparado, à espera do dono (DIR-208):** `cancelar_arremate_nao_pago()` (migração `20261008140000`) — cancela um arremate nunca pago: estorna as comissões do martelo, devolve a reserva com a trava anti-duplicidade do livro-caixa, marca `order_status = cancelado` e deixa o leilão pronto para reativar. Caso: cadeira de R$ 246 (conta do dono). A função só entra em produção com o "confirma".

**Em aberto (decisão, não bug):** Duplicar passa a compartilhar o produto entre original e cópia (se os dois encerrarem com vencedor, a baixa de estoque pode rodar duas vezes). Os 50 leilões ativos ainda estão sem medida: o dono pediu para rodar a atualização em todos e a Beatriz confirmar.

**Prova:** `tests/medidasDoProduto` (4), `fichaDaPagina` (5), `produtoDoLeilao` (12), `produtoDoLeilaoCard` (7), `gestaoProdutosMedidas` (7); suíte 4120, lint 0 erros, build; revisor adversarial corrigiu 3 pontos antes do PR.

## 🔭 DIR-206 — O que entrou no gateway e não existe aqui: varredura de hora em hora (07/10/2026)

**Dono:** "analise isso urgentemente… acho que teve depósito e não foi constado. Isso não pode falhar." Conferido: o painel estava certo (o depósito de R$ 850 do Vinicius chegou às 16:30, depois da foto das 15:45, e já aparece). Mas a análise mostrou um ponto cego real: a conciliação (DIR-195) confere pagamento por pagamento só dos que **nasceram no aplicativo**. Um PIX mandado direto para a conta do gateway, sem gerar o QR aqui, entrava lá e não aparecia em lugar nenhum. O dono: "pode fazer".

**Feito** (`api/_lib/varreduraGateway.js`, dentro do vigia de hora em hora):
1. Pergunta ao gateway tudo o que ele recebeu da meia-noite de ontem (Brasília) até agora, página a página.
2. Fica só com o que teve dinheiro (liberado, retido, devolvido, chargeback, disputa, alterado); pendente e cancelado nunca entraram.
3. Casa cada pagamento com as nossas vendas de dois jeitos: pelo id do pagamento gravado na venda, ou pela referência da venda que mandamos ao gateway (cobre QR regerado).
4. O que sobrou vira alerta vermelho no WhatsApp de administrador, **um por pagamento, sem repetir por 7 dias**: valor, hora, situação, meio, primeiro nome do pagador, descrição e o id do pagamento. "Ninguém foi creditado por isso aqui. Conferir no gateway e decidir: a quem pertence?"
5. A rodada do vigia guarda em `system_logs` quantos pagamentos o gateway devolveu, quantos tinham dinheiro e quais ficaram sem venda. Gateway fora do ar: vira número no log, não derruba a rodada.

**Em tempo real também** (dono: "cada pagamento entra em tempo real, né? Isso precisa funcionar independente de hora em hora"): o caminho normal do depósito é o webhook, e é instantâneo (o de R$ 850 de hoje: aviso do gateway 16:31:24, carteira creditada 16:31:25). O webhook tinha duas saídas mudas para o caso sem venda (pagamento aprovado cuja venda não existe; estorno sem referência). Agora as duas avisam o administrador no ato, sem mudar a resposta ao gateway. A varredura de hora em hora fica como rede para o aviso que o gateway não mandar.

**Nada é criado nem creditado sozinho.** Dinheiro sem dono é decisão de gente.

**Prova:** `tests/varreduraGateway.test.mjs` (6), suíte completa, lint 0 erros, build.

**206c (08/10/2026, primeiro dia real):** a varredura acusou três pagamentos no gateway sem venda no aplicativo e sem nenhum aviso do webhook — R$ 2.199,00 (visto às 09h23), R$ 1.138,00 e R$ 132,04 (às 13h23) — ou seja, dinheiro que entrou na conta por fora do app (PIX direto, link ou maquininha). O WhatsApp de Luiz e Beatriz recebeu os três com nome do pagador e meio. Mas o `system_logs` da rodada só guardava o **id** de cada pagamento, e o detalhe morria na mensagem. Ajuste: a rodada passa a gravar valor, hora, situação, meio, pagador, descrição e referência de cada um (`vigiaFinanceiro.js`, uma linha; pino no teste atualizado). Nenhum crédito automático: continua decisão de gente.

## 🏷️ DIR-205 — Arremate sem saldo não é silêncio: o vencedor é lembrado (1h e 24h) e o admin vê no vigia (07/10/2026)

**Dono:** item 4 das automações aprovadas ("arremate não pago"), com a regra "cirúrgicas, não quebre nada".

**O que foi medido antes de mexer:** no Leilão NoZap o arremate não tem "pagar depois": o valor sai da Carteira sozinho (`liquidarArrematesPendentes`, a cada 10 min). Nos últimos 60 dias, 52 arremates fecharam assim. O único caso parado é real e é da conta do próprio dono (vale-do-recreio): cadeira presidente, R$ 246, encerrado em 11/09, com R$ 169,80 na Carteira (faltam R$ 76,20). O cron tentou a cada 10 minutos por 26 dias ("1 sem saldo") e ninguém foi avisado — nem o vencedor, nem o admin. As duas comissões do martelo (R$ 12,30 indicador + R$ 61,50 retido) ficaram com a conta oficial; nenhuma pessoa da rede recebeu por esse arremate.

**Feito:**
1. **E-mail ao vencedor** (`arremate_sem_saldo`, categoria leilão): 1 hora depois do encerramento, "falta saldo para fechar o seu arremate" com quanto tem, quanto falta e o botão da Carteira; 24 horas depois, a segunda via — "ainda está esperando saldo", abrindo a porta para desistir respondendo o e-mail. Uma vez cada (chave = leilão + etapa). Quem desligou avisos de leilão não recebe. Quem manda é o próprio cron de liquidação, no momento em que o banco responde "saldo insuficiente" — nada é mexido no dinheiro nem no leilão.
2. **Vigia financeiro v2** (`vigia_financeiro()`, migração `20261007230000`, aplicada em produção): regra 11, "arremate parado por falta de saldo do vencedor" — amarelo até 48h, vermelho a partir de 48h com "decidir: cobrar ou cancelar". Mesmo filtro do cron (fora plano, investimento e teste). Número novo `arremates_sem_saldo`.

**Decidido NÃO automatizar (por enquanto):** cancelar o arremate e reofertar o produto em 48h, com estorno da comissão do martelo. Com 1 caso em 60 dias (e sendo da conta do dono), cancelar o arremate de um cliente sem gente no meio é risco sem ganho. O vigia leva o caso ao admin em 48h; o cancelamento com estorno e reoferta pode virar botão de admin quando o dono pedir.

**Pendência para o dono:** a cadeira de R$ 246 na conta vale-do-recreio — colocar R$ 76,20 na Carteira (o pedido fecha sozinho) ou mandar cancelar.

**Prova:** `tests/arremateSemSaldo.test.mjs` (4), `tests/textosDosAvisos.test.mjs` atualizado (14 tipos), suíte completa, lint 0 erros, build.

## 🛡️ DIR-204 — O sistema que vigia o sistema: vigia financeiro, fechamento do dia e aviso na hora quando dinheiro sai (07/10/2026)

**Dono:** "quais automações seriam de fato importantes… tipo Vale do Silício, equipe sênior"; depois: "cirúrgicas, não quebre nada que esteja funcionando, só melhore e deixe o aplicativo 10/10". Fase A das oito aprovadas (as outras — arremate não pago, antifraude de depósito, nutrição, pagamento automático por PIX — vêm em seguida, uma por vez).

**Princípio:** nada aqui mexe em dinheiro. As duas funções novas do banco **só leem**; as rotas novas só leem e avisam; o único registro é a memória em `system_logs`. Se o vigia cair, o aplicativo não sente.

**Feito:**
1. **Vigia financeiro** (`vigia_financeiro()`, migração `20261007200000`, aplicada em produção; rota `vigiaFinanceiro`, cron de hora em hora). Confere dez regras e, para cada uma que falha, manda UMA mensagem no WhatsApp de administrador (sem repetir o mesmo assunto antes de 6 horas): saldo × extrato, liberação dos 7 dias atrasada, venda paga sem comissão, leilão encerrado sem comissão do martelo, indicação a conferir, crédito que ficou pendente, cupom de bônus sobre depósito não pago, pendência na conciliação, ação no gateway que não andou, webhook mudo há mais de 24h, robô do banco (pg_cron) parado ou com falha. Primeira rodada em produção: **zero alertas** (saldo da rede R$ 1.153,38 = extrato; em espera R$ 1.636; conciliação sem pendência; robôs em dia).
2. **Fechamento do dia** (`fechamento_diario(dia)`, mesma migração; rota `fechamentoDiario`, todo dia às 07h de Brasília). O resumo de ontem chega no WhatsApp: entrou (depósitos, loja, arremates, líquido no gateway), saiu/travou (avisos de devolução, bloqueios, devoluções feitas), comissões (geradas, em espera, liberadas, pagas na mão, estornadas, empresa), saldos (rede, carteiras, reservado, conta oficial, bônus), movimento (cadastros, lances, leilões, arremates a pagar) e a auditoria do vigia. Uma mensagem por dia; `?dia=AAAA-MM-DD` reemite outro dia para conferência.
3. **Aviso na hora quando dinheiro sai** (`mpWebhook` e `conciliarMercadoPago`): no momento em que o gateway informa devolução, chargeback ou disputa e o sistema bloqueia a carteira, o administrador recebe no WhatsApp quem, quanto, o que já foi feito (bloqueio, corte da comissão, cancelamento do bônus) e onde ver. Antes só aparecia no log e no painel.

**Para receber:** as mensagens vão para os números em `ALERTA_WHATSAPP` (Vercel). Hoje: Luiz e Avila. A Beatriz precisa ser incluída lá para receber.

**Prova:** `tests/vigiaEFechamento.test.mjs` (6), suíte completa, lint 0 erros, build; `select vigia_financeiro()` e `select fechamento_diario()` rodados em produção.

## 🧾 DIR-203 — Os 10% de quem indicou: a espera aparece para o indicador, e a indicação que mudou de dono aparece para o dono (07/10/2026)

**Dono:** "não é bônus; é 10% sobre o depósito da indicação. Corrija o que tiver que corrigir e veja se quem indicou está ganhando os 10%."

**Conferido depósito a depósito desde 26/09:** todo depósito pago gerou a comissão para o indicador da hora do depósito (Verônica, Luciano, Iara, Emannuel, Luis Francisco, paim, Ribeiro). As liberações dos 7 dias estão em dia.

**O caso real:** Marcelo Zaidan Salles foi movido para debaixo do Luciano em 03/10 08h52 (ajuste de rede pelo admin), mas os R$ 4.450 que ele depositou entre 29/09 e 02/10 pagaram o indicador da época, a conta oficial — e essas linhas foram canceladas no DIR-201. O Luciano olhava e não via nada. Outros três clientes movidos desde 27/09 (Herbert → Luis Francisco, Henrique → Beatriz, Leonardo → Luciano) não perderam nada: Herbert já estava com o Luis Francisco quando depositou; os outros dois não depositaram.

**Feito:**
1. **Passado:** 4 linhas em espera para o Luciano sobre os depósitos do Marcelo (R$ 5 + R$ 30 + R$ 10 + R$ 400 = R$ 445), com o mesmo prazo de 7 dias contado do depósito; liberam entre 07/10 e 09/10 pelo robô. Decisão: o admin reconheceu o Luciano como indicador e a empresa não ficou com nada.
2. **Extrato de quem indicou** (`getMyCommissions` + `ExtratoComissoes`): a indicação em espera aparece na hora, com "Em espera · libera dd/mm" e o depósito do cliente. Antes só aparecia 7 dias depois, quando virava linha "Gerada" — por 7 dias o indicador não via nada.
3. **Carteira:** o cartão "A liberar" passou a dizer "A liberar (indicações) · 10% do depósito de quem você indicou · libera 7 dias depois" (a nota antiga falava do escrow de vendas, cancelado em 28/09).
4. **Relatório de Pagamentos** (`relatorio_comissoes` v3, migração `20261007150000`, aplicada em produção): bloco "Indicações a conferir" com todo depósito na regra cujo indicador atual não recebeu os 10% — a Beatriz vê, o dono decide. Hoje: nenhum.

**Regra mantida:** a comissão é do indicador na hora do depósito. Cliente movido depois não gera comissão retroativa sozinho; aparece no relatório para decisão.

**Prova:** `tests/indicacaoAConferir.test.mjs` (3), suíte completa, lint 0 erros, build.

## 🎟️ DIR-202 — O bônus de 10% (Cupom Passaporte) segue o depósito; a Carteira mostra o guardado (07/10/2026)

**Dono, com print de cliente:** "as pessoas que estão dando lance no leilão não estão recebendo os 10%; desde semana passada; não está constando mais." E: "auditoria extremamente diligente, sem quebrar nada, para não ter mais nenhum erro."

**O que é o "10%":** o Cupom Passaporte — 10% de cada depósito (a partir de R$ 27), que nasce guardado e libera, fatia a fatia, a cada leilão que a pessoa disputa e não ganha; vale só na Loja Virtual. Não é a comissão de indicação.

**Auditado em 07/10 (banco + código):** todo depósito pago desde 17/09 tem o cupom (único sem cupom: R$ 25 de 21/09, abaixo do piso da época); as liberações acontecem no fim de cada leilão (PS5 26/09: 12 fatias; Harley 29/09: 4; iPhone 17 02/10: 15); desde 02/10 só terminou um leilão com um único participante, então nada havia para liberar. R$ 2.716 gastáveis e R$ 884 guardados hoje. Comissões reconferidas no mesmo ato: 0 saldos fora do extrato, 0 liberações atrasadas, os 2 depósitos de 06/10 com a comissão de indicação na espera, a venda de 06/10 com 30% certinho.

**Os dois problemas reais:**
1. **Tela:** o cartão da Carteira escondia o valor guardado quando a pessoa já tinha algum crédito liberado. Quem depositou R$ 3.000 e tinha R$ 15 liberados via "R$ 15" e nada dos R$ 300 esperando o leilão — é exatamente "não está constando". `PassaporteCard` agora mostra liberado e guardado juntos, com os valores.
2. **Furo:** depósito devolvido/contestado no gateway bloqueava a carteira e cortava a comissão (DIR-198), mas o cupom ficava de pé: Diogo tinha R$ 310 gastáveis na loja sobre R$ 3.300 que voltaram para ele. Migração `20261007120000` (aplicada em produção): `cancelar_cupom_passaporte_do_deposito` e `bloquear_saldo_contestado` v3 chamando-a sempre. Passado: os 4 cupons do Diogo cancelados (R$ 310 liberados + R$ 20 guardados; nada tinha sido gasto).

**Prova:** `tests/cupomPassaporteSegueODeposito.test.mjs` (3), suíte completa, lint 0 erros, build.

## 🧾 DIR-201 — As decisões da auditoria das comissões (05/10/2026)

**Dono, sobre as 5 decisões do DIR-200:** "QUERO QUE VOCÊ DECIDA ISSO." Decidido e executado (nada aqui muda saldo de ninguém da rede):

1. **Saldo × extrato (R$ 140,26 de 3 contas internas):** o dinheiro foi gasto em compras pagas com saldo de comissão; a linha "Gerada" ficou aberta. Entrou uma linha **negativa** `compra_com_saldo` em cada conta (Luiz −105,09 · Beatriz −20,58 · Luciano −14,59), sale_type `ajuste`. Extrato = saldo, saldo intocado. **Daqui para a frente** `comprar_com_saldo` grava essa linha sozinha (+ `wallet_ledger` `compra_com_comissao`). A tela mostra "Usado em compra"; a linha nunca é pagável (tela e servidor recusam).
2. **Leilão paga no martelo (mantido):** o lance reserva o saldo, então o martelo já é o pagamento, como está documentado. O único caso em aberto (R$ 73,80) é da conta oficial.
3. **16 vendas Nexus de 03–15/08 sem comissão (R$ 1.014,42): sem retroativo.** A regra de comissionar venda Nexus começou em 15/08, e as pessoas envolvidas tiveram a comissão zerada por ordem do dono em 28/09.
4. **A empresa fora dos 10% de indicação:** cliente de cadastro direto aponta para a conta oficial; esses 10% eram "comissão" da empresa para a empresa. `trg_deposito_paga_indicador` agora pula a conta oficial. Passado estornado pela função de estorno: R$ 505 em espera cancelados (6 depósitos) e R$ 2,70 já liberados saíram do saldo da conta oficial e a linha virou "Estornado".
5. **Cargos de quem foi zerado em 28/09 (Ribeiro, Iara, Elenice): ficam.** Zerar saldo acertou o passado; tirar cargo é tirar da rede, e isso o dono não pediu.

**Migração `20261005230000_decisoes_da_auditoria.sql`** (aplicada em produção e registrada): `trg_deposito_paga_indicador` v2 e `comprar_com_saldo` v2. `src/lib/origemDaComissao.js` ganha `compra_com_saldo` e `ehLinhaDeUso`; `linhaPagavel` exige valor > 0; `payCommissionManually` recusa linha ≤ 0.

**Prova:** `tests/decisoesDaAuditoria.test.mjs` (4), suíte completa, lint 0 erros, build; `relatorio_comissoes()` em produção: "saldos fora do extrato" vazio e indicação da empresa zerada.

## 🧾 DIR-200 — Auditoria financeira das comissões: relatório por origem e licença, liberação dos 7 dias com segurança (05/10/2026)

**Dono:** "auditoria financeira extremamente diligente; atualize os pagamentos após os 7 dias; relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda da loja por licença (Influenciador, Vendedor, Parceiro etc.); analise todo o sistema financeiro, traga erros e bugs e como funcionam os pagamentos hoje." Depois do "entendi": "PODE FAZER".

**Relatório completo:** `docs/AUDITORIA_COMISSOES_2026-10-05.md` (régua inteira de cada origem, números do dia, o que bate, o que não bate, decisões que ficam com o dono). **Nenhum saldo foi alterado.**

**O que bate:** liberação dos 7 dias (17 liberadas, todas em até 58 min do vencimento; nenhuma vencida parada); 10% exatos em todas as 37 comissões de depósito; nenhum depósito na regra sem comissão; 47 vendas da loja desde 01/08 somam 30% certinho; 52 leilões somam 30%; 14 pagamentos manuais batem; nenhuma duplicata; 20 de 23 saldos iguais ao extrato.

**Achados:** (4.1) saldo menor que o extrato em 3 contas internas, R$ 140,26 (Luiz 105,09 · Beatriz 20,58 · Luciano 14,59) por compras pagas com saldo de comissão — dinheiro gasto, linha "Gerada" ficou aberta; (4.2) compra com saldo não deixa rastro na linha; (4.3) liberação dos 7 dias não olhava se o depósito continuava de pé; (4.4) estorno do depósito não estornava a linha "Gerada"; (4.5) 5%/10% do leilão pagos no martelo antes do arrematante pagar (1 caso, R$ 73,80, conta oficial); (4.6) R$ 125 do Luciano liberados 5 dias antes em 28/09, fora do robô; (4.7) 16 vendas Nexus de 03–15/08 sem comissão (R$ 1.014,42); (4.8) a conta oficial entrava no "total das pessoas"; (4.9) a empresa recebe 10% dos depósitos de clientes que ela mesma indicou (R$ 505 em espera); (4.10) quem foi zerado em 28/09 segue nos pools; (4.11) `recalculateCommissionBalances` criaria R$ 140,26 se rodasse.

**Feito (migração `20261005200000`, aplicada em produção):** `liberar_saldos_maturados` só libera depósito ainda pago e sem devolução/chargeback (vira `cancelado` se o dinheiro saiu; retido/disputa/alterado não tratado fica em espera); `estornar_comissoes_do_deposito` marca a linha `indicacao_deposito` como estornada e devolve `ja_pagas`; nova `relatorio_comissoes()` (só servidor). Rota `relatorioComissoes` (admin, crachá). Tela: bloco "Relatório por origem e licença" (em espera · a receber · pago · estornado por origem; tabela por cargo; empresa à parte; próximas liberações; alerta se o robô atrasar), "Auditoria viva · saldo × extrato", empresa fora do total das pessoas, resumo por origem e cargo em português em cada cartão. `src/lib/origemDaComissao.js` é a tabela única papel → origem/rótulo.

**Fica com o dono (nada mexe em saldo sem o "sim"):** marcar as linhas usadas em compra (4.1); leilão pagar no martelo ou no pagamento (4.5); retroativo das 16 vendas Nexus (4.7); tirar a conta oficial dos 10% (4.9); tirar os cargos de quem foi zerado (4.10).

**Prova:** `tests/auditoriaComissoes.test.mjs` (6), suíte completa, lint 0 erros, build; `select relatorio_comissoes()` em produção.
## 👔 DIR-185 — O elenco sumia no celular (05/10/2026)

**Dono, com um print do iPhone e outro do MacBook lado a lado:** "na Jornada os
bonequinhos que aparecem no desktop não estão aparecendo no mobile. Precisa
identificar esse erro imediatamente e fazer toda a experiência ser igual em
todos os dispositivos."

**🔴 A causa, numa linha só** (`XGameJornada.jsx`, o `<span>` do boneco):

```
hidden sm:block
```

Escondido abaixo de 640px — ou seja, em **todo celular**, de propósito. Era
precaução contra o boneco vazar pela lateral numa tela estreita, e **ninguém
nunca mediu se vazava mesmo**.

**Medido agora, em Chromium real, em três larguras:**

| largura | bonecos | vaza esquerda | vaza direita | rolagem lateral |
|---|---|---|---|---|
| 320px (iPhone SE) | 3 | 0 | 0 | não |
| 390px (iPhone atual) | 3 | 0 | 0 | não |
| 1280px (computador) | 3 | 0 | 0 | não |

A 390px as caixas ficam entre 174px e 295px numa tela de 390 — sobra larga dos
dois lados. A precaução escondia um elenco que sempre coube.

**Provas:** `tests/navegador/rodapeJornada.spec.mjs` (+2) — um mede os dois
lados e a rolagem nas três larguras; o outro compara o elenco do celular com o
do computador e exige que sejam **idênticos** (mesmo boneco, mesma pose).

**🩹 A mutação achou um defeito no MEU teste:** repus o `hidden sm:block` e o
segundo teste PASSOU — porque `hidden` deixa o elemento no DOM, e eu estava
contando presença, não visibilidade. Corrigido pra filtrar por caixa com
largura > 0. Com a correção, a mutação derruba os dois. Um teste que não cai
com o defeito de volta não é prova de nada.

**Varredura:** zero `hidden sm:` / `sm:hidden` / `useEhCelular` sobrando em
`XGameJornada`, `XGameCapas`, `ElencoBoneco`, `PlacarDoDia`, `BarraDaVisao`,
`PortasDasVisoes` e `RodapeDaJornada`. A experiência é a mesma em todo aparelho.

Suíte **3691/3691** · lint 0 erro · build OK.

---

## 📱 DIR-199 — Mapa do painel no iPhone: "Fechar" nunca mais debaixo do relógio (03/10/2026)

**Dono, com vídeo:** "os botões de fechar estão subindo muito e não está aparecendo; essas coisas não podem acontecer de jeito nenhum."

**O que o vídeo mostra (18 s, quadro a quadro):** no mapa do painel (Visão Geral em blocos), a barra "Visão Geral · Fechar" ora aparece abaixo do relógio do iPhone, ora some por baixo dele, alternando enquanto a pessoa mexe na tela.

**Causa:** o modal tinha altura `h-screen` (100vh) **centralizado** numa camada `fixed inset-0` com padding. No iPhone, 100vh é maior que a área visível: o modal transbordava para cima e para baixo em partes iguais, e o transbordo mudava conforme a barra do navegador recolhia ou o toque puxava a tela. E não havia recuo pela área segura do entalhe.

**Correção (`MiniCanvasOverview.jsx`, `MiniCanvasMobile.jsx`, `MenuPainelLateral.jsx`):** em tela cheia, a camada é uma coluna que recua pela área segura (`nz-tela-cheia`) e o modal preenche o que sobra (`flex-1 min-h-0`), sem 100vh; fora da tela cheia, `95dvh`. A página de trás fica travada enquanto o mapa está aberto, e a lista usa `overscroll-contain` para não arrastar o documento. A gaveta lateral do painel no celular (`top-0`) ganhou o mesmo recuo: o X de fechar ficava debaixo do relógio.

**Varredura:** nenhum outro overlay do app usa `h-screen`/100vh em camada fixa; os painéis de tela cheia de DIR-189 já recuam pela área segura.

**Prova:** iPhone emulado (390×844 e 390×700, entalhe de 47 px): "Fechar" a 58 px do topo nas duas alturas, e no mesmo lugar depois de rolar o documento. `tests/mapaDoPainelNoIphone.test.mjs` (4), suíte completa, lint 0 erros, build.

## 🧾 DIR-198 — Segurança real no depósito contestado: comissão cortada, fila de ações com rastro, pendência fecha com motivo (03/10/2026)

**Dono:** "faz o que é o certo; tira a comissão de quem indicou (o João); segue essas regras pro futuro e organiza o passado. Precisamos ter segurança real nisso."

**O que o gateway revelou:** os 4 PIX do Diogo foram devolvidos ao pagador pelo próprio Mercado Pago em 02/10 18h21, por "suspeita de fraude" (devolução administrativa, escondida do pagamento: status segue "approved" e devolvido zero; só `/refunds` mostra). O indicador, João Vitor Paim, tinha R$ 330 de comissão de indicação a liberar em 09/10.

**Regras (migração `20261004000000`, aplicada em produção):**

- `estornar_comissoes_do_deposito`: cancela a_liberar, estorna disponivel (sai do saldo de comissão, nunca negativo). `bloquear_saldo_contestado` chama isso SEMPRE, mesmo se já bloqueado: todo caminho que trava saldo corta a comissão.
- `gateway_acoes`: fila de ações (devolver pelo gateway com chave de idempotência, marcar resolvida), registrada antes de acontecer, executada pelo botão na hora ou pelo cron (até 3 tentativas), resultado na linha e evento em `gateway_eventos`.
- `conciliacao_resolvida_em/por/motivo`: pendência tratada sai da lista com rastro. "Pago lá, cancelado aqui" com devolução na carteira fecha sozinha.
- Rota `resolverPendencia` (admin, motivo obrigatório) e botões "Devolver pelo Mercado Pago" / "Marcar como tratada" em cada pendência.

**Passado organizado (feito à parte):** comissões do João nas 4 vendas do Diogo canceladas (R$ 330, estavam a liberar). Fila: devolução de 2× R$ 2 do Gabriel pelo gateway; "resolvida" para Luiz (R$ 47,62) e Sophia (R$ 30,48), compras internas. Ronilson fecha sozinho. Conferido: nenhuma outra comissão de indicação sobre depósito cujo dinheiro saiu.

**Prova:** `tests/segurancaDoDepositoContestado.test.mjs` (4), suíte completa, lint 0 erros, build.

## 🧾 DIR-197 — Auditoria caso a caso: cancelamento com rastro, painel pelo valor do gateway, conferência sem mexer na data (03/10/2026)

**Dono:** "confere, não podemos ter nenhum achismo, quero entender tudo" e, depois do relatório, "pode fazer tudo que precisa fazer".

**Os cinco "pago no gateway, cancelado aqui" (conferidos um a um, banco + gateway):** Gabriel 2× R$ 2 (26/07, nunca enviados, nada devolvido, comissões seguiam pagas); Luiz R$ 47,62 e Sophia R$ 30,48 (01/08 e 04/08, produto + frete, cancelados, nada devolvido, comissões estornadas; compras do dono e da filha); Ronilson R$ 86,54 (19/08, "produto indisponível", devolvido em crédito na carteira em 20/08, resolvido). Quem cancelou e quando: não existia registro; e a conferência de 03/10 sobrescreveu a `updated_at` das 285 vendas.

**Feito em produção (fora de migração):** `cancelar_venda` nas duas vendas do Gabriel (comissões R$ 0,58 + R$ 0,60 estornadas; um registro de R$ 0,02 já estava pago e ficou); duas linhas de −R$ 0,60 em `financial_income` anulando a receita de comissão de 30/08.

**Migração `20261003233000` (aplicada em produção):**

- `catalog_sales_set_updated_at`: se só a coluna `gateway` mudou, `updated_at` fica como estava.
- `cancelado_em` (trigger na transição de status), `cancelado_por` e `cancelamento_motivo` (gravados por `updateOrderStatus`, `excluirMeuPedido` e `mpWebhook`). A assinatura de `cancelar_venda` não muda.
- `painel_investidor`: "Entrou pelo gateway" passa a usar o valor que o gateway cobrou (`gateway.valor`) quando a venda já foi conferida, com líquido, taxa e quantos conferidos; `fluxo_deposito.bloqueado`. O KPI mostra líquido e taxas.

**Por que os totais não batiam centavo a centavo:** loja virtual R$ 350,36 de frete cobrado pelo gateway e fora do nosso campo de valor; depósitos no cartão R$ 379,24 de taxa (4,99%) paga pelo cliente. Nada perdido. Pagamentos liberados: cobrado R$ 61.850,87, taxas R$ 1.790,41, líquido R$ 60.826,91.

**Prova:** `tests/cancelamentoComRastro.test.mjs` (3), suíte completa, lint 0 erros, build.

## 🧾 DIR-196 — Depósitos e carteiras um por um, o momento do dinheiro, e o PIX "alterado" no gateway (03/10/2026)

**Dono, com a conciliação na tela:** "preciso de um modal para ver todos os depósitos e entender tudo que a plataforma está falando: qual o momento do dinheiro, a lista de depósitos e, principalmente, quanto de carteira dentro da operação está parado para compra, para eu virar em produto."

**A lição do dia:** a primeira conferência (18h22) trouxe os 4 PIX do Diogo como "liberado". O Mercado Pago mantém `status approved`, `money_release_status released` e devolução zero, mas carimbou `date_last_updated` às 18h21, a hora exata do "cancelamento de liberação" no extrato. Entre 173 pagamentos liberados, só esses 4 foram alterados depois de aprovados.

**O que muda:**

- **Régua:** PIX aprovado e liberado que o gateway alterou mais de 10 min depois da aprovação vira `alterado` e conta como dinheiro que saiu (bloqueio automático de depósito, pendência no painel). Cartão fica de fora: o gateway atualiza quando libera em D+N, e isso é normal.
- **Investigação:** quando o dinheiro saiu ou alterou, a conciliação e o webhook consultam devoluções, chargebacks e reclamações do pagamento, guardam o que cada recurso respondeu (`gateway.investigacao`) e apuram a situação (chargeback > disputa > devolvido). É assim que a gente aprende o que o Mercado Pago expõe nesses casos.
- **Modal "Depósitos e carteiras"** (`ModalDepositos.jsx`), aberto pelos KPIs "Depositado nas carteiras" e "Parado nas carteiras": totais (depositado, virou compra, reservado em lances, **parado para virar produto** em destaque, bloqueado); aba **Carteiras** pessoa a pessoa (depositou, virou compra, reservado, parado, bloqueado, último depósito, último acesso, ligar e WhatsApp), ordenada por quem tem mais parado; aba **Depósitos** um por um, com o momento do dinheiro (aguardando pagamento → pago no gateway → liberado → conferido → na carteira; bloqueado por contestação; dinheiro saiu e segue na carteira; creditado sem conferência; cancelado), filtro por momento e busca.
- **Banco (migração `20261003223000`, aplicada em produção):** `painel_depositos()`; `painel_conciliacao()` com `alterado` em dinheiro_saiu e pendências por gravidade. A rota do painel só traz os depósitos quando o modal pede.

**Números de hoje (18h40):** depositado R$ 53.818 (41 pessoas), virou compra R$ 20.733, reservado R$ 281, **parado R$ 29.036 (39 pessoas)**, bloqueado R$ 3.300. Maiores saldos parados: Virgilio R$ 4.477, Herbert R$ 3.700, Lilian R$ 3.150, Gabrielle R$ 2.600, Rosenberg R$ 2.220, Ângela R$ 1.941.

**Prova:** `tests/depositosECarteiras.test.mjs` (5), `tests/conciliacaoMercadoPago.test.mjs` ajustado, suíte completa, lint 0 erros, build.

## 🏦 DIR-195 — Conciliação com o Mercado Pago: dinheiro que entra, sai e fica, com quem ligar (03/10/2026)

**Dono, com o extrato do Mercado Pago na mão:** "tem cliente que depositou e depois veio 'cancelamento de liberação de dinheiro'. Preciso de uma auditoria muito grave: o dinheiro que entra, sai e fica tem que bater real, em tempo real, webhook, com a lista dos clientes que pediram chargeback para a gente entrar em contato. Preciso ser uma extensão do Mercado Pago com uma comunicação mais clara." E: "quero seguir suas decisões de forma sênior."

**O caso:** Diogo dos Santos da Costa, conta de 11/09, 4 PIX em 02/10 (R$ 1.500, 800, 500, 500 = R$ 3.300). Às 18h21 do mesmo dia o Mercado Pago cancelou a liberação dos 4 (extrato: R$ 1.485,15 + 792,08 + 495,05 + 495,05). O webhook recebeu os 4 avisos (log da Vercel às 21:21Z), consultou os pagamentos, viu "approved", respondeu `already_paid` e seguiu. O dinheiro saiu da conta da empresa; os R$ 3.300 seguiam disponíveis na carteira dele, sem nenhum gasto ainda.

**Decisões (tomadas e executadas):**

1. **Travou primeiro.** `bloquear_saldo_contestado` nos 4 depósitos do Diogo às 17h59 de 03/10: saldo R$ 3.300 → R$ 0, quatro linhas no `wallet_ledger` (tipo `bloqueio_contestacao`), reversível por `liberar_saldo_contestado`. Nenhum status de venda mudou.
2. **Régua única** `api/_lib/conferenciaMercadoPago.js`: lê o pagamento do Mercado Pago e resume em uma palavra (`liberado`, `retido`, `devolvido`, `devolvido_parcial`, `chargeback`, `disputa`, `cancelado`, `pendente`, `desconhecido`). Olha `status`, `money_release_status` e `transaction_amount_refunded`, que o webhook nunca olhava.
3. **Webhook (`mpWebhook.js`):** todo aviso vira linha em `gateway_eventos` (tópico, id, formato, assinatura, status, situação, o que foi feito), mesmo quando a rota falha. O que o gateway diz é guardado em `catalog_sales.gateway` ANTES de qualquer decisão. Depósito pago cujo dinheiro saiu → saldo bloqueado na hora. Aviso de chargeback/reclamação (que vem com outro id) é resolvido até o pagamento em vez de descartado.
4. **Auditoria `conciliarMercadoPago.js`:** admin (botão "Conferir agora" no Painel do Investidor, em lotes de 25 até acabar) ou cron (`Bearer CRON_SECRET`). Nunca conferido primeiro, depois o mais antigo. Só confere e bloqueia; nunca paga, credita, devolve ou cancela.
5. **Painel do Investidor, seção "Conciliação com o Mercado Pago":** Bate / Dinheiro saiu / Pago lá, cancelado aqui / Pago aqui, sem pagamento lá; lista de pendências com nome, valor, situação no gateway, status aqui, saldo bloqueado, telefone (ligar e WhatsApp) e e-mail; distribuição por situação; saúde do webhook (avisos nas últimas 24 h e os últimos 6).

**Banco (migração `20261003210000`, aplicada em produção em partes pelo MCP):** `catalog_sales.gateway jsonb` + índice; `gateway_eventos` (só service_role); `bloquear_saldo_contestado` / `liberar_saldo_contestado` (idempotentes pela última linha do extrato; um bloqueio e uma liberação por venda); `painel_conciliacao()`.

**Cron (dono: "adiciona e deixa tudo perfeito"):** `vercel.json` ganha `/api/functions/conciliarMercadoPago` a cada 30 min e `maxDuration` 60 s para a rota; o cron confere até 150 pagamentos por rodada (orçamento de 50 s), 45 dias para trás, nunca conferido primeiro. Rede de segurança caso um aviso do webhook se perca.

**Prova:** `tests/conciliacaoMercadoPago.test.mjs` (7), suíte completa, lint 0 erros, build.

## 🎂 DIR-194 — Data de nascimento no cadastro, opcional e leve (03/10/2026)

**Dono:** "pode colocar a data de nascimento no cadastro, mas sem ferir, sem restringir e sem criar ainda mais bloqueio na entrada — isso precisa ser bem leve."

**O que muda:**

- **Campo opcional "Data de nascimento (dd/mm/aaaa)"** nos três cadastros (`Cadastro.jsx` da rede, `Register.jsx`, modal de visitante) e no Perfil (editar e ver). Máscara enquanto digita, teclado numérico no celular, nenhuma validação que trave: incompleto ou inválido vai como vazio e o cadastro segue igual.
- **Régua única** `src/lib/dataDeNascimento.js` (`mascaraData`, `nascimentoISO`, `nascimentoBR`, `idadeDe`): aceita dd/mm/aaaa, ddmmaaaa e aaaa-mm-dd; só vira data o que é data do calendário, não futura, até 120 anos. Nunca lança erro.
- **Servidor grava** (`publicRegister`, `registerNetworkUser`, `atualizarMeuCadastro`, `adminUpdateUser`), sempre pela régua. Coluna `app_users.birth_date date` nula, sem check (migração `20261003180000`, aplicada em produção). **Fora da lista pública de colunas**: dado pessoal; a própria pessoa recebe a dela do servidor (login/cadastro/salvar) e o Perfil lê do cache.
- **Painel do Investidor:** a fatia "Faixa etária" acende com o que foi informado (até 17, 18–24, 25–34, 35–44, 45–54, 55–64, 65+), com "N informaram · M sem data". Enquanto ninguém informou, explica que o campo é opcional. Nada se estima.

**Prova:** `tests/dataDeNascimento.test.mjs` (9), `tests/painelInvestidor.test.mjs` ajustado, suíte completa, lint 0 erros, build.

## 📅 DIR-193 — Painel do Investidor: "Hoje" é desde a meia-noite, não janela móvel (30/09/2026)

**Dono, com o print às 18:37:** "o Hoje estava em 600, depois 550, agora 50 — o que está acontecendo? Precisamos ver os depósitos e vendas."

**Causa:** "Hoje" era "últimas 24 horas". Às 15h a janela ainda pegava os depósitos de ontem à tarde (Lilian R$ 50 às 15:03, Luciano R$ 500 às 17:57, Marcelo R$ 50 às 22:23); conforme a tarde avançava, cada um saía da janela e o número caía: R$ 600 → 550 → 50. Nenhum dado sumiu do banco: hoje (30/09) não houve pagamento aprovado até as 18:37, só um PIX pendente de R$ 27 às 17:49.

**O que muda (migração `20260930190000`, aplicada em produção):** os períodos passam a ser dias de calendário no fuso de Brasília. "Hoje" = desde a meia-noite; "7 dias" = hoje e os 6 anteriores; "30 dias" = hoje e os 29 anteriores; "Tudo" segue tudo. Vale para as duas funções (painel e perfil). A tela mostra a definição ao lado do período ("Hoje · desde a meia-noite").

**Prova:** `tests/painelInvestidor.test.mjs` (+1), suíte completa, lint 0 erros, build.

## ⏱️ DIR-192 — Painel do Investidor ao vivo de verdade: 20 s, contagem visível, botão que responde (30/09/2026)

**Dono:** "os números precisam atualizar em tempo real e o botão de atualizar precisa funcionar."

**O que estava acontecendo:** o botão funcionava, mas em silêncio: chamava o cálculo, nada girava, nada avisava, e se nada tinha mudado no banco o número era o mesmo. Parecia morto. O recálculo automático era a cada 60 s.

**O que muda (`PainelInvestidor.jsx`):** recálculo a cada 20 s com contagem regressiva ao lado do ponto verde ("próxima em 14 s"); botão "Atualizar agora" gira, desabilita enquanto calcula e confirma com aviso "Atualizado às HH:MM"; recálculo ao voltar para a aba; se o servidor não responder, a tela mantém os últimos números e o ponto fica âmbar com "sem resposta há X s", em vez de cair.

**Prova:** `tests/painelInvestidor.test.mjs` (asserções novas), suíte completa, lint 0 erros, build.

## 👥 DIR-191 — Painel do Investidor: mapa maior no desktop, homens e mulheres, por onde chegaram, idade em aberto (30/09/2026)

**Dono, com a foto do desktop:** "ficou foda no celular, mas no desktop o mapa está muito pequeno. Quero quantidade de homens e mulheres, faixa etária, pizza de fatia; quantos vieram pelo WhatsApp, quantos pelo Facebook e Instagram. Tudo em tempo real sem cair."

**O que muda:**

- **Mapa no desktop:** a seção ocupava 1/5 da largura (faltava o `lg:col-span-3`). Agora ocupa 3/5, e o mapa 2/3 da seção.
- **Homens e mulheres** (`painel_genero`, migração `20260930170000`): estimado pelo primeiro nome (terminação + listas de exceção), marcado na tela como estimativa. Hoje: 676 homens, 328 mulheres, 40 sem estimativa.
- **Por onde chegaram** (`painel_canal`): Instagram, Facebook, WhatsApp, Google, TikTok, YouTube, outros sites, direto, indicação de membro, sem registro, a partir da origem gravada no cadastro (desde 25/09) e do link de indicação. Hoje: 1.000 por indicação de membro (antes de 25/09 só havia isso), 41 Instagram, 2 Facebook.
- **Faixa etária:** o banco não tem data de nascimento em nenhum cadastro. A tela diz isso e o caminho: campo opcional no cadastro e no perfil, e leitura pelo KYC. Não se inventa idade.
- A function junta os dois cálculos em paralelo; se o perfil falhar, o resto do painel continua.

**Prova:** `tests/painelInvestidor.test.mjs` (+2), suíte completa, lint 0 erros, build; funções executadas em produção.

## 📈 DIR-190 — Painel do Investidor: dinheiro real por área, funil, leilão ao vivo e mapa do Brasil; lucro do dia vai para o Financeiro (30/09/2026)

**Dono, com quatro prints da Visão Geral:** "essa visão geral tem que ser foda e muito mais intuitiva, contemplar tudo, inclusive vendas dos parceiros, loja virtual; quanto do depósito vai pra compra, pra arremate, pra leilão esperando; volume financeiro por área em tempo real; quantas pessoas entrando; mapa do Brasil com calor por estado, clicável. Estou apresentando para muito investidor." Depois: "é mais de 40 mil em depósito, precisamos ser diligentes, números reais". E: "tira a parte do lucro dali e põe no setor financeiro numa aba".

**Auditoria (números do banco, conciliados com o Mercado Pago em 30/09):** dinheiro que entrou pelo gateway = **R$ 45.538 em 153 pagamentos** (carteira R$ 34.858, operação R$ 457, loja PIX/cartão R$ 3.373, PDV R$ 5.027, adesão R$ 1.497, passaporte e frete R$ 327). O painel mostrava R$ 33.973 (só depósitos pós-marco) e "Valor Total R$ 43.185" somando depósitos com compras pagas com o saldo desses mesmos depósitos. Os 65 depósitos "cancelados" (R$ 36.661) foram conferidos um a um no gateway: 63 vencidos, 1 recusado, 1 pendente, nenhum aprovado sem crédito. Fluxo do depositado (R$ 35.315): arremates 31%, loja 13%, reservado em lances 1,5%, parado nas carteiras 52%. Ponto de atenção que fica marcado na tela: 54 arremates encerrados "aguardando pagamento" somam R$ 300 mil nominais e ficam fora do caixa.

**O que muda:**

- **`public.painel_investidor(_dias)`** (migração `20260930160000`): uma função no banco calcula tudo, com uma regra só: entrada = pago no gateway (nunca uso de saldo); áreas por `painel_area(kind, source)`; histórico importado (Nexus) à parte; mapa por estado do endereço ou pelo DDD (`painel_ddd_uf`), 92% da base localizada. Só o `service_role` executa.
- **`api/functions/painelInvestidor.js`**: só admin/super_admin, chama a RPC com o período.
- **Página `PainelInvestidor`** (só admin): período (hoje, 7, 30 dias, tudo), recálculo a cada minuto, KPIs, entrada por área e por mês, faixa "para onde vai o depósito", funil, compras por área, leilão ao vivo, **mapa do Brasil** com calor por estado (contornos `@svg-maps/brazil`, clicável, com painel do estado e top 6), cadastros por dia, últimos pagamentos.
- **Visão Geral:** sai o "Lucro líquido — HOJE"; entra o botão "Painel do Investidor". Resumo, métricas e árvore ficam como estavam.
- **Setor Financeiro:** aba nova **Lucro do dia** (`LucroDoDiaTab`, mesma regra de dinheiro real).

**Prova:** `tests/painelInvestidor.test.mjs` (5 testes), suíte 3977/3977, lint 0 erros, build; a função rodou em produção com 30 dias e devolveu os números acima.

## 📱 DIR-189 — Topo sem clarão: a tela do navegador tem a cor da barra e o entalhe é opaco (30/09/2026)

**Dono, com o print da home no iPhone:** "em cima da tela o degradê branco está atrapalhando a logo e a navegação."

**Causa:** desde o `viewport-fit=cover` (DIR-179) a barra fixa do topo fica debaixo da barra de status do iPhone. Ela é translúcida com desfoque (`backdrop-filter`), e o corpo da página (`body`) era branco, a cor padrão do navegador. Na borda de cima o desfoque do WebKit puxa a cor da tela do navegador, o branco, e a espalha pelos primeiros pixels: um clarão em degradê exatamente na área da barra de status, sobre a logo. Em Chromium não aparece (o desfoque não vaza a borda), por isso nunca foi visto nos testes de tela.

**O que muda:**

- **`html`/`body` com a cor da barra** (`#21222B`) em `index.css`. Telas claras (Recepção, Live Shop, painel com tema claro e páginas com `data-painel-nav`) marcam o body com `data-tema-claro` e voltam ao branco, para a barra clara não ganhar um vazamento escuro.
- **Faixa do entalhe opaca** na própria barra: um `linear-gradient` na cor da barra cobre exatamente `var(--nz-entalhe)`; abaixo dele, a barra continua translúcida como sempre. Nada atravessa o desfoque na área da barra de status.
- `Layout.jsx` marca o body num efeito colocado antes de qualquer retorno antecipado (regra dos hooks).

**Segundo print do dono (organograma em tela cheia):** o mesmo degradê claro aparecia sobre um painel opaco (`fixed inset-0 bg-gray-950`), onde nenhum desfoque nosso existe. Logo o degradê é o **material da barra de status do próprio Safari**, que segue o esquema de cores da página: sem declaração, com o aparelho em modo claro, vem branco. Por isso entram `<meta name="color-scheme" content="dark">` e `color-scheme` no `<html>` (o Layout troca para `light` nas telas claras), e o `theme-color` passa a ser a cor da barra (`#21222B`, também no manifesto do app). E, em tela cheia, o painel do organograma recua pela área segura (`--nz-entalhe` e `safe-area-inset-*`): o botão "Sair da tela cheia" ficava debaixo da barra de status e o dono não conseguia mais fechar.

**Terceiro print (11:43, depois da publicação):** continuava igual. Auditoria: a tela do print não é a Visão Geral do super admin, é o **Organograma da própria pessoa** (`MinhaArvoreRede`, DIR-186), que tem a sua própria tela cheia — e a correção só tinha entrado na Visão Geral. Agora existe a classe `nz-tela-cheia` (index.css) e ela vale para todo painel `fixed inset-0` com barra de comandos no topo: Organograma da pessoa, Visão Geral, Visão Canvas, editor de posição de imagem e a apresentação do Encontro da Mentalidade. O painel do Concurso e os percursos do Parceiro ficaram de fora de propósito (têm padding próprio por tamanho de tela; entram se alguém reclamar).

**Prova:** `tests/topoSemClarao.test.mjs` (5 testes), suíte completa, lint 0 erros, build; iPhone emulado com entalhe de 59 px: Home com body escuro e faixa opaca, Meus Pedidos com body branco. A confirmação final do degradê é no aparelho do dono, porque o material é do Safari.

## 📱 DIR-188 — Organograma no celular: a pílula de expandir/recolher cabe num dedo (30/09/2026)

**Dono, com o organograma aberto no iPhone:** "ficou top, porém no celular quando expando não está recolhendo. Veja toda a experiência do cliente, teste todos os botões, volta e tals."

**O que foi medido (iPhone emulado, toques de verdade):** a pílula com o número de indicados media 21×16 px aberta e 14×11 px depois do "Ver tudo", porque encolhia junto com o zoom. Um toque a 8 px acima dela caía no avatar, que abre o perfil da pessoa. Era isso que parecia "não recolhe": o dedo nunca acertava a pílula. Todos os outros botões (Expandir todos, Recolher, Ver tudo, zoom, busca, Lista/Organograma, fechar perfil) já funcionavam no toque.

**O que muda (`TreeHierarchy.jsx` + `index.css`):**

- **Contra-escala:** quando o zoom reduz, a pílula cresce na mesma proporção e nunca fica menor que o tamanho base, em qualquer nível de zoom, nos dois modos (organograma e lista).
- **Halo de toque invisível** ao redor da pílula (8 px; 14 px em tela de toque): o toque perto dela vai para ela, não para o avatar.
- **No celular** (ponteiro grosso) a pílula tem no mínimo 40×26 px, e o número de indicados aparece sempre, aberta ou fechada, para ela ser mais larga.
- Os moldes da árvore não mudam: mesmas posições, mesmos cartões, mesmos botões.

**Prova:** `tests/organogramaToque.test.mjs` (3 testes), suíte 3967/3967, lint 0 erros, build; percurso de toque no iPhone emulado: pílulas 40×26 em todos os zooms, toque 8 px acima da pílula recolhe (antes abria o perfil), expandir/recolher/Ver tudo/zoom/busca/modos conferidos.

## 📦 DIR-187 — Acompanhar Pedido: a entrega vem da transportadora, com código real, link dos Correios e ocorrência à vista (30/09/2026)

**Dono, com quatro prints (o site, os Correios, o WhatsApp do cliente):** "preciso de uma atualização nos acompanhamentos dos pedidos e deixar mais transparente para os clientes. Deu como entregue, porém no Melhor Envio está em trânsito e nos Correios outra informação. O cliente precisa ter acesso a todas as informações pelo nosso site, e não pensar que o erro é nosso." Depois: "a partir do escritório virtual desse cliente, analise e corrija o painel — precisa ter link do site do Correio, código aparecendo e etc."

**O caso:** pedido `cd75eeb9…` do Herbert (Pinça culinária, 11/09). A tela dizia "Entregue! 🎉" com as quatro etapas verdes e "código de rastreio LZCD75EEB9". Nos Correios, o objeto AV091829611BR estava com "endereço inexistente".

**As duas causas:**

1. `catalog_sales.status = 'entregue'` significa **venda paga** (palavra herdada do Base44 — `api/_lib/statusVenda.js`). A tela e o card traduziam o status de *pagamento* como status de *entrega*: toda venda paga virava "Entregue". 44 pedidos estavam assim sem nenhum `delivered_at`.
2. `tracking_code` nasce como número interno (`LZ` + começo do id — 74 pedidos). Não rastreia nada. O código real dos Correios ficava só no Melhor Envio.

**O que muda:**

- **`src/lib/rastreio.js` (JS puro, testado no Node):** a situação da entrega sai só do que a transportadora, o Melhor Envio, a logística (`fulfillment_status`) ou o próprio cliente disseram. "Entregue" só com prova (`delivered_at`, evento "objeto entregue", confirmação de recebimento). "Objeto **não** entregue" nunca conta como entrega. Ocorrência (endereço inexistente, aguardando retirada, destinatário ausente, extravio, devolução…) vira etapa **Atenção na entrega**, com o texto da transportadora e **o que fazer**.
- **`api/functions/rastrearPedido.js`:** consulta o Melhor Envio (detalhe do pedido → transportadora/serviço) e o **Melhor Rastreio** (rastreador público do Melhor Envio, que devolve os eventos dos Correios e das outras transportadoras), deriva a situação com a mesma biblioteca da tela, guarda em `raw_base44.rastreio` (cache de 5 min) e grava só o que foi provado: `tracking_code` real no lugar do LZ, `carrier` (pelo código: AV…BR = Correios, mesmo com etiqueta J&T cancelada no Melhor Envio), `shipped_at`, `delivered_at`, `fulfillment_status`. Devolve também o endereço que foi para a etiqueta (`raw_base44.address`, que o cliente não enxergava). **Nunca** mexe em `status` (pagamento) nem em dinheiro. Etiqueta cancelada no Melhor Envio **não** vira pedido cancelado. Limite por IP e por pedido. Cada pedido que alguém abre se corrige sozinho — vale para todos os pedidos, sem migração.
- **Descobertas na prova real (30/09):** a API pública dos Correios (`proxyapp.correios.com.br`) responde 403 a qualquer servidor — por isso o Melhor Rastreio. O token do Melhor Envio não tem o escopo `shipping-tracking` (o endpoint `/shipment/tracking` responde 403); `melhorEnvioOAuth.js` já pede o escopo, mas **só vale depois que o dono autorizar de novo** em Configurações → Melhor Envio. Sem isso o sistema funciona do mesmo jeito, pelo Melhor Rastreio.
- **Tela Acompanhar Pedido:** manchete e linha do tempo (6 etapas datadas: pedido, pagamento, postado, a caminho, saiu para entrega, entregue) pela situação real; aviso laranja da ocorrência; **código real** com Copiar; botões **Rastrear no site dos Correios** (ou da transportadora) e **Ver no Melhor Rastreio**; transportadora e serviço; **número do pedido** (LZ…) separado, para o suporte; lista de **movimentações da transportadora** com data e local; "Consultado na transportadora às…" e **Atualizar agora**; consulta a cada minuto enquanto não termina; mensagem do WhatsApp já com número, código e produto.
- **Card "Meus Pedidos" e modal de detalhes:** selo pela entrega (Pago · em preparação / Postado / A caminho / Saiu para entrega / Atenção na entrega / Entregue), nunca pelo status de pagamento; modal mostra Nº do pedido, rastreio real e link da transportadora.
- **Confirmar recebimento** passa a gravar `delivered_at` e `fulfillment_status = 'entregue'` — quem recebeu é a prova.

**Prova:** `tests/rastreioDoPedido.test.mjs` (13 testes, incluindo o cenário do Herbert com a resposta real do Melhor Rastreio → "Atenção na entrega"), suíte 3964/3964, lint 0 erros, build; a function no preview oficial respondeu para o pedido do Herbert: código AV091829611BR, Correios, 4 movimentações (postado 14/09 no RJ, saiu para entrega 28/09 em SP, "não entregue — endereço inexistente" 28/09), link dos Correios, carrier corrigido de "JeT" para "Correios", `shipped_at` gravado; print da tela com esses dados.

## 🏢 DIR-186 — Organograma: a operação de cada pessoa a um toque, com nome de empresa (30/09/2026)

**Dono, com o print do menu:** "preciso de uma visualização da árvore das pessoas, um botão em algum lugar dentro do painel — não a Visão Geral do super admin, o local onde cada pessoa vê dela pra baixo. Precisa ser de fácil acesso, um atalho pra cá." E sobre o nome: "não coloca Minha Rede, coloca outro nome mais empresarial, não pode parecer multinível." E sobre o molde: "não pode ficar um botão grande, precisa entrar apenas o ícone, e quando clicar aparece o nome."

**O que já existia:** a árvore da própria pessoa (ela no topo, a operação dela abaixo — `MinhaArvoreRede`) vivia numa aba do Painel do Distribuidor chamada "Minha Árvore", sem porta de entrada fora dali.

**O que muda:**

- **Nome: Organograma.** Termo de qualquer empresa, mostra hierarquia sem sugerir rede de indicação. A aba, o título da tela, o cartão de estatística e o texto dos links de cadastro passam a usar esse nome; "árvore genealógica" e "Minha Árvore" saem das telas da pessoa (teste `organograma.test.mjs` proíbe voltar).
- **Atalho na grade do menu** (`menuAtalhos.js`): azulejo ORGANOGRAMA, no mesmo molde dos outros, para todo mundo logado, antes de Favoritos. Abre `/painel?tab=rede` direto na aba (a página já lia `?tab=` da URL).
- **No painel, só o ícone.** Na barra do celular, ao lado de "Pedido", entra um botão só com o ícone de organograma (`aria-label`/`title` "Organograma"). Ao tocar, a aba abre e o nome aparece na barra, no lugar da seção atual.
- A Visão Geral do super admin fica exatamente como está.

**Prova:** suíte 3951/3951 (`organograma.test.mjs`, 3 testes), lint 0 erros, build ok, print do menu (azulejo entre Arremates e Favoritos) e do painel (ícone ao lado de Pedido, título Organograma).

---

## 📚 DIR-185 — Sem teto de mil: a árvore inteira, os números batendo e "Mover para" no celular (30/09/2026)

**Dono, com o print do Sistema de Alavancagem em "1000 no sistema":** "a plataforma está com 1000 cadastros desde ontem, não estou conseguindo editar e mexer na árvore genealógica, precisamos de uma auditoria diligente." Depois da auditoria: "tentei mover uma pessoa para outra pessoa, tem um lápis e o lápis não estava aparecendo. Resolva tudo. Não podemos ter nenhum limite nesses números. Estamos numa operação gigante em São Paulo, milhões de pessoas sendo impactadas, os números precisam bater e se anteceder a qualquer problema."

**A auditoria, antes de mexer:**

| | painel | banco |
|---|---|---|
| pessoas no sistema | 1000 | 1.035 |
| novos em 30 dias | 358 | 430 |
| pessoas fora da árvore | — | 34 |

- **"1000" era um teto, não um número.** `NetworkOverview` pedia `AppUser.list("-created_date", 1000)`, e o Supabase corta em 1.000 por chamada de qualquer jeito. A base cruzou 1.000 em 29/09; desde então o contador trava e cada cadastro novo empurra mais uma pessoa para fora da tela — quem não está carregado não pode ser editado, movido nem promovido. O mesmo teto já valia, em silêncio, para as comissões (1.573 linhas, pedidas com "5000") e para o CRM.
- **"Novos (30 dias)" errava por 72.** A métrica lia só `created_date`, campo herdado do Base44 que está vazio em 117 cadastros (72 dos últimos 30 dias) — `new Date(null)` vira 1970 e a pessoa some da janela.
- **O lápis sumia no celular do dono** (super_admin no banco) porque `isSuperAdmin` lia só a cópia do aparelho.
- **7 de 8 gravações em 24h voltaram 400** da rota `adminUpdateUser` sem dizer o motivo.

**O que muda:**

- `src/lib/paginacao.js` (puro, testado): `tudoEmPaginas(buscarPagina)` lê em páginas de 1.000 até vir uma página curta, com trava contra loop. O adaptador ganha `listAll(orderBy)` e `filterAll(filters, orderBy)`, e `list`/`filter` com limite acima de 1.000 passam a paginar em vez de receber 1.000 calados. Sem limite continua UMA chamada, como sempre. A ordem é estável (desempate por `id`), então nenhuma linha se repete nem some entre páginas — conferido no banco: página 1 = 1000, página 2 = 35, distintos = 1035 = total.
- Toda tela de base inteira (árvore, usuários, cargos, minha rede, licenciados, pedidos, painel do lojista, parceiros, proteção) usa `listAll`. O teste `semTetoDeMil.test.mjs` proíbe "1000"/"500" voltar nessas listas.
- `src/lib/dataDeCriacao.js`: `created_date` quando existe, senão `created_at`; sem data não conta como novo. "Novos (30 dias)" e a coluna de data da lista usam isso.
- `isSuperAdmin` vale o papel lido do **banco** ao carregar a árvore (`papelNoBanco`); o cache do aparelho fica só de reserva.
- Os moldes da árvore ficam **como eram** (dono: "não mexe nos moldes, está perfeito, só o lápis precisa reaparecer"). Um botão "Mover para outra pessoa" chegou a subir no #545 e saiu em seguida: o lápis já era desenhado sempre que `canEdit` fosse verdadeiro — o que faltava era o papel certo.
- `adminUpdateUser`: a recusa 400 passa a dizer quais campos chegaram (`campos_recebidos`); a tela já mostra a mensagem do servidor.

**Prova:** suíte 3948/3948 (`semTetoDeMil.test.mjs` novo, 9 testes; `lgpdEtapa1` passa a contar o 4º caminho de leitura, também protegido), lint 0 erros, build ok, paginação conferida no banco.

---

## 🪙 DIR-184 — As moedas vazavam pra dentro das visões (24/09/2026)

**Dono, olhando o DIR-183:** "ficou quase perfeito. As moedas só têm que
aparecer quando eu abrir o quadro. Cliquei na Jornada, vai sumir tudo, vai
aparecer só a Jornada."

**🔴 O que eu errei no DIR-183:** prendi o `PlacarDoDia` à capa e **esqueci que
a moeda em fatias, o Modelo, o "Onde estou × Executivo Ideal", as Missões e a
votação do MvM são blocos SEPARADOS**, todos presos a `mostrarPainel` — e o
`mostrarPainel` ainda tinha dois escapes:

```
const mostrarPainel = naCapaDasVisoes || (visao === 'lista' && !celular) || painelAberto;
                                          └─ dentro da Lista, no computador   └─ GRAVADO no aparelho
```

O segundo é o grave: `painelAberto` vem do `localStorage`, então **quem já
tinha o painel aberto via a moeda dentro de TODA visão** — exatamente o que o
dono viu. Prender metade do placar à capa e deixar a outra metade solta não é
meio conserto: é o defeito inteiro, porque quem vazava era justo a moeda.

Agora é uma frase só, sem escape: `const mostrarPainel = naCapaDasVisoes;`

**🗑️ E o "Eu no Game" morreu junto**, de propósito. Ele recolhia/fixava o
placar (pedido de 08/09). Com a capa sendo o lugar onde tudo aparece e a visão
o lugar onde nada de placar aparece, ele não tem mais dois estados pra
alternar — botão morto, e estado morto gravado no aparelho é o que volta a
assombrar seis meses depois. A escolha do dono virou a estrutura da tela.

**Provas:**
- `tests/capaDasVisoes.test.mjs` (11) — dois testes novos travam a regra pelos
  DOIS lados: a frase do `mostrarPainel` não pode ganhar escape, e todo bloco
  do placar tem que estar preso a ela (varre `moeda-pizza`, `moeda-pizza-modelo`
  e `votacao-mvm-toggle` no arquivo e exige a guarda antes de cada um).
- Mutação: repus o escape do `painelAberto` → caiu o 1º; soltei a moeda em
  fatias da capa → caiu o 2º. Restaurei, verde.
- `tests/navegador/placarDoDia.spec.mjs` (5) no Chromium real.
- Suíte **3691/3691** · lint 0 erro · build OK.

---


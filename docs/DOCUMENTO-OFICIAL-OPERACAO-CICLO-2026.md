# Documento Oficial de Operação — Ciclo Executivo set/2026 → fev/2027

> **Status:** análise oficial dos dois PDFs entregues pelo dono em 06/09/2026 e o que foi
> transferido pro painel (X-Performance → Quadro Geral da pessoa).
> **Hierarquia:** vale abaixo de `src/docs/VERDADE.md` e ao lado de
> `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md` (comissão) — este cobre o **ciclo executivo**
> (funções, metas, entregáveis, modelo econômico, score, rituais). Comissão continua no outro.
> **Fonte no código:** `src/lib/documentoOficial.js` (cada número com a página).

## 1. Os dois documentos

| Documento | Páginas | O que é | O que traz pro painel |
|---|---|---|---|
| **DOCUMENTO OFICIAL DE OPERAÇÃO** — Modelo Integrado de Governança, Performance e Participação Econômica — Leilão NoZap — Ciclo Executivo de 6 meses (set/2026–fev/2027) | 46 | A lei do ciclo | 8 cargos C-level com missão, meta e entregáveis; as 5 camadas econômicas; Score Executivo; Escada de Ascensão; rituais da semana |
| **RESUMO EXECUTIVO INTEGRADO** — Captação, Operação, Estoque, Distribuição, Consórcio, Marketing e Escala | 41 | O plano financeiro/operacional | Budget mensal por pessoa (Camada 1); Estrutura de Liderança (9 cargos, com CFO e CTO); 12 números do dashboard; regra FUNÇÃO → KPI → META → ENTREGÁVEL → PRAZO → VESTING |

**O ciclo oficial acaba em fevereiro/2027**, não em março. Março/2027 fica no programa da
mentoria como pós-ciclo: a conversa de sociedade com quem acendeu os três portões (DIR-74).

## 2. A separação que o documento exige (p. 4) — e que o painel passou a respeitar

O documento separa nove coisas: cargo funcional · posição institucional · participação
econômica · carteira de capital · equity · entregáveis · performance · critérios de ascensão ·
governança. No painel isso virou:

- **Posição** = o nível do painel de controle (`careerLevels.js`): Diretor Operacional,
  Diretoria Executiva, Fundador, Conselheiro, CEO, Livoo Live, Embaixador, Sócio Executivo.
- **Função** = o trabalho (`funcoes.js`): COO, CRO, CCO, CMO, CBDO, CAO, CXO, CEO, CFO, CTO
  (oficiais) + Sócio Executivo, Livoo Live, Embaixador (níveis que também são trabalho).
- A pessoa tem **as duas**. "Diretor Operacional" não vira função nenhuma; o documento
  **sugere** a função pelo nome (Emanuel → COO, Jean → CMO, Luciano → CCO, Karen → CBDO,
  Aline → CAO, Cristiano → CRO, José Amâncio → CXO, Luiz → CEO) e o dono decide no painel da
  pessoa (`xgame_participantes.funcao_titulo`). Nome por extenso vale: "diretora financeira" → CFO.

## 3. Os cargos (Documento p. 5, 17–32; Resumo p. 9)

| Sigla | Titular | Missão | Captação/mês | Metas mensais oficiais | Budget (Resumo p. 9) |
|---|---|---|---|---|---|
| CEO | Luiz Alberto Sant'Anna Filho | Construir valor empresarial | — | sem número (conduz a formação) | R$ 50.000 |
| CCO | Luciano Pinheiro | Construir a máquina de capital | R$ 350 mil | 44 reuniões de investimento | R$ 50.000 |
| COO | Emanuel Alves | Transformar estratégia em execução | R$ 150 mil | 44 reuniões · 1 ponto de retirada/mês · 1 loja a cada 2 meses | R$ 7.000 |
| CRO | Cristiano Ribeiro | Construir receita e rede | R$ 150 mil | 44 reuniões · 20 vendedores · 5 licenciados · 30 influenciadores · treinamento diário | R$ 7.000 |
| CMO | Jean Aranha | Construir audiência que compra | — | 1.000 pessoas/dia (a partir de outubro) · 330–350 cadastros/dia · 5 lives/semana | R$ 4.000 |
| CBDO | Karen Castro | Transformar relacionamento em negócio | R$ 250 mil | 44 reuniões · 2 parcerias estratégicas | R$ 20.000 |
| CAO | Aline Mendes | Transformar crescimento em organização | R$ 100 mil | 44 reuniões | R$ 10.000 |
| CXO | José Amâncio | Proteger as relações humanas e institucionais | — | sem número | — |
| CFO | (sem titular) | — | — | **não consta** em documento nenhum (só o cargo, no Resumo p. 10) | — |
| CTO | Avila (futuro) | — | — | não consta | R$ 2.000 |

Captação do time: 350 + 250 + 150 + 150 + 100 = **R$ 1 milhão/mês**, R$ 6 milhões no ciclo.
Máquina de reuniões (p. 16): 2/dia × 22 dias = 44/mês por pessoa; 220 no time; ticket R$ 50 mil;
20 fechamentos = R$ 1 mi; conversão 1 a cada 11.

## 4. O modelo econômico do executivo — cinco camadas (p. 11 e 44)

1. **Remuneração da função** — valor mensal individual (o fixo do X-Game, `fixo_mes`).
2. **Carteira de capital** — 1% ao mês sobre a carteira construída, contratos de 12 meses
   (no painel: soma das oportunidades `fechado_100` dos últimos 12 meses × 1%).
3. **Diretoria Operacional** — pool de 0,5% das vendas Brasil (R$ 5 mi → R$ 25 mil ÷ 7 ≈ R$ 3.571).
4. **Equity** — 0,5% da companhia mediante cumprimento do ciclo (R$ 125 mil a R$ 25 mi de valuation).
5. **Governança** — por convite: Diretoria Executiva, Fundadores, Conselho, cada um com a sua fatia dos 10% do topo.

**Os 10% do topo (a divisão oficial do negócio — dono, 06/09/2026, e `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md` §6):**
CEO 3% · Livoo Live 2% · Embaixador 1% · Conselheiros 1% (pool) · Fundadores 1% (pool) ·
Diretoria Executiva 0,5% (pool) · Diretoria Operacional 0,5% (pool) · Sócio Executivo 1% sobre a
própria estrutura = **10%**. É o que o motor paga (`api/_lib/arvoreOficial.js`); o painel só lê
(`PARTICIPACAO_TOPO` em `documentoOficial.js`). O PDF do ciclo escreve "1% Brasil + Mundial" pros
pools de governança; a tabela oficial acima é a que vale.

## 5. Score Executivo (p. 42) e Escada de Ascensão (p. 43)

Score: Resultado financeiro 40 · Entregáveis da função 25 · Desenvolvimento da equipe 15 ·
Cultura e formação 10 · Organização e accountability 10. Linha: **80%**. "O equity não é
adquirido pelo decurso dos seis meses: permanência + cultura + entrega + resultado."

No painel o score é **lido**, não digitado: resultado = média do % das metas; entregáveis =
cards entregues ÷ cards; equipe = tarefas H8 feitas ÷ planejadas; cultura = tarefas de
formação (mentoria) feitas ÷ planejadas; organização = dias com planejamento gerado ÷ dias
passados. Sem dado aparece "sem dado", nunca zero escondido.

Escada: 1 Top College + X-EOS → 2 Mentalidade do Diretor + CEO → 3 Diretoria Operacional →
4 Entregáveis + Performance → 5 0,5% de equity → 6 convite (Dir. Executiva · Fundadores · Conselho).

## 6. Rituais (p. 16, 23, 33–35)

- **Segunda 9h–12h:** Bloco 1 Formação (45–60 min, Top College + X-EOS) · Bloco 2 Organização (~2 h).
  "A manhã organiza. A tarde produz."
- **2 reuniões de investimento por dia**, inclusive segunda.
- **Lives:** seg, ter, qua, qui, sáb (5/semana).
- **Conexão Sexta:** opcional; quem participa transfere a produção pro sábado.
- Roadmap: set Estruturação · out 1.000 entradas/dia · nov Escala · dez Aceleração · jan Consolidação · fev Fechamento e avaliação.

## 7. O que entrou no painel (06/09/2026)

- `src/lib/documentoOficial.js` — CICLO, CARGOS_OFICIAIS, CAPTACAO, CAMADAS, pool/equity/carteira, SCORE_EXECUTIVO, ESCADA, POSICOES, RITUAIS, DASHBOARD.
- `src/lib/funcoes.js` — FUNCOES viram as oficiais + as do painel; `funcaoDaPessoaComOrigem` (escolhida → documento → painel → nada); apelidos por extenso.
- `src/lib/metasPessoa.js` — chaves novas (captação, reuniões de investimento, vendedores, licenciados, influenciadores, parcerias, pontos de retirada, lojas, lives, entradas, cadastros); METAS_MODELO das oficiais sai do documento (marcado `oficial`); progresso lê `captacao_oportunidades` e `app_users` novos; `fracoesDoScore`, `carteiraDeCapital`.
- `src/lib/programaMentoria.js` — cada mês com a fase oficial.
- `PainelOficial.jsx` — cartão da função, cinco camadas, Score + escada, semana oficial.
- Quadro Geral · Pessoa: posição × função (menu com os dois grupos), cartão oficial, camadas, score. Metas: etiqueta "oficial". Programa: fase. Semana: rituais.

## 8. O que o documento NÃO tem (não foi inventado)

Fixo por cargo (só o budget do Resumo) · rateio definitivo dos pools · regra de equity parcial abaixo de 80% ·
linha de reporte · CFO (titular e metas) · Embaixador e Livoo Live definidos · holding e cadeia societária ·
metas de "contatos"/"alunos" · 1:1 e relatórios formais. Onde o painel precisou de número aí, ficou marcado "sugestão".

## 9. Ambiguidades pro dono decidir

1. Quem são os 7 integrantes do pool de 0,5% da Diretoria Operacional? O CEO entra? O CXO fica fora?
2. Equity: abaixo de 80% é parcial ou nada?
3. As adesões de vendedor/licenciado do CRO (R$ 54.940/mês) contam na captação de R$ 150 mil?
4. Dias do fixo: 24 (dono, `DIAS_FIXO`) × 22 dias produtivos (documento p. 16) — o painel usa 24 pro fixo e 22 só na conta de reuniões.
5. CFO e CTO: fixo, metas e titular.

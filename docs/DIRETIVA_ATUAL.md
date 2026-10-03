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


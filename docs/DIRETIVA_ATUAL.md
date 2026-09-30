## 📦 DIR-187 — Acompanhar Pedido: a entrega vem da transportadora, com código real, link dos Correios e ocorrência à vista (30/09/2026)

**Dono, com quatro prints (o site, os Correios, o WhatsApp do cliente):** "preciso de uma atualização nos acompanhamentos dos pedidos e deixar mais transparente para os clientes. Deu como entregue, porém no Melhor Envio está em trânsito e nos Correios outra informação. O cliente precisa ter acesso a todas as informações pelo nosso site, e não pensar que o erro é nosso." Depois: "a partir do escritório virtual desse cliente, analise e corrija o painel — precisa ter link do site do Correio, código aparecendo e etc."

**O caso:** pedido `cd75eeb9…` do Herbert (Pinça culinária, 11/09). A tela dizia "Entregue! 🎉" com as quatro etapas verdes e "código de rastreio LZCD75EEB9". Nos Correios, o objeto AV091829611BR estava com "endereço inexistente".

**As duas causas:**

1. `catalog_sales.status = 'entregue'` significa **venda paga** (palavra herdada do Base44 — `api/_lib/statusVenda.js`). A tela e o card traduziam o status de *pagamento* como status de *entrega*: toda venda paga virava "Entregue". 44 pedidos estavam assim sem nenhum `delivered_at`.
2. `tracking_code` nasce como número interno (`LZ` + começo do id — 74 pedidos). Não rastreia nada. O código real dos Correios ficava só no Melhor Envio.

**O que muda:**

- **`src/lib/rastreio.js` (JS puro, testado no Node):** a situação da entrega sai só do que a transportadora, o Melhor Envio, a logística (`fulfillment_status`) ou o próprio cliente disseram. "Entregue" só com prova (`delivered_at`, evento "objeto entregue", confirmação de recebimento). "Objeto **não** entregue" nunca conta como entrega. Ocorrência (endereço inexistente, aguardando retirada, destinatário ausente, extravio, devolução…) vira etapa **Atenção na entrega**, com o texto da transportadora e **o que fazer**.
- **`api/functions/rastrearPedido.js`:** consulta o Melhor Envio (rastreio + transportadora/serviço) e o rastreio público dos Correios, deriva a situação com a mesma biblioteca da tela, guarda em `raw_base44.rastreio` (cache de 5 min) e grava só o que foi provado: `tracking_code` real no lugar do LZ, `carrier`, `shipped_at`, `delivered_at`, `fulfillment_status`. **Nunca** mexe em `status` (pagamento) nem em dinheiro. Limite por IP e por pedido. Cada pedido que alguém abre se corrige sozinho — vale para todos os pedidos, sem migração.
- **Tela Acompanhar Pedido:** manchete e linha do tempo (6 etapas datadas: pedido, pagamento, postado, a caminho, saiu para entrega, entregue) pela situação real; aviso laranja da ocorrência; **código real** com Copiar; botões **Rastrear no site dos Correios** (ou da transportadora) e **Ver no Melhor Rastreio**; transportadora e serviço; **número do pedido** (LZ…) separado, para o suporte; lista de **movimentações da transportadora** com data e local; "Consultado na transportadora às…" e **Atualizar agora**; consulta a cada minuto enquanto não termina; mensagem do WhatsApp já com número, código e produto.
- **Card "Meus Pedidos" e modal de detalhes:** selo pela entrega (Pago · em preparação / Postado / A caminho / Saiu para entrega / Atenção na entrega / Entregue), nunca pelo status de pagamento; modal mostra Nº do pedido, rastreio real e link da transportadora.
- **Confirmar recebimento** passa a gravar `delivered_at` e `fulfillment_status = 'entregue'` — quem recebeu é a prova.

**Prova:** `tests/rastreioDoPedido.test.mjs` (12 testes, incluindo o cenário do Herbert → "Atenção na entrega"), suíte completa, lint, build; print do pedido do Herbert no preview oficial antes de produção.

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


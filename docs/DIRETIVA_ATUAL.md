# DIRETIVA ATUAL — Leilão NoZap

> Este arquivo contém **só a diretiva de engenharia em vigor agora** — o que
> está autorizado a acontecer nesta rodada, e nada além disso. Quando uma
> diretiva nova for definida (pelo dono ou pela OpenAI), este arquivo é
> **substituído** pelo conteúdo da diretiva nova; a versão anterior não se
> perde — vai para `docs/HISTORICO_DIRETIVAS.md` no mesmo commit, e o
> resultado dela para `docs/RELATORIOS_EXECUCAO.md`.
>
> Formato fixo desta diretiva e de toda diretiva futura:
> `docs/PADRAO_DIRETIVAS.md`.

---

## DIR-10 — CRM: dono vê o negócio inteiro, rede vê só a própria rede (Fase 1)

**Emitida por:** dono (Luiz), diretamente, depois de pedir análise sênior do
CRM (print da tela "CRM - Gestão de Clientes" com quase todos os cards
zerados apesar de vendas, usuários e estoque reais).
**Data:** 27/08/2026.
**Objetivo:** investigação de código encontrou 5 causas raiz independentes
pros zeros, confirmadas por leitura direta (arquivo/linha), sem suposição.
Regra confirmada com o dono antes de corrigir: o CRM PRECISA continuar
puxando de verdade "de mim pra baixo" pra quem tem rede de indicação
(licenciado/vendedor só vê a própria rede — senão o CRM vira uma lista de
clientes de todo mundo, inútil pra ele); só o **super_admin** enxerga o
negócio inteiro, circulando entre todas as estruturas, sem filtro nenhum.
**Escopo autorizado:**
1. `src/lib/crmUnifiedCustomers.js` e
   `src/components/licensing/CentralVendas/CrmClientesTab.jsx` ganham um
   bypass do filtro de rede quando `currentUser.role === 'super_admin'` —
   nesse caso, todos os `AppUser`/`CatalogSale`/`Auction` entram, sem passar
   por `getNetworkDescendantIds`.
2. Pra quem NÃO é super_admin (visão de rede normal), corrigir o campo usado
   pra achar "de quem é a venda" — hoje só olha `licensee_id`, mas a venda
   real pode estar em `seller_id`/`anchor_id`/`owner_id` dependendo do canal
   (mesma constatação já usada em `LicenseeOrders.jsx`).
3. "Volume em Negociação" chamava uma função de servidor
   (`/api/functions/adminDataProxy`) que nunca existiu no projeto — sempre
   404, sempre zero. Trocar pelo mesmo caminho genérico de entidade já usado
   por Customer/Seller/etc (`Negotiation` já está mapeada no adapter).
4. "Produtos em Estoque" buscava só os 500 produtos mais recentes por data
   de criação, sem o filtro `catalog_active` usado na vitrine pública — podia
   nunca alcançar o estoque real. Usar o mesmo filtro do catálogo.
5. "Arrematantes" checava uma coluna (`arrematante_context`) que é TEXT no
   banco, tratada como se fosse objeto (`.enabled`) — nunca funciona, e
   ninguém escreve esse campo. Trocar por dado real: quem tem
   `Auction.winner_id` de verdade vira "arrematante" (só se nenhum papel
   mais específico — leiloeiro/investidor/influencer/vendedor/licenciado —
   já se aplicar).
**Fora do escopo / proibido (fica pra Fase 2, registrada mas não iniciada):**
- Persistir automaticamente em `customers` quando uma venda/arremate
  acontece (hoje é só calculado na tela, nada é gravado) — mudança de
  arquitetura de dados, diretiva própria.
- Unificar a tabela `sellers` (cadastro manual "Novo Vendedor") com o papel
  "Vendedor" calculado a partir de `app_users.is_seller` — hoje são dois
  "vendedor" desconectados; decisão de qual vira fonte única fica pra depois.
- Checar/corrigir RLS (Row Level Security) do Supabase — não confirmável só
  por código; peço ao dono conferir no painel do Supabase se `customers`,
  `sellers` e `negotiations` têm policy de leitura pra `anon`/`authenticated`
  (achado à parte, sem acesso direto ao Supabase nesta sessão).
**Regras fixas:** nenhuma além da DIR-5 a DIR-9 (não mexer em produção sem
autorização, reportar no formato Protocolo-Mestre, preview real testado
antes de pedir aprovação).
**Status:** EM VIGOR.

---

## Estado agora

**DIR-10 (Fase 1) em execução.** DIR-1 a DIR-9 concluídas (ver
`docs/RELATORIOS_EXECUCAO.md`). Pendências ainda abertas, sem relação com
esta diretiva:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI.
- Fase 3 do Financeiro (conciliação automática, decisão sobre Open
  Finance).
- Fase 2 do CRM (persistência automática em `customers`, unificação de
  "Vendedor") — depois da Fase 1 no ar.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.

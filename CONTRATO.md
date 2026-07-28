# 📘 CONTRATO — Leilão NoZap

> **Este é o mapa-mestre do projeto.** Se você chegou agora (time do front), **comece por aqui.**
> Documento em português. Última revisão: 28/07/2026.

---

## 🎯 Como o trabalho é dividido

```
BACKEND (aqui / Base44)          GITHUB              FRONT (VSEL / time do front)
──────────────────────    →   (super base)    →    ────────────────────────────
Coda a lógica de servidor      ponto de              Puxa o código do GitHub
+ funções + dados              encontro              Pluga e desenvolve as telas
+ documenta em português       comum                 Lê este CONTRATO + MUDANCAS.md
```

- **Backend** é responsabilidade do time de servidor (codado no ambiente Base44).
- **Front** é responsabilidade do time do VSEL.
- **Ponto de encontro** = este repositório no **GitHub** + o banco no **Supabase**.
- **Toda mudança de backend é registrada em `MUDANCAS.md`** (o diário de bordo, em português).

---

## 🗄️ 1. Onde ficam os DADOS

Os dados NÃO ficam no GitHub. GitHub guarda **código**. Os dados ficam no **Supabase**:

- **Projeto Supabase:** `gezvviyegtxytnwjkrjv` (região `sa-east-1`)
- **URL:** `https://gezvviyegtxytnwjkrjv.supabase.co`
- **Cliente do front:** `src/api/supabaseClient.js`

Esta é a **fonte única de verdade** dos dados (lotes, usuários, transações, pedidos, saldos).

---

## 🔌 2. Como o FRONT lê e escreve DADOS

O front **não fala direto** com o Supabase na maioria dos casos. Ele usa um **adapter** que
mantém a mesma interface do antigo SDK Base44, pra o código não quebrar.

- **Arquivo do adapter:** `src/api/base44Adapter.js`
- **Como importar:** `import { base44 } from '@/api/base44Client';`

### Ler dados
```js
const lotes = await base44.entities.LoteRecebido.list('-created_date', 100);
const um    = await base44.entities.LoteRecebido.get(id);
const filtrados = await base44.entities.LoteRecebido.filter({ status: 'recebido' });
```

### Escrever dados (create / update / delete)
```js
await base44.entities.LoteRecebido.create({ nome_lote: 'X', marketplace: 'Outros' });
await base44.entities.LoteRecebido.update(id, { status: 'comprado' });
await base44.entities.LoteRecebido.delete(id);
```

> ⚠️ **Regra importante da escrita:** quando o usuário logado é **admin / super_admin** (ou tem
> cargo de estoque), o adapter **não escreve direto no Supabase** — ele roteia a escrita para a
> função de servidor `/api/functions/entityWrite` (que usa a chave de service_role). Isso respeita
> as regras de segurança (RLS) do banco. O front **não precisa fazer nada diferente** — é só chamar
> `base44.entities.X.create/update/delete` normalmente.

### Mapa Entidade → Tabela
A tradução entre o nome usado no código (ex: `LoteRecebido`) e a tabela real no Supabase
(ex: `lotes_recebidos`) está no topo do `src/api/base44Adapter.js` (constante `TABLE_MAP`).

---

## ⚙️ 3. Como o FRONT chama o BACKEND (funções)

```js
// forma recomendada
const resp = await base44.functions.invoke('nomeDaFuncao', { ...payload });

// forma curta (equivalente)
const resp = await base44.functions.nomeDaFuncao({ ...payload });
```

- As funções de backend vivem em **`api/functions/`** (rodam na Vercel) e em `base44/functions/` (legado).
- **Padrão oficial:** priorizar `api/functions/`. O diretório `base44/functions/` é legado da
  migração e não deve receber código novo sem combinar antes.
- Cada função de backend tem, no topo do arquivo, um **cabeçalho em português** explicando o que
  ela faz, quem a chama e a data da última mudança (ver seção 5).

---

## 🔐 4. Segredos / Chaves

As chaves (Supabase service_role, ASAAS, Brevo, Mercado Livre, etc.) **nunca** ficam no código.
Elas vivem como **secrets de ambiente** e são acessadas no servidor via `process.env` / `Deno.env`.

- ❌ Nunca colar uma chave dentro de um arquivo `.js` / `.ts`.
- ✅ Chave nova = cadastrar como secret de ambiente e ler via `process.env.NOME_DA_CHAVE`.

---

## 📝 5. Cabeçalho padrão das funções de backend

Toda função nova de backend deve começar com este bloco (em português):

```js
// ─────────────────────────────────────────────
// FUNÇÃO: nomeDaFuncao
// O QUE FAZ: [explicação curta em português]
// USADO POR: [qual tela / fluxo do front chama esta função]
// ÚLTIMA MUDANÇA: DD/MM/AAAA
// ─────────────────────────────────────────────
```

Assim qualquer dev do front abre a função e entende em segundos.

---

## 🛡️ 6. Regra de Ouro (para todos)

1. **Nunca quebrar o que já funciona em produção.** Tem dinheiro real, usuário real, transação real.
2. **Backend** (funções, banco, integrações financeiras) → mexe o time de backend.
3. **Front** (telas, componentes, layout) → mexe o time do front.
4. Mudança em área crítica (pagamento, comissão, saldo, estoque, auth) = **combinar antes**.
5. **Toda mudança de backend vai pro `MUDANCAS.md`.**

---

## 🚦 7. Fluxo de entrega (resumo)

1. Backend é codado e documentado aqui.
2. A mudança é registrada no `MUDANCAS.md`.
3. O código sobe pro GitHub (via sincronização do repositório).
4. O time do front puxa do GitHub, lê o `MUDANCAS.md`, e integra.
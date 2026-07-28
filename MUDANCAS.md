# 📋 MUDANÇAS — Diário de Bordo do Backend

> **Para o time do front:** toda alteração feita no backend é registrada aqui, em português,
> da mais recente pra mais antiga. Leia este arquivo pra saber **o que mudou a cada entrega.**
>
> **Formato de cada registro:**
> - **Data** · **O que mudou** · **Arquivos** · **Impacto no front** · **Risco**

---

## 28/07/2026 — Correção da escrita de lotes (Estoque de Lotes)

- **O que mudou:** os botões da tela de Estoque de Lotes (Salvar, Arrematamos, Avançar status,
  Excluir) voltaram a usar o adapter oficial (`base44.entities.LoteRecebido`), que escreve no
  Supabase via `entityWrite`. Foi removido um atalho antigo que apontava para o banco errado
  (causava erros "ID not found" e HTTP 502).
- **Arquivos:** `src/pages/EstoqueLotes.jsx`
- **Impacto no front:** nenhum. É o mesmo padrão de escrita usado no resto do app.
- **Risco:** 🔴 Alto (mexe em estoque) — mas foi um retorno ao padrão já comprovado, sem lógica nova.

---

## 28/07/2026 — Criação da documentação-base do projeto

- **O que mudou:** criados os arquivos `CONTRATO.md` (mapa-mestre do projeto) e `MUDANCAS.md`
  (este diário de bordo), ambos em português, para alinhar backend e front pelo GitHub.
- **Arquivos:** `CONTRATO.md`, `MUDANCAS.md`
- **Impacto no front:** só documentação — nada no código funcional mudou.
- **Risco:** 🟢 Baixo.

---

<!--
  MODELO PARA PRÓXIMOS REGISTROS (copie o bloco abaixo pra cima, logo após esta linha):

## DD/MM/AAAA — Título curto da mudança

- **O que mudou:** [descrição em português]
- **Arquivos:** [lista de arquivos tocados]
- **Impacto no front:** [o que o time do front precisa saber / fazer, ou "nenhum"]
- **Risco:** 🟢 Baixo / 🟡 Médio / 🔴 Alto — [motivo]
-->
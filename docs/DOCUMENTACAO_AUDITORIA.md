# Documentação do Sistema de Auditoria (SIA) - Base44

Este documento descreve a implementação oficial da Auditoria de Comissões no backend da Base44, composta por duas funções principais: `commissionPilot` e `auditUserCommissions`.

## 1. Visão Geral

O sistema de auditoria foi migrado para o backend (Edge Functions) para garantir performance e acesso direto aos dados seguros.

| Função | Arquivo Fonte | Objetivo |
| :--- | :--- | :--- |
| **commissionPilot** | `functions/commissionPilot.ts` | Auditar uma **Venda Específica** (Real ou Simulada). Recalcula toda a distribuição e compara com o banco. |
| **auditUserCommissions** | `functions/auditUserCommissions.ts` | Auditar um **Usuário Específico**. Varre todo o histórico dele em busca de duplicidades e erros. |

---

## 2. Acesso (URLs no Frontend)

Para acessar as ferramentas visuais de auditoria no navegador:

| Ferramenta | Slug / URL | Descrição |
| :--- | :--- | :--- |
| **Painel de Auditoria** | `/CommissionPilot` | Interface principal para carregar snapshots, simular vendas e ver gráficos de divergência. |
| **Gerador de Snapshot** | `/AuditSnapshot` | Ferramenta para baixar o backup atual do banco de dados (JSON) para análise offline. |

---

## 3. Função: `commissionPilot` (Auditoria de Venda)

Esta função é o motor de cálculo. Ela reconstrói a árvore de distribuição para uma venda e diz quem deveria ter recebido o quê.

### Como Funciona
1.  **Entrada:** Recebe um `sale_id` (para auditar venda real) ou `simulate_amount` + `simulate_licensee_id` (para simulação).
2.  **Cadeia:** Reconstrói a linha ascendente (uplines) do vendedor no momento.
3.  **Cálculo:** Aplica as "Regras de Ouro" (13% Licenciado, Pools de Diretoria, Hierarquia).
4.  **Comparação:** Se for venda real, busca os registros na tabela `commission_record` e compara com o calculado.

### Regras de Distribuição (Vigentes no Código)

| Cargo | Percentual | Regra |
| :--- | :--- | :--- |
| **Licenciado Catálogo** | 13.0% | Multinível (Captura ou Sobe) |
| **Trainee a Distribuidor** | Variável | Multinível (Se o abaixo não tem, sobe) |
| **Diretor a Fundador** | 0.5% - 3.0% | **Pool Global** (Rateio entre todos os qualificados) |

> **Nota:** Se ninguém na hierarquia for elegível para um nível multinível, o valor vai para a empresa (`company_rollup`).

### Exemplo de Uso (JSON Payload)
```json
{
  "sale_id": "uuid-da-venda-aqui"
}
```
*Retorna:* Objeto `simulation` (esperado) e `actual_records` (real).

---

## 3. Função: `auditUserCommissions` (Auditoria de Usuário)

Esta função serve para "passar um pente fino" na conta de um usuário específico em busca de anomalias financeiras.

### O que ela verifica?
1.  **Duplicidades:** Se o usuário recebeu mais de um registro de comissão para a mesma venda e mesmo cargo (Erro crítico).
2.  **Rateio de Diretor:** Se o usuário é diretor, verifica se ele recebeu valor IGUAL aos outros diretores na mesma venda (apontando erros de arredondamento ou exclusão).
3.  **Soma de Percentuais:** Verifica se o total distribuído na venda fecha em ~26%.
4.  **Âncora Ausente:** Verifica se a venda teve o registro obrigatório de 13% do Licenciado.

### Exemplo de Uso (JSON Payload)
```json
{
  "email": "usuario@exemplo.com"
}
```
*Retorna:* Um relatório de integridade (`summary`) com listas de `checks` (duplicidades, erros, etc).

---

## 4. Onde Encontrar no Código

As implementações oficiais estão em:
-   `/functions/commissionPilot.ts`
-   `/functions/auditUserCommissions.ts`

Estas funções são executadas via Edge Functions do Supabase e podem ser chamadas pelo painel administrativo ou via API (com permissão de Admin).

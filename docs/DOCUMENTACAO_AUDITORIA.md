# Documentação da Auditoria de Comissões (SIA)

Este documento descreve como o sistema calcula as comissões "Esperadas" para auditar contra os valores "Reais" pagos.

## 1. Regras de Cálculo (Lógica Esperada)

O sistema segue a seguinte ordem de prioridade para distribuir a comissão de uma venda:

### A. Identificação do Vendedor (Âncora)
- O usuário que realizou a venda (`licensee_id`) é considerado o **Âncora**.
- Se a venda não tiver um licenciado vinculado, nenhuma comissão é distribuída para a rede (vai 100% para a empresa).

### B. Tabela de Percentuais (Total: 26%)
O sistema tenta distribuir os seguintes percentuais sobre o valor total da venda:

| Cargo / Nível | Percentual | Tipo de Distribuição |
| :--- | :--- | :--- |
| **Licenciado Catálogo** | 13.0% | Multinível (Hierarquia) |
| **Trainee** | 0.5% | Multinível (Hierarquia) |
| **Executivo** | 0.5% | Multinível (Hierarquia) |
| **Kit Start** | 1.0% | Multinível (Hierarquia) |
| **Plano Líder** | 1.0% | Multinível (Hierarquia) |
| **Plano Lojista** | 3.0% | Multinível (Hierarquia) |
| **Distribuidor** | 1.0% | Multinível (Hierarquia) |
| **Diretor** | 0.5% | Pool Global (Rateio) |
| **Diretoria** | 0.5% | Pool Global (Rateio) |
| **CEO** | 3.0% | Pool Global (Rateio) |
| **Conselheiro** | 1.0% | Pool Global (Rateio) |
| **Fundador** | 1.0% | Pool Global (Rateio) |

### C. Regras de Distribuição

#### 1. Distribuição Multinível (Hierárquica)
Para cargos até "Distribuidor":
- **Se o Âncora (Vendedor) possui o cargo ou superior:** O próprio Âncora recebe essa fatia.
- **Se o Âncora não possui o cargo:** O sistema sobe a rede de indicação (Uplines) até encontrar alguém que tenha o cargo.
- **Se ninguém na linha ascendente tiver o cargo:** O valor sobra para a empresa (`Company Rollup`).

#### 2. Distribuição Global (Pool de Diretoria)
Para cargos de "Diretor" acima (Diretoria, CEO, Conselheiro, Fundador):
- O valor é dividido igualmente entre **TODOS** os usuários qualificados no sistema com aquele cargo (excluindo o usuário "Site Oficial").
- Não depende da linha de indicação; é um rateio global.

---

## 2. Como Verificar (Auditar)

Para verificar se as comissões pagas estão corretas:

1.  Acesse o **Painel de Auditoria** em `/CommissionPilot`.
2.  Carregue o arquivo de snapshot (`audit-snapshot-2026-02-16.json` ou gere um novo na aba Online).
3.  Observe a coluna **Status** na tabela de resultados:
    -   🟢 **OK:** O valor pago no banco (`Real`) é igual ao calculado pelas regras (`Esperado`).
    -   🔴 **Divergente:** O valor pago é diferente (ou faltou pagamento, ou pagou a mais).
4.  Clique na linha da venda para ver os detalhes:
    -   **Trace de Auditoria:** Mostra passo a passo como o sistema calculou o valor esperado ("Quem é o âncora", "Quem captura o nível Trainee", etc).
    -   **Comparativo:** Mostra lado a lado quem recebeu no Banco vs Quem deveria ter recebido.

### Links Úteis
- **Painel de Auditoria:** [http://localhost:5173/CommissionPilot](http://localhost:5173/CommissionPilot)
- **Gerar Novo Snapshot:** [http://localhost:5173/AuditSnapshot](http://localhost:5173/AuditSnapshot) (Requer Login Admin `erbrito...`)

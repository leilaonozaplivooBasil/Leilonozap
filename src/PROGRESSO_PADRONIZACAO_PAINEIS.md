# 📋 PROGRESSO — PADRONIZAÇÃO DOS PAINÉIS DO LEILÃO NOZAP

**Última atualização:** 25/05/2026
**Status global:** Fase A ✅ Concluída · Fase B ✅ Concluída (parcial com critério técnico) · Fase C ⏳ Pendente

---

## 🎯 CONTEXTO INICIAL

O projeto possui **9 painéis internos** (Super Admin, Vendedor, Arrematante, Loja Virtual, Lojista, Licenciado, Investidor, Leiloeiro, Admin) que apresentavam:
- Fragmentação visual entre painéis
- Falhas de UX (login duplicado, ausência de "voltar ao Portal", etc.)
- Headers inconsistentes
- Código órfão em `Licensing.jsx` (abas sem trigger)

**Decisão estratégica do usuário:**
- Manter painel "Arrematante" integrado à Home (`/leiloes`) com barra superior de controle
- Manter login separado para lojistas (com aviso prévio)
- Criar infraestrutura comum padronizada

---

## ✅ FASE A — INFRAESTRUTURA COMUM (CONCLUÍDA)

| Item | Arquivo | Status |
|------|---------|--------|
| Componente reutilizável de header | `components/common/PortalPageHeader.jsx` | ✅ Criado |
| Hook para refresh de painel em retorno de aba | `hooks/usePanelVisibility.js` | ✅ Criado |
| Limpeza de código morto (abas órfãs) | `pages/Licensing.jsx` | ✅ Limpo |

### 📦 Componentes/Hooks disponíveis para uso futuro

**`PortalPageHeader`** — Cabeçalho padronizado com:
- Botão "← Voltar ao Portal" (configurável)
- Ícone Lucide com gradient + ring
- Título + subtítulo
- Suporte a 8 cores accent (emerald, violet, amber, blue, green, purple, red, cyan)
- Slot para ações extras (botões à direita)
- Slot para badge opcional
- Mobile-friendly (min-h 44px no botão voltar)

**`usePanelVisibility`** — Hook que:
- Detecta retorno do usuário ao app (visibilitychange + focus)
- Throttle de 3s para evitar refresh spam
- Polling opcional configurável
- Callback `onVisible` para refazer fetch

---

## ✅ FASE B — APLICAÇÃO DO PADRÃO (CONCLUÍDA COM CRITÉRIO)

### Painéis migrados:
| Painel | Decisão | Justificativa |
|--------|---------|---------------|
| ✅ **SuperAdminPanels** | MIGRADO | Painel admin puro, sem fluxo especial |

### Painéis avaliados e mantidos com header próprio:
| Painel | Decisão | Justificativa técnica |
|--------|---------|----------------------|
| ⏭️ **SellerPanel** | NÃO MIGRAR | Acesso via link mágico (email/WhatsApp), fora do fluxo do Portal |
| ⏭️ **CarteiraInvestidor** | NÃO MIGRAR | Tem `navigate(-1)` contextual mais útil que ir ao Portal |
| ⏭️ **CRMInvestidores** | NÃO MIGRAR | Muitos botões de ação no header — substituir quebraria UX |
| ⏭️ **LojistaDashboard** | NÃO MIGRAR | Login independente — lojista não vem do Portal |

**Princípio aplicado:** REGRA DE OURO — não quebrar fluxos que já funcionam.

---

## ⏳ FASE C — PENDENTE (PRÓXIMOS PASSOS)

### 🔵 PRIORIDADE 1 — Aplicar `usePanelVisibility` em painéis com dados críticos
Painéis que precisam refresh ao voltar de outra aba/app:

- [ ] `pages/CarteiraInvestidor.jsx` — saldos podem desatualizar (alocação/depósitos)
- [ ] `pages/CRMInvestidores.jsx` — capital de investidores muda em tempo real
- [ ] `pages/LojistaDashboard.jsx` — novas vendas precisam aparecer
- [ ] `pages/SellerPanel.jsx` — saldo + vendas dependem de sync

**Como aplicar:**
```js
import { usePanelVisibility } from "@/hooks/usePanelVisibility";

usePanelVisibility({
  onVisible: () => fetchDashboard(), // sua função de refresh
  enabled: !!user, // só quando logado
});
```

---

### 🟡 PRIORIDADE 2 — Aplicar `PortalPageHeader` em painéis admin secundários
Painéis admin que ainda têm header próprio mas SE BENEFICIARIAM do padrão:

- [ ] `pages/AdminUsers.jsx` (Gerenciar Senhas)
- [ ] `pages/Financial.jsx` (Dashboard Financeiro)
- [ ] `pages/TransactionHistory.jsx`
- [ ] `pages/ProductManagement.jsx`
- [ ] `pages/CatalogManagement.jsx`
- [ ] `pages/NetworkOverview.jsx`
- [ ] `pages/ActivePartners.jsx`
- [ ] `pages/InfluencersDashboard.jsx`
- [ ] `pages/SystemDiagnostics.jsx`

**Como aplicar (exemplo):**
```jsx
import PortalPageHeader from "@/components/common/PortalPageHeader";
import { Crown } from "lucide-react";

<PortalPageHeader
  icon={Crown}
  title="Gerenciar Usuários"
  subtitle="Controle de acessos e senhas"
  accentColor="violet"
/>
```

---

### 🟢 PRIORIDADE 3 — Avaliações pendentes (decisão do usuário)
- [ ] Decidir se o **Portal hub** (`/`) deve ter contagem de painéis disponíveis por usuário
- [ ] Avaliar se `PainelSelector` precisa de melhorias visuais
- [ ] Definir se logo do leiloeiro / corretora deve aparecer nos headers de painéis admin
- [ ] Considerar tema dark/light por painel (atualmente tudo dark)

---

### 🔴 PRIORIDADE 4 — Pontos sensíveis NÃO RESOLVIDOS (apenas mapeados)
**NÃO TOCAR sem autorização explícita:**

1. **Login duplicado do Lojista** — fluxo separado em `LojistaDashboard.jsx` (linha ~213)
   - Decisão atual: MANTER (com aviso prévio ao lojista)
   - Por quê: Auth própria via `lojistaAuth` backend, não usa AppUser

2. **Painel Arrematante** — integrado à Home (`/leiloes`)
   - Decisão atual: MANTER integrado
   - Por quê: É a tela principal do usuário comum, separar quebraria UX

3. **Acesso via link mágico do Vendedor** — `AcessoVendedor.jsx` → `SellerPanel.jsx`
   - Token de 7 dias gerado por `generateSellerAccessToken`
   - Validado por `validateSellerAccessToken`
   - Decisão: NÃO mexer, está validado

---

## 🛡️ ARQUIVOS CRIADOS NESTA SESSÃO

```
✅ components/common/PortalPageHeader.jsx  (100 linhas — novo)
✅ hooks/usePanelVisibility.js              (criado — novo)
✅ PROGRESSO_PADRONIZACAO_PAINEIS.md       (este arquivo — novo)
```

## 🛡️ ARQUIVOS MODIFICADOS NESTA SESSÃO

```
✏️ pages/SuperAdminPanels.jsx  (header migrado + contador)
✏️ pages/Licensing.jsx          (abas órfãs removidas — 9 linhas a menos)
```

## 🛡️ ARQUIVOS QUE NÃO FORAM TOCADOS (proteção ativa)

```
🔒 pages/AuctionRoom.jsx, pages/Cart, pages/MarketplaceLotes (CONGELADOS)
🔒 Toda a camada financeira (functions/asaas*, functions/processCatalog*, etc.)
🔒 Layout.jsx, App.jsx, index.css, tailwind.config.js
🔒 Painéis com fluxo especial (Lojista, Vendedor, Investidor, CRM)
```

---

## 📌 COMO RETOMAR AMANHÃ

**Cole isto no chat:**

> "Vamos retomar a padronização dos painéis. Leia `PROGRESSO_PADRONIZACAO_PAINEIS.md` e me confirme onde paramos. Depois quero seguir com [PRIORIDADE 1 / 2 / 3 — escolha qual]."

---

## ✅ CHECKLIST DE INTEGRIDADE (sessão de 25/05/2026)

- [x] Zero quebras em produção
- [x] Zero impacto em lógica financeira
- [x] Zero alteração em arquivos congelados
- [x] REGRA DE OURO respeitada (não quebrar o que funciona)
- [x] Componentes novos = uso opcional (nada quebra se não usado)
- [x] Decisões técnicas documentadas para auditoria futura
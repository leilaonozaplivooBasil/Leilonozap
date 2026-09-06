import { LayoutDashboard, ShoppingBag, Award, Shield, Wallet, Package, PackagePlus, Gavel, Trophy, TrendingUp, Store, Receipt, Handshake, BarChart3, Users, GraduationCap, UserRound, Brain } from 'lucide-react';
// caminho relativo (e não o atalho '@/') de propósito: assim este arquivo
// também roda na suíte do node, que não resolve o alias do Vite. É o que
// permite testar o agrupamento do menu como qualquer outra regra da casa.
import { normalizeLevels } from './careerLevels.js';

// 🧭 PONTO 85 — FONTE ÚNICA das abas do Painel de Alavancagem.
// Antes essa lista estava DUPLICADA em LicensingSidebar.jsx (rail do desktop) e
// DashboardTabsList.jsx (abas do mobile), cada uma com suas próprias regras de
// exibição — foi exatamente isso que deixou a conta lojista (Sofia) sem
// "Central de Vendas" e sem "Admin". Agora existe um lugar só.
//
// PADRÃO OFICIAL: os 4 itens aparecem para TODO usuário logado, sem exceção.
// O que muda por cargo NÃO é a existência do item, é o CONTEÚDO do "Admin":
//   • admin / super_admin → administração completa da plataforma
//   • demais usuários     → administração DA PRÓPRIA LOJA (foto, nome e o
//                           link da loja pra compartilhar)
export const LICENSING_TABS = [
  { value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
  { value: 'catalogo', label: 'Loja & Vendas', icon: ShoppingBag },
  { value: 'plano-carreira', label: 'Carreira', icon: Award },
  { value: 'admin', label: 'Admin', icon: Shield },
];

// Abas válidas para o parâmetro ?tab= da URL. Inclui 'minha-loja' por
// compatibilidade: links antigos continuam abrindo a administração da loja.
export const VALID_LICENSING_TABS = [...LICENSING_TABS.map((t) => t.value), 'minha-loja', 'xgame-admin'];

// 🧭 FASE 2 DA UNIFICAÇÃO — a lateral do Painel de Alavancagem passa a ser o
// ÍNDICE ÚNICO de tudo o que o usuário tem. Nesta fase NENHUM painel foi
// absorvido: os itens novos são LINKS que abrem a rota que já existe hoje.
//
// Dois tipos de item:
//   • { type: 'tab',  value }  → troca a aba dentro do próprio painel (como hoje)
//   • { type: 'link', to }     → navega para a rota existente
//
// ⛔ FORA daqui por decisão do dono: Parceiro de Compra (captação privada,
// preto/dourado, acesso por sessão) e Live Shop (vitrine ao vivo co-branded).
// 🔓 REGRA OFICIAL (Gabriel, 08/08/2026): estoque próprio e PDV valem DO VENDEDOR
// PARA CIMA. O vendedor pode ter um estoque mínimo em casa e fechar pedido com o
// cliente na rua, recebendo em dinheiro. O influenciador é o ÚNICO de fora:
// ele divulga, não estoca e não tira pedido.
const CARGOS_SEM_OPERACAO = ['influenciador', 'influencer', 'usuario'];

// enabled_panels (Super Admin) continua com a palavra final quando preenchido.
export function podeVerOperacao(user) {
  if (!user) return false;
  const painels = Array.isArray(user.enabled_panels) ? user.enabled_panels : [];
  if (painels.length > 0) return painels.includes('lojista');
  const cargos = normalizeLevels(user.career_levels);
  if (!cargos.length) return false;
  return !cargos.every((c) => CARGOS_SEM_OPERACAO.includes(c));
}

// 🎓 DIR-57 — SEÇÕES DA LOJA & VENDAS (o caixa) e DA TOP COLLEGE (a formação).
// A fronteira é uma pergunta só: nesta tela a pessoa está sendo FORMADA ou está
// OPERANDO? Formada → Top College. Operando → Leilão NoZap.
// Ficam exportadas porque o seletor interno da Central de Vendas usa as MESMAS
// listas — fonte única, sem lista paralela pra desencontrar depois.
export const SECOES_LOJA = [
  { value: 'catalogo-produtos', label: 'Sua Loja Virtual', icon: Store },
  { value: 'catalogo-home', label: 'Relatório da Loja', icon: BarChart3 },
  { value: 'catalogo-pedidos', label: 'Pedidos', icon: Package },
  { value: 'catalogo-clientes', label: 'Venda Direta', icon: Users },
  { value: 'catalogo-comissoes', label: 'Comissões', icon: Wallet },
];
export const SECOES_TOP_COLLEGE = [
  // "CRM" morreu como nome (DIR-57): palavra genérica de software não combina
  // com uma faculdade própria. O valor da aba continua o mesmo — link antigo
  // (?catalogTab=catalogo-crm) segue abrindo no lugar certo.
  { value: 'catalogo-crm', label: 'O Método', icon: GraduationCap, marca: '/marca/marca-xeos.webp' },
  // 🧠 06/09/2026 — o ENCONTRO DA MENTALIDADE: "um lugar estratégico, não na
  // parte administrativa, junto com os 8 Hábitos" — a segunda-feira num espaço
  // só (Executivo · Diretor · CEO): apresentação, tópico pela IA, cronômetro
  // 15+45+120 e as demandas direcionadas ao vivo.
  { value: 'catalogo-encontro', label: 'Mentalidade', icon: Brain },
  { value: 'catalogo-vendedores', label: 'Time', icon: Handshake },
  // 🏛️ DIR-72 — X-PERFORMANCE: o planejamento executivo da diretoria. Fica
  // AQUI, e não solto no menu, porque é a Top College que forma — o quadro de
  // entregáveis é a mesma faculdade cobrando o que ensinou.
  { value: 'catalogo-xperformance', label: 'X-Performance', icon: Trophy },
];

export function getLicensingGroups(user) {
  // 🧭 ORDEM POR PRIORIDADE DE USO: Visão Geral → Conta → Operação (dia a dia de
  // quem tem loja/estoque) → Loja & Vendas → Top College → Leilões → Admin.
  //
  // 🎓 DIR-57 — `colapsar` diz que o grupo vira UM ícone com menu flutuante.
  // Antes isso era um `if (grupo.title === 'Operação')` escrito DUAS vezes (na
  // lateral do desktop e no menu do celular); agora é dado, num lugar só.
  const grupos = [
    {
      title: 'Visão Geral',
      items: [
        { type: 'tab', value: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Minha Conta',
      colapsar: { chave: 'group:conta', label: 'Minha Conta', icon: UserRound },
      items: [
        { type: 'link', to: '/Carteira', label: 'Carteira', icon: Wallet },
        { type: 'link', to: '/MyCatalogOrders', label: 'Minhas Compras', icon: Package },
      ],
    },
  ];

  if (podeVerOperacao(user)) {
    grupos.push({
      title: 'Operação',
      colapsar: { chave: 'group:operacao', label: 'Operação', icon: Store },
      items: [
        { type: 'link', to: '/painel', label: 'Meu Painel', icon: Store },
        { type: 'link', to: '/painel/pdv', label: 'PDV', icon: Receipt },
        { type: 'link', to: '/painel/estoque', label: 'Estoque', icon: Package },
        { type: 'link', to: '/painel/comprar-estoque', label: 'Comprar Estoque', icon: PackagePlus },
      ],
    });
  }

  grupos.push(
    {
      title: 'Vender',
      items: [
        {
          // a chave da lateral continua sendo `tab:catalogo` — quem já arrastou
          // este ícone de lugar mantém a posição salva
          type: 'tab', value: 'catalogo', label: 'Loja & Vendas', icon: ShoppingBag,
          subItens: SECOES_LOJA,
        },
      ],
    },
    {
      // 🎓 O DEPARTAMENTO DA TOP COLLEGE dentro do painel do cliente: tudo que
      // FORMA a pessoa. Metas veio de "Operação", onde estava solta — meta é
      // acompanhamento, não chão de loja.
      title: 'Top College',
      colapsar: { chave: 'group:topcollege', label: 'Top College', icon: GraduationCap, marca: '/marca/marca-topcollege.webp' },
      items: [
        // 🎓 DIR-59 — no menu, este item NÃO escreve "O Método": entra a logo
        // inteira da X-eos no lugar do texto (ordem do dono). `marcaCompleta`
        // quer dizer exatamente isso — a marca SUBSTITUI o rótulo. O `label`
        // continua existindo porque vira o texto alternativo da imagem e o
        // nome pra busca no menu do celular.
        { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-crm', label: 'O Método', icon: GraduationCap, marca: '/marca/marca-xeos.webp', marcaCompleta: '/marca/marca-xeos-lockup.webp', legenda: 'Estrutura de operações e expansão' },
        { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-encontro', label: 'Mentalidade', icon: Brain },
        { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-vendedores', label: 'Time', icon: Handshake },
      { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-xperformance', label: 'X-Performance', icon: Trophy },
        { type: 'tab', value: 'plano-carreira', label: 'Carreira', icon: Award },
        { type: 'link', to: '/Evoluir', label: 'Evoluir Nível', icon: TrendingUp },
        // 🎯 06/09/2026 — "Metas" saiu do menu: "acaba com ela e joga pra
        // dentro". As metas de cada pessoa moram no Quadro Geral dela, no
        // X-Performance. A rota /Metas continua existindo pra link antigo.
        // 🎮 06/09/2026 — o Admin X-GAME deixou de ser item do menu: virou a
        // GESTÃO dentro do X-Performance ("junta o admin do X-Game com o
        // X-Performance, que lá eu já administro a gamificação e as demandas").
        // O valor de aba `xgame-admin` continua válido só pra link antigo
        // abrir no lugar certo (Licensing redireciona).
      ],
    },
    {
      title: 'Leilões',
      items: [
        { type: 'link', to: '/painel-arrematante', label: 'Arrematante', icon: Gavel },
        { type: 'link', to: '/MyWinnings', label: 'Meus Arremates', icon: Trophy },
      ],
    },
    {
      title: 'Admin',
      colapsar: { chave: 'group:admin', label: 'Admin', icon: Shield },
      items: [
        { type: 'tab', value: 'admin', label: 'Admin', icon: Shield },
        // 🤝 Aprovação dos pedidos de mercadoria consignada — só admin
        ...((user?.role === 'admin' || user?.role === 'super_admin')
          ? [{ type: 'link', to: '/painel/consignado', label: 'Consignado', icon: Handshake }]
          : []),
      ],
    }
  );

  return grupos;
}

// 🔑 DIR-57 — identidade de cada item na lateral. É a chave que guarda a ordem
// que o usuário arrastou, então precisa ser única: duas seções da mesma aba
// (O Método e Time vivem as duas em `catalogo`) não podem colidir.
export function chaveDoItem(item) {
  if (item.type !== 'tab') return item.to;
  return item.catalogTab ? `tab:${item.value}:${item.catalogTab}` : `tab:${item.value}`;
}

// 🧭 DIR-57 — converte um item do menu numa entrada de menu flutuante. Dentro do
// Painel de Alavancagem (onTabChange presente) troca a aba na hora; fora dele,
// vira link pra rota que já existe. Um lugar só, usado pelo desktop e pelo
// celular — era essa duplicação que deixava sub-item sem navegação nenhuma.
export function entradaFlutuante(item, onTabChange) {
  const base = { label: item.label, icon: item.icon, marca: item.marca, marcaCompleta: item.marcaCompleta, legenda: item.legenda };
  if (item.type === 'tab') {
    if (onTabChange) return { ...base, onClick: () => onTabChange(item.value, item.catalogTab) };
    const sufixo = item.catalogTab ? `&catalogTab=${item.catalogTab}` : '';
    return { ...base, to: `/Licensing?tab=${item.value}${sufixo}` };
  }
  return { ...base, to: item.to };
}
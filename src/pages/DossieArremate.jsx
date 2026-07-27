import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Shield, Zap, Layers, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DossieArremate() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Toolbar — escondida na impressão */}
      <div className="sticky top-16 z-40 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-12 print:p-0 print:max-w-none">
        {/* CAPA */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white p-12 rounded-lg print:rounded-none print:min-h-screen print:flex print:flex-col print:justify-center mb-12">
          <div className="border-l-4 border-emerald-400 pl-6 mb-12">
            <p className="text-emerald-300 text-sm tracking-[0.3em] uppercase mb-2">Dossiê Técnico-Institucional</p>
            <h1 className="text-5xl font-bold leading-tight mb-4">Sistema Inteligente de Arremate</h1>
            <p className="text-2xl text-slate-300 font-light">Plataforma NoZap</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
            <div>
              <p className="text-emerald-300 uppercase tracking-wider mb-1">Documento</p>
              <p className="text-white">Diligência de Transferência de Gestão Técnica</p>
            </div>
            <div>
              <p className="text-emerald-300 uppercase tracking-wider mb-1">Versão</p>
              <p className="text-white">1.0 — Junho/2026</p>
            </div>
            <div>
              <p className="text-emerald-300 uppercase tracking-wider mb-1">Classificação</p>
              <p className="text-white">Confidencial · Uso Interno</p>
            </div>
            <div>
              <p className="text-emerald-300 uppercase tracking-wider mb-1">Destinatário</p>
              <p className="text-white">Gestão Técnica Entrante</p>
            </div>
          </div>
        </div>

        {/* 1. SUMÁRIO EXECUTIVO */}
        <Section number="01" title="Sumário Executivo">
          <p className="text-slate-700 leading-relaxed mb-4">
            O <strong>Sistema Inteligente de Arremate</strong> é a infraestrutura tecnológica proprietária da NoZap que conecta{" "}
            <strong>capital de investidores</strong> à <strong>operação de arremate em leilões externos</strong>, sob curadoria
            algorítmica e governança automatizada.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            A plataforma opera em <strong>quatro camadas independentes e interconectadas</strong>, com lógica financeira validada,
            integrações ativas com o gateway de pagamento ASAAS e inteligência de precificação proprietária (PrecificaVivo).
          </p>
          <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 mt-6">
            <p className="text-slate-800">
              <strong>Modelo de Negócio:</strong> Intermediação inteligente entre capital privado e oportunidades de arremate, com
              remuneração por taxa de operação e participação em resultados.
            </p>
          </div>
        </Section>

        {/* 2. DIAGRAMA INSTITUCIONAL */}
        <Section number="02" title="Diagrama Institucional Oficial">
          <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-slate-400">
            <div className="space-y-8">
              <FluxoCamada
                numero="I"
                titulo="ORIGINAÇÃO"
                cor="amber"
                icone={<Layers className="w-6 h-6" />}
                etapas={["Captação de Lotes", "IA PrecificaVivo", "Curadoria Admin", "Publicação no Marketplace"]}
              />
              <Arrow />
              <FluxoCamada
                numero="II"
                titulo="CAPITAL"
                cor="emerald"
                icone={<Zap className="w-6 h-6" />}
                etapas={["Onboarding Investidor", "Aporte via ASAAS", "Análise de Lote", "Autorização Formal", "Travamento de Capital"]}
              />
              <Arrow />
              <FluxoCamada
                numero="III"
                titulo="EXECUÇÃO"
                cor="orange"
                icone={<Shield className="w-6 h-6" />}
                etapas={["Equipe Operacional", "Disputa em Leilão Externo", "Resultado do Arremate"]}
              />
              <Arrow />
              <FluxoCamada
                numero="IV"
                titulo="LIQUIDAÇÃO"
                cor="violet"
                icone={<CheckCircle2 className="w-6 h-6" />}
                etapas={[
                  "✅ Arrematou → Estoque + Comissões + Relatório",
                  "❌ Não arrematou → Restituição automática do capital",
                ]}
              />
            </div>
          </div>
        </Section>

        {/* 3. GOVERNANÇA POR CAMADAS */}
        <Section number="03" title="Governança por Camadas">
          <CamadaCard
            titulo="🏛️ Camada I — Originação"
            cor="amber"
            dados={[
              ["Responsável", "Administração NoZap (Admin / Super Admin)"],
              ["Objetivo", "Captar, analisar e publicar lotes de leilões externos"],
              ["Sistemas", "AnaliseDeLotes · PrecificaVivo · GestaoLotes · EstoqueLotes"],
              ["Inteligência", "IA cruza dados do Google Shopping + histórico de mercado"],
              ["SLA", "Análise automatizada em segundos · Curadoria humana antes da publicação"],
            ]}
          />
          <CamadaCard
            titulo="💰 Camada II — Capital"
            cor="emerald"
            dados={[
              ["Responsável", "Investidor (pessoa física/jurídica)"],
              ["Objetivo", "Aportar capital e autorizar operações de arremate"],
              ["Sistemas", "CadastroInvestidor · CarteiraInvestidor · MarketplaceLotes"],
              ["Gateway", "ASAAS (PIX) — webhook validado"],
              ["Princípio", "Investidor autoriza, não dá lance — capital permanece protegido"],
            ]}
          />
          <CamadaCard
            titulo="⚔️ Camada III — Execução"
            cor="orange"
            dados={[
              ["Responsável", "Equipe Operacional NoZap (Arrematantes/Leiloeiros)"],
              ["Objetivo", "Executar lances em leilões externos dentro do teto autorizado"],
              ["Sistemas", "SistemaDeArremate · AdminLancesAutorizados"],
              ["Remuneração", "Taxa pré-acordada no cadastro do investidor"],
              ["Limite", "Lance jamais ultrapassa o teto autorizado"],
            ]}
          />
          <CamadaCard
            titulo="⚙️ Camada IV — Liquidação"
            cor="violet"
            dados={[
              ["Responsável", "Sistema Automatizado"],
              ["Objetivo", "Liquidar operação · Distribuir comissões · Restituir capital"],
              ["Sistemas", "distributeAuctionCommissions · refundAuctionBalance · processAuctionSale"],
              ["Garantia", "Não arrematou = capital volta automaticamente (sem intervenção)"],
              ["Auditoria", "Trilha completa em SaleCommission + WalletTransaction"],
            ]}
          />
        </Section>

        {/* 4. ARQUITETURA DE PROTEÇÃO */}
        <Section number="04" title="Arquitetura de Proteção">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
            {[
              ["🛡️ Capital Protegido", "Saldo travado em saldo_alocado, segregado contabilmente"],
              ["🤖 Precificação Inteligente", "IA PrecificaVivo + Comparai consultam mercado em tempo real"],
              ["💎 Transparência Total", "Investidor visualiza valor de mercado + margem + taxa antes da autorização"],
              ["⚖️ Comissão Pré-Acordada", "Taxa do arrematante definida no cadastro do investidor"],
              ["🔄 Reversibilidade Automática", "Não arrematou → capital retorna em segundos"],
              ["🔐 RLS Rigoroso", "Row Level Security separa dados por perfil no banco"],
              ["📋 Trilha de Auditoria", "Cada movimentação registrada em SystemLog + WalletTransaction"],
              ["⚡ Operação Atômica", "Travamento de saldo e lance ocorrem em transação única"],
            ].map(([titulo, desc], i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white">
                <p className="font-semibold text-slate-900 mb-1">{titulo}</p>
                <p className="text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. INTEGRAÇÕES ATIVAS */}
        <Section number="05" title="Integrações Ativas">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left p-3 text-sm uppercase tracking-wider">Integração</th>
                <th className="text-left p-3 text-sm uppercase tracking-wider">Função</th>
                <th className="text-left p-3 text-sm uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ASAAS", "Gateway de pagamento PIX + Webhook", "🟢 Produção"],
                ["Brevo", "Notificações WhatsApp + Email transacional", "🟢 Produção"],
                ["SerpAPI", "Pesquisa Google Shopping (precificação)", "🟢 Produção"],
                ["Supabase", "Storage de imagens públicas", "🟢 Produção"],
                ["IP Geolocation", "Validação regional de operação", "🟢 Produção"],
              ].map(([nome, funcao, status], i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="p-3 font-semibold text-slate-900">{nome}</td>
                  <td className="p-3 text-slate-700">{funcao}</td>
                  <td className="p-3 text-slate-700">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 6. STATUS OPERACIONAL */}
        <Section number="06" title="Status Operacional Consolidado">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
            {[
              "Captação de Lotes",
              "IA de Precificação",
              "Marketplace Institucional",
              "Carteira Digital",
              "Autorização de Lances",
              "Execução de Arremate",
              "Distribuição de Comissões",
              "Restituição de Capital",
            ].map((modulo, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-slate-800 font-medium">{modulo}</span>
                <span className="ml-auto text-xs text-emerald-700 font-semibold">OPERACIONAL</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. ZONAS DE PROTEÇÃO CRÍTICA */}
        <Section number="07" title="Zonas de Proteção Crítica">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-slate-800 text-sm">
                Os seguintes módulos operam sob <strong>regime de congelamento técnico</strong> — qualquer alteração exige
                autorização formal e auditoria prévia.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {[
              "Núcleo de Pagamentos (ASAAS · Webhooks · Carteira Digital)",
              "Núcleo de Comissões (Distribuição · Conciliação)",
              "Núcleo de Arremate (Sala de Leilão · Submissão Atômica · Finalização)",
              "Núcleo de Autenticação (Login · Senha · Sessões)",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <Lock className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="text-slate-800">{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-slate-100 border-l-4 border-slate-700 p-4 mt-6">
            <p className="text-sm text-slate-700">
              <strong>Recomendação:</strong> Gestão entrante deve operar inicialmente em modo de leitura sobre estes núcleos,
              propondo alterações apenas via Protocolo Mestre Soberano.
            </p>
          </div>
        </Section>

        {/* 8. CONCLUSÃO */}
        <Section number="08" title="Conclusão">
          <p className="text-slate-700 leading-relaxed mb-4">
            O Sistema Inteligente de Arremate da NoZap representa uma plataforma <strong>madura, auditada e em produção plena</strong>,
            com lógica financeira validada e arquitetura de proteção institucional ativa.
          </p>
          <p className="text-slate-700 leading-relaxed">
            A transferência de gestão técnica deve preservar a integridade dos fluxos atualmente operacionais, observando
            rigorosamente as zonas de proteção e o Protocolo Mestre Soberano vigente.
          </p>
        </Section>

        {/* RODAPÉ */}
        <div className="mt-16 pt-8 border-t-2 border-slate-300 text-center text-sm text-slate-600">
          <p className="font-semibold text-slate-800 mb-1">Documento elaborado por: IA Técnica Responsável — Leilão NoZap</p>
          <p>Data: 11 de junho de 2026</p>
          <p className="mt-2 text-xs text-slate-500">Próxima revisão: Sob demanda da gestão entrante</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          nav, footer, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .print\\:bg-white { background: white !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Componentes auxiliares ─────────────────────────────────────────

function Section({ number, title, children }) {
  return (
    <section className="mb-12 print:break-inside-avoid">
      <div className="flex items-baseline gap-4 mb-6 pb-3 border-b-2 border-slate-900">
        <span className="text-4xl font-bold text-emerald-600">{number}</span>
        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

function FluxoCamada({ numero, titulo, cor, icone, etapas }) {
  const cores = {
    amber: "bg-amber-50 border-amber-500 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-500 text-emerald-900",
    orange: "bg-orange-50 border-orange-500 text-orange-900",
    violet: "bg-violet-50 border-violet-500 text-violet-900",
  };
  const badgeCores = {
    amber: "bg-amber-600",
    emerald: "bg-emerald-600",
    orange: "bg-orange-600",
    violet: "bg-violet-600",
  };

  return (
    <div className={`border-l-4 rounded-r-lg p-5 ${cores[cor]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${badgeCores[cor]} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold`}>
          {numero}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">Camada {numero}</p>
          <h3 className="text-xl font-bold">{titulo}</h3>
        </div>
        <div className="ml-auto">{icone}</div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {etapas.map((etapa, i) => (
          <span key={i} className="bg-white px-3 py-1 rounded-full text-sm border border-current border-opacity-30">
            {etapa}
          </span>
        ))}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <div className="w-1 h-8 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full" />
    </div>
  );
}

function CamadaCard({ titulo, cor, dados }) {
  const cores = {
    amber: "border-amber-500",
    emerald: "border-emerald-500",
    orange: "border-orange-500",
    violet: "border-violet-500",
  };
  return (
    <div className={`border-l-4 ${cores[cor]} bg-white border border-slate-200 rounded-lg p-5 mb-4 print:break-inside-avoid`}>
      <h3 className="text-lg font-bold text-slate-900 mb-3">{titulo}</h3>
      <table className="w-full text-sm">
        <tbody>
          {dados.map(([label, valor], i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-semibold text-slate-700 w-1/4">{label}</td>
              <td className="py-2 text-slate-600">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
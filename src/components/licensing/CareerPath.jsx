import React from 'react';
import { Award, Briefcase, ArrowUp, Users, Gem, Megaphone, Store, MapPin, Building2 } from 'lucide-react';
import { cn } from "@/lib/utils"

// Comissão de VENDA DIRETA por cargo (plano de carreira atual — bloco rede).
// Modelo telescópico: o cargo recebe esse % direto; a diferença pra 20% sobe pra rede.
const rolePercentages = {
  influenciador: 5,
  vendedor: 10,
  licenciado: 13,
  parceiro: 15,
  ponto_retirada: 16,
  loja_fisica: 19,
  distribuidor: 20,
};

// REBATE por nível (card oficial Heloim 22/07): quando alguém da sua rede vende, você ganha
// a diferença entre o seu nível e o dele. É o que o motor (arvoreOficial.js) paga na cadeia.
const roleRebate = {
  vendedor:       { pct: 5, sobre: 'Influenciador' },
  licenciado:     { pct: 3, sobre: 'Vendedor' },
  parceiro:       { pct: 2, sobre: 'Licenciado' },
  ponto_retirada: { pct: 1, sobre: 'Parceiro' },
  loja_fisica:    { pct: 3, sobre: 'Ponto de Retirada' },
  distribuidor:   { pct: 1, sobre: 'Loja Física' },
};

// Quem cada nível cadastra na rede (card oficial Heloim 22/07).
const roleCadastra = {
  influenciador:  'Não cadastra ninguém, só compartilha o link',
  vendedor:       'Cadastra: influenciador',
  licenciado:     'Cadastra: vendedor e influenciador',
  parceiro:       'Cadastra: licenciado, vendedor e influenciador',
  ponto_retirada: 'Cadastra: parceiro, licenciado, vendedor e influenciador',
  loja_fisica:    'Cadastra: ponto de retirada, parceiro, licenciado, vendedor e influenciador',
  distribuidor:   'Cadastra: todo mundo',
};

// Bloco DIRETORIA (cargos institucionais TTT) — só aparece pra quem tem algum deles.
// % = governança do topo (card oficial Heloim 22/07). Aliases cobrem ids antigos.
const directorSteps = [
  { id: 'fundador', match: ['fundador'], title: 'Fundador', gov: '1% governança', icon: Gem,
    desc: 'Topo institucional do ecossistema.' },
  { id: 'conselheiro', match: ['conselheiro'], title: 'Conselheiro', gov: '1% governança', icon: Award,
    desc: 'Conselho da holding.' },
  { id: 'ceo', match: ['ceo'], title: 'CEO', gov: '3% governança + 3% faturamento', icon: Briefcase,
    desc: 'Direção geral.' },
  { id: 'diretoria_executiva', match: ['diretoria_executiva', 'diretoria'], title: 'Diretoria Executiva', gov: '0,5% governança', icon: Building2,
    desc: 'Convidados pelo CEO.' },
  { id: 'diretor_operacional', match: ['diretor_operacional', 'diretor', 'diretoria_operacao'], title: 'Diretor Operacional', gov: '0,5% governança', icon: Building2,
    desc: 'Logística, comercial, operações, administrativo.' },
  { id: 'socio', match: ['socio', 'socio_executivo'], title: 'Sócio Executivo', gov: 'cadeia + licenciado', icon: Store,
    desc: 'Executivo que também é licenciado: recebe da cadeia que cadastrou e como licenciado.' },
];

const careerSteps = [
  // Topo → Base (hierarquia de rede atual)
  { id: 'distribuidor', title: 'Distribuidor', icon: Gem,
    achievedDescription: '💎 Topo da rede. Estoque próprio, sobe produtos e recebe 20% na venda direta.',
    lockedDescription: 'Adesão R$ 4.000.000 (100% em produto). 20% na venda direta + topo da rede.' },
  { id: 'loja_fisica', title: 'Loja Física', icon: Building2,
    achievedDescription: '🏬 Loja física com estoque próprio. 19% na venda direta.',
    lockedDescription: 'Adesão R$ 350.000 (100% em produto). 19% na venda direta.' },
  { id: 'ponto_retirada', title: 'Ponto de Retirada', icon: MapPin,
    achievedDescription: '📍 Ponto de retirada com estoque próprio. 16% na venda direta.',
    lockedDescription: 'Adesão R$ 50.000 (100% em produto). 16% na venda direta.' },
  { id: 'parceiro', title: 'Parceiro', icon: Store,
    achievedDescription: '🤝 Parceiro da rede. 15% na venda direta e cadastra sua equipe.',
    lockedDescription: 'Adesão R$ 20.000 (100% em produto). 15% na venda direta.' },
  { id: 'licenciado', title: 'Licenciado', icon: Briefcase,
    achievedDescription: '📚 Licenciado. 13% na venda direta pelo seu link.',
    lockedDescription: 'Adesão R$ 5.000 (100% em produto). 13% na venda direta.' },
  { id: 'vendedor', title: 'Vendedor', icon: Award,
    achievedDescription: '🛒 Vendedor ativo. 10% na venda direta.',
    lockedDescription: 'Em breve: torne-se Vendedor e ganhe 10% na venda direta.' },
  { id: 'influenciador', title: 'Influenciador', icon: Megaphone,
    achievedDescription: '📣 Influenciador. Indique e ganhe 5% nas vendas pelo seu link.',
    lockedDescription: 'Em breve: torne-se Influenciador e ganhe 5%.' },
  { id: 'usuario', title: 'Usuário', icon: Users,
    achievedDescription: '🎯 Bem-vindo! Você está cadastrado e pronto para evoluir na rede.',
    lockedDescription: 'Nível inicial: cadastro ativo no sistema.' },
];

export default function CareerPath({ currentUser }) {
    const userLevels = Array.isArray(currentUser?.career_levels) 
        ? currentUser.career_levels 
        : (currentUser?.career_levels 
            ? [currentUser.career_levels] 
            : ['usuario']
          );
    
    const primaryLevel = currentUser?.primary_career_level || userLevels[0] || 'usuario';

    // Diretoria: só mostra os cargos institucionais que o usuário realmente tem (destacados em verde).
    const myDirectorSteps = directorSteps.filter((s) => s.match.some((m) => userLevels.includes(m)));

    return (
        <div className="p-6">
            {myDirectorSteps.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-700">
                    <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">🏛️ Seus Cargos de Diretoria</h3>
                    <ul className="space-y-3">
                        {myDirectorSteps.map((s) => (
                            <li key={s.id} className="flex items-start gap-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500 ring-4 ring-green-500/30">
                                    <s.icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold flex items-center gap-2 text-green-400">
                                        {s.title}
                                        <span className="ml-1 text-xs px-2 py-0.5 rounded border bg-green-600/20 text-green-300 border-green-500/30">{s.gov}</span>
                                    </h4>
                                    <p className="mt-1 text-sm text-gray-300">{s.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="relative">
                {/* Linha de Conexão - ATRÁS DOS CÍRCULOS */}
                <div className="absolute left-5 top-5 h-[calc(100%-40px)] w-0.5 bg-gray-700 z-0" aria-hidden="true" />
                
                <ul className="space-y-8">
                    {careerSteps.map((step) => {
                        const isActive = userLevels.includes(step.id);
                        const isPrimary = step.id === primaryLevel;

                        return (
                            <li key={step.id} className="flex items-start gap-4 relative z-10">
                                <div className={cn(
                                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                                    isActive ? "bg-green-500 ring-4 ring-green-500/30" : "border-2 border-gray-600 bg-gray-800",
                                    isPrimary && "ring-4 ring-white/50"
                                )}>
                                    {isActive ? (
                                        <ArrowUp className="h-6 w-6 text-white" />
                                    ) : (
                                        <step.icon className="h-6 w-6 text-gray-500" />
                                    )}
                                </div>
                                <div>
                                    <h4 className={cn(
                                        "font-bold flex items-center gap-2",
                                        isActive ? "text-green-400" : "text-gray-500"
                                    )}>
                                        {isPrimary && <span className="text-sm">⭐</span>}
                                        {step.title}
                                        {isPrimary && <span className="text-xs text-gray-400">(Função Principal)</span>}
                                        {rolePercentages[step.id] ? (
                                          <span className={cn(
                                            "ml-2 text-xs px-2 py-0.5 rounded border",
                                            isActive ? "bg-green-600/20 text-green-300 border-green-500/30" : "bg-gray-700/40 text-gray-400 border-gray-600/40"
                                          )}>{rolePercentages[step.id]}% venda direta</span>
                                        ) : null}
                                        {roleRebate[step.id] ? (
                                          <span className={cn(
                                            "ml-1 text-xs px-2 py-0.5 rounded border",
                                            isActive ? "bg-amber-600/20 text-amber-300 border-amber-500/30" : "bg-gray-700/40 text-gray-400 border-gray-600/40"
                                          )}>+{roleRebate[step.id].pct}% rebate</span>
                                        ) : null}
                                    </h4>
                                    <p className={cn(
                                        "mt-1 text-sm",
                                        isActive ? "text-gray-300" : "text-gray-500"
                                    )}>
                                        {isActive ? step.achievedDescription : step.lockedDescription}
                                    </p>
                                    {roleRebate[step.id] ? (
                                      <p className={cn("mt-0.5 text-xs", isActive ? "text-amber-300/80" : "text-gray-500")}>
                                        Rebate de {roleRebate[step.id].pct}% sobre {roleRebate[step.id].sobre} (quando alguém da sua rede vende).
                                      </p>
                                    ) : null}
                                    {roleCadastra[step.id] ? (
                                      <p className={cn("mt-0.5 text-xs", isActive ? "text-gray-400" : "text-gray-600")}>
                                        {roleCadastra[step.id]}
                                      </p>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
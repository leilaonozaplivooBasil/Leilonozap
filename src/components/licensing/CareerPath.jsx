import React from 'react';
import { Award, BookOpen, Briefcase, Star, ArrowUp, Users, Crown, Gem, Trophy, Megaphone, Store, MapPin, Building2, ShieldCheck, Landmark } from 'lucide-react';
import { cn } from "@/lib/utils"

// Comissão de VENDA DIRETA por cargo (plano de carreira atual — bloco rede).
// Modelo telescópico: o cargo recebe esse % direto; a diferença pra 20% sobe pra rede.
const rolePercentages = {
  influenciador: 5,
  vendedor: 10,
  licenciado_catalogo: 13,
  parceiro: 15,
  ponto_retirada: 16,
  loja_fisica: 19,
  distribuidor: 20,
};

const careerSteps = [
  // Topo → Base (hierarquia de rede atual + escada de convite acima do Distribuidor)
  { id: 'fundador', title: 'Fundador', icon: Trophy,
    achievedDescription: '🏆 Fundador da Leilão NoZap.',
    lockedDescription: 'Convites abertos apenas até o lançamento oficial da Leilão NoZap, em dezembro de 2026 (pré-lançamento). Após essa data, não haverá mais novos Fundadores.' },
  { id: 'conselheiro', title: 'Conselheiro', icon: Star,
    achievedDescription: '⭐ Conselheiro da Leilão NoZap.',
    lockedDescription: 'Convite exclusivo para se tornar Conselheiro.' },
  { id: 'ceo', title: 'CEO', icon: Crown,
    achievedDescription: '👑 CEO liderando a expansão da Leilão NoZap.',
    lockedDescription: 'Convidado para se tornar CEO e liderar a expansão da Leilão NoZap em novos estados.' },
  { id: 'diretoria', title: 'Diretoria Executiva', icon: Landmark,
    achievedDescription: '🏛️ Membro da Diretoria Executiva.',
    lockedDescription: 'Convidado para integrar a Diretoria Executiva e participar das decisões estratégicas do negócio.' },
  { id: 'diretor', title: 'Diretor Operacional', icon: ShieldCheck,
    achievedDescription: '🛡️ Diretor Operacional.',
    lockedDescription: 'Convidado para assumir uma posição na Diretoria Operacional.' },
  { id: 'socio', title: 'Sócio Executivo', icon: BookOpen,
    achievedDescription: '📖 Sócio: 1% sobre todo o seu sistema de alavancagem.',
    lockedDescription: 'Convidado para participar da mentoria X-OS (nossa Academia de Desenvolvimento). Ao concluir, torna-se Sócio e ganha 1% sobre todo o seu sistema de alavancagem — ex: se um Distribuidor da sua rede vender R$ 10 milhões, você ganha 1% sobre esse total.' },
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
  { id: 'licenciado_catalogo', title: 'Licenciado', icon: Briefcase,
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
    
    return (
        <div className="p-6">
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
                                    </h4>
                                    <p className={cn(
                                        "mt-1 text-sm",
                                        isActive ? "text-gray-300" : "text-gray-500"
                                    )}>
                                        {isActive ? step.achievedDescription : step.lockedDescription}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
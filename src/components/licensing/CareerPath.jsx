import React from 'react';
import { Award, BookOpen, Briefcase, Star, ArrowUp, Users, Crown, Gem, Trophy } from 'lucide-react';
import { cn } from "@/lib/utils";

const careerSteps = [
    {
        id: 'fundador',
        title: 'Fundador',
        icon: Crown,
        achievedDescription: '🎉 Parabéns! Você conquistou o nível máximo! Criador e visionário do sistema. Patrimônio e legado.',
        lockedDescription: 'Em breve: Torne-se criador e visionário do sistema de alavancagem. Patrimônio e legado.'
    },
    {
        id: 'conselheiro',
        title: 'Conselheiro',
        icon: Gem,
        achievedDescription: '✨ Incrível! Você é um Conselheiro! Influencie decisões críticas da empresa.',
        lockedDescription: 'Em breve: Influencie decisões críticas da empresa como conselheiro do sistema.'
    },
    {
        id: 'ceo',
        title: 'CEO',
        icon: Trophy,
        achievedDescription: '👑 Parabéns! Você é o CEO! Gerencie toda a operação e defina estratégias globais.',
        lockedDescription: 'Em breve: Assuma a liderança máxima do sistema de alavancagem.'
    },
    {
        id: 'diretor',
        icon: Star,
        title: 'Diretor',
        achievedDescription: '🚀 Você alcançou o topo! Participe das decisões estratégicas e tenha ganhos exponenciais.',
        lockedDescription: 'Em breve: Alcance o topo do sistema de alavancagem e participe das decisões estratégicas.'
    },
    {
        id: 'executivo',
        title: 'Executivo',
        icon: Briefcase,
        achievedDescription: '💼 Parabéns, Executivo! Lidere sua equipe no sistema de alavancagem e multiplique seus resultados.',
        lockedDescription: 'Em breve: Após a mentoria, lidere uma equipe e multiplique resultados no sistema.'
    },
    {
        id: 'licenciado_catalogo',
        title: 'Licenciado Catálogo',
        icon: BookOpen,
        achievedDescription: '📚 Ótimo! Expanda seus ganhos com nosso catálogo de produtos exclusivo.',
        lockedDescription: 'Em breve: Expanda seus ganhos no sistema com catálogo exclusivo de produtos.'
    },
    {
        id: 'licenciado_aplicativo',
        title: 'Influenciador',
        icon: Award,
        achievedDescription: '✅ Você é um Influenciador! Indique clientes e ganhe 3% em cada arremate deles.',
        lockedDescription: 'Indique clientes para o app e ganhe 3% em cada arremate através do sistema de alavancagem.'
    },
    {
        id: 'usuario',
        title: 'Usuário',
        icon: Users,
        achievedDescription: '🎯 Bem-vindo! Você está cadastrado e pronto para evoluir no sistema.',
        lockedDescription: 'Nível inicial: cadastro ativo no sistema de alavancagem.'
    }
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
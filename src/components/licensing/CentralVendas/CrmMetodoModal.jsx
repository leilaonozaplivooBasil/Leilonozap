import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, BookOpen } from 'lucide-react';

// 📖 DIR-41 (Hábito 8 — DUPLICAÇÃO): o método do dono, vivo DENTRO da
// ferramenta onde o time trabalha. Fonte: deck "O Sucesso Não Negocia com a
// Mediocridade — os 8 Hábitos de Sucesso" (01/09/2026).
const HABITOS = [
  { n: 1, titulo: 'SONHO', sub: 'Clareza de destino', texto: 'Sem clareza de destino, toda energia se dispersa. O sonho dá direção, foco e propósito — é o combustível do compromisso nos momentos difíceis.' },
  { n: 2, titulo: 'COMPROMISSO', sub: 'Decisão diária', texto: 'Talento faz você começar na frente; disciplina faz você continuar. Todos os dias. Sem exceção. Sem negociação.' },
  { n: 3, titulo: 'LISTA DE NETWORK', sub: 'O ambiente vence', texto: 'O ambiente ou te eleva ou te limita. Sua lista de network é um ativo estratégico — trate-a como tal. No CRM: seus contatos e sua árvore.' },
  { n: 4, titulo: 'CONTATO E CONVITE', sub: 'Método F.O.R.M.', texto: 'Antes de apresentar, entenda a pessoa: Família, Ocupação, Recreação — e então a Mensagem certa pra pessoa certa. No CRM: o bloco F.O.R.M. do cliente.' },
  { n: 5, titulo: 'APRESENTAÇÃO DE SUCESSO', sub: 'Clareza e valor', texto: 'Conexão → FORM → Mensagem → Convite → Apresentação → Próximo Passo. Você não apresenta uma oportunidade — apresenta uma possibilidade.' },
  { n: 6, titulo: 'ACOMPANHAMENTO E FECHAMENTO', sub: 'PPV — Próximo Ponto de Venda', texto: 'Cada etapa precisa conduzir ao próximo ponto. Os dois pilares: DOR + CONFIANÇA. As objeções do caminho ("não tenho dinheiro", "preciso pensar", "tenho medo", "não conheço") se gerenciam, não se temem. No CRM: negociação sem PPV fica marcada em vermelho.' },
  { n: 7, titulo: 'VERIFICAÇÃO DO PROGRESSO', sub: 'Medir e corrigir', texto: 'O que não se mede, não se corrige. No CRM: reuniões do dia, win rate do time, objeções que travam a esteira — tudo na Visão Executiva.' },
  { n: 8, titulo: 'DUPLICAÇÃO DOS 8 HÁBITOS', sub: 'Ensinar e multiplicar', texto: 'Conhecimento é o que adquirimos; sabedoria é o que colocamos em prática. Ensine o método — esta página existe pra isso.' },
];

export default function CrmMetodoModal({ aberto, onFechar }) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-nz-verde" /> O Método — os 8 Hábitos de Sucesso
            </p>
            <Button variant="ghost" size="icon" onClick={onFechar}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>
          <p className="text-sm text-nz-tinta-fraca mb-4 italic">"O sucesso não negocia com a mediocridade. Uma grande meta exige uma grande postura."</p>
          <div className="space-y-3">
            {HABITOS.map((h) => (
              <div key={h.n} className="rounded-lg border border-nz-borda p-3">
                <p className="text-sm font-bold text-nz-tinta">
                  <span className="text-nz-verde">{h.n}. {h.titulo}</span>
                  <span className="text-nz-tinta-fraca font-normal"> — {h.sub}</span>
                </p>
                <p className="text-sm text-nz-tinta-fraca mt-1">{h.texto}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-nz-tinta-fraca mt-4 text-center italic">"A disciplina é a ponte entre objetivos e realização." — Jim Rohn</p>
        </CardContent>
      </Card>
    </div>
  );
}

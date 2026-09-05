import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, BookOpen } from 'lucide-react';
import { HABITOS } from '@/lib/metodo';

// 📖 DIR-41 (Hábito 8 — DUPLICAÇÃO): o método do dono, vivo DENTRO da
// ferramenta onde o time trabalha. Fonte: deck "O Sucesso Não Negocia com a
// Mediocridade — os 8 Hábitos de Sucesso" (01/09/2026).
// 🎓 DIR-69 — a lista dos 8 hábitos era uma CÓPIA da de src/lib/metodo.js.
// Duas cópias significam dois nomes: quando o dono ditou os nomes completos,
// um lado mudaria e o outro não. Agora o nome e a frase vêm da fonte única —
// e ficam aqui só as linhas que são DESTE modal: onde cada hábito mora dentro
// do CRM. É a única coisa que esta tela sabe e a lib não.
const ONDE_MORA_NO_CRM = {
  lista: 'No CRM: seus contatos e sua árvore.',
  contato: 'No CRM: o bloco F.O.R.M. do cliente.',
  acompanhamento: 'No CRM: negociação sem PPV fica marcada em vermelho.',
  verificacao: 'No CRM: reuniões do dia, win rate do time e as objeções que travam a esteira — tudo na Visão Executiva.',
  duplicacao: 'Ensine o método — esta página existe pra isso.',
};

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
                <p className="text-sm text-nz-tinta-fraca mt-1">
                  {h.texto}{ONDE_MORA_NO_CRM[h.id] ? ` ${ONDE_MORA_NO_CRM[h.id]}` : ''}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-nz-tinta-fraca mt-4 text-center italic">"A disciplina é a ponte entre objetivos e realização." — Jim Rohn</p>
        </CardContent>
      </Card>
    </div>
  );
}

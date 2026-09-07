import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CareerPath from '@/components/licensing/CareerPath';
import EvoluirNivel from '@/components/licensing/EvoluirNivel';

// 🎖️ CARREIRA — a seção da Top College que UNE o Plano de Carreira e o
// Evoluir Nível (dono, 06/09/2026: "no menu fica só a X-EOS clicável; o resto
// vai pra dentro das seções, unindo o que precisa unir"). Em cima, a escada
// (onde a pessoa está); embaixo, o próximo degrau pago com o upgrade.
// 🎓 07/09/2026 — dono: "dentro da Top College precisa tudo puxar pra
// identidade visual, todas as páginas, não pode ser branco". Esta seção
// era um Card branco solto sobre o fundo escuro da faculdade — o mesmo
// tratamento escuro do EvoluirNivel (linha de baixo) agora sobe pra cá.
export default function CarreiraSecao({ currentUser }) {
  return (
    <div className="space-y-4" data-teste="secao-carreira">
      <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Seu Plano de Carreira</CardTitle>
          <CardDescription className="text-white/50">Veja sua evolução no sistema de alavancagem</CardDescription>
        </CardHeader>
        <CardContent>
          <CareerPath currentUser={currentUser} />
        </CardContent>
      </Card>
      <EvoluirNivel embutido />
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CareerPath from '@/components/licensing/CareerPath';
import EvoluirNivel from '@/components/licensing/EvoluirNivel';

// 🎖️ CARREIRA — a seção da Top College que UNE o Plano de Carreira e o
// Evoluir Nível (dono, 06/09/2026: "no menu fica só a X-EOS clicável; o resto
// vai pra dentro das seções, unindo o que precisa unir"). Em cima, a escada
// (onde a pessoa está); embaixo, o próximo degrau pago com o upgrade.
export default function CarreiraSecao({ currentUser }) {
  return (
    <div className="space-y-4" data-teste="secao-carreira">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Seu Plano de Carreira</CardTitle>
          <CardDescription className="text-gray-500">Veja sua evolução no sistema de alavancagem</CardDescription>
        </CardHeader>
        <CardContent>
          <CareerPath currentUser={currentUser} />
        </CardContent>
      </Card>
      <EvoluirNivel embutido />
    </div>
  );
}

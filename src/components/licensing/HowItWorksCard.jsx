import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksCard({ isSaiDeBaixo }) {
  const steps = [
    { n: 1, title: "Compartilhe seu Link", desc: "Envie seu link de indicação para amigos e familiares." },
    { n: 2, title: "Eles Se Cadastram", desc: "Quando usam seu link, são automaticamente seus indicados." },
    { n: 3, title: "Você Ganha Comissões em R$", desc: "App: 3% por arremate | Loja Virtual: até 26% distribuídos na rede!" }
  ];

  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
      <CardHeader>
        <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Como Funciona o Sistema</CardTitle>
      </CardHeader>
      <CardContent className={`space-y-4 ${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}`}>
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500'}`}>
              <span className="text-white font-bold">{s.n}</span>
            </div>
            <div>
              <h4 className={`font-semibold mb-1 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>{s.title}</h4>
              <p className={`text-sm ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>{s.desc}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
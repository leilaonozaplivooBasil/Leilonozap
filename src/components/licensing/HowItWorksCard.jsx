import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ☀️ 08/08/2026: cartão claro. O bloco preto no meio da tela branca quebrava a
// continuidade — o escuro fica só na barra do topo e na lateral de ícones.
export default function HowItWorksCard({ isSaiDeBaixo }) {
  const steps = [
    { n: 1, title: "Compartilhe seu Link", desc: "Envie seu link de indicação para amigos e familiares." },
    { n: 2, title: "Eles Se Cadastram", desc: "Quando usam seu link, são automaticamente seus indicados." },
    { n: 3, title: "Você Ganha Comissões em R$", desc: "App: 5% por venda e arremate | Loja Virtual: 30% distribuídos na árvore genealógica!" }
  ];

  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-white border-nz-borda'}>
      <CardHeader>
        <CardTitle className="text-nz-tinta">Como Funciona o Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((s) => (
          <div key={s.n} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSaiDeBaixo ? 'bg-red-600' : 'bg-nz-verde'}`}>
              <span className="text-white font-bold">{s.n}</span>
            </div>
            <div>
              <h4 className="font-semibold mb-1 text-nz-tinta">{s.title}</h4>
              <p className="text-sm text-nz-tinta-fraca">{s.desc}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
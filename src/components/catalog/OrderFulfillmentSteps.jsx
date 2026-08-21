import React from 'react';
import { PackageCheck, Box, Send, Truck, CheckCircle2 } from 'lucide-react';

// 🚚 Jornada de entrega. As etapas de etiqueta e conferência são mostradas
// imediatamente acima deste bloco no Gerenciar Pedido e precisam ser concluídas
// antes de avançar para Embalando.
const STEPS = [
  { value: 'a_enviar', label: 'Pedido recebido', icon: PackageCheck },
  { value: 'preparando', label: 'Embalando', icon: Box },
  { value: 'enviado', label: 'Enviado', icon: Send },
  { value: 'saiu_entrega', label: 'Saiu para entrega', icon: Truck },
  { value: 'entregue', label: 'Entregue', icon: CheckCircle2 },
];

export default function OrderFulfillmentSteps({ current, onSelect }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.value === current));

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
          🚚 Jornada da entrega — clique para avançar
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
          Pedido recebido → etiqueta no Melhor Envio → imprimir etiqueta → conferir produtos → Embalando → Enviado → Saiu para entrega → Entregue.
        </p>
      </div>
      <div className="flex items-stretch gap-1">
        {STEPS.map((step, i) => {
          const done = i <= idx;
          const StepIcon = step.icon;
          return (
            <button
              key={step.value}
              type="button"
              onClick={() => onSelect(step.value)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                done ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200' : 'border-gray-600 bg-gray-700/40 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <StepIcon className={`h-4 w-4 ${done ? 'text-indigo-300' : 'text-gray-500'}`} />
              <span className="text-[10px] font-medium leading-tight">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
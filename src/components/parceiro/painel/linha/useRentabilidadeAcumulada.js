import { useEffect, useState } from 'react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';

const DIA_MS = 24 * 60 * 60 * 1000;

// 📈 Rentabilidade acumulada do aporte, apurada DIA A DIA a partir do 31º dia.
// Nada aqui é gravado: é a leitura visual do que a operação já rendeu no ciclo,
// travada no valor do primeiro repasse (60º dia) até o próximo fechamento.
//
// 📱 Mobile congela setInterval em background — por isso recalcula também em
// visibilitychange e focus: quem volta do banco vê o número certo na hora.
export default function useRentabilidadeAcumulada(dataAssinatura, aporte, taxaMensalPct = 3) {
  const [estado, setEstado] = useState(() => calcular(dataAssinatura, aporte, taxaMensalPct));

  useEffect(() => {
    const atualizar = () => setEstado(calcular(dataAssinatura, aporte, taxaMensalPct));
    atualizar();
    const id = setInterval(atualizar, 1000);
    window.addEventListener('visibilitychange', atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, [dataAssinatura, aporte, taxaMensalPct]);

  return estado;
}

function calcular(dataAssinatura, aporte, taxaMensalPct) {
  const base = dataAssinatura ? new Date(dataAssinatura).getTime() : NaN;
  const capital = Number(aporte) || 0;
  if (isNaN(base) || capital <= 0) {
    return { diaAtual: 0, iniciou: false, diasApurados: 0, acumulado: 0, alvo: 0, progressoPct: 0, diasParaApurar: DIA_INICIO_APURACAO, diasParaRepasse: DIA_PRIMEIRO_REPASSE };
  }

  const diasCorridos = (Date.now() - base) / DIA_MS;
  const alvo = capital * (taxaMensalPct / 100); // resultado do ciclo de 30 dias apurados
  const diasApurados = Math.max(0, Math.min(30, diasCorridos - DIA_INICIO_APURACAO));
  const acumulado = alvo * (diasApurados / 30);

  return {
    diaAtual: Math.floor(diasCorridos),
    iniciou: diasCorridos >= DIA_INICIO_APURACAO,
    diasApurados,
    acumulado,
    alvo,
    progressoPct: Math.min(100, (diasApurados / 30) * 100),
    diasParaApurar: Math.max(0, Math.ceil(DIA_INICIO_APURACAO - diasCorridos)),
    diasParaRepasse: Math.max(0, Math.ceil(DIA_PRIMEIRO_REPASSE - diasCorridos)),
  };
}
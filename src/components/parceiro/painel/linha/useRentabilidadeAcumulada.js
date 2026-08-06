import { useEffect, useState } from 'react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';

const DIA_MS = 24 * 60 * 60 * 1000;

// 📈 ACOMPANHAMENTO DO CICLO DE 30 DIAS.
//
// ⚖️ DECISÃO JURÍDICA (06/08/2026): o acompanhamento mede TEMPO DE CICLO, não
// dinheiro subindo segundo a segundo. Valor que "aparece" dia a dia sugere
// quantia já devida e resultado garantido — exatamente o que caracteriza
// promessa de rentabilidade. Por isso o número exibido é o PREVISTO no
// fechamento (estático) e o progresso é a contagem dos dias do ciclo.
//
// A janela de rentabilização vai do D+10 (produtos no ar) ao D+30 (repasse).
//
// 📱 Mobile congela setInterval em background — por isso recalcula também em
// visibilitychange e focus: quem volta do banco vê o número certo na hora.
export default function useRentabilidadeAcumulada(dataAssinatura, aporte, taxaMensalPct = 3) {
  const [estado, setEstado] = useState(() => calcular(dataAssinatura, aporte, taxaMensalPct));

  useEffect(() => {
    const atualizar = () => setEstado(calcular(dataAssinatura, aporte, taxaMensalPct));
    atualizar();
    // 1x por minuto basta: o progresso é em dias, não em centavos.
    const id = setInterval(atualizar, 60000);
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

// Dias em que o capital rentabiliza dentro do ciclo (D+10 → D+30)
export const JANELA_APURACAO = DIA_PRIMEIRO_REPASSE - DIA_INICIO_APURACAO;

function calcular(dataAssinatura, aporte, taxaMensalPct) {
  const base = dataAssinatura ? new Date(dataAssinatura).getTime() : NaN;
  const capital = Number(aporte) || 0;
  if (isNaN(base) || capital <= 0) {
    return {
      diaAtual: 0,
      iniciou: false,
      diasApurados: 0,
      alvo: 0,
      progressoPct: 0,
      diasParaApurar: DIA_INICIO_APURACAO,
      diasParaRepasse: DIA_PRIMEIRO_REPASSE,
    };
  }

  const diasCorridos = (Date.now() - base) / DIA_MS;
  // Repasse previsto do ciclo de 30 dias (referência, não valor devido)
  const alvo = capital * (taxaMensalPct / 100);
  const diasApurados = Math.max(0, Math.min(JANELA_APURACAO, diasCorridos - DIA_INICIO_APURACAO));

  return {
    diaAtual: Math.max(0, Math.floor(diasCorridos)),
    iniciou: diasCorridos >= DIA_INICIO_APURACAO,
    diasApurados,
    alvo,
    // 100% exatamente no dia do repasse (D+30)
    progressoPct: Math.min(100, (Math.min(diasCorridos, DIA_PRIMEIRO_REPASSE) / DIA_PRIMEIRO_REPASSE) * 100),
    diasParaApurar: Math.max(0, Math.ceil(DIA_INICIO_APURACAO - diasCorridos)),
    diasParaRepasse: Math.max(0, Math.ceil(DIA_PRIMEIRO_REPASSE - diasCorridos)),
  };
}
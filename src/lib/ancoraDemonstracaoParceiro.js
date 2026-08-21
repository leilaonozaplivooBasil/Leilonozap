import React from 'react';
import { plataforma } from '@/api/plataformaClient';

// 🎬 ÂNCORA DO MODO DEMONSTRAÇÃO DA LINHA DO TEMPO DO PARCEIRO.
//
// ⚖️ REGRA OFICIAL (Gabriel, 07/08/2026): não existe data fixa de pagamento no
// calendário. O ciclo de 30 dias de CADA parceiro conta a partir do dia do
// APORTE DELE. Com aporte real isso já vem do startDate do investimento.
//
// Na conta SEM aporte, a tela precisa demonstrar o mesmo comportamento: conta
// como se o depósito tivesse entrado no dia em que a pessoa abriu a tela pela
// primeira vez, e a partir daí ANDA sozinha (D+1, D+2 ... D+30).
//
// Antes, a demonstração usava "agora menos 18 dias", recalculado a cada
// abertura — ou seja, marcava D+18 para sempre e nunca avançava.
//
// A âncora fica GRAVADA NA CONTA (UserPreference), não no aparelho: senão a
// pessoa abriria no computador e a contagem voltaria ao dia 1.
// localStorage é só cache de leitura instantânea.
// Visitante não logado: usa a data de hoje em memória, sem gravar nada.

const CHAVE_CACHE = 'parceiro-demo-inicio';
const DIA_MS = 24 * 60 * 60 * 1000;

// Meia-noite LOCAL (America/São Paulo no aparelho do usuário). Ancorar na
// meia-noite é o que garante a virada do dia no horário certo — usar o
// horário exato da visita faria o dia virar, por exemplo, às 14h37.
function meiaNoiteDeHoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function lerCache() {
  try {
    return localStorage.getItem(CHAVE_CACHE) || null;
  } catch {
    return null;
  }
}

function salvarCache(iso) {
  try {
    localStorage.setItem(CHAVE_CACHE, iso);
  } catch {
    /* storage indisponível: segue com o valor da conta */
  }
}

function usuarioLogado() {
  try {
    const bruto = localStorage.getItem('currentUser');
    const u = bruto ? JSON.parse(bruto) : null;
    return u?.id ? u : null;
  } catch {
    return null;
  }
}

/**
 * Data de início da demonstração (ISO). Busca na conta, grava na primeira vez.
 * @param {boolean} ativo — false quando existe aporte REAL: aí nada é lido nem
 *   gravado, porque a contagem oficial vem da data do depósito do parceiro.
 */
export function useAncoraDemonstracao(ativo = true) {
  const [inicio, setInicio] = React.useState(() => lerCache());

  React.useEffect(() => {
    if (!ativo) return; // aporte real: a data oficial é a do depósito
    const user = usuarioLogado();
    if (!user) return; // visitante: demonstração só em memória
    let vivo = true;

    (async () => {
      const linhas = await plataforma.entities.UserPreference.filter({ user_id: user.id });
      if (!vivo) return;
      const registro = Array.isArray(linhas) ? linhas[0] : null;

      if (registro?.parceiro_demo_inicio) {
        setInicio(registro.parceiro_demo_inicio);
        salvarCache(registro.parceiro_demo_inicio);
        return;
      }

      // Primeira visita: "o depósito entrou hoje".
      const novo = meiaNoiteDeHoje();
      if (registro) {
        await plataforma.entities.UserPreference.update(registro.id, { parceiro_demo_inicio: novo });
      } else {
        await plataforma.entities.UserPreference.create({ user_id: user.id, parceiro_demo_inicio: novo });
      }
      if (!vivo) return;
      setInicio(novo);
      salvarCache(novo);
    })();

    return () => {
      vivo = false;
    };
  }, [ativo]);

  // Enquanto a conta não responde (ou visitante): conta a partir de hoje.
  return inicio || meiaNoiteDeHoje();
}

/**
 * Relógio do dia do ciclo. 📱 Mobile congela timer em segundo plano — por isso
 * revalida também em visibilitychange e focus: quem volta do banco vê o dia
 * certo na hora, sem precisar recarregar.
 */
export function useRelogioDoCiclo() {
  const [agora, setAgora] = React.useState(() => Date.now());

  React.useEffect(() => {
    const tick = () => setAgora(Date.now());
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return agora;
}

/** Dia do ciclo (fracionado) a partir da data de início e do relógio. */
export function diaDoCiclo(dataInicio, agora) {
  const base = new Date(dataInicio).getTime();
  if (isNaN(base)) return 0;
  return (agora - base) / DIA_MS;
}
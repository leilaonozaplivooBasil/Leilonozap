/* global __BUILD_VERSION__ */
// __BUILD_VERSION__ é injetada pelo vite.config.js no momento do build
// (define). Não é import: é substituída no código pelo carimbo do deploy.
import { useEffect, useRef, useState } from 'react';

// 🔄 CAMADA 1 — detecção de novo deploy.
// O arquivo /version.json é reescrito em CADA build (plugin no vite.config.js).
// Comparamos a versão do BUILD que está rodando com a do servidor: diferente
// = este aparelho está velho → sinaliza atualização.
//
// ⚠️ MOBILE: setInterval congela quando o app vai pro background. Por isso a
// checagem também acontece em 'visibilitychange' e 'focus' (voltar do banco).
// Falha de rede é silenciosa — nunca aparece erro pro usuário.

// ⏱️ Intervalo mantido em 60s (requisição minúscula, percepção imediata).
const INTERVALO = 60000; // 1 min

// 🚨 A referência de comparação é a versão do BUILD carimbada no bundle:
// um aparelho preso em cache antigo SABE que está velho (histórico 07/08/2026).
const VERSAO_DO_BUILD =
  typeof __BUILD_VERSION__ !== 'undefined' ? String(__BUILD_VERSION__) : null;

// 🛑 FIM DO LOOP (07/08/2026 — banner preso "Nova versão disponível").
// O app recarregava a cada 4s indefinidamente quando a versão nunca convergia.
// Agora existe MEMÓRIA ENTRE SESSÕES: guardamos a versão-alvo e quantas
// recargas automáticas já foram gastas nela. No máximo 2 — depois disso o app
// NUNCA mais se recarrega sozinho nessa versão-alvo, só por toque do usuário.
const K_TARGET = 'nz_update_target';
const K_TRIES = 'nz_update_tries';
// 🚪 SAÍDA DE EMERGÊNCIA JÁ USADA para esta versão-alvo (08/08/2026).
// Se nem o "Forçar" (que remove o service worker travado) trouxe a versão nova,
// paramos de oferecer botão e mostramos UMA mensagem honesta — sem loop.
const K_FORCED = 'nz_update_forced';
export const MAX_TENTATIVAS = 2;

const ler = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const gravar = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* modo privado */ }
};
const apagar = (k) => {
  try { localStorage.removeItem(k); } catch { /* modo privado */ }
};

// Chamado no instante em que uma recarga é disparada: contabiliza a tentativa
// para aquela versão-alvo. Retorna o total de tentativas já gastas.
export function marcarTentativa(versaoAlvo) {
  const alvo = String(versaoAlvo || '');
  const anterior = ler(K_TARGET);
  const gastas = anterior === alvo ? Number(ler(K_TRIES)) || 0 : 0;
  const total = gastas + 1;
  gravar(K_TARGET, alvo);
  gravar(K_TRIES, String(total));
  return total;
}

// Registra que a saída de emergência (remover o service worker) já foi usada
// para esta versão-alvo. Se ela falhar, não insistimos mais.
export function marcarForcado(versaoAlvo) {
  gravar(K_FORCED, String(versaoAlvo || ''));
}

function limparMarcas() {
  apagar(K_TARGET);
  apagar(K_TRIES);
  apagar(K_FORCED);
}

export function useAppVersion() {
  const [temAtualizacao, setTemAtualizacao] = useState(false);
  const [versaoServidor, setVersaoServidor] = useState(null);
  const [esgotado, setEsgotado] = useState(false);
  const [forcadoFalhou, setForcadoFalhou] = useState(false);
  const versaoInicial = useRef(VERSAO_DO_BUILD);

  useEffect(() => {
    let cancelado = false;

    // ✅ SUCESSO: o build que está rodando é exatamente a versão-alvo que
    // tentávamos alcançar → limpa o contador (o aparelho atualizou de fato).
    const alvoSalvo = ler(K_TARGET);
    if (alvoSalvo && VERSAO_DO_BUILD && alvoSalvo === VERSAO_DO_BUILD) {
      limparMarcas();
    }

    const checar = async () => {
      if (cancelado || !navigator.onLine) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        // Se o servidor devolver o index.html (fallback SPA), ignora: não é versão.
        const texto = await res.text();
        if (!texto.trim().startsWith('{')) return;
        const v = JSON.parse(texto)?.version;
        if (!v || cancelado) return;
        // 🛑 CAUSA-RAIZ DO AVISO PRESO (07/08/2026): ambientes de dev/preview
        // servem um version.json fixo ({"version":"dev"}), que NUNCA bate com o
        // carimbo do bundle — o aviso ficava eternamente na tela e o app se
        // recarregava sem parar. Carimbo de deploy real é timestamp em ms
        // (>= 10 dígitos): qualquer outro valor não é versão, então ignoramos.
        if (!/^\d{10,}$/.test(String(v))) return;
        if (versaoInicial.current === null) {
          versaoInicial.current = v;
          return;
        }
        if (String(v) === String(versaoInicial.current)) {
          // já estamos na versão do servidor: nada pendente
          limparMarcas();
          setTemAtualizacao(false);
          setEsgotado(false);
          setForcadoFalhou(false);
          return;
        }
        setVersaoServidor(String(v));
        setTemAtualizacao(true);
        // Já gastamos as recargas automáticas desta versão-alvo?
        const alvo = ler(K_TARGET);
        const gastas = Number(ler(K_TRIES)) || 0;
        setEsgotado(alvo === String(v) && gastas >= MAX_TENTATIVAS);
        // Já usamos a saída de emergência nesta versão e continuamos velhos?
        // Então NÃO existe mais botão pra oferecer — só a mensagem honesta.
        setForcadoFalhou(ler(K_FORCED) === String(v));
      } catch {
        // silêncio total (offline, CDN instável, etc.)
      }
    };

    checar();
    const timer = setInterval(checar, INTERVALO);
    const aoVoltar = () => { if (!document.hidden) checar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', checar);

    return () => {
      cancelado = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', checar);
    };
  }, []);

  return { temAtualizacao, versaoServidor, esgotado, forcadoFalhou };
}

export default useAppVersion;
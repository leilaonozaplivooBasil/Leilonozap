import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useAppVersion, marcarTentativa, marcarForcado } from '@/hooks/useAppVersion';
import { fastTap } from '@/lib/fastTap';

// Rotas onde JAMAIS recarregamos sozinho — só telas de TRANSAÇÃO EM ANDAMENTO
// (lance sendo dado, pagamento/PIX aberto, pedido sendo montado no PDV).
//
// 🛑 CAUSA-RAIZ DO "GENTE PRESA EM VERSÃO ANTIGA" (10/08/2026): a lista antiga
// incluía 'carteira', 'vendedor' e 'painel' — três palavras tão largas que
// bloqueavam a atualização automática em QUASE TODO painel interno (carteira,
// painel do distribuidor, painel/pedidos, painel/estoque, painel-arrematante,
// vendedor...). Como são exatamente as telas que o usuário engajado mais
// revisita, a atualização automática nunca chegava a rodar pra ele — só o
// banner manual, fácil de ignorar. Aqui ficam só as telas onde existe MESMO
// uma transação em andamento (lance, PIX, checkout, PDV montando pedido).
const CRITICAS = [
  'auction', 'checkout', 'cart', 'carrinho', 'pagamento', 'deposit',
  'pdv', 'aporte', 'pix', 'transferir', 'saque',
  'withdraw', 'lance', 'parceiro',
];

// Cache de imagens preservado: apagá-lo faria o celular baixar tudo de novo.
const CACHE_PRESERVADO = 'supabase-imagens';

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// ⏳ TEMPO-LIMITE POR ESPERA (08/08/2026 — banner preso em "Atualizando...").
// No app instalado (WebView) e em aba que ficou em segundo plano, as promessas
// do service worker e do cache podem NUNCA responder. Sem limite, a recarga
// jamais era chamada e o spinner ficava eterno. Aqui toda espera tem prazo:
// estourou, segue em frente.
const comLimite = (promessa, ms = 2000) =>
  Promise.race([Promise.resolve(promessa).catch(() => null), pausa(ms).then(() => null)]);

function recarregar(versaoAlvo) {
  const params = new URLSearchParams(window.location.search);
  if (versaoAlvo) params.set('nzv', String(versaoAlvo));
  const busca = params.toString();
  window.location.replace(window.location.pathname + (busca ? `?${busca}` : ''));
}

// 🔄 ATUALIZAÇÃO NORMAL — pede a versão nova e ESPERA o novo service worker
// assumir antes de recarregar.
//
// ⚠️ CAUSA-RAIZ CORRIGIDA (08/08/2026 — "aperto Forçar e volta a mesma versão"):
// antes apagávamos TODOS os caches (inclusive o precache) com o service worker
// ANTIGO ainda no comando, e recarregávamos na hora. O próprio service worker
// respondia a navegação com o index.html que ele guardou — o ?nzv= não escapa
// dele — então o aparelho recarregava na versão velha, para sempre. Agora:
// nada é apagado por baixo do worker antigo; pedimos o update e aguardamos o
// worker novo ativar (ele já vem com skipWaiting), e só então recarregamos.
async function atualizarNormal(versaoAlvo) {
  try {
    if ('serviceWorker' in navigator) {
      const regs = (await comLimite(navigator.serviceWorker.getRegistrations())) || [];
      await comLimite(Promise.all(regs.map((r) => r.update().catch(() => {}))));
      // Se um worker novo ficou "em espera", manda assumir agora.
      const limite = Date.now() + 5000;
      while (Date.now() < limite) {
        const atuais = (await comLimite(navigator.serviceWorker.getRegistrations())) || [];
        const esperando = atuais.find((r) => r.waiting);
        if (esperando) {
          try { esperando.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch { /* worker sem canal */ }
          await pausa(400);
          break;
        }
        if (!atuais.some((r) => r.installing)) break;
        await pausa(400);
      }
    }
  } catch { /* se a troca falhar, ainda vale recarregar */ }
  recarregar(versaoAlvo);
}

// 🚪 SAÍDA DE EMERGÊNCIA — só depois que a via normal já falhou.
// Um service worker travado não entrega bundle novo de jeito nenhum. Aqui ele é
// REMOVIDO (e só então os caches são apagados, com segurança, porque já não há
// ninguém interceptando a navegação). O próximo carregamento vem puro da rede e
// registra um worker novo do zero.
async function forcarTrocaDeVersao(versaoAlvo) {
  try {
    if ('serviceWorker' in navigator) {
      const regs = (await comLimite(navigator.serviceWorker.getRegistrations())) || [];
      await comLimite(Promise.all(regs.map((r) => r.unregister().catch(() => {}))));
    }
    if ('caches' in window) {
      const chaves = (await comLimite(caches.keys())) || [];
      await comLimite(
        Promise.all(chaves.filter((k) => k !== CACHE_PRESERVADO).map((k) => caches.delete(k)))
      );
    }
  } catch { /* ainda assim recarrega */ }
  recarregar(versaoAlvo);
}

export default function AtualizacaoDisponivel() {
  const { temAtualizacao, versaoServidor, esgotado, forcadoFalhou } = useAppVersion();
  const [atualizando, setAtualizando] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  // ⏱️ Contagem visível antes de atualizar sozinho (o usuário VÊ que vai acontecer)
  const [segundos, setSegundos] = useState(null);
  // Se a aba estava atrás/campo em foco na hora, este contador reinicia o ciclo
  const [ciclo, setCiclo] = useState(0);
  // 🛟 A tentativa terminou sem trocar de versão (a página continua viva).
  // Existe para o botão VOLTAR a funcionar — nunca mais spinner permanente.
  const [travou, setTravou] = useState(false);
  // 🎯 Versão-alvo SEMPRE a mais recente conhecida: se um 2º deploy sobe por
  // cima durante a troca, a recarga não pode mirar a versão antiga.
  const versaoRef = React.useRef(null);
  React.useEffect(() => {
    if (versaoServidor) versaoRef.current = versaoServidor;
  }, [versaoServidor]);

  // Limpa o ?nzv= da URL depois que a carga nova subiu (não poluir links).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('nzv')) return;
    params.delete('nzv');
    const busca = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (busca ? `?${busca}` : '')
    );
  }, []);

  // Feedback imediato no toque: o usuário vê que o comando foi aceito mesmo
  // que a troca leve um instante (rede lenta / worker sendo substituído).
  const atualizarAgora = React.useCallback(() => {
    if (atualizando) return;
    setAtualizando(true);
    setTravou(false);
    setSegundos(null);
    const alvo = versaoRef.current || versaoServidor;
    marcarTentativa(alvo);

    // 🛟 REDE DE SEGURANÇA (o coração da correção): aconteça o que acontecer lá
    // dentro, em 6s a página recarrega de verdade — a recarga nunca fica
    // inalcançável. Se a troca normal for rápida, a página já saiu e este
    // temporizador morre junto com ela.
    setTimeout(() => recarregar(versaoRef.current || alvo), 6000);
    // 🚫 SPINNER ETERNO PROIBIDO: se em 10s ainda estamos aqui, a tentativa
    // falhou — devolve o botão ao usuário com uma mensagem honesta.
    setTimeout(() => {
      setAtualizando(false);
      setTravou(true);
    }, 10000);

    if (esgotado || travou) {
      // via normal já falhou → saída de emergência (remove o worker travado)
      marcarForcado(alvo);
      forcarTrocaDeVersao(alvo);
    } else {
      atualizarNormal(alvo);
    }
  }, [atualizando, esgotado, travou, versaoServidor]);

  // ⏱️ AUTOMÁTICO COM CONTAGEM (pedido 08/08/2026): o aviso aparece, conta 4s e
  // atualiza sozinho — no app instalado e no link, é o mesmo código.
  //
  // ⚠️ ANTI-LOOP PRESERVADO: quando as 2 recargas normais da versão-alvo já
  // foram gastas (esgotado), o automático NÃO insiste no caminho que falhou —
  // ele usa a saída de emergência UMA vez. Se nem ela resolver, entra o
  // 'forcadoFalhou' e nada mais se recarrega sozinho.
  // ⚠️ Telas com transação em andamento continuam FORA: ali só recarrega por toque.
  useEffect(() => {
    // 'travou' entra aqui: depois de uma tentativa frustrada o app NÃO fica
    // recontando sozinho — a decisão volta para o toque do usuário.
    if (!temAtualizacao || forcadoFalhou || atualizando || travou) {
      setSegundos(null);
      return;
    }
    const rota = (window.location.pathname + window.location.search).toLowerCase();
    if (CRITICAS.some((c) => rota.includes(c))) {
      setSegundos(null);
      return;
    }
    setSegundos(4);
    const tique = setInterval(() => {
      setSegundos((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    const t = setTimeout(() => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const digitando =
        tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
      // Aba atrás ou usuário digitando: não atrapalha — reinicia a contagem.
      if (document.visibilityState !== 'visible' || digitando) {
        setCiclo((c) => c + 1);
        return;
      }
      atualizarAgora();
    }, 4000);
    return () => {
      clearInterval(tique);
      clearTimeout(t);
    };
  }, [temAtualizacao, forcadoFalhou, atualizando, travou, versaoServidor, ciclo, atualizarAgora]);

  if (!temAtualizacao || dispensado) return null;

  // 🛑 FIM DO LOOP: a saída de emergência já foi usada nesta versão e o aparelho
  // continua velho. Não existe mais botão pra oferecer — só a verdade, uma vez.
  if (forcadoFalhou) {
    return (
      <div className="fixed left-3 right-3 z-[9998] flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="flex items-center gap-3 max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl bg-nz-tinta text-white shadow-2xl">
          <RefreshCw className="w-4 h-4 shrink-0 text-nz-verde-claro" />
          <span className="text-sm font-medium flex-1">
            Não conseguimos atualizar neste aparelho. Feche o app por completo e abra de novo.
          </span>
          <button
            type="button"
            {...fastTap(() => setDispensado(true))}
            className="flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-sm font-bold bg-white/10 hover:bg-white/20 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-3 right-3 z-[9998] flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div className="flex items-center gap-3 max-w-md w-full sm:w-auto px-4 py-3 rounded-2xl bg-nz-tinta text-white shadow-2xl">
        <RefreshCw className="w-4 h-4 shrink-0 text-nz-verde-claro" />
        <span className="text-sm font-medium flex-1">
          {atualizando
            ? 'Atualizando o aplicativo...'
            : travou
              ? 'Não conseguimos atualizar — toque para forçar'
              : segundos !== null
                ? `Nova versão — atualizando em ${segundos}s`
                : esgotado
                  ? 'Atualização pendente — toque para atualizar'
                  : 'Nova versão disponível'}
        </span>
        <button
          type="button"
          disabled={atualizando}
          {...fastTap(atualizarAgora)}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold bg-nz-verde hover:bg-nz-verde-claro transition-colors active:scale-[.97] disabled:opacity-80"
        >
          {atualizando && <Loader2 className="h-4 w-4 animate-spin" />}
          {atualizando ? 'Atualizando...' : (esgotado || travou) ? 'Forçar' : 'Atualizar agora'}
        </button>
      </div>
    </div>
  );
}
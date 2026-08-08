// 🛡️ CAMADA DE REDE DO MONITOR — INSTALAÇÃO ÚNICA E PERMANENTE
//
// CAUSA-RAIZ do "Maximum call stack size exceeded" em /api/functions/entityWrite
// (08/08/2026): a camada era instalada dentro de um useEffect do GlobalMonitor.
// Cada rota monta o seu próprio Layout, então o monitor REMONTA a cada
// navegação; e como Sentry/analytics também embrulham window.fetch, a bandeira
// de proteção ficava escondida por baixo do embrulho deles — cada remontagem
// empilhava uma camada nova. Depois de muitas navegações, TODA requisição
// atravessava centenas de camadas e estourava a pilha do navegador.
//
// Regra definitiva: instala UMA vez por aba (marca no window, sobrevive a
// remontagem e a recarga a quente do preview) e NUNCA desinstala. Sem
// desinstalar, não há como reinstalar em cima de si mesma.
//
// Também quebra o ciclo erro → grava log → erro: requisição de gravação de log
// não gera novo aviso (senão o próprio registro do erro produzia outro erro).

const MARCA = '__nzCamadaRedeInstalada';

// O componente pluga aqui a função que exibe/grava o aviso. Fica fora do
// escopo da camada pra a camada nunca depender do ciclo de vida do React.
let avisar = () => {};
export function definirAviso(fn) {
  avisar = typeof fn === 'function' ? fn : () => {};
}

const contagem = { total: 0, desde: Date.now() };
const desempenho = [];

// URLs de telemetria/log: se elas falharem, NÃO geramos outro aviso (evita
// erro → log → erro). O erro continua indo pro console.
const ehCaminhoDeLog = (url) =>
  /entityWrite|system_logs|SystemLog|queuePerformanceEvent|sentry/i.test(String(url || ''));

const ehImagemExterna = (url) =>
  String(url).includes('gstatic.com') ||
  String(url).includes('encrypted-tbn') ||
  /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(String(url)) ||
  String(url).includes('shopping?q=tbn');

const ehRedeInstavel = (erro) => {
  const msg = String(erro?.message || '').toLowerCase();
  return (
    erro?.name === 'AbortError' ||
    msg.includes('load failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network connection was lost') ||
    msg.includes('cancelled') ||
    msg.includes('aborted')
  );
};

export function instalarCamadaRede() {
  if (typeof window === 'undefined' || window[MARCA]) return;
  window[MARCA] = true;

  // Cópia amarrada do fetch vigente: a camada chama SEMPRE esta referência,
  // que nunca é o próprio embrulho.
  const original = window.fetch.bind(window);

  const camada = async (...args) => {
    const inicio = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    contagem.total += 1;
    if (Date.now() - contagem.desde > 60000) {
      const rpm = contagem.total;
      if (rpm > 50) {
        avisar({
          level: 'warning',
          type: 'rate_limit_risk',
          message: `${rpm} requisições/min - RISCO DE RATE LIMIT!`,
          location: 'Global',
          timestamp: new Date().toISOString(),
          prompt: `ATENÇÃO: Detectadas ${rpm} requisições por minuto.\n\nAÇÃO NECESSÁRIA:\n1. Aumentar intervalos de sincronização\n2. Implementar cache local\n3. Reduzir chamadas desnecessárias`,
        });
      }
      contagem.total = 0;
      contagem.desde = Date.now();
    }

    try {
      const resposta = await original(...args);
      const duracao = Date.now() - inicio;

      desempenho.push({ url, duracao, quando: Date.now() });
      if (desempenho.length > 100) desempenho.shift();

      if (duracao > 3000 && !ehCaminhoDeLog(url)) {
        avisar({
          level: 'warning',
          type: 'slow_request',
          message: `Requisição lenta: ${duracao}ms`,
          location: url,
          timestamp: new Date().toISOString(),
          prompt: `Requisição demorou ${duracao}ms:\n${url}\n\nSUGESTÃO: reduzir limit de registros ou paginar.`,
        });
      }

      if (resposta.status === 429) {
        avisar({
          level: 'critical',
          type: 'rate_limit',
          message: '🔴 RATE LIMIT ATINGIDO!',
          location: url,
          timestamp: new Date().toISOString(),
          prompt: `🔴 RATE LIMIT CRÍTICO\n\nURL: ${url}\n\nCORREÇÃO: parar sincronizações por 2 min, aumentar intervalo para 90-120s e aplicar backoff exponencial.`,
        });
      }

      return resposta;
    } catch (erro) {
      if (!ehImagemExterna(url) && !ehRedeInstavel(erro) && !ehCaminhoDeLog(url)) {
        const ehRede =
          erro?.message === 'Failed to fetch' ||
          String(erro?.message || '').includes('NetworkError') ||
          String(erro?.message || '').includes('Network request failed');

        avisar({
          level: 'critical',
          type: ehRede ? 'network_error' : 'request_error',
          message: ehRede
            ? '🌐 Erro de rede — conexão bloqueada ou interrompida'
            : `Erro na requisição: ${erro?.message}`,
          location: url,
          timestamp: new Date().toISOString(),
          prompt: ehRede
            ? `ERRO DE REDE: ${erro?.message}\n\nURL: ${url}\n\nCAUSAS PROVÁVEIS:\n1. Ad blocker bloqueando o domínio\n2. Extensão interceptando chamadas\n3. VPN/Proxy/Firewall\n4. Conexão instável ou DNS\n\nAÇÃO: abrir em modo anônimo. Se funcionar, é extensão/ad blocker.`
            : `ERRO DE REQUISIÇÃO:\n${erro?.message}\n\nURL: ${url}\n\nVERIFICAR:\n1. Conexão\n2. URL correta\n3. Permissões de acesso\n4. Se a entidade existe no banco`,
        });
      }
      throw erro;
    }
  };

  window.fetch = camada;

  // console.error: mesma regra de instalação única (antes também empilhava).
  const consoleOriginal = console.error;
  console.error = (...args) => {
    const texto = args.join(' ');
    if (texto.includes('Maximum update depth exceeded')) {
      avisar({
        level: 'critical',
        type: 'infinite_loop',
        message: '🔴 LOOP INFINITO DETECTADO!',
        location: 'React Component',
        timestamp: new Date().toISOString(),
        prompt: '🔴 LOOP INFINITO DE RENDERIZAÇÃO\n\nCAUSA: useEffect com dependências circulares.\n\nCORREÇÃO: usar useRef para valores que não precisam re-render, memoizar callbacks e revisar arrays de dependências.',
      });
    }
    if (texto.includes('rendered more hooks')) {
      avisar({
        level: 'critical',
        type: 'hook_error',
        message: 'Erro de React Hooks',
        location: 'React Component',
        timestamp: new Date().toISOString(),
        prompt: `ERRO DE HOOKS:\n${texto}\n\nREGRAS: hooks sempre no topo, nunca em condicionais/loops, ordem sempre igual.`,
      });
    }
    consoleOriginal(...args);
  };
}

export function mediaDesempenho() {
  if (desempenho.length <= 10) return 0;
  return desempenho.reduce((s, p) => s + p.duracao, 0) / desempenho.length;
}
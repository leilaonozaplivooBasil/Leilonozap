// Um `plataforma` de mentira só pra banca do navegador — NÃO vai pro app.
// A banca (vite.config.mjs) aponta `@/api/plataformaClient` pra cá, então
// componentes que chamam rotas/uploads rodam sem rede e a prova enxerga
// cada chamada em window.__plataformaFalsa.chamadas.
import { normalizarEventoRealtime } from '@/lib/eventoRealtime';

const estado = { chamadas: [], respostas: {} };
// entidade → tabela (só o que as bancas do Método usam; o resto ecoa o que recebeu)
const TABELA_DA_ENTIDADE = { MetodoTarefa: 'metodo_tarefas', MetodoPerfil: 'metodo_perfil', Customer: 'customers', CaptacaoOportunidade: 'captacao_oportunidades', ReuniaoEmpresa: 'reunioes_empresa' };
if (typeof window !== 'undefined') window.__plataformaFalsa = estado;

// 🎬 LINHAS DE MENTIRA PRA BANCA: window.__entidadesFalsas = { Auction: [...], Product: [...] }
// Lido a cada chamada (não na importação), porque a banca semeia DEPOIS do import.
// Sem semente, continua devolvendo lista vazia — como sempre devolveu.
const semeadas = (entidade) => (typeof window === 'undefined' ? [] : (window.__entidadesFalsas?.[entidade] || []));
const casa = (linha, onde) => Object.entries(onde || {}).every(([c, v]) => String(linha[c]) === String(v));

const responder = (nome, corpo) => {
  const r = estado.respostas[nome];
  return typeof r === 'function' ? r(corpo) : (r ?? { success: false, images: [], motivo: 'sem_resultado' });
};

export const plataforma = {
  functions: {
    invoke: async (nome, corpo) => { estado.chamadas.push({ tipo: 'invoke', nome, corpo }); return responder(nome, corpo); },
  },
  integrations: {
    Core: {
      // 🧠 a IA do encontro: a banca decide a resposta por window.__iaFalsa(body);
      // sem ela, "IA não conectada" — e a tela tem que cair na régua local
      InvokeLLM: async (body) => {
        estado.chamadas.push({ tipo: 'llm', prompt: body?.prompt, schema: !!body?.response_json_schema });
        const r = window.__iaFalsa;
        return typeof r === 'function' ? r(body) : { ok: false, needs_key: true, error: 'IA não conectada (configure AI_GATEWAY_API_KEY).' };
      },
      UploadFile: async ({ file }) => {
        estado.chamadas.push({ tipo: 'upload', nome: file?.name, tipoArquivo: file?.type, tamanho: file?.size });
        return { file_url: `https://nosso-bucket/${estado.chamadas.length}-${(file?.name || 'imagem').replace(/[^a-z0-9.]/gi, '_')}` };
      },
    },
  },
  // 📝 06/09 — `create` GRAVA no banco de mentira (as telas do Método criam a
  // tarefa do dia pela entidade, e a prova precisa enxergar a linha em
  // `escritas`); o resto continua vazio/eco, como sempre foi.
  entities: new Proxy({}, { get: (_, entidade) => ({
    list: async () => semeadas(entidade),
    filter: async (onde) => semeadas(entidade).filter((l) => casa(l, onde)),
    create: async (d) => {
      // 🖼️ 08/10/2026 — a criação fica visível pra prova (tipo 'create') e, quando a
      // banca pede (window.__criaNaLista), entra na lista semeada: a tela que relê
      // depois de gravar enxerga a linha nova, como no banco de verdade.
      estado.chamadas.push({ tipo: 'create', entidade, dados: d });
      if (typeof window !== 'undefined' && window.__criaNaLista && Array.isArray(window.__entidadesFalsas?.[entidade])) {
        const nova = { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, ...d };
        window.__entidadesFalsas[entidade].push(nova);
        return nova;
      }
      const tabela = TABELA_DA_ENTIDADE[entidade];
      const b = typeof window !== 'undefined' ? (window.__bancoFalso ||= { tabelas: {}, escritas: [] }) : null;
      if (!tabela || !b) return d;
      const linha = { id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...d };
      (b.tabelas[tabela] ||= []).push(linha);
      b.escritas.push({ tipo: 'insert', tabela, linhas: [linha] });
      return linha;
    },
    // 📝 23/09/2026 — o update passa a ser VISÍVEL pra prova (chamadas com tipo
    // 'update'): a banca do lead precisa ver que o follow_up_date foi gravado.
    // Também aplica na linha semeada, pra tela que relê enxergar o novo valor.
    update: async (id, d) => {
      estado.chamadas.push({ tipo: 'update', entidade, id, dados: d });
      const linha = semeadas(entidade).find((l) => l.id === id);
      if (linha) Object.assign(linha, d);
      return { id, ...(linha || {}), ...(d || {}) };
    },
    delete: async () => ({}),
    // 📡 01/10/2026 — tempo real de mentira. A banca emite com
    // window.__realtimeFalso.emitir('Auction', { eventType: 'UPDATE', new: {...} })
    // e todo mundo que assinou aquela entidade recebe, no MESMO formato que o
    // adaptador de verdade entrega (normalizado). O filtro `id=eq.X` /
    // `auction_id=eq.X` é respeitado, como no servidor.
    subscribe: (cb, opts = {}) => {
      if (typeof cb !== 'function') return () => {};
      const rt = (window.__realtimeFalso ||= { ouvintes: [], emitir: null });
      const ouvinte = { entidade, cb, opts };
      rt.ouvintes.push(ouvinte);
      return () => { rt.ouvintes = rt.ouvintes.filter((o) => o !== ouvinte); };
    },
  }) }),
  auth: { me: async () => null },
  // o rastreador de desempenho das páginas chama isto ao montar; na banca, não faz nada
  analytics: { track: () => {} },
};

if (typeof window !== 'undefined') {
  const rt = (window.__realtimeFalso ||= { ouvintes: [], emitir: null });
  rt.emitir = (entidade, payload) => {
    const ev = normalizarEventoRealtime(payload);
    for (const o of [...rt.ouvintes]) {
      if (o.entidade !== entidade) continue;
      const evento = String(o.opts?.event || '*').toUpperCase();
      if (evento !== '*' && evento !== String(payload.eventType || '').toUpperCase()) continue;
      const m = /^(\w+)=eq\.(.+)$/.exec(o.opts?.filter || '');
      if (m && String(ev.data?.[m[1]]) !== m[2]) continue;
      o.cb(ev);
    }
  };
}
export const supabase = null;

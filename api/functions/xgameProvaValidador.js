// xgameProvaValidador — A BATERIA DE PROVA DO VALIDADOR (DIR-84.4).
//
// Ordem do dono (07/09/2026), depois do primeiro teste real pegar a foto na
// cama pelos dois motivos: *"será que você consegue fazer mais uns testes
// reais aí por dentro como usuário, só para termos certeza?"*
//
// Isto roda a validação DE VERDADE (mesmo handler, mesmo gateway, mesmo
// modelo) contra imagens conhecidas — fotos reais já enviadas por pessoas e
// telas renderizadas em public/prova/ — e devolve o veredito de cada caso
// lado a lado com o esperado. É como se um usuário comprovasse cada uma.
//
// 🔒 Protegido por senha do COFRE (`app_segredos.xgame_prova_token`): sem o
// token certo, 401 e nada roda (cada caso gasta ~R$ 0,30 de IA). Apagar a
// linha do cofre desliga a bateria sem redeploy. Só GET; um caso por chamada
// (`?caso=nome`) pra caber no tempo da função; sem `caso`, só LISTA os casos
// (não gasta nada).
import { timingSafeEqual } from 'node:crypto';
import validar from './xgameValidarPrint.js';

export const config = { maxDuration: 60 };

// fotos REAIS já enviadas por pessoas do time (storage público do projeto) —
// servem de prova exatamente porque são o que a IA vai encontrar na vida real
const REAIS = {
  cama: 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/xgame/prints/68db0ff2c19838a827fb6e5f/2026-09-07_23997984-d4fb-49e7-8c88-107c9acfc553.jpg',
  fechamento: 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/xgame/prints/af8f3ea05853e7bd96077e70/2026-09-07_17a41231-53ca-4ad3-8438-7500672d9a2a.PNG',
  contratos: 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/xgame/prints/2b7c054de6c3ae61deea8d74/2026-09-06_6e1d61ab-4524-4900-9833-c6d528a8476b.jpg',
};
// telas renderizadas (public/prova/*.png), servidas pelo próprio deploy
const RENDERIZADAS = ['planilha', 'livro', 'preto', 'meme'];

const RESUMO_LIVRO = 'A disciplina é a ponte entre metas e realizações: quem espera a motivação já perdeu o dia, quem age antes descobre que ela vem depois do movimento. Vou aplicar na reunião de segunda — cumprir a lista sem negociar comigo mesmo.';

// esperado: lista de vereditos aceitáveis; `pergunta: true` exige pergunta_para_pessoa
export const CASOS = [
  { nome: 'cama_financeiro', tipo: 'foto', titulo: 'Resolver: O financeiro', hora: '09:00', imagem: 'cama', esperado: ['reprovada', 'duvida'], porque: 'foto na cama × tarefa de trabalho — o teste do dono; nunca aprovada' },
  { nome: 'cama_reciclada', tipo: 'foto', titulo: 'Treino funcional', hora: '06:30', imagem: 'cama', anteriores: ['cama'], esperado: ['reprovada'], porque: 'a MESMA foto já usada antes — reciclagem reprova direto' },
  { nome: 'cama_acordar', tipo: 'instagram', titulo: 'Acordar — gratidão e foco no sonho', hora: '05:00', imagem: 'cama', esperado: ['reprovada', 'duvida'], porque: 'pessoa deitada pra tarefa de acordar — a regra manda reprovar' },
  { nome: 'cama_pretreino', tipo: 'foto', titulo: 'Story ANTES da atividade física (pré-treino)', hora: '05:15', imagem: 'cama', esperado: ['duvida', 'reprovada'], porque: 'o exemplo do dono: incoerência → ela deve PERGUNTAR (ou reprovar se achar gritante)' },
  { nome: 'cama_pretreino_justificativa', tipo: 'foto', titulo: 'Story ANTES da atividade física (pré-treino)', hora: '05:15', imagem: 'cama', justificativa: 'acabei de acordar, ainda tô na cama mas já vou levantar pro treino', tentativa: 2, esperado: ['duvida', 'reprovada'], semPergunta: true, porque: '2ª rodada com justificativa evasiva — não aprova, e não pergunta de novo' },
  { nome: 'planilha_financeiro', tipo: 'foto', titulo: 'Resolver: O financeiro', hora: '09:00', imagem: 'planilha', esperado: ['aprovada'], porque: 'print de planilha de fluxo de caixa × tarefa financeira — tem que APROVAR (quem cumpriu não pode sofrer)' },
  { nome: 'livro_leitura', tipo: 'aprendizado', titulo: 'Leitura — 15 minutos do livro', hora: '05:30', imagem: 'livro', resumo: RESUMO_LIVRO, esperado: ['aprovada'], porque: 'página de livro + resumo nas palavras da pessoa — aprovada' },
  { nome: 'livro_financeiro', tipo: 'foto', titulo: 'Resolver: O financeiro', hora: '09:00', imagem: 'livro', esperado: ['duvida', 'reprovada'], porque: 'página de livro × tarefa financeira — não bate' },
  { nome: 'preto_treino', tipo: 'foto', titulo: 'Treino funcional', hora: '06:30', imagem: 'preto', esperado: ['reprovada'], porque: 'tela preta — reprova sem perguntar' },
  { nome: 'meme_financeiro', tipo: 'foto', titulo: 'Resolver: O financeiro', hora: '09:00', imagem: 'meme', esperado: ['reprovada'], porque: 'meme — reprova sem perguntar' },
  { nome: 'fechamento_real', tipo: 'foto', titulo: 'Fechamento do dia', hora: '18:30', imagem: 'fechamento', esperado: null, porque: 'foto real de uma pessoa do time (o gestor reprovou na mão) — exploratório: o que a IA diz?' },
  { nome: 'contratos_real', tipo: 'foto', titulo: 'Contratos + follow-ups', hora: '17:30', imagem: 'contratos', esperado: null, porque: 'foto real de outra pessoa (gestor reprovou) — exploratório' },
];

let _cacheToken = { valor: null, ate: 0 };
async function tokenDoCofre() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (_cacheToken.ate > Date.now()) return _cacheToken.valor;
  let valor = null;
  try {
    if (SUPABASE_URL && SR) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/app_segredos?id=eq.xgame_prova_token&select=valor&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` }, signal: AbortSignal.timeout(5000),
      });
      const j = await r.json().catch(() => []);
      valor = Array.isArray(j) && j[0]?.valor ? String(j[0].valor) : null;
    }
  } catch { valor = null; }
  _cacheToken = { valor, ate: Date.now() + 60 * 1000 };
  return valor;
}

function tokenBate(dado, certo) {
  if (!dado || !certo) return false;
  const a = Buffer.from(String(dado)); const b = Buffer.from(String(certo));
  return a.length === b.length && timingSafeEqual(a, b);
}

function urlDaImagem(chave, host) {
  if (REAIS[chave]) return REAIS[chave];
  if (RENDERIZADAS.includes(chave)) return `https://${host}/prova/${chave}.png`;
  return null;
}

// roda o validador DE VERDADE, em processo, como se a tela tivesse chamado
async function rodarCaso(caso, host) {
  const body = {
    image_url: urlDaImagem(caso.imagem, host), tipo: caso.tipo, titulo: caso.titulo, hora: caso.hora,
    data: new Date().toISOString().slice(0, 10),
    ...(caso.resumo ? { resumo: caso.resumo } : {}),
    ...(caso.anteriores ? { imagens_anteriores: caso.anteriores.map((k) => urlDaImagem(k, host)) } : {}),
    ...(caso.justificativa ? { justificativa: caso.justificativa, tentativa: caso.tentativa || 2 } : {}),
  };
  const res = { code: 0, corpo: null, setHeader() {}, status(c) { this.code = c; return this; }, json(v) { this.corpo = v; return this; } };
  const t0 = Date.now();
  await validar({ method: 'POST', body }, res);
  const r = res.corpo || {};
  const bateu = r.ia_indisponivel ? false
    : caso.esperado === null ? null
      : caso.esperado.includes(r.veredito) && (!caso.pergunta || !!r.pergunta_para_pessoa) && (!caso.semPergunta || !r.pergunta_para_pessoa);
  return {
    caso: caso.nome, porque: caso.porque, esperado: caso.esperado, ok: bateu, ms: Date.now() - t0,
    veredito: r.veredito, confianca: r.confianca, pergunta_para_pessoa: r.pergunta_para_pessoa || '',
    o_que_viu: r.o_que_viu, motivo: r.motivo, model: r.model, via: r.via,
    ...(r.ia_indisponivel ? { ia_indisponivel: true, details: r.details } : {}),
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'só GET' });
  const certo = await tokenDoCofre();
  if (!tokenBate(req.query?.token, certo)) return res.status(401).json({ ok: false, error: 'sem acesso' });
  const host = String(req.headers?.host || '');
  const nome = String(req.query?.caso || '');
  if (!nome) return res.status(200).json({ ok: true, casos: CASOS.map((c) => ({ nome: c.nome, esperado: c.esperado, porque: c.porque })) });
  const caso = CASOS.find((c) => c.nome === nome);
  if (!caso) return res.status(404).json({ ok: false, error: `caso desconhecido: ${nome}` });
  try {
    return res.status(200).json({ ok: true, resultado: await rodarCaso(caso, host) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 300) });
  }
}

// Um `plataforma` de mentira só pra banca do navegador — NÃO vai pro app.
// A banca (vite.config.mjs) aponta `@/api/plataformaClient` pra cá, então
// componentes que chamam rotas/uploads rodam sem rede e a prova enxerga
// cada chamada em window.__plataformaFalsa.chamadas.
const estado = { chamadas: [], respostas: {} };
// entidade → tabela (só o que as bancas do Método usam; o resto ecoa o que recebeu)
const TABELA_DA_ENTIDADE = { MetodoTarefa: 'metodo_tarefas', MetodoPerfil: 'metodo_perfil', Customer: 'customers', CaptacaoOportunidade: 'captacao_oportunidades', ReuniaoEmpresa: 'reunioes_empresa' };
if (typeof window !== 'undefined') window.__plataformaFalsa = estado;

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
    list: async () => [],
    filter: async () => [],
    create: async (d) => {
      const tabela = TABELA_DA_ENTIDADE[entidade];
      const b = typeof window !== 'undefined' ? (window.__bancoFalso ||= { tabelas: {}, escritas: [] }) : null;
      if (!tabela || !b) return d;
      const linha = { id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...d };
      (b.tabelas[tabela] ||= []).push(linha);
      b.escritas.push({ tipo: 'insert', tabela, linhas: [linha] });
      return linha;
    },
    update: async (d) => d,
    delete: async () => ({}),
  }) }),
  auth: { me: async () => null },
};
export const supabase = null;

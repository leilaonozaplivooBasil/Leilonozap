// Um `plataforma` de mentira só pra banca do navegador — NÃO vai pro app.
// A banca (vite.config.mjs) aponta `@/api/plataformaClient` pra cá, então
// componentes que chamam rotas/uploads rodam sem rede e a prova enxerga
// cada chamada em window.__plataformaFalsa.chamadas.
const estado = { chamadas: [], respostas: {} };
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
      UploadFile: async ({ file }) => {
        estado.chamadas.push({ tipo: 'upload', nome: file?.name, tipoArquivo: file?.type, tamanho: file?.size });
        return { file_url: `https://nosso-bucket/${estado.chamadas.length}-${(file?.name || 'imagem').replace(/[^a-z0-9.]/gi, '_')}` };
      },
    },
  },
  entities: new Proxy({}, { get: () => ({ list: async () => [], filter: async () => [], create: async (d) => d, update: async (d) => d }) }),
  auth: { me: async () => null },
};
export const supabase = null;

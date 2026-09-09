// 🧹 PURGAR ÁUDIOS ANTIGOS — a faxina de 1 mês do acervo de voz (DIR-104, 09/09/2026).
//
// GET  (?dry=1 ou sem nada)  → conta o que VENCEU, não apaga nada
// POST / cron da Vercel      → apaga de verdade
//
// Decisão do dono: "Faz sentido, mas inclua opção de download e aviso de que só
// permanece salvo por 1 mês." O download e o aviso já estão na tela; esta rota
// é a outra metade — quem cumpre o prazo.
//
// ⚠️ ISTO APAGA GRAVAÇÃO DE PESSOA. Não é log, não é cache: é a voz de alguém
// dizendo pelo que era grato. Três coisas seguram a mão:
//
//   1. A RÉGUA É COMPARTILHADA. `audioExpirado` é a MESMA função que a tela usa
//      pra dizer "some em 3 dias". Se o cron tivesse a própria conta, um dia ele
//      apagaria algo que a tela ainda dava como vivo — e a pessoa perderia a
//      gravação depois de ler que tinha tempo.
//   2. DATA RUIM NÃO AUTORIZA NADA. `audioExpirado` devolve false quando não
//      consegue ler a data. Na dúvida o arquivo FICA.
//   3. TETO POR RODADA. Ela roda todo dia; não precisa varrer o mundo de uma
//      vez, e um teto transforma um erro de régua em "apagou 200" em vez de
//      "apagou tudo".
//
// A ORDEM É DE PROPÓSITO — apaga o arquivo, DEPOIS limpa o caminho:
//   - se o arquivo sair e o PATCH falhar, a linha ainda aponta pro caminho, a
//     rodada de amanhã pega ela de novo e termina o serviço (apagar um objeto
//     que já não existe é inofensivo). Auto-corrige.
//   - se fosse ao contrário, um PATCH que desse certo seguido de uma remoção que
//     falhasse deixaria o arquivo órfão no cofre PRA SEMPRE, sem ninguém sabendo
//     que ele está lá. Justamente o que a gente não quer com gravação de voz.
import { audioExpirado, RETENCAO_AUDIO_DIAS } from '../../src/lib/acervoDeVoz.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'xgame-audios';
const TETO_POR_RODADA = 200;

const cab = { apikey: SR, Authorization: `Bearer ${SR}` };
const rest = (p, o = {}) => fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...o, headers: { ...cab, 'Content-Type': 'application/json', ...(o.headers || {}) } });
const store = (p, o = {}) => fetch(`${SUPABASE_URL}/storage/v1/${p}`, { ...o, headers: { ...cab, 'Content-Type': 'application/json', ...(o.headers || {}) } });

/**
 * As linhas cuja gravação já passou do mês.
 *
 * O filtro fino é aqui no JS, com a régua compartilhada — e não num
 * `data=lt.<iso>` montado à mão no PostgREST. Data calculada em dois lugares é
 * exatamente como a tela e o cron passam a discordar.
 */
export async function vencidos(hoje = new Date()) {
  const r = await rest("metodo_tarefas?select=id,data,comprovacao&comprovacao->>audio_gratidao_path=not.is.null&order=data.asc&limit=1000");
  const linhas = await r.json().catch(() => []);
  return (Array.isArray(linhas) ? linhas : [])
    .filter((t) => t?.comprovacao?.audio_gratidao_path && audioExpirado(t.data, hoje))
    .slice(0, TETO_POR_RODADA);
}

/** Tira só o caminho da comprovação e deixa a marca de que a gravação existiu. */
export function comprovacaoSemAudio(comprovacao = {}) {
  const { audio_gratidao_path: _fora, ...resto } = comprovacao || {};
  // A marca importa: sem ela o diário mostraria a entrada como se nunca tivesse
  // havido gravação nenhuma — apagar o arquivo não pode apagar a lembrança de
  // que a pessoa gravou naquele dia.
  return { ...resto, audio_gratidao_expirado: true };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SR) return res.status(200).json({ ok: false, error: 'sem configuração' });

  const hoje = new Date();
  let alvos = [];
  try {
    alvos = await vencidos(hoje);
  } catch (e) {
    console.error('[purgarAudiosAntigos] não consegui listar', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'não consegui listar' });
  }

  // GET é sempre ensaio: dá pra conferir o estrago antes de autorizar.
  if (req.method === 'GET' && !req.query?.executar) {
    return res.status(200).json({ ok: true, ensaio: true, retencao_dias: RETENCAO_AUDIO_DIAS, vencidos: alvos.length, teto: TETO_POR_RODADA });
  }

  let apagados = 0;
  let falhas = 0;
  for (const t of alvos) {
    const caminho = t.comprovacao.audio_gratidao_path;
    try {
      const r = await store(`object/${BUCKET}/${caminho}`, { method: 'DELETE' });
      // 404 = já não estava lá; segue pro PATCH, que é o que fecha o serviço.
      if (!r.ok && r.status !== 404) { falhas += 1; continue; }
      const p = await rest(`metodo_tarefas?id=eq.${encodeURIComponent(t.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ comprovacao: comprovacaoSemAudio(t.comprovacao) }),
      });
      if (!p.ok) { falhas += 1; continue; } // amanhã ela volta pra lista e termina
      apagados += 1;
    } catch (e) {
      console.error('[purgarAudiosAntigos] falhou em', t.id, String(e?.message || e));
      falhas += 1;
    }
  }

  console.log(`[purgarAudiosAntigos] ${apagados} apagados, ${falhas} falhas, de ${alvos.length} vencidos`);
  return res.status(200).json({ ok: true, retencao_dias: RETENCAO_AUDIO_DIAS, vencidos: alvos.length, apagados, falhas });
}

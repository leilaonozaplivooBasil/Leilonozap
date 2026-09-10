// 🚚 MOVER OS VÍDEOS DO RITUAL PRO COFRE — rota de UMA VEZ SÓ (09/09/2026).
//
// GET  ?actorId=<admin>            → conta o que falta mover (não mexe em nada)
// POST { actorId, confirmar: true } → move de verdade
//
// POR QUE UMA ROTA, E NÃO SQL: o arquivo mora no Storage, não no banco. Trocar
// `bucket_id` em `storage.objects` na marra deixaria a linha apontando pra um
// arquivo que não está lá — o registro diria "privado" e o objeto continuaria
// no bucket público. Mover de verdade é baixar, subir no cofre, conferir, e só
// então apagar o original.
//
// A ORDEM IMPORTA, E É ESTA:
//   1. baixa do público   2. sobe no cofre   3. atualiza a comprovação
//   4. só então apaga o público
// Se qualquer passo falhar, o vídeo continua acessível pelo caminho antigo e a
// comprovação segue apontando pra ele. O pior caso é ficar como está hoje —
// nunca perder a gravação de alguém.
//
// ⚠️ ROTA DESCARTÁVEL. Depois que o GET responder `faltam: 0`, ela pode ser
// apagada do repositório. Está aqui porque mover 9 arquivos à mão pelo painel
// é onde se erra o caminho e se apaga o de outra pessoa.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_PUBLICO = 'public-assets';
const BUCKET_COFRE = 'xgame-videos';

const cab = { apikey: SR, Authorization: `Bearer ${SR}` };
const rest = (p, o = {}) => fetch(`${SUPABASE_URL}/rest/v1/${p}`, { ...o, headers: { ...cab, 'Content-Type': 'application/json', ...(o.headers || {}) } });
const store = (p, o = {}) => fetch(`${SUPABASE_URL}/storage/v1/${p}`, { ...o, headers: { ...cab, ...(o.headers || {}) } });

/** Só admin de verdade, lido do banco. */
async function ehAdmin(id) {
  if (!id) return false;
  try {
    const r = await rest(`app_users?select=role&id=eq.${encodeURIComponent(id)}&limit=1`);
    const j = await r.json().catch(() => []);
    return ['admin', 'super_admin'].includes(String(j?.[0]?.role || ''));
  } catch { return false; }
}

/**
 * Do link público de volta pro caminho dentro do bucket.
 * `.../object/public/public-assets/xgame/rituais/<uid>/<arquivo>` → o que vem
 * depois do nome do bucket.
 */
function caminhoDoLink(url) {
  const m = String(url || '').match(new RegExp(`/object/public/${BUCKET_PUBLICO}/(.+)$`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function pendentes() {
  // `comprovacao->>'video_url' is not null` e ainda sem `video_path`
  const r = await rest("metodo_tarefas?select=id,comprovacao&comprovacao->>video_url=not.is.null&limit=500");
  const linhas = await r.json().catch(() => []);
  return (Array.isArray(linhas) ? linhas : []).filter((t) => t?.comprovacao?.video_url && !t?.comprovacao?.video_path);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SR) return res.status(200).json({ ok: false, error: 'sem configuração' });

  const corpo = req.method === 'POST' ? (req.body || {}) : {};
  const actorId = String(req.query?.actorId || corpo.actorId || '');
  if (!(await ehAdmin(actorId))) return res.status(403).json({ ok: false, error: 'só admin' });

  const fila = await pendentes();
  if (req.method !== 'POST' || corpo.confirmar !== true) {
    return res.status(200).json({ ok: true, faltam: fila.length, prévia: fila.slice(0, 5).map((t) => t.id) });
  }

  const feitos = []; const falhas = [];
  for (const t of fila) {
    const c = t.comprovacao || {};
    const caminho = caminhoDoLink(c.video_url);
    if (!caminho) { falhas.push({ id: t.id, motivo: 'link fora do formato esperado' }); continue; }
    try {
      // 1. baixa do público
      const baixa = await store(`object/${BUCKET_PUBLICO}/${caminho}`);
      if (!baixa.ok) { falhas.push({ id: t.id, motivo: `baixar: ${baixa.status}` }); continue; }
      const bytes = Buffer.from(await baixa.arrayBuffer());

      // 2. sobe no cofre, no MESMO caminho (o uid no meio é a trava de dono)
      const sobe = await store(`object/${BUCKET_COFRE}/${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': baixa.headers.get('content-type') || 'video/webm', 'x-upsert': 'true' },
        body: bytes,
      });
      if (!sobe.ok) { falhas.push({ id: t.id, motivo: `subir: ${sobe.status}` }); continue; }

      // 3. a comprovação passa a apontar pro cofre (e o link público sai dela)
      const nova = { ...c, video_path: caminho };
      delete nova.video_url;
      const patch = await rest(`metodo_tarefas?id=eq.${encodeURIComponent(t.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ comprovacao: nova }),
      });
      if (!patch.ok) { falhas.push({ id: t.id, motivo: `atualizar: ${patch.status}` }); continue; }

      // 4. só AGORA apaga o público. Se algo acima falhou, o vídeo continua
      //    acessível pelo caminho antigo — o pior caso é ficar como está hoje.
      const apaga = await store(`object/${BUCKET_PUBLICO}/${caminho}`, { method: 'DELETE' });
      feitos.push({ id: t.id, caminho, publico_apagado: apaga.ok });
    } catch (e) {
      falhas.push({ id: t.id, motivo: String(e?.message || e).slice(0, 120) });
    }
  }
  return res.status(200).json({ ok: true, movidos: feitos.length, falhas: falhas.length, feitos, falhas });
}

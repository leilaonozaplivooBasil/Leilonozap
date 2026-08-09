import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2, ChevronDown, ChevronRight, Users, Search } from 'lucide-react';

// 🌳 ÁRVORE GENEALÓGICA COMPLETA (08/08/2026)
// Antes o painel mostrava só quem a pessoa cadastrou DIRETO (1 nível) e, quando
// esse primeiro nível estava vazio, a tela dizia "sua árvore está vazia" mesmo
// existindo gente mais embaixo. Aqui a árvore desce até o último nível, a partir
// da própria pessoa: quem ela trouxe, quem essa pessoa trouxe, e assim por diante.
// Só LEITURA — nenhuma regra de comissão ou cadastro é tocada.

const CARGO_LABEL = {
  usuario: 'Usuário', influenciador: 'Influenciador', influencer: 'Influenciador',
  vendedor: 'Vendedor', licenciado: 'Licenciado', licenciado_catalogo: 'Licenciado',
  parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física',
  distribuidor: 'Distribuidor', trainee: 'Trainee', executivo: 'Executivo',
  diretor: 'Diretor', diretoria: 'Diretoria', ceo: 'CEO',
  conselheiro: 'Conselheiro', fundador: 'Fundador',
};

// o "dono" de cada pessoa: quem indicou; se não houver, quem recrutou
const paiDe = (u) => u.referred_by_id || u.recruited_by_id || null;

export default function ArvoreGenealogica({ userId, userName }) {
  const [pessoas, setPessoas] = useState(null);
  const [abertos, setAbertos] = useState({});
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    (async () => {
      const linhas = [];
      // páginas de 1000 pra não bater no teto de linhas do banco
      for (let p = 0; p < 12; p++) {
        const { data } = await supabase
          .from('app_users')
          .select('id,full_name,email,primary_career_level,referred_by_id,recruited_by_id,created_at')
          .range(p * 1000, p * 1000 + 999);
        linhas.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      if (vivo) setPessoas(linhas);
    })();
    return () => { vivo = false; };
  }, [userId]);

  // filhos por pai + árvore montada a partir de MIM
  const { raiz, total, porCargo } = useMemo(() => {
    if (!pessoas) return { raiz: [], total: 0, porCargo: {} };
    const filhos = {};
    pessoas.forEach((u) => {
      const pai = paiDe(u);
      if (!pai || pai === u.id) return;
      (filhos[pai] = filhos[pai] || []).push(u);
    });
    const cargos = {};
    let n = 0;
    const vistos = new Set([userId]);
    const montar = (id, nivel) => (filhos[id] || [])
      .filter((f) => !vistos.has(f.id)) // trava anti-ciclo
      .map((f) => {
        vistos.add(f.id);
        n += 1;
        const c = f.primary_career_level || 'usuario';
        cargos[c] = (cargos[c] || 0) + 1;
        return { ...f, nivel, filhos: montar(f.id, nivel + 1) };
      })
      .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR'));
    const arvore = montar(userId, 1);
    return { raiz: arvore, total: n, porCargo: cargos };
  }, [pessoas, userId]);

  // busca: acha a pessoa em qualquer nível
  const achados = useMemo(() => {
    if (!busca.trim() || !pessoas) return null;
    const termo = busca.trim().toLowerCase();
    const lista = [];
    const varrer = (nos) => nos.forEach((no) => {
      if (String(no.full_name || '').toLowerCase().includes(termo) || String(no.email || '').toLowerCase().includes(termo)) lista.push(no);
      varrer(no.filhos);
    });
    varrer(raiz);
    return lista;
  }, [busca, raiz, pessoas]);

  if (pessoas === null) {
    return <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Montando sua árvore…</div>;
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">
        <b className="text-white">{total}</b> pessoa(s) na sua árvore — contando todos os níveis abaixo de você.
      </p>

      {total > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {Object.entries(porCargo).sort((a, b) => b[1] - a[1]).map(([c, q]) => (
            <span key={c} className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-200">
              {CARGO_LABEL[c] || c}: <b className="text-white">{q}</b>
            </span>
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">
          Sua árvore está vazia. Use <b className="text-green-400">Cadastrar &amp; Vender</b> pra começar.
        </div>
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alguém na árvore…"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
            />
          </div>

          {achados ? (
            <div className="space-y-2">
              {achados.length === 0 && <p className="text-gray-500 text-sm">Ninguém encontrado com esse nome.</p>}
              {achados.map((p) => <Linha key={p.id} pessoa={p} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 p-3 bg-gray-900/40">
              <div className="flex items-center gap-2 mb-2 text-sm font-bold text-green-400">
                <Users className="w-4 h-4" /> {userName || 'Você'} <span className="text-gray-500 font-normal">(topo da sua árvore)</span>
              </div>
              <Ramo nos={raiz} abertos={abertos} setAbertos={setAbertos} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Ramo({ nos, abertos, setAbertos }) {
  return (
    <div className="ml-2 pl-3 border-l border-gray-800 space-y-1.5">
      {nos.map((p) => {
        const temFilhos = p.filhos.length > 0;
        const aberto = abertos[p.id] !== false; // abertos por padrão
        return (
          <div key={p.id}>
            <div className="flex items-center gap-1.5">
              {temFilhos ? (
                <button
                  onClick={() => setAbertos((a) => ({ ...a, [p.id]: !aberto }))}
                  className="p-1 text-gray-500 hover:text-white shrink-0"
                  aria-label={aberto ? 'Recolher' : 'Expandir'}
                >
                  {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : <span className="w-6 shrink-0" />}
              <Linha pessoa={p} />
            </div>
            {temFilhos && aberto && <Ramo nos={p.filhos} abertos={abertos} setAbertos={setAbertos} />}
          </div>
        );
      })}
    </div>
  );
}

function Linha({ pessoa }) {
  const qtd = pessoa.filhos?.length || 0;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{pessoa.full_name || '—'}</div>
        <div className="text-[11px] text-gray-500 truncate">{pessoa.email || '—'}</div>
      </div>
      <span className="text-[10px] bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 shrink-0">
        {CARGO_LABEL[pessoa.primary_career_level] || pessoa.primary_career_level || 'Usuário'}
      </span>
      {qtd > 0 && <span className="text-[10px] text-green-400 shrink-0">+{qtd}</span>}
    </div>
  );
}
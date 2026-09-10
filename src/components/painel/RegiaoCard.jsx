import React, { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { plataforma } from '@/api/plataformaClient';
import { buscarRegiao } from '@/lib/regiaoInteligenciaCache';
import { MapPin, Users2, TrendingUp, Network, Loader2 } from 'lucide-react';

const num = (n) => Number(n || 0).toLocaleString('pt-BR');

// 🎨 10/09/2026 — CORES EM TOKEN DA MARCA, NÃO EM CLASSE DO TAILWIND.
//
// Este card nasceu no tema escuro (`from-indigo-900/30 to-gray-900`) e a Visão
// da Operação virou tema claro em 08/08. O clareamento global do .nz-painel
// cobre `from-gray-8/9`, `from-slate-9` e `via-gray-9` — mas NÃO cobre parada
// de degradê colorida. Resultado: enquanto a página inteira clareou, este
// bloco continuou escuro, sozinho, com a linha da estimativa apagada.
//
// A correção NÃO é ensinar mais uma cor ao clareador global (isso repintaria
// 20+ telas de uma vez). É este componente parar de depender do clareador:
// as cores vêm dos tokens institucionais (:root do index.css), aplicadas em
// `style`. Nenhuma classe `bg-*`/`text-*` de cor sobrou aqui, então nenhuma
// regra global casa com ele — nem pra clarear, nem pra escurecer.
const CASCA = { backgroundColor: 'var(--nz-verde-fundo)', border: '1px solid var(--nz-borda)' };
const TINTA = { color: 'var(--nz-tinta)' };
const FRACA = { color: 'var(--nz-tinta-fraca)' };
const VERDE = { color: 'var(--nz-verde)' };
// número grande: `tabular-nums` alinha as casas entre as três colunas
const VALOR = { fontVariantNumeric: 'tabular-nums' };

// filete à esquerda de cada métrica — verde no dinheiro, neutro no resto
const filete = (destaque) => ({ borderLeft: `3px solid ${destaque ? 'var(--nz-verde)' : 'var(--nz-borda)'}` });

function Metrica({ icon: Icon, rotulo, sufixo, valor, destaque }) {
  return (
    <div className="pl-3" style={filete(destaque)}>
      <div className="flex items-center gap-1.5 text-xs mb-0.5" style={FRACA}>
        <Icon className="w-3.5 h-3.5" /> {rotulo}{sufixo ? <span className="text-[10px]">{sufixo}</span> : null}
      </div>
      <div className="text-2xl font-black" style={{ ...VALOR, ...(destaque ? VERDE : TINTA) }}>{valor}</div>
    </div>
  );
}

// Inteligência da região do endereço cadastrado (habitantes, potencial, afiliações).
// Robusto: não quebra se não tiver CEP ou se a API externa falhar.
export default function RegiaoCard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cep = (user?.address_zip_code || user?.cep || '').replace(/\D/g, '');
  const cidade = user?.address_city || '';
  const uf = user?.address_state || '';

  // 🛰️ Uma consulta por região a cada 2 minutos, no máximo. O porteiro
  // (regiaoInteligenciaCache) guarda a resposta, junta pedidos simultâneos e
  // dá espera crescente quando a API recusa — era daqui que vinha a rajada
  // que estourava o limite e mostrava o alerta vermelho sobre o painel.
  // As dependências agora são os VALORES (cep/cidade/uf), não o objeto do
  // usuário: antes, qualquer re-render do painel podia pedir tudo de novo.
  useEffect(() => {
    if (!cep && !cidade) { setLoading(false); setData({ available: false }); return; }
    let alive = true;
    buscarRegiao(plataforma, { cep, cidade, uf }).then((r) => {
      if (!alive) return;
      setData(r);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [cep, cidade, uf]);

  // ⚠️ Os três retornos usam a MESMA casca. Antes, carregando e indisponível
  // eram escuros também (`bg-gray-800/60`, `bg-gray-800/40`) — o card ficava
  // piscando escuro antes de aparecer claro.
  if (loading) return (
    <div className="rounded-2xl p-5 mb-6 flex items-center gap-2 text-sm" style={{ ...CASCA, ...FRACA }}>
      <Loader2 className="w-4 h-4 animate-spin" /> Carregando inteligência da região…
    </div>
  );
  if (!data?.available) return (
    <div className="rounded-2xl p-4 mb-6 text-sm flex items-center gap-2" style={{ ...CASCA, border: '1px dashed var(--nz-borda)', ...FRACA }}>
      <MapPin className="w-4 h-4" /> {data?.motivo || 'Cadastre seu CEP em Empresa / Perfil pra ver a inteligência da sua região.'}
    </div>
  );

  return (
    <div className="rounded-2xl p-5 mb-6" style={CASCA}>
      <div className="flex items-center gap-2 text-xs font-bold mb-4">
        <MapPin className="w-4 h-4" style={VERDE} />
        <span className="uppercase tracking-wider" style={VERDE}>Inteligência da Região</span>
        <span style={FRACA}>·</span>
        <span className="text-sm" style={TINTA}>{data.cidade}{data.uf ? `/${data.uf}` : ''}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metrica icon={Users2} rotulo="Habitantes" valor={data.habitantes != null ? num(data.habitantes) : '—'} />
        <Metrica icon={TrendingUp} rotulo="Potencial de venda" sufixo=" (mês)" valor={data.potencial_venda != null ? money(data.potencial_venda) : '—'} destaque />
        <Metrica icon={Network} rotulo="Afiliações na região" valor={num(data.afiliacoes)} />
      </div>
      {data.premissas && (
        <div className="text-[11px] mt-4 pt-3" style={{ ...FRACA, borderTop: '1px solid var(--nz-borda)' }}>
          Estimativa: {data.premissas.penetracao_pct}% da população × ticket de {money(data.premissas.ticket)}.
        </div>
      )}
    </div>
  );
}

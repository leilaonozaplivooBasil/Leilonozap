import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Wallet, TrendingUp, Search } from 'lucide-react';

// 📄 EXTRATO DE COMISSÕES — transparência total, em qualquer login.
// Mostra de ONDE veio cada centavo: data, produto, quem vendeu, valor da venda,
// o cargo pelo qual você ganhou, o % e o seu ganho. Nada de caixa-preta.
const CARGO_LABEL = {
  licenciado_catalogo: 'Licenciado',
  licenciado_aplicativo: 'Influenciador',
  influenciador: 'Influenciador',
  vendedor: 'Vendedor',
  trainee: 'Trainee',
  executivo: 'Executivo',
  kit_start: 'Kit Start',
  plano_lider: 'Plano Líder',
  plano_lojista: 'Plano Lojista',
  distribuidor: 'Distribuidor',
  diretor: 'Diretor',
  diretoria: 'Diretoria',
  ceo: 'CEO',
  conselheiro: 'Conselheiro',
  fundador: 'Fundador',
  parceiro: 'Parceiro',
  ponto_retirada: 'Ponto de Retirada',
  loja_fisica: 'Loja Física',
  site_official_rollup: 'Empresa',
};
const rotulo = (c) => CARGO_LABEL[c] || c;

export default function ExtratoComissoes({ user, isSaiDeBaixo = false }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    setCarregando(true);
    try {
      const r = await base44.functions.invoke('getMyCommissions', { user_id: user.id, limit: 500 });
      setDados(r?.success ? r : { itens: [], total: 0, por_cargo: {}, saldo_carteira: 0 });
    } catch {
      setDados({ itens: [], total: 0, por_cargo: {}, saldo_carteira: 0 });
    }
    setCarregando(false);
  }, [user?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const card = isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700';
  const txt = isSaiDeBaixo ? 'text-gray-900' : 'text-white';
  const sub = isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400';
  const linha = isSaiDeBaixo ? 'border-gray-200' : 'border-gray-700';

  const itens = (dados?.itens || []).filter((i) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (i.produto || '').toLowerCase().includes(q)
      || (i.vendedor || '').toLowerCase().includes(q)
      || rotulo(i.cargo).toLowerCase().includes(q);
  });

  const baixarCSV = () => {
    const head = ['Data', 'Produto', 'Quem vendeu', 'Origem', 'Valor da venda', 'Seu cargo', '%', 'Sua comissão'];
    const linhas = (dados?.itens || []).map((i) => [
      new Date(i.data).toLocaleString('pt-BR'),
      `"${(i.produto || '').replace(/"/g, "'")}"`,
      `"${i.vendedor || ''}"`,
      `"${i.origem || ''}"`,
      Number(i.valor_venda).toFixed(2),
      rotulo(i.cargo),
      Number(i.percentual).toFixed(3),
      Number(i.ganho).toFixed(2),
    ].join(';'));
    const csv = [head.join(';'), ...linhas].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-comissoes-${(user?.full_name || 'conta').replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (carregando) {
    return (
      <Card className={card}>
        <CardContent className="py-12 text-center">
          <Loader2 className={`w-7 h-7 mx-auto animate-spin ${sub}`} />
          <p className={`${sub} mt-3 text-sm`}>Carregando seu extrato…</p>
        </CardContent>
      </Card>
    );
  }

  const porCargo = Object.entries(dados?.por_cargo || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className={card}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 text-xs font-semibold ${sub}`}><Wallet className="w-4 h-4" /> SALDO NA CARTEIRA</div>
            <p className="text-2xl font-black text-green-400 mt-1">{money(dados?.saldo_carteira || 0)}</p>
          </CardContent>
        </Card>
        <Card className={card}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 text-xs font-semibold ${sub}`}><TrendingUp className="w-4 h-4" /> TOTAL JÁ GANHO</div>
            <p className={`text-2xl font-black ${txt} mt-1`}>{money(dados?.total || 0)}</p>
          </CardContent>
        </Card>
        <Card className={card}>
          <CardContent className="p-4">
            <div className={`text-xs font-semibold ${sub}`}>LANÇAMENTOS</div>
            <p className={`text-2xl font-black ${txt} mt-1`}>{dados?.total_lancamentos || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* GANHO POR CARGO — explica de qual "chapéu" veio o dinheiro */}
      {porCargo.length > 0 && (
        <Card className={card}>
          <CardHeader className="pb-3">
            <CardTitle className={`${txt} text-base`}>💼 De onde vem o seu ganho</CardTitle>
            <CardDescription className={sub}>Você recebe por cada cargo que ocupa. Estes são os seus totais por cargo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {porCargo.map(([cargo, valor]) => (
                <div key={cargo} className={`px-3 py-2 rounded-xl border ${isSaiDeBaixo ? 'bg-gray-50 border-gray-200' : 'bg-gray-900/60 border-gray-700'}`}>
                  <p className={`text-[11px] font-semibold ${sub}`}>{rotulo(cargo)}</p>
                  <p className="text-sm font-bold text-green-400">{money(valor)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EXTRATO DETALHADO */}
      <Card className={card}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className={`${txt} text-base`}>📄 Extrato detalhado</CardTitle>
              <CardDescription className={sub}>Cada linha mostra a venda que gerou a sua comissão.</CardDescription>
            </div>
            <Button onClick={baixarCSV} variant="outline" className={isSaiDeBaixo ? '' : 'bg-gray-900 border-gray-600 text-gray-200 hover:bg-gray-700'}>
              <Download className="w-4 h-4 mr-2" /> Baixar CSV
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por produto, vendedor ou cargo…"
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none ${isSaiDeBaixo ? 'bg-gray-100 border border-gray-300 text-gray-900' : 'bg-gray-900 border border-gray-700 text-white'}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <div className={`text-center py-10 ${sub}`}>
              <p className="text-sm">Nenhuma comissão por aqui ainda.</p>
              <p className="text-xs mt-1">Assim que uma venda da sua rede for paga, ela aparece aqui com todos os detalhes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {itens.map((i) => (
                <div key={i.id} className={`rounded-xl border ${linha} p-3 ${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${txt} truncate`}>{i.produto}</p>
                      <p className={`text-[11px] ${sub} mt-0.5`}>
                        {new Date(i.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{i.origem}
                      </p>
                      <p className={`text-[11px] ${sub} mt-1`}>
                        Vendido por <strong className={isSaiDeBaixo ? 'text-gray-800' : 'text-gray-300'}>{i.vendedor}</strong>
                        {' · '}venda de <strong className={isSaiDeBaixo ? 'text-gray-800' : 'text-gray-300'}>{money(i.valor_venda)}</strong>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-green-400">+{money(i.ganho)}</p>
                      <p className={`text-[11px] ${sub}`}>
                        {rotulo(i.cargo)} · {Number(i.percentual).toFixed(2).replace(/\.?0+$/, '')}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {dados?.tem_mais && (
                <p className={`text-center text-xs ${sub} pt-2`}>
                  Mostrando os {itens.length} lançamentos mais recentes. Baixe o CSV para ver o histórico completo.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Landmark } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import { getLevel } from '@/lib/careerLevels';

// 🏛️ DIR-39 — O TIME CORPORATIVO: quem carrega as metas de licença e
// parceiro de compra é o topo (Sócio Executivo → Fundador), puxado
// AUTOMATICAMENTE do cadastro do app pela função principal — cadastro manual
// de vendedor continua existindo, mas não lista mais aqui.
export default function CrmTimeCorporativo({ membros = [] }) {
  const [filtroFuncao, setFiltroFuncao] = useState('todas');

  const funcoesPresentes = useMemo(() => {
    const ids = [...new Set(membros.map((m) => m.funcaoPrincipal))];
    return ids.sort((a, b) => getLevel(b).ordem - getLevel(a).ordem);
  }, [membros]);

  const visiveis = filtroFuncao === 'todas'
    ? membros
    : membros.filter((m) => m.funcaoPrincipal === filtroFuncao);

  return (
    <Card className="bg-white border-nz-borda">
      <CardHeader className="border-b border-nz-borda">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-nz-tinta text-base flex items-center gap-2">
            <Landmark className="w-4 h-4 text-nz-marrom" />
            Time Corporativo ({visiveis.length})
            <StatInfoTooltip text="Os donos das metas de licença e parceiro de compra: todo mundo com cargo executivo (Sócio Executivo → Fundador) JÁ CADASTRADO no app, listado pela função principal. A lista vem direto do cadastro — cargo novo atribuído no Admin aparece aqui sozinho." />
          </CardTitle>
          <select
            value={filtroFuncao}
            onChange={(e) => setFiltroFuncao(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-3 py-1.5 border border-nz-borda text-sm"
          >
            <option value="todas">Todas as funções</option>
            {funcoesPresentes.map((id) => (
              <option key={id} value={id}>{getLevel(id).name}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                <th className="text-left p-3 font-semibold text-nz-tinta">Nome</th>
                <th className="text-left p-3 font-semibold text-nz-tinta">Contato</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Função principal</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Outros cargos</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((m) => {
                const nivel = getLevel(m.funcaoPrincipal);
                const outros = m.cargos.filter((c) => c !== m.funcaoPrincipal);
                return (
                  <tr key={m.user.id} className="border-b border-nz-borda hover:bg-nz-cinza-fundo/60">
                    <td className="p-3 text-nz-tinta font-medium">{m.user.full_name || m.user.email || 'Sem nome'}</td>
                    <td className="p-3 text-nz-tinta-fraca">
                      <div className="space-y-0.5">
                        {m.user.phone && <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{m.user.phone}</p>}
                        {m.user.email && <p className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{m.user.email}</p>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={`${nivel.color} text-white border-0`}>{nivel.name}</Badge>
                    </td>
                    <td className="p-3 text-center text-xs text-nz-tinta-fraca">
                      {outros.length > 0 ? outros.map((c) => getLevel(c).name).join(' · ') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visiveis.length === 0 && (
            <div className="text-center py-12 text-nz-tinta-fraca">
              <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Ninguém do topo com essa função ainda — atribua os cargos no painel Admin.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

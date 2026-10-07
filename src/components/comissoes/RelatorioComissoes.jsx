import React from 'react';
import { fmtBR } from '@/lib/money';
import { Loader2, ScrollText, AlertTriangle } from 'lucide-react';
import { ORIGENS, rotuloDoPapel } from '@/lib/origemDaComissao';

// 🧾 RELATÓRIO POR ORIGEM E LICENÇA (05/10/2026, DIR-200)
// Dono: "relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda
// da loja virtual por licença". Os números vêm prontos do servidor
// (api/functions/relatorioComissoes.js → relatorio_comissoes()); aqui só se mostra.
// A conta oficial da empresa fica num bloco à parte: não é "pessoa a receber".
const dataCurta = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';
};

function Valor({ rotulo, valor, n, tom = 'text-white', teste }) {
  return (
    <div data-teste={teste}>
      <div className="text-[11px] text-gray-500">{rotulo}</div>
      <div className={`text-base font-black ${tom}`}>R$ {fmtBR(valor)}</div>
      {Number.isFinite(Number(n)) && <div className="text-[11px] text-gray-600">{n} linha{Number(n) === 1 ? '' : 's'}</div>}
    </div>
  );
}

export default function RelatorioComissoes({ relatorio, carregando, erro }) {
  if (carregando) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-400 flex items-center gap-2" data-teste="relatorio-carregando">
        <Loader2 className="w-4 h-4 animate-spin" /> Montando o relatório por origem…
      </div>
    );
  }
  if (!relatorio) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-500" data-teste="relatorio-indisponivel">
        O relatório por origem não carregou{erro ? ` (${erro})` : ''}. O extrato por pessoa abaixo continua valendo.
      </div>
    );
  }
  const origens = Array.isArray(relatorio.origens) ? relatorio.origens : [];
  const licencas = Array.isArray(relatorio.licencas) ? relatorio.licencas : [];
  const fora = Array.isArray(relatorio.saldos_fora_do_extrato) ? relatorio.saldos_fora_do_extrato : [];
  const proximas = Array.isArray(relatorio.proximas_liberacoes) ? relatorio.proximas_liberacoes : [];
  const empresa = relatorio.empresa || {};
  const vencidas = Number(relatorio.em_espera_vencidas) || 0;
  const aConferir = Array.isArray(relatorio.indicacoes_a_conferir) ? relatorio.indicacoes_a_conferir : [];

  return (
    <section className="space-y-4" data-teste="relatorio-comissoes">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-green-400" />
        <h2 className="text-lg font-black">Relatório por origem e licença</h2>
        <span className="text-xs text-gray-500">· {dataCurta(relatorio.gerado_em)}</span>
      </div>

      {vencidas > 0 && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2" data-teste="alerta-liberacao-atrasada">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {vencidas} comiss{vencidas === 1 ? 'ão' : 'ões'} de depósito já venceu os 7 dias há mais de 2 horas e não liberou. O robô de liberação precisa ser olhado.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {origens.map((o) => {
          const meta = ORIGENS[o.origem] || { rotulo: o.origem, regra: '', tom: 'text-white' };
          return (
            <div key={o.origem} className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3" data-teste={`origem-${o.origem}`}>
              <div>
                <div className={`font-black ${meta.tom}`}>{meta.rotulo}</div>
                <div className="text-[11px] text-gray-500">{meta.regra}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {o.origem === 'deposito' && <Valor rotulo="Em espera (7 dias)" valor={o.em_espera} n={o.n_em_espera} tom="text-gray-200" teste="em-espera" />}
                <Valor rotulo="A receber (geradas)" valor={o.a_receber} n={o.n_a_receber} tom="text-amber-400" teste="a-receber" />
                <Valor rotulo="Já pago" valor={o.pago} n={o.n_pago} tom="text-green-400" teste="pago" />
                <Valor rotulo="Estornado" valor={o.estornado} tom="text-gray-400" teste="estornado" />
                {o.origem === 'deposito' && Number(o.cancelado_em_espera) > 0 && <Valor rotulo="Cancelado antes de liberar" valor={o.cancelado_em_espera} tom="text-gray-400" teste="cancelado-em-espera" />}
                {Number(o.empresa) > 0 && <Valor rotulo="Ficou com a empresa" valor={o.empresa} tom="text-gray-300" teste="empresa" />}
              </div>
              <div className="text-[11px] text-gray-500">{o.pessoas} pessoa{Number(o.pessoas) === 1 ? '' : 's'} com comissão nesta origem</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Por licença (cargo)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-teste="tabela-licencas">
              <thead className="bg-gray-800/60 text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Licença</th>
                  <th className="text-left px-3 py-2">Origem</th>
                  <th className="text-right px-3 py-2">Pessoas</th>
                  <th className="text-right px-3 py-2">A receber</th>
                  <th className="text-right px-3 py-2">Já pago</th>
                  <th className="text-right px-3 py-2">Estornado</th>
                </tr>
              </thead>
              <tbody>
                {licencas.map((l) => (
                  <tr key={`${l.origem}-${l.role}`} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-gray-200">{rotuloDoPapel(l.role)}</td>
                    <td className={`px-3 py-2 text-xs ${ORIGENS[l.origem]?.tom || 'text-gray-400'}`}>{ORIGENS[l.origem]?.rotulo || l.origem}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{l.pessoas}</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-400">R$ {fmtBR(l.a_receber)}</td>
                    <td className="px-3 py-2 text-right text-green-400">R$ {fmtBR(l.pago)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">R$ {fmtBR(l.estornado)}</td>
                  </tr>
                ))}
                {licencas.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhuma comissão gerada ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2" data-teste="bloco-empresa">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Retido pela empresa (conta oficial)</div>
            <div className="text-xl font-black text-gray-200">R$ {fmtBR(empresa.saldo)}</div>
            <div className="text-[11px] text-gray-500 space-y-0.5">
              <div>Leilão retido: R$ {fmtBR(empresa.leilao_retido)}</div>
              <div>Loja, fatia sem dono: R$ {fmtBR(empresa.loja_sem_dono)}</div>
              <div>Indicação de depósito (clientes sem indicador): R$ {fmtBR(empresa.indicacao_deposito)}{Number(empresa.indicacao_em_espera) > 0 ? ` + R$ ${fmtBR(empresa.indicacao_em_espera)} em espera` : ''}</div>
            </div>
            <p className="text-[11px] text-gray-600">Não entra no total das pessoas: é dinheiro da empresa com a empresa.</p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4" data-teste="proximas-liberacoes">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Próximas liberações (7 dias)</div>
            {proximas.length === 0 ? (
              <div className="text-xs text-gray-500">Nada em espera.</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {proximas.slice(0, 8).map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="text-gray-300 truncate">{p.nome}</span>
                    <span className="text-gray-500 whitespace-nowrap">{dataCurta(p.libera_em)}</span>
                    <span className="font-bold text-white whitespace-nowrap">R$ {fmtBR(p.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {aConferir.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4" data-teste="indicacoes-a-conferir">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Indicações a conferir · depósito cujo indicador atual não recebeu os 10%</div>
          <p className="text-xs text-gray-400 mb-2">
            A comissão vai para quem era o indicador na hora do depósito. Se o cliente foi movido para outra pessoa depois, o depósito aparece aqui para o dono decidir se a comissão vai para o indicador atual.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs"><tr><th className="text-left px-2 py-1">Depósito</th><th className="text-left px-2 py-1">Cliente</th><th className="text-left px-2 py-1">Indicador atual</th><th className="text-left px-2 py-1">Quem recebeu</th><th className="text-right px-2 py-1">10%</th></tr></thead>
              <tbody>
                {aConferir.map((d) => (
                  <tr key={d.sale_id} className="border-t border-gray-800/60">
                    <td className="px-2 py-1 text-gray-300 whitespace-nowrap">{dataCurta(d.depositado_em)} · R$ {fmtBR(d.valor)}</td>
                    <td className="px-2 py-1 text-gray-200">{d.cliente}</td>
                    <td className="px-2 py-1 text-amber-200">{d.indicador}</td>
                    <td className="px-2 py-1 text-gray-400">{d.quem_recebeu || 'ninguém'}</td>
                    <td className="px-2 py-1 text-right font-bold text-white">R$ {fmtBR(d.dez_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`rounded-xl border p-4 ${fora.length ? 'border-amber-500/40 bg-amber-500/5' : 'border-gray-800 bg-gray-900'}`} data-teste="saldos-fora-do-extrato">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Auditoria viva · saldo × extrato</div>
        {fora.length === 0 ? (
          <div className="text-sm text-green-400">Todos os saldos batem com as linhas "Gerada".</div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {fora.length} conta{fora.length === 1 ? '' : 's'} com saldo diferente da soma das linhas "Gerada". Saldo menor que o extrato quer dizer dinheiro já usado (compra com saldo, saque ou ajuste) com a linha ainda aberta; saldo maior quer dizer crédito sem linha.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs"><tr><th className="text-left px-2 py-1">Conta</th><th className="text-right px-2 py-1">Saldo</th><th className="text-right px-2 py-1">Extrato</th><th className="text-right px-2 py-1">Diferença</th></tr></thead>
                <tbody>
                  {fora.map((s) => (
                    <tr key={s.user_id} className="border-t border-gray-800/60">
                      <td className="px-2 py-1 text-gray-200">{s.nome}</td>
                      <td className="px-2 py-1 text-right text-gray-300">R$ {fmtBR(s.saldo)}</td>
                      <td className="px-2 py-1 text-right text-gray-300">R$ {fmtBR(s.extrato)}</td>
                      <td className={`px-2 py-1 text-right font-bold ${Number(s.diferenca) < 0 ? 'text-amber-300' : 'text-red-300'}`}>{Number(s.diferenca) < 0 ? '−' : '+'} R$ {fmtBR(Math.abs(Number(s.diferenca) || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

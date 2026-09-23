import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { FileDown, Loader2, Gavel, RefreshCw } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import { pdfDoRelatorioDoLeilao } from '@/lib/pdfRelatorioDoLeilao';

/**
 * 📊 RELATÓRIO DE UM LEILÃO — a tela.
 *
 * 22/09/2026, o dono: "esse relatório de um leilão específico deve ser uma
 * opção para todos que podem enviar demanda."
 *
 * A conta NÃO mora aqui: vem pronta de api/functions/relatorioDoLeilao.js, que
 * é onde a permissão é conferida. Esta tela só desenha e oferece o PDF — se ela
 * calculasse qualquer coisa, o número da tela e o do PDF poderiam divergir, que
 * é o pior desfecho possível num relatório financeiro.
 *
 * 🔴 A RESSALVA vem DENTRO da resposta e é desenhada sempre, em destaque. Não é
 * rodapé nem tooltip: sem ela alguém lê "R$ 10.400 de depósitos" como se fosse
 * o caixa daquele leilão, e não é — é o que a plataforma consegue atribuir.
 *
 * 🎨 Paleta CLARA de propósito: esta seção mora em "Loja & Vendas" (o caixa),
 * que é branca. A paleta escura é a da Top College — usar preto aqui deixaria
 * a página com dois temas na mesma faixa.
 */

const dataHora = (ms) => (ms
  ? new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—');
const soData = (iso) => (iso
  ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  : 'sem data');

export default function RelatorioDoLeilao({ currentUser }) {
  const [leiloes, setLeiloes] = useState([]);
  const [escolhido, setEscolhido] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState('');
  const uid = currentUser?.id || null;

  useEffect(() => {
    let vivo = true;
    if (!uid) { setCarregandoLista(false); return undefined; }
    (async () => {
      try {
        const r = await plataforma.functions.invoke('relatorioDoLeilao', { actorId: uid, acao: 'listar' });
        if (!vivo) return;
        if (!r?.success) { setErro(r?.error || 'Não consegui listar os leilões.'); return; }
        setLeiloes(Array.isArray(r.leiloes) ? r.leiloes : []);
      } catch {
        if (vivo) setErro('Não consegui listar os leilões agora.');
      } finally {
        if (vivo) setCarregandoLista(false);
      }
    })();
    return () => { vivo = false; };
  }, [uid]);

  const buscar = async (auctionId) => {
    if (!auctionId || !uid) return;
    setCarregando(true); setErro(''); setRelatorio(null);
    try {
      const r = await plataforma.functions.invoke('relatorioDoLeilao', { actorId: uid, auctionId });
      if (!r?.success) { setErro(r?.error || 'Não consegui montar o relatório.'); return; }
      setRelatorio(r.relatorio || null);
    } catch {
      setErro('Não consegui montar o relatório agora.');
    } finally {
      setCarregando(false);
    }
  };

  const baixarPdf = async () => {
    if (!relatorio) return;
    setBaixando(true);
    try {
      await pdfDoRelatorioDoLeilao(relatorio);
      toast.success('PDF pronto.');
    } catch (e) {
      // 🔴 falhar calado aqui faria a pessoa clicar de novo achando que não pegou
      toast.error(`Não consegui gerar o PDF: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setBaixando(false);
    }
  };

  const L = relatorio?.leilao;
  const E = relatorio?.entrou;
  const opcoes = useMemo(() => leiloes.map((a) => ({
    id: a.id,
    rotulo: `${a.title || 'sem título'} · ${soData(a.end_time || a.created_date)}${a.status === 'active' ? ' · em andamento' : ''}`,
  })), [leiloes]);

  return (
    <div className="space-y-4" data-teste="relatorio-do-leilao">
      <div>
        <h2 className="text-lg font-bold text-nz-tinta flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
          <Gavel className="w-5 h-5 text-nz-verde" /> Relatório de leilão
        </h2>
        <p className="text-sm text-nz-tinta-fraca mt-1">
          O dinheiro que entrou na carteira dos participantes enquanto o leilão esteve aberto.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={escolhido}
          onChange={(e) => { setEscolhido(e.target.value); buscar(e.target.value); }}
          disabled={carregandoLista || !opcoes.length}
          className="flex-1 min-w-[240px] rounded-md border border-nz-borda bg-white px-3 py-2 text-nz-tinta disabled:opacity-50"
          data-teste="escolher-leilao"
        >
          <option value="">{carregandoLista ? 'carregando leilões…' : `— escolha o leilão (${opcoes.length}) —`}</option>
          {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select>
        {escolhido && (
          <button
            type="button" onClick={() => buscar(escolhido)} disabled={carregando}
            title="Recarregar"
            className="rounded-md border border-nz-borda px-3 py-2 text-nz-tinta-fraca hover:text-nz-tinta disabled:opacity-50"
            data-teste="recarregar-relatorio"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {erro && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-teste="relatorio-erro">{erro}</p>
      )}

      {carregando && (
        <p className="text-sm text-nz-tinta-fraca flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> montando…</p>
      )}

      {relatorio && (
        <div className="space-y-4" data-teste="relatorio-pronto">
          {/* ── o cabeçalho do leilão ── */}
          <div className="rounded-lg border border-nz-borda bg-white p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-nz-tinta font-bold text-base">{L.titulo}</p>
                <p className="text-[12px] text-nz-tinta-fraca">
                  {dataHora(L.abriuMs)} → {L.aindaAberto ? 'em andamento' : dataHora(L.fechouMs)}
                  {' · '}{L.participantes} participante{L.participantes === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button" onClick={baixarPdf} disabled={baixando}
                className="inline-flex items-center gap-2 rounded-md bg-nz-verde px-3 py-2 text-sm font-semibold text-white hover:bg-nz-verde-claro disabled:opacity-60"
                data-teste="baixar-pdf"
              >
                {baixando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} PDF
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              <div><p className="text-[11px] text-nz-tinta-fraca">Abertura</p><p className="text-nz-tinta font-semibold">R$ {fmtBR(L.abertura)}</p></div>
              <div><p className="text-[11px] text-nz-tinta-fraca">Arremate</p><p className="text-nz-tinta font-semibold">R$ {fmtBR(L.arremate)}</p></div>
              <div><p className="text-[11px] text-nz-tinta-fraca">Frete</p><p className="text-nz-tinta font-semibold">R$ {fmtBR(L.frete)}</p></div>
              <div><p className="text-[11px] text-nz-tinta-fraca">Cobrado do ganhador</p><p className="text-nz-verde font-bold">R$ {fmtBR(L.cobradoDoGanhador)}</p></div>
            </div>
            {L.arrematante && <p className="text-[12px] text-nz-tinta-fraca mt-2">Arrematante: <span className="text-nz-tinta font-semibold">{L.arrematante}</span></p>}
          </div>

          {/* ── o que entrou ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Cartao rotulo="Depósitos pagos" valor={E.depositosPagos} nota="no período do leilão" />
            <Cartao rotulo="Valor pago" valor={`R$ ${fmtBR(E.valorPago)}`} nota="só o que compensou" cor="text-nz-verde" />
            <Cartao rotulo="Tentativas não pagas" valor={E.tentativasNaoPagas} nota={`R$ ${fmtBR(E.valorNaoPago)} que não entrou`} cor="text-nz-fogo-escuro" />
            <Cartao rotulo="Quem depositou" valor={E.quemDepositou} nota="pessoas" />
          </div>

          {/* 🔴 A RESSALVA — em destaque, nunca em rodapé */}
          <p
            className="rounded-lg border border-nz-fogo-claro bg-nz-fogo-fundo px-3 py-2.5 text-[12px] leading-relaxed text-nz-fogo-escuro"
            data-teste="ressalva-do-relatorio"
          >
            ⚠️ {relatorio.ressalva}
          </p>

          {/* ── pessoa por pessoa ── */}
          <div className="rounded-lg border border-nz-borda bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-nz-cinza-fundo text-[11px] uppercase tracking-wide text-nz-tinta-fraca">
                <tr>
                  <th className="text-left p-2.5">Pessoa</th>
                  <th className="text-right p-2.5">Depósitos</th>
                  <th className="text-right p-2.5">Valor pago</th>
                  <th className="text-right p-2.5">Não pago</th>
                  <th className="text-right p-2.5">Lances</th>
                  <th className="text-right p-2.5">Reservado</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.pessoas.map((p) => (
                  <tr key={p.id} className="border-t border-nz-borda">
                    <td className="p-2.5 text-nz-tinta">
                      {p.nome}
                      {p.arrematou && <span className="ml-1.5 text-[11px] font-bold text-nz-verde">arrematou</span>}
                    </td>
                    <td className="p-2.5 text-right text-nz-tinta-fraca">{p.depositos}</td>
                    <td className="p-2.5 text-right text-nz-tinta font-semibold">R$ {fmtBR(p.pago)}</td>
                    <td className="p-2.5 text-right text-nz-fogo-escuro">{p.naoPago ? `R$ ${fmtBR(p.naoPago)}` : '—'}</td>
                    <td className="p-2.5 text-right text-nz-tinta-fraca">{p.lances}</td>
                    <td className="p-2.5 text-right text-nz-tinta-fraca">R$ {fmtBR(p.reservado)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-nz-verde/30 bg-nz-verde-fundo font-bold">
                  <td className="p-2.5 text-nz-tinta">TOTAL</td>
                  <td className="p-2.5 text-right text-nz-tinta">{relatorio.totais.depositos}</td>
                  <td className="p-2.5 text-right text-nz-verde">R$ {fmtBR(relatorio.totais.pago)}</td>
                  <td className="p-2.5 text-right text-nz-fogo-escuro">R$ {fmtBR(relatorio.totais.naoPago)}</td>
                  <td className="p-2.5 text-right text-nz-tinta">{relatorio.totais.lances}</td>
                  <td className="p-2.5 text-right text-nz-tinta-fraca">R$ {fmtBR(relatorio.totais.reservado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-nz-tinta-fraca">
            &quot;Reservado&quot; é o que a plataforma segurou na carteira pra cobrir os lances — <strong>não é dinheiro cobrado</strong>.
            Volta quando alguém cobre o lance.
          </p>

          {/* ── extrato ── */}
          {relatorio.extrato.length > 0 && (
            <details className="rounded-lg border border-nz-borda bg-white" data-teste="extrato-do-relatorio">
              <summary className="cursor-pointer p-2.5 text-sm font-semibold text-nz-tinta">
                Extrato, um a um ({relatorio.extrato.length})
              </summary>
              <div className="overflow-x-auto border-t border-nz-borda">
                <table className="w-full text-sm">
                  <tbody>
                    {relatorio.extrato.map((e) => (
                      <tr key={e.id} className="border-b border-nz-borda">
                        <td className="p-2 text-nz-tinta-fraca whitespace-nowrap">{dataHora(e.quandoMs)}</td>
                        <td className="p-2 text-nz-tinta">{e.pessoa}</td>
                        <td className="p-2 text-nz-tinta-fraca">{e.forma}</td>
                        <td className="p-2 text-right text-nz-tinta font-semibold whitespace-nowrap">R$ {fmtBR(e.valor)}</td>
                        <td className={`p-2 text-right text-[12px] font-semibold ${e.pago ? 'text-nz-verde' : 'text-nz-fogo-escuro'}`}>
                          {e.pago ? 'pago' : 'não compensou'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <p className="text-[11px] text-nz-tinta-fraca">🔒 {relatorio.selo}</p>
        </div>
      )}
    </div>
  );
}

function Cartao({ rotulo, valor, nota, cor = 'text-nz-tinta' }) {
  return (
    <div className="rounded-lg border border-nz-borda bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-nz-tinta-fraca">{rotulo}</p>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
      {nota && <p className="text-[11px] text-nz-tinta-fraca mt-0.5">{nota}</p>}
    </div>
  );
}

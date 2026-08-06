import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { lerPlanilhaMercadoLivre, lerPlanilhaCasaEVideo } from '@/lib/parseLotePlanilha';
import { loteDaPlanilha } from '@/lib/loteParceiro';
import ParceiroAnaliseCustos from './ParceiroAnaliseCustos';
import ParceiroAnaliseResultado from './ParceiroAnaliseResultado';
import ParceiroPlanilhasTeste from './ParceiroPlanilhasTeste';

const CUSTOS_PADRAO = { arremate: '', taxaPct: 7, frete: 2500, outros: 0 };

export default function ParceiroAnalisadorConsulta() {
  const [modelo, setModelo] = useState('mercadolivre');
  const [lido, setLido] = useState(null);
  const [custos, setCustos] = useState(CUSTOS_PADRAO);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregandoId, setCarregandoId] = useState(null);

  const analisar = (workbook, nomeArquivo, qualModelo) => {
    const resultado =
      qualModelo === 'casaevideo'
        ? lerPlanilhaCasaEVideo(XLSX, workbook, nomeArquivo)
        : lerPlanilhaMercadoLivre(XLSX, workbook, nomeArquivo);
    setLido(resultado);
  };

  const aoEscolherArquivo = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setProcessando(true);
    setErro('');
    const leitor = new FileReader();
    leitor.onload = (evt) => {
      try {
        analisar(XLSX.read(evt.target.result, { type: 'binary' }), arquivo.name, modelo);
        setCustos(CUSTOS_PADRAO);
      } catch (err) {
        setErro(err?.message || 'Não foi possível ler esta planilha.');
        setLido(null);
      } finally {
        setProcessando(false);
      }
    };
    leitor.onerror = () => {
      setErro('Não foi possível abrir o arquivo.');
      setProcessando(false);
    };
    leitor.readAsBinaryString(arquivo);
    e.target.value = '';
  };

  // 📄 Lotes hospedados aqui dentro: o sistema baixa o arquivo e roda o analisador.
  // O parceiro não abre nem recebe a planilha — só vê a leitura.
  const aoEscolherHospedada = async (p) => {
    setCarregandoId(p.id);
    setErro('');
    try {
      const resposta = await fetch(p.url);
      if (!resposta.ok) throw new Error('Não foi possível carregar este lote agora.');
      const buffer = await resposta.arrayBuffer();
      analisar(XLSX.read(buffer, { type: 'array' }), p.titulo, 'mercadolivre');
      setModelo('mercadolivre');
      setCustos(CUSTOS_PADRAO);
    } catch (err) {
      setErro(err?.message || 'Não foi possível ler este lote.');
      setLido(null);
    } finally {
      setCarregandoId(null);
    }
  };

  const lote = lido ? loteDaPlanilha(lido, custos) : null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-pc-tinta sm:text-xl">Analisar uma planilha</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        O mesmo analisador que a operação usa antes de dar um lance, aqui em modo consulta.
        Toque em um dos lotes abaixo — as planilhas já estão aqui dentro — e veja a leitura
        completa: custo, grades, cenários de venda e item por item.
      </p>

      <ParceiroPlanilhasTeste onEscolher={aoEscolherHospedada} carregandoId={carregandoId} />

      <p className="mt-8 text-xs uppercase tracking-wide text-pc-tinta-fraca">
        Ou teste com uma planilha sua
      </p>

      {/* modelo */}
      <div className="mt-6 flex gap-2 border border-pc-borda bg-pc-preto-2 p-1">
        {[
          { id: 'mercadolivre', rotulo: 'Mercado Livre' },
          { id: 'casaevideo', rotulo: 'Casa & Vídeo' },
        ].map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setModelo(op.id)}
            className={`min-h-[44px] flex-1 text-sm font-bold transition-colors ${
              modelo === op.id
                ? 'bg-pc-ouro text-pc-preto'
                : 'text-pc-tinta-fraca hover:text-pc-ouro'
            }`}
          >
            {op.rotulo}
          </button>
        ))}
      </div>

      {/* upload */}
      <label className="mt-3 flex min-h-[52px] cursor-pointer items-center justify-center gap-2 border border-pc-ouro bg-pc-preto-2 px-4 text-sm font-bold text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto">
        <UploadCloud className="h-4 w-4" strokeWidth={1.5} />
        <span>Carregar planilha (Excel ou CSV)</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={aoEscolherArquivo}
          disabled={processando}
        />
      </label>

      {processando && (
        <p className="mt-4 flex items-center gap-2 text-sm text-pc-ouro">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Lendo a planilha...
        </p>
      )}

      {erro && (
        <p className="mt-4 flex items-start gap-2 border border-pc-borda bg-pc-preto-2 p-3 text-sm text-pc-tinta">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
          {erro}
        </p>
      )}

      {lido && (
        <div className="mt-8 border-t border-pc-borda pt-8">
          <ParceiroAnaliseCustos custos={custos} onChange={setCustos} />
          <ParceiroAnaliseResultado lote={lote} />
        </div>
      )}
    </section>
  );
}
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { lerPlanilhaMercadoLivre, lerPlanilhaCasaEVideo } from '@/lib/parseLotePlanilha';
import { loteDaPlanilha } from '@/lib/loteParceiro';
import ParceiroAnaliseCustos from './ParceiroAnaliseCustos';
import ParceiroAnaliseResultado from './ParceiroAnaliseResultado';

// 🧪 Planilhas reais deixadas prontas para o parceiro testar na hora, sem
// precisar de arquivo próprio. Os custos vêm dos nossos registros de arremate.
const PLANILHAS_TESTE = [
  {
    nome: 'Lote 46-48 — Rio de Janeiro (arrematado 16/04/2026)',
    arquivo: 'LOTE 46-48 ARREMATADO 16-04-2026 RIO DE JANEIRO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/dd5358f44_LOTE46-48-ARREMATADO16042026RIODEJANEIRO.xlsx',
    custos: { arremate: 18666, taxaPct: 7, frete: 2500, outros: 200 },
  },
  {
    nome: 'Lote 46-48 — Rio de Janeiro (completo)',
    arquivo: 'LOTE 46-48 RIO DE JANEIRO COMPLETO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/a5df823e9_LOTE46-48-RIODEJANEIRO-COMPLETO.xlsx',
    custos: { arremate: 18666, taxaPct: 7, frete: 2500, outros: 200 },
  },
  {
    nome: 'Lote 51 — Rio de Janeiro (completo)',
    arquivo: 'LOTE 51 RIO DE JANEIRO COMPLETO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/f74b163a8_LOTE51-RIODEJANEIRO-COMPLETO.xlsx',
    custos: { arremate: 18612.06, taxaPct: 7, frete: 2500, outros: 0 },
  },
];

const CUSTOS_PADRAO = { arremate: '', taxaPct: 7, frete: 2500, outros: 0 };

export default function ParceiroAnalisadorConsulta() {
  const [modelo, setModelo] = useState('mercadolivre');
  const [lido, setLido] = useState(null);
  const [custos, setCustos] = useState(CUSTOS_PADRAO);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

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

  const carregarPlanilhaTeste = async (planilha) => {
    setProcessando(true);
    setErro('');
    try {
      const resposta = await fetch(planilha.url);
      if (!resposta.ok) throw new Error('Não foi possível carregar a planilha de teste.');
      const buffer = await resposta.arrayBuffer();
      setModelo('mercadolivre');
      analisar(XLSX.read(buffer, { type: 'array' }), planilha.arquivo, 'mercadolivre');
      setCustos(planilha.custos);
    } catch (err) {
      setErro(err?.message || 'Não foi possível carregar a planilha de teste.');
      setLido(null);
    } finally {
      setProcessando(false);
    }
  };

  const lote = lido ? loteDaPlanilha(lido, custos) : null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-pc-tinta sm:text-xl">Analisar uma planilha</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        O mesmo analisador que a operação usa antes de dar um lance, aqui em modo consulta.
        Escolha o modelo, carregue a planilha e veja a leitura completa do lote.
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

      {/* planilhas de teste */}
      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.15em] text-pc-ouro">
          Ou teste com um lote real nosso
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {PLANILHAS_TESTE.map((planilha) => (
            <button
              key={planilha.url}
              type="button"
              onClick={() => carregarPlanilhaTeste(planilha)}
              disabled={processando}
              className="flex min-h-[44px] items-start gap-2 border border-pc-borda bg-pc-preto-2 p-3 text-left transition-colors hover:border-pc-ouro disabled:opacity-60"
            >
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" strokeWidth={1.5} />
              <span className="min-w-0 text-xs font-semibold text-pc-tinta">{planilha.nome}</span>
            </button>
          ))}
        </div>
      </div>

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
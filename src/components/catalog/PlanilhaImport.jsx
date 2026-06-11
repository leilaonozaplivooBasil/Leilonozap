import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2, Check, X, Download, Image as ImageIcon } from 'lucide-react';

const money = (n) => (n == null ? '—' : 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

// dicionário de cabeçalhos aceitos (pt) → campo interno
const HEADER_MAP = {
  name: ['nome', 'produto', 'titulo', 'título', 'descricao', 'descrição', 'item', 'name', 'title'],
  price: ['preco', 'preço', 'valor', 'preco de venda', 'preço de venda', 'preco venda', 'price', 'valor venda'],
  cost: ['custo', 'preco de custo', 'preço de custo', 'cost'],
  compare: ['de', 'preco de', 'preço de', 'valor de mercado', 'comparar', 'compare', 'preco cheio'],
  quantity: ['estoque', 'quantidade', 'qtd', 'qty', 'stock', 'quant'],
  sku: ['sku', 'codigo', 'código', 'cod', 'lote', 'ref', 'referencia', 'referência'],
  images: ['imagem', 'imagens', 'foto', 'fotos', 'image', 'images', 'url', 'url da imagem', 'link da imagem'],
  notes: ['observacao', 'observação', 'detalhes', 'descricao longa', 'descrição longa', 'notes', 'obs'],
};
const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function detectField(header) {
  const h = norm(header);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some((a) => h === norm(a) || h.includes(norm(a)))) return field;
  }
  return null;
}

export default function PlanilhaImport({ onDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json.length) { toast.error('Planilha vazia.'); return; }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      const map = {};
      hdrs.forEach((h) => { const f = detectField(h); if (f && !Object.values(map).includes(h)) map[f] = h; });
      setMapping(map);
      setRows(json);
      toast.success(`${json.length} linha(s) lida(s). Confira o mapeamento.`);
    } catch (err) { console.error(err); toast.error('Não consegui ler o arquivo. Use .xlsx ou .csv.'); }
  };

  const preview = rows.slice(0, 8).map((r) => ({
    name: r[mapping.name] || '',
    price: r[mapping.price] || '',
    cost: r[mapping.cost] || '',
    quantity: r[mapping.quantity] || '',
    sku: r[mapping.sku] || '',
    images: r[mapping.images] || '',
  }));

  const validCount = rows.filter((r) => String(r[mapping.name] || '').trim()).length;

  const doImport = async () => {
    if (!user?.id) { toast.error('Faça login como admin.'); return; }
    if (!mapping.name) { toast.error('Indique qual coluna é o NOME do produto.'); return; }
    if (!validCount) { toast.error('Nenhuma linha com nome válido.'); return; }
    setImporting(true); setResult(null);
    try {
      const items = rows.map((r) => ({
        name: r[mapping.name],
        price: mapping.price ? r[mapping.price] : null,
        cost: mapping.cost ? r[mapping.cost] : null,
        compare: mapping.compare ? r[mapping.compare] : null,
        quantity: mapping.quantity ? r[mapping.quantity] : null,
        sku: mapping.sku ? r[mapping.sku] : null,
        images: mapping.images ? r[mapping.images] : null,
        notes: mapping.notes ? r[mapping.notes] : null,
      })).filter((it) => String(it.name || '').trim());
      const res = await base44.functions.invoke('bulkImportProducts', { actorId: user.id, items, publish: true });
      setResult(res);
      if (res?.success) { toast.success(`${res.inserted} produto(s) publicados na loja!`); onDone && onDone(); }
      else toast.error(res?.error || 'Falha na importação.');
    } catch (e) { toast.error('Erro ao importar.'); }
    setImporting(false);
  };

  const downloadModel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nome', 'Preço', 'Custo', 'De', 'Estoque', 'SKU', 'Imagem', 'Observação'],
      ['Fone Bluetooth XYZ', '89,90', '40,00', '149,90', '50', 'FONE-001', 'https://exemplo.com/foto.jpg', 'Bivolt'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo-produtos-leilao-nozap.xlsx');
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Importar Planilha</h2>
          <p className="text-gray-400 mt-1 text-sm">Suba um Excel/CSV e publique vários produtos de uma vez na Loja Virtual.</p>
        </div>
        <button onClick={downloadModel} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm">
          <Download className="w-4 h-4" /> Baixar modelo
        </button>
      </div>

      {/* upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors mb-6"
      >
        <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="text-white font-semibold">{fileName || 'Clique para escolher a planilha (.xlsx ou .csv)'}</p>
        <p className="text-gray-500 text-sm mt-1">Cabeçalhos aceitos: Nome, Preço, Custo, De, Estoque, SKU, Imagem, Observação</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
      </div>

      {rows.length > 0 && (
        <>
          {/* mapeamento */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-white mb-3">Mapeamento das colunas</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries({ name: 'Nome do produto *', price: 'Preço de venda', cost: 'Custo', compare: 'Preço "De"', quantity: 'Estoque', sku: 'SKU/Lote', images: 'Imagem (URL)', notes: 'Observação' }).map(([field, label]) => (
                <div key={field} className="flex items-center gap-2">
                  <label className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</label>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">— ignorar —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* preview */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">Prévia ({validCount} produto(s) válido(s) de {rows.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-950/50">
                  <tr><th className="text-left px-3 py-2">Produto</th><th className="text-left px-3 py-2">Preço</th><th className="text-left px-3 py-2">Custo</th><th className="text-left px-3 py-2">Estoque</th><th className="text-left px-3 py-2">SKU</th><th className="text-left px-3 py-2">Img</th></tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className="border-t border-gray-800">
                      <td className="px-3 py-2 text-white max-w-[260px] truncate">{p.name || <span className="text-red-400">sem nome</span>}</td>
                      <td className="px-3 py-2 text-gray-300">{p.price || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{p.cost || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{p.quantity || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{p.sku || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{p.images ? <ImageIcon className="w-4 h-4 text-emerald-400" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={doImport} disabled={importing} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold flex items-center justify-center gap-2">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando…</> : <><Upload className="w-4 h-4" /> Publicar {validCount} produto(s) na loja</>}
          </button>

          {result && (
            <div className={`mt-4 rounded-xl p-4 text-sm ${result.success ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
              {result.success
                ? <div className="flex items-center gap-2"><Check className="w-4 h-4" /> {result.inserted} de {result.total} produto(s) publicados na Loja Virtual.</div>
                : <div className="flex items-center gap-2"><X className="w-4 h-4" /> {result.error || 'Falha'} {result.details ? `(${result.details})` : ''}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

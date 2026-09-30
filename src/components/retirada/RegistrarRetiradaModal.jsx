import React, { useState } from 'react';
import { X, Loader2, MapPin, User, Users, KeyRound, Camera, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import AssinaturaNaTela from '@/components/retirada/AssinaturaNaTela';
import { LOCAIS, TERMO, errosDaRetirada, codigoLimpo, rotuloDoLocal, quandoRetirou } from '@/lib/retirada';

// 📦 REGISTRAR RETIRADA — 30/09/2026. O balcão preenche, o cliente assina na
// tela, e o pedido ganha o comprovante (retiradaNaLoja.js). Tudo numa tela só,
// de cima pra baixo, pra caber no celular do balcão.
const Secao = ({ n, titulo, children }) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-white flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-green-600 text-[11px] font-bold">{n}</span>{titulo}</p>
    {children}
  </div>
);
const opcao = (ativo) => `min-h-[44px] rounded-lg border px-3 text-sm font-medium flex items-center gap-2 transition-colors ${ativo ? 'border-green-500 bg-green-500/15 text-white' : 'border-gray-600 bg-gray-700/40 text-gray-300 hover:border-gray-500'}`;
const campo = 'w-full min-h-[44px] rounded-lg border border-gray-600 bg-gray-900 px-3 text-sm text-white placeholder-gray-500 focus:border-green-500 outline-none';

export default function RegistrarRetiradaModal({ pedido, codigoInicial = '', onFechar, onRegistrada }) {
  const [f, setF] = useState({ local: '', localOutro: '', quem: 'comprador', terceiroNome: '', terceiroDoc4: '', codigo: codigoInicial, semCodigo: false, motivoSemCodigo: '', assinatura: null, aceite: false, fotoUrl: '' });
  const [enviando, setEnviando] = useState(false);
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [tentou, setTentou] = useState(false);
  const muda = (k) => (v) => setF((a) => ({ ...a, [k]: v }));
  const erros = errosDaRetirada(f);
  const numero = pedido?.numero || String(pedido?.id || '').slice(0, 10);

  const foto = async (arq) => {
    if (!arq) return;
    setSubindoFoto(true);
    try { const { file_url } = await plataforma.integrations.Core.UploadFile({ file: arq }); if (file_url) muda('fotoUrl')(file_url); else toast.error('Falha ao enviar a foto'); } catch { toast.error('Falha ao enviar a foto'); }
    setSubindoFoto(false);
  };

  const confirmar = async () => {
    setTentou(true);
    if (erros.length) { toast.error(erros[0]); return; }
    setEnviando(true);
    try {
      const r = await plataforma.functions.invoke('retiradaNaLoja', { acao: 'registrar', saleId: pedido.id, ...f, codigo: codigoLimpo(f.codigo) });
      if (r?.success) { toast.success('Retirada registrada'); onRegistrada?.({ local: rotuloDoLocal(f.local, f.localOutro), retiradoEm: r.retiradoEm }); return; }
      if (r?.error === 'ja_retirado') toast.error(r.retirada ? `Já retirado em ${quandoRetirou(r.retirada.retiradoEm)} (${r.retirada.local}) por ${r.retirada.atendente || 'outro atendente'}` : 'Este pedido já foi retirado');
      else toast.error(r?.error || 'Não foi possível registrar');
    } catch { toast.error('Sem conexão — tente de novo'); }
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
      <div data-teste="registrar-retirada" className="w-full sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-gray-700 bg-gray-800">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-700 bg-gray-800 px-5 py-4">
          <div>
            <p className="text-lg font-bold text-white">Registrar retirada</p>
            <p className="text-sm text-gray-400">Pedido #{numero} · {pedido?.produto}</p>
            <p className="text-xs text-gray-500">Comprador: {pedido?.comprador || '—'}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <Secao n={1} titulo="Onde está sendo retirado">
            <div className="grid grid-cols-1 gap-2">
              {LOCAIS.map((l) => (
                <button key={l.valor} type="button" data-teste={`local-${l.valor}`} onClick={() => muda('local')(l.valor)} className={opcao(f.local === l.valor)}>
                  <MapPin className="w-4 h-4 text-green-400" />{l.rotulo}
                </button>
              ))}
            </div>
            {f.local === 'outro' && <input className={campo} placeholder="Onde? Ex.: Loja da Taquara" value={f.localOutro} onChange={(e) => muda('localOutro')(e.target.value)} />}
          </Secao>

          <Secao n={2} titulo="Quem está retirando">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => muda('quem')('comprador')} className={opcao(f.quem === 'comprador')}><User className="w-4 h-4 text-green-400" />O próprio comprador</button>
              <button type="button" data-teste="quem-terceiro" onClick={() => setF((a) => ({ ...a, quem: 'terceiro', semCodigo: false }))} className={opcao(f.quem === 'terceiro')}><Users className="w-4 h-4 text-green-400" />Outra pessoa</button>
            </div>
            {f.quem === 'terceiro' && (
              <div className="grid grid-cols-3 gap-2">
                <input className={`${campo} col-span-2`} placeholder="Nome completo" value={f.terceiroNome} onChange={(e) => muda('terceiroNome')(e.target.value)} />
                <input className={campo} inputMode="numeric" maxLength={4} placeholder="4 últ. doc." value={f.terceiroDoc4} onChange={(e) => muda('terceiroDoc4')(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
            )}
          </Secao>

          <Secao n={3} titulo="Código de retirada do cliente">
            {!f.semCodigo ? (
              <>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input className={`${campo} pl-9 font-mono tracking-[0.3em] text-lg`} data-teste="codigo" inputMode="numeric" placeholder="000 000" value={f.codigo} onChange={(e) => muda('codigo')(codigoLimpo(e.target.value))} />
                </div>
                <p className="text-xs text-gray-400">O cliente vê o código em Meus Pedidos, no pedido.</p>
                {f.quem === 'comprador' && <button type="button" onClick={() => muda('semCodigo')(true)} className="text-xs text-gray-400 underline hover:text-white">O cliente não está com o código</button>}
              </>
            ) : (
              <>
                <textarea className={`${campo} py-2 min-h-[64px]`} placeholder="Por que sem código? Ex.: conferido o documento com foto, cliente sem celular" value={f.motivoSemCodigo} onChange={(e) => muda('motivoSemCodigo')(e.target.value)} />
                <p className="text-xs text-gray-400">Fica registrado no comprovante que a retirada foi sem código.</p>
                <button type="button" onClick={() => muda('semCodigo')(false)} className="text-xs text-gray-400 underline hover:text-white">Voltar e digitar o código</button>
              </>
            )}
          </Secao>

          <Secao n={4} titulo={TERMO.titulo}>
            <p data-teste="termo" className="rounded-lg border border-gray-600 bg-gray-900/60 p-3 text-sm leading-relaxed text-gray-200">{TERMO.texto(numero)}</p>
            <label className="flex items-start gap-2 text-sm text-gray-300">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-green-600" checked={f.aceite} onChange={(e) => muda('aceite')(e.target.checked)} />
              O cliente leu o termo e vai assinar
            </label>
            <AssinaturaNaTela onChange={muda('assinatura')} />
          </Secao>

          <Secao n={5} titulo="Foto do produto entregue (opcional)">
            {f.fotoUrl ? (
              <div className="flex items-center gap-3"><img src={f.fotoUrl} alt="Produto entregue" className="h-16 w-16 rounded-lg object-cover" /><button type="button" className="text-xs text-gray-400 underline" onClick={() => muda('fotoUrl')('')}>Trocar foto</button></div>
            ) : (
              <label className={`${opcao(false)} cursor-pointer w-full justify-center`}>
                {subindoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-green-400" />}Tirar ou escolher foto
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => foto(e.target.files?.[0])} />
              </label>
            )}
          </Secao>

          {tentou && erros.length > 0 && <p data-teste="erro-retirada" className="rounded-lg border border-gray-600 bg-gray-900/60 p-3 text-sm text-gray-200">{erros[0]}</p>}
        </div>

        <div className="sticky bottom-0 border-t border-gray-700 bg-gray-800 px-5 py-4">
          <button type="button" data-teste="confirmar-retirada" onClick={confirmar} disabled={enviando}
            className="w-full min-h-[48px] rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2">
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}Confirmar retirada
          </button>
        </div>
      </div>
    </div>
  );
}

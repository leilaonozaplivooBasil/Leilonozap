import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Camera, ImagePlus, Loader2 } from 'lucide-react';
import { ROTULO_VALIDACAO, LINK_ABRIR_INSTAGRAM, RESUMO_MIN, AVISO_COLAR } from '@/lib/xgame';
import { arquivosDoColar } from '@/lib/colarImagem';

// ✅ X-GAME F10.3 — O MODAL DE COMPROVAÇÃO (leve e direto, ordem do dono:
// "não quadradão"). Um cartão só: vê a tarefa, abre o Instagram se for o
// caso, tira a foto NA HORA (câmera de verdade, via getUserMedia — funciona
// no computador e no celular) ou escolhe da galeria, vê o preview e conclui.
// A validação (hash anti-reuso, upload, IA de visão) fica com o pai — aqui é
// só a experiência.

export default function XGameComprovarModal({ tarefa, tipo, enviando, erro, onFechar, onComprovar }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [texto, setTexto] = useState('');   // resumo do aprendizado OU link opcional do insta
  const [avisoCola, setAvisoCola] = useState(''); // 🚫 tentou colar no resumo
  const [cameraAberta, setCameraAberta] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const galeriaRef = useRef(null);
  const celularRef = useRef(null);

  // preview local da imagem escolhida
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fecharCamera = () => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraAberta(false);
  };
  useEffect(() => () => fecharCamera(), []); // desmontou = câmera desliga

  // 📷 câmera DE VERDADE: preview ao vivo + capturar (não dá pra usar foto velha)
  const abrirCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCameraAberta(true);
      // o <video> só existe depois do render
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch {
      // sem permissão/câmera → cai pro seletor nativo do celular (que abre a câmera)
      celularRef.current?.click();
    }
  };
  const capturar = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) setFile(new File([blob], `foto_agora_${Date.now()}.jpg`, { type: 'image/jpeg' }));
      fecharCamera();
    }, 'image/jpeg', 0.92);
  };

  // 📚 estudo = FOTO do estudo + RESUMO digitado (mínimo de verdade)
  const podeConcluir = tipo === 'aprendizado'
    ? !!file && texto.trim().length >= RESUMO_MIN
    : !!file;

  // 🚫 anti copiar-e-colar no resumo: colar não entra e a pessoa é avisada
  const bloquearCola = (e) => {
    e.preventDefault();
    setAvisoCola(AVISO_COLAR);
    setTimeout(() => setAvisoCola(''), 6000);
  };

  // 📋 DIR-75 — COLAR O PRINT (Ctrl+V no computador, "Colar" do dedo no
  // celular). Reusa a mesma lib do Quadro dos Sonhos.
  //
  // ⚠️ CUIDADO QUE ESTA FUNÇÃO TOMA: colar IMAGEM entra; colar TEXTO não é
  // problema dela. O bloqueio de cola no resumo do aprendizado (`bloquearCola`,
  // logo acima) existe pra impedir que a pessoa copie o texto de outro lugar —
  // se este `onPaste` do cartão engolisse o evento, aquele bloqueio morreria
  // junto. Por isso aqui só se age quando VEIO IMAGEM, e nada mais é tocado.
  const colarPrint = (evento) => {
    const imagens = arquivosDoColar(evento.clipboardData);
    if (!imagens.length) return;
    evento.preventDefault();
    setFile(imagens[0]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPaste={colarPrint}
        data-teste="comprovar-modal"
      >
        {/* cabeçalho enxuto */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-nz-verde uppercase tracking-wide">Comprovar pra concluir</p>
            <p className="text-sm font-bold text-nz-tinta truncate">{tarefa?.hora ? `${tarefa.hora} · ` : ''}{tarefa?.titulo}</p>
            <p className="text-[11px] text-nz-tinta-fraca">{ROTULO_VALIDACAO[tipo]}</p>
          </div>
          <button type="button" onClick={onFechar} className="shrink-0 rounded-full p-1.5 text-nz-tinta-fraca hover:bg-nz-cinza-fundo hover:text-nz-tinta">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* 📱 POSTAR NO INSTAGRAM EM TUDO (ordem do dono): toda comprovação
              é também conteúdo — o botão abre o app pra postar o momento */}
          <a
            href={LINK_ABRIR_INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white text-sm font-bold py-2.5 hover:opacity-90"
          >📱 Postar no Instagram</a>

          {/* 📚 estudo: o resumo DIGITADO (colar é bloqueado — digitar é treino) */}
          {tipo === 'aprendizado' && (
            <div className="space-y-1">
              <Textarea
                autoFocus
                placeholder="Digita com as SUAS palavras o que você aprendeu na leitura de hoje..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onPaste={bloquearCola}
                onDrop={bloquearCola}
                className="bg-nz-cinza-fundo/50 border-nz-borda text-nz-tinta text-sm min-h-[100px] rounded-xl"
              />
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold ${texto.trim().length >= RESUMO_MIN ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`}>
                  {texto.trim().length >= RESUMO_MIN ? '✔ resumo no tamanho' : `${texto.trim().length}/${RESUMO_MIN} caracteres`}
                </span>
                <span className="text-[10px] text-nz-tinta-fraca">✍️ só digitando — colar não vale</span>
              </div>
              {avisoCola && <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{avisoCola}</p>}
              <p className="text-[11px] text-nz-tinta-fraca pt-1">E a foto do estudo (a página, a anotação):</p>
            </div>
          )}

          {cameraAberta ? (
            /* 🎥 a câmera ao vivo */
            <div className="space-y-2">
              <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
              <div className="flex gap-2">
                <Button onClick={capturar} className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white rounded-xl h-11 text-sm font-bold">
                  📸 Capturar
                </Button>
                <Button variant="outline" onClick={fecharCamera} className="rounded-xl h-11 border-nz-borda text-nz-tinta-fraca">
                  cancelar
                </Button>
              </div>
            </div>
          ) : preview ? (
            /* preview da prova escolhida */
            <div className="space-y-2">
              <img src={preview} alt="sua comprovação" className="w-full max-h-64 object-contain rounded-xl border border-nz-borda bg-nz-cinza-fundo/40" />
              <button type="button" onClick={() => setFile(null)} className="text-[11px] text-nz-tinta-fraca hover:text-nz-tinta">
                ↺ trocar a imagem
              </button>
            </div>
          ) : (
            /* os dois caminhos, grandes e óbvios */
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={abrirCamera}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-nz-verde/40 bg-nz-verde-fundo/30 py-6 hover:border-nz-verde hover:bg-nz-verde-fundo/50"
              >
                <Camera className="w-6 h-6 text-nz-verde" />
                <span className="text-xs font-bold text-nz-tinta">Tirar foto agora</span>
                <span className="text-[10px] text-nz-tinta-fraca">abre a câmera</span>
              </button>
              <button
                type="button"
                onClick={() => galeriaRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-nz-borda bg-nz-cinza-fundo/40 py-6 hover:border-nz-verde"
              >
                <ImagePlus className="w-6 h-6 text-nz-tinta-fraca" />
                <span className="text-xs font-bold text-nz-tinta">Subir o print</span>
                <span className="text-[10px] text-nz-tinta-fraca">da galeria</span>
              </button>
              {/* 📋 DIR-75 — a terceira porta. Fica como AVISO e não como
                  terceiro botão porque colar não tem o que clicar: quem copiou
                  o print só precisa saber que pode largar ele aqui. */}
              <p className="col-span-2 text-center text-[10px] text-nz-tinta-fraca">
                📋 ou <span className="font-bold text-nz-tinta">cole o print aqui</span> — Ctrl+V, ou “Colar” segurando no celular
              </p>
            </div>
          )}
          <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input ref={celularRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />

          {tipo === 'instagram' && (
            <Input
              placeholder="link do post (opcional)"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="bg-nz-cinza-fundo/50 border-nz-borda text-nz-tinta h-9 text-xs rounded-xl"
            />
          )}

          {erro && <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{erro}</p>}

          <Button
            onClick={() => onComprovar({ file, texto })}
            disabled={!podeConcluir || enviando}
            className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white rounded-xl h-11 text-sm font-bold disabled:opacity-50"
          >
            {enviando ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A IA está conferindo...</>) : 'Comprovar e concluir ✔'}
          </Button>

          <p className="text-[10px] text-center text-nz-tinta-fraca">
            🤖 validação automática por IA · print repetido é barrado · horário carimbado
          </p>
        </div>
      </div>
    </div>
  );
}

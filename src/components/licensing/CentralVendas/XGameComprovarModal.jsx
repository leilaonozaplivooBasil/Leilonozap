import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Camera, ImagePlus, Loader2, SwitchCamera } from 'lucide-react';
import { ROTULO_VALIDACAO, LINK_ABRIR_INSTAGRAM, RESUMO_MIN, RESUMO_MIN_FDS, AVISO_COLAR, textoDoContador, motivoDoBotaoTravado, faltaDoResumo, ehOrganizacaoDoNegocio } from '@/lib/xgame';
import { arquivosDoColar } from '@/lib/colarImagem';
import { useSegurarCamada } from '@/hooks/useCamadaModal';

// ✅ X-GAME F10.3 → DIR-84 — O MODAL DE COMPROVAÇÃO (leve e direto, ordem do
// dono: "não quadradão"). Um cartão só: vê a tarefa, abre o Instagram se for
// o caso, tira a foto NA HORA (câmera de verdade, via getUserMedia — funciona
// no computador e no celular) ou escolhe da galeria, vê o preview e conclui.
// A validação (hash anti-reuso, upload, IA de visão) fica com o pai — aqui é
// só a experiência.
//
// 🗣️ DIR-84 — quando a IA nota uma incoerência (ex.: comprova pré-treino
// com foto deitada na cama) ela não reprova nem manda pro gestor de cara:
// pergunta pra pessoa. `pergunta` vindo do pai troca o cartão inteiro por
// essa segunda etapa — mostra a pergunta, pede a explicação e reenvia SEM
// pedir a imagem de novo (o pai já guardou o que foi upado).

export default function XGameComprovarModal({ tarefa, tipo, enviando, erro, pergunta, onFechar, onComprovar }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [texto, setTexto] = useState('');   // resumo do aprendizado OU link opcional do insta
  const [justificativa, setJustificativa] = useState('');
  const [avisoCola, setAvisoCola] = useState(''); // 🚫 tentou colar no resumo
  const [cameraAberta, setCameraAberta] = useState(false);
  const [ladoCamera, setLadoCamera] = useState('user'); // DIR-93 — de qual lado a câmera está
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
  //
  // 🔄 DIR-93 — ordem do dono: "toda comprovação tenha a possibilidade de
  // virar a câmera para bater a foto do livro por exemplo". `pedirStream`
  // fica separado de `abrirCamera` pra `virarCamera` poder repedir o vídeo
  // com o outro lado sem duplicar a lógica de ligar no <video>.
  const pedirStream = async (lado) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: lado } }, audio: false });
    streamRef.current = stream;
    // o <video> só existe depois do render
    setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    return stream;
  };
  const abrirCamera = async () => {
    try {
      await pedirStream(ladoCamera);
      setCameraAberta(true);
    } catch {
      // sem permissão/câmera → cai pro seletor nativo do celular (que abre a câmera)
      celularRef.current?.click();
    }
  };
  const virarCamera = async () => {
    const novoLado = ladoCamera === 'user' ? 'environment' : 'user';
    // 📵 no celular a câmera é recurso exclusivo — parar a atual ANTES de
    // pedir a outra, senão o navegador trava a promise ou devolve a mesma.
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    try {
      await pedirStream(novoLado);
      setLadoCamera(novoLado);
    } catch {
      // esse aparelho não tem o lado pedido (ex.: notebook só tem frontal)
      // — volta pro lado que já funcionava, pra não deixar o vídeo congelado
      try { await pedirStream(ladoCamera); } catch { fecharCamera(); }
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

  // 🪟 enquanto este cartão estiver aberto, os flutuantes (X-MUSIC, Leila)
  // saem da frente — eles cobriam o botão de concluir no celular.
  useSegurarCamada();

  // 📚 estudo = FOTO do estudo + RESUMO digitado (mínimo de verdade — bem
  // maior no estudo de fim de semana, o "estudo foda" do dono)
  const ehEstudo = tipo === 'aprendizado' || tipo === 'aprendizado_fds';
  const podeConcluir = ehEstudo
    ? !!file && faltaDoResumo(texto, tipo) === 0
    : !!file;

  // 🔒 e o botão apagado DIZ o que está faltando, em vez de só ficar opaco
  const motivoTravado = motivoDoBotaoTravado({ tipo, temFoto: !!file, texto });

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

  // 🗣️ DIR-84 — a IA tem uma pergunta. É uma etapa própria: SEM câmera, SEM
  // trocar imagem — a imagem já enviada está fixa, só a explicação da
  // pessoa muda o resultado. Uma chance só (o pai não manda pergunta de novo
  // na segunda rodada — se ainda ficar em dúvida, vai pro gestor).
  if (pergunta) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onFechar}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden [color-scheme:light]" onClick={(e) => e.stopPropagation()} data-teste="comprovar-modal-justificativa">
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">🤖 a IA quer confirmar</p>
              <p className="text-sm font-bold text-nz-tinta truncate">{tarefa?.hora ? `${tarefa.hora} · ` : ''}{tarefa?.titulo}</p>
            </div>
            <button type="button" onClick={onFechar} className="shrink-0 rounded-full p-1.5 text-nz-tinta-fraca hover:bg-nz-cinza-fundo hover:text-nz-tinta">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {/* 🩹 DIR-92 — o dono viu essa caixa em branco (fundo aparecendo,
                texto invisível) em produção, mesmo com a régua de cor batendo
                certinho em todo teste que eu consigo rodar aqui. Isso é a
                marca de um repintador de "modo escuro" no navegador (extensão
                ou tema do sistema) forçando as cores por cima da página.
                `color-scheme: light` é o sinal padrão que o PRÓPRIO Chrome
                (e a maioria dessas ferramentas) respeita pra saber que este
                pedaço já É claro de propósito e não deve ser invertido. Cor
                também virou inline (não só classe) — outra camada de defesa,
                caso algo esteja lendo computed style em vez de herdar cascata. */}
            <p
              className="text-sm font-semibold rounded-xl px-3 py-2.5 [color-scheme:light]"
              style={{ color: '#1A1A1A', background: '#FFFBEB', border: '1px solid #FDE68A' }}
              data-teste="pergunta-ia"
            >
              {pergunta}
            </p>
            <Textarea
              autoFocus
              placeholder="explica pra IA o que essa foto mostra..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              data-teste="justificativa-ia"
              className="bg-nz-cinza-fundo/50 border-nz-borda text-nz-tinta text-sm min-h-[90px] rounded-xl"
            />
            {erro && <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{erro}</p>}
            <Button
              onClick={() => onComprovar({ justificativa })}
              disabled={!justificativa.trim() || enviando}
              data-teste="enviar-justificativa"
              className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white rounded-xl h-11 text-sm font-bold disabled:opacity-50"
            >
              {enviando ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A IA está reavaliando...</>) : 'Enviar explicação'}
            </Button>
            <p className="text-[10px] text-center text-nz-tinta-fraca">esta é a sua chance de esclarecer pra IA o que a foto mostra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden [color-scheme:light]"
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
          {/* 📋 09/09/2026 — dono, ao vivo, vendo uma foto de papel aceita
              como "organização do negócio": "isso é horrível, não pode...
              tem que ser dentro do Quadro. Papel nunca." Avisa ANTES de
              tirar a foto errada, não depois de reprovar. */}
          {ehOrganizacaoDoNegocio(tarefa?.titulo) && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              🗂️ Isso só vale registrado dentro do <strong>Quadro</strong> — abra o Quadro, organize por lá e mande o print de TELA. Foto de papel/caderno não vai ser aceita.
            </p>
          )}
          {/* 📱 POSTAR NO INSTAGRAM EM TUDO (ordem do dono): toda comprovação
              é também conteúdo — o botão abre o app pra postar o momento */}
          <a
            href={LINK_ABRIR_INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white text-sm font-bold py-2.5 hover:opacity-90"
          >📱 Postar no Instagram</a>

          {/* 📚 estudo: o resumo DIGITADO (colar é bloqueado — digitar é treino).
              No fim de semana o mínimo é bem maior — é o mergulho fundo. */}
          {ehEstudo && (() => {
            const minimo = tipo === 'aprendizado_fds' ? RESUMO_MIN_FDS : RESUMO_MIN;
            return (
              <div className="space-y-1">
                <p className="text-[11px] text-nz-tinta-fraca">
                  Escreva com as <span className="font-bold text-nz-tinta">suas palavras</span>, no mínimo{' '}
                  <span className="font-bold text-nz-tinta">{minimo} caracteres</span>
                  {tipo === 'aprendizado_fds' ? ' — o estudo foda de fim de semana, um resumo bem detalhado.' : ' — dá umas 6 linhas.'}
                </p>
                <Textarea
                  autoFocus
                  placeholder={`O que você aprendeu, com as suas palavras (pelo menos ${minimo} caracteres)...`}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onPaste={bloquearCola}
                  onDrop={bloquearCola}
                  className="bg-nz-cinza-fundo/50 border-nz-borda text-nz-tinta text-sm min-h-[100px] rounded-xl"
                />
                <div className="flex items-center justify-between gap-2">
                  {/* 🗣️ diz quanto FALTA, e já diz o tamanho antes de começar.
                      "18/400 caracteres" lia-se como "18 de um limite de 400" —
                      o oposto do que a regra pede. */}
                  <span
                    data-teste="contador-resumo"
                    className={`text-[10px] font-semibold ${faltaDoResumo(texto, tipo) === 0 ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`}
                  >
                    {textoDoContador(texto, tipo)}
                  </span>
                  <span className="text-[10px] text-nz-tinta-fraca">✍️ só digitando — colar não vale</span>
                </div>
                {avisoCola && <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{avisoCola}</p>}
                <p className="text-[11px] text-nz-tinta-fraca pt-1">E a foto do estudo (a página, a anotação):</p>
              </div>
            );
          })()}

          {cameraAberta ? (
            /* 🎥 a câmera ao vivo */
            <div className="space-y-2">
              <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
              <div className="flex gap-2">
                <Button onClick={capturar} className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white rounded-xl h-11 text-sm font-bold">
                  📸 Capturar
                </Button>
                <Button variant="outline" onClick={virarCamera} title="virar câmera" data-teste="virar-camera" className="rounded-xl h-11 w-11 p-0 border-nz-borda text-nz-tinta-fraca shrink-0">
                  <SwitchCamera className="w-4 h-4" />
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
          {/* 🔄 DIR-93 — sem `capture` fixo: esse input só entra em cena quando
              o getUserMedia falhou de vez, e aí a pessoa já está no app de
              câmera nativo do celular — que tem o próprio botão de virar. */}
          <input ref={celularRef} type="file" accept="image/*" capture hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />

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

          {/* 🔒 botão apagado explica o motivo — ninguém deduz por que um
              botão está opaco, e quem não deduz liga pro suporte */}
          {!enviando && motivoTravado && (
            <p data-teste="motivo-travado" className="text-[11px] text-center font-semibold text-nz-tinta-fraca">
              🔒 {motivoTravado}
            </p>
          )}

          <p className="text-[10px] text-center text-nz-tinta-fraca">
            🤖 validação automática por IA · print repetido é barrado · horário carimbado
          </p>
        </div>
      </div>
    </div>
  );
}

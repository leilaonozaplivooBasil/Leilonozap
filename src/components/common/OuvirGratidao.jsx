import React, { useState } from 'react';
import { ouvirAudio, baixarAudio } from '@/lib/cofreDeAudio';
import { avisoDeRetencao, retaFinal, audioExpirado } from '@/lib/acervoDeVoz';

// 🎙️ OUVIR A GRATIDÃO — o mesmo pedaço na tarefa do dia e no Diário de Bolso
// (DIR-101/104, 09/09/2026).
//
// Dono: "4. Fazer" (ouvir a gratidão no Diário de Bolso) e "5. Faz sentido, mas
// inclua opção de download e aviso de que só permanece salvo por 1 mês".
//
// POR QUE UM COMPONENTE SÓ, E NÃO DOIS PARECIDOS: o botão nasceu na tarefa do
// dia; o Diário é onde a pessoa REVISITA — é lá que ela vai querer ouvir de
// novo, e é lá que o prazo importa. Duas cópias divergiriam, e a que ficasse
// pra trás avisaria o prazo errado. O aviso e o apagar têm que sair da MESMA
// régua (`acervoDeVoz`), senão a tela promete um dia que o cron não cumpre.
//
// 🎙️ DIR-101.1 — O cofre é privado: não existe URL fixa, só link assinado de
// 10 minutos. Por isso o link é pedido no CLIQUE e não fica pendurado na tela
// — link assinado guardado em componente vence sozinho e vira "não abre" sem
// explicação nenhuma.
//
// TRÊS COISAS NA MESMA LINHA, NESTA ORDEM DE PROPÓSITO:
//   ouvir  → o que a pessoa veio fazer
//   baixar → a saída de emergência antes do prazo
//   aviso  → a verdade sobre quanto tempo ainda resta
// O MESMO pedaço vive em dois fundos: a tarefa do dia é clara, o Diário é
// escuro. `nz-tinta-fraca` é #5C6B62 — some no escuro. Por isso o tom é
// explícito: um componente só, duas paletas, nenhuma cópia.
const TOM = {
  claro: { acao: 'text-nz-verde', aviso: 'text-nz-tinta-fraca', apagado: 'text-nz-tinta-fraca' },
  escuro: { acao: 'text-emerald-300', aviso: 'text-white/40', apagado: 'text-white/35' },
};

export default function OuvirGratidao({ caminho, uid, dia, segundos = 0, className = '', tom = 'claro' }) {
  const cor = TOM[tom] || TOM.claro;
  const [url, setUrl] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(false);
  const [baixando, setBaixando] = useState(false);

  // Passou de 30 dias: o arquivo já não está lá. Dizer isso é melhor que
  // oferecer um play que só devolve "não abriu" — o erro faria a pessoa achar
  // que é falha do sistema, quando foi a regra que ela nunca leu.
  const expirou = audioExpirado(dia);

  const abrir = async () => {
    if (url || buscando) return;
    setBuscando(true); setErro(false);
    const link = await ouvirAudio({ caminho, actorId: uid });
    if (link) setUrl(link); else setErro(true);
    setBuscando(false);
  };

  const baixar = async () => {
    if (baixando) return;
    setBaixando(true);
    const link = await baixarAudio({ caminho, actorId: uid, dia });
    // A aba nova pega o Content-Disposition: attachment do Storage e salva o
    // arquivo em vez de tocar. Sem link, não inventa erro: o aviso já explica
    // que a gravação pode ter passado do prazo.
    if (link) window.open(link, '_blank', 'noopener');
    setBaixando(false);
  };

  if (expirou) {
    return (
      <span className={`shrink-0 text-[10px] ${cor.apagado} ${className}`} data-teste="gratidao-expirada" title={`as gravações ficam guardadas por 1 mês`}>
        🎙️ gravação de mais de 1 mês — já apagada
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 flex-wrap ${className}`} data-teste="ouvir-gratidao-bloco">
      {url ? (
        <audio src={url} controls autoPlay className="h-8 w-44 shrink-0" data-teste="ouvir-gratidao" />
      ) : (
        <button
          type="button"
          onClick={abrir}
          disabled={buscando}
          data-teste="botao-ouvir-gratidao"
          className={`shrink-0 text-[10px] font-bold ${cor.acao} hover:underline disabled:opacity-50`}
          title="ouvir a gratidão que você gravou"
        >
          {buscando ? '🎙️ abrindo…' : erro ? '🎙️ não abriu — tente de novo' : `🎙️ ouvir${segundos ? ` (${segundos}s)` : ''}`}
        </button>
      )}

      <button
        type="button"
        onClick={baixar}
        disabled={baixando}
        data-teste="botao-baixar-gratidao"
        className={`shrink-0 text-[10px] font-bold ${cor.acao} hover:underline disabled:opacity-50`}
        title="salvar a gravação no seu aparelho, pra guardar pra sempre"
      >
        {baixando ? '⬇️ preparando…' : '⬇️ baixar'}
      </button>

      <span
        className={`shrink-0 text-[10px] ${retaFinal(dia) ? 'font-bold text-amber-500' : cor.aviso}`}
        data-teste="aviso-retencao-gratidao"
      >
        {avisoDeRetencao(dia)}
      </span>
    </span>
  );
}

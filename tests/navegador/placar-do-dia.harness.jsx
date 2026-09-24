/**
 * Banca do PLACAR DO DIA — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (DIR-180, 24/09/2026)
 * Dono, com o print da tela do Compromisso no celular: "pra gente deixar isso
 * ainda mais limpo... pra ficar ainda melhor visual e a pessoa entender
 * melhor... o que você ainda melhoraria pra ficar ainda mais bonito?"
 *
 * Aqui moravam SEIS blocos empilhados (a linha do 🔥, quatro avisos e a grade
 * de quatro cartões iguais) e a explicação da metodologia inteira presa num
 * `title=` que NUNCA abre no celular.
 *
 * ?caso=limpo    → dia normal (nenhum alerta)
 * ?caso=zerado   → não votou E atrasou o pronto E está em aviso E foi liberado
 *                  (os quatro juntos: a barra tem que mostrar UM só)
 * ?caso=aviso    → só o aviso âmbar
 * ?caso=liberado → só a liberação verde
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import PlacarDoDia from '@/components/licensing/CentralVendas/PlacarDoDia';

const caso = new URLSearchParams(window.location.search).get('caso') || 'limpo';

const xgame = {
  token_dia: 14.31,
  faixa: { medalha: '🥇', label: 'Ouro' },
  cotacao: 0.93,
  dia_util: 8,
  pontos: 41,
  frase_mvm: 'você está sendo bem visto',
  perdeu_por_nao_votar: caso === 'zerado',
  perdeu_por_atraso_pronto: caso === 'zerado',
  em_aviso_pronto: caso === 'zerado' || caso === 'aviso',
  avisos_pronto: 1,
  xpay: { ganho: 62.4, perdido: 0, emJogo: 28.5, valorDia: 90.9, pesoReferencia: 75, somaPesos: 52, pesoFalta: 23 },
};
const ciclo = { total: 14.31, liga: { emoji: '🥇', label: 'Ouro' }, estudoEmDiaCompleto: true };
const liberacao = (caso === 'zerado' || caso === 'liberado') ? { ate_hora: '09:00', motivo: 'corrida da empresa' } : null;

function Banca() {
  const [hora, setHora] = React.useState('');
  const [rascunho, setRascunho] = React.useState('');
  return (
    <div className="nz-painel p-3" style={{ minHeight: '100vh', background: '#F5F6F5' }} data-teste="banca-placar">
      <PlacarDoDia
        xgame={xgame}
        ciclo={ciclo}
        recebido={{ media: 8.4 }}
        fogo={{ dias: 3, congelou: true }}
        hojeFechou={false}
        ehHoje
        liberacao={liberacao}
        teste={{ hora, rascunho, onRascunho: setRascunho, entrar: () => setHora(rascunho), sair: () => { setHora(''); setRascunho(''); } }}
      />
      <span data-teste="estado-placar">{JSON.stringify({ hora })}</span>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);

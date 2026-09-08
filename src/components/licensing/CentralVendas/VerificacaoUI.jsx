import React from 'react';

// 📊 A GRAMÁTICA COMPARTILHADA DA VERIFICAÇÃO DO PROGRESSO (Hábito 7) — DIR-96,
// 08/09/2026. Nasceu da análise "Nove Telas, Um Número": toda barra de
// progresso do app segue o mesmo instinto (trilho claro, preenchimento
// sólido, cantos redondos) mas cada arquivo desenhava a sua própria — nove
// implementações do mesmo componente, nunca o mesmo componente. Foi essa
// deriva que forçou a limpeza de emergência da X-Performance em 07/09
// ("está ficando muito confuso… deixe fluido").
//
// A REGRA DESTE ARQUIVO: mesmo visual exato de cada tela — nada foi
// redesenhado. Cada componente aqui só nomeia o que já existia, pra nove
// lugares pararem de poder divergir sozinhos com o tempo. Dois DIALETOS,
// porque o app tem dois: 'claro' (os cartões brancos da Central de Vendas)
// e 'escuro' (as superfícies quase-pretas da Top College/X-EOS).

const ALTURA_BARRA = { fina: 'h-1', padrao: 'h-1.5', media: 'h-2', grossa: 'h-2.5', extra: 'h-3' };

/**
 * A barra de progresso — trilho + preenchimento, com marca de limite opcional
 * (a linha vertical do Score Executivo) e o estado "sem fonte de dado" (a
 * Meta Central mostra "sem fonte" no lugar da barra em vez de uma barra
 * vazia mentindo 0%).
 */
export function BarraProgresso({ pct = 0, dialeto = 'claro', altura = 'padrao', corClasse, corEstilo, trilhoClasse, limite = null, semDado = false }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const h = ALTURA_BARRA[altura] || ALTURA_BARRA.padrao;
  // o trilho troca de cor conforme o que está por baixo — quem chama pode
  // sobrescrever (trilhoClasse) quando o cartão não é a superfície padrão do dialeto
  const trilho = trilhoClasse || (dialeto === 'escuro' ? 'bg-white/10' : 'bg-nz-cinza-fundo border border-nz-borda');
  const marca = dialeto === 'escuro' ? 'bg-white/70' : 'bg-nz-tinta/50';
  return (
    <div className={`relative ${h} rounded-full overflow-hidden ${trilho}`} data-teste="barra-progresso" data-sem-dado={semDado ? 'sim' : 'nao'}>
      {!semDado && (
        <div
          className={`h-full rounded-full transition-all ${corClasse || 'bg-nz-verde'}`}
          style={{ width: `${p}%`, ...(corEstilo ? { background: corEstilo } : {}) }}
        />
      )}
      {limite != null && (
        <div className={`absolute top-0 h-full w-px ${marca}`} style={{ left: `${limite}%` }} title={`linha dos ${limite}%`} data-teste="barra-limite" />
      )}
    </div>
  );
}

// dado = medido de venda/cadastro real; aproximação = fórmula-proxy declarada;
// sem fonte = o sistema ainda não mede — pendência explícita, nunca número
// inventado (a régua de governança do Resumo Executivo, Seção 37).
const SELO_CLARO = {
  dado: { texto: 'Dado', cls: 'bg-nz-verde/10 text-nz-verde border-nz-verde/30' },
  aproximacao: { texto: 'Aproximação', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  sem_fonte: { texto: 'Sem fonte', cls: 'bg-nz-cinza-fundo text-nz-tinta-fraca border-nz-borda' },
};
const SELO_ESCURO = {
  dado: { texto: 'Dado', cls: 'bg-nz-verde/15 text-nz-verde border-nz-verde/30' },
  aproximacao: { texto: 'Aproximação', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/25' },
  sem_fonte: { texto: 'Sem fonte', cls: 'bg-white/5 text-white/40 border-white/15' },
};

/** O selo de confiança do número: dado real, aproximação por fórmula, ou sem fonte ainda. */
export function SeloConfianca({ tipo, dialeto = 'claro' }) {
  const mapa = dialeto === 'escuro' ? SELO_ESCURO : SELO_CLARO;
  const e = mapa[tipo] || mapa.sem_fonte;
  return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${e.cls}`} data-teste="selo-confianca" data-tipo={tipo}>{e.texto}</span>;
}

const COR_SEMAFORO = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
const TITULO_SEMAFORO = { verde: 'em dia', amarelo: 'um furo', vermelho: 'dois ou mais furos' };

const TAMANHO_SEMAFORO = { pequeno: 'h-2 w-2', padrao: 'h-2.5 w-2.5', grande: 'h-3 w-3' };

/** O ponto colorido — verde/amarelo/vermelho — o mesmo semáforo que src/lib/metasPessoa.js já calcula. */
export function Semaforo({ cor, tamanho = 'padrao', titulo }) {
  const t = TAMANHO_SEMAFORO[tamanho] || TAMANHO_SEMAFORO.padrao;
  return <span className={`inline-block ${t} rounded-full shrink-0 ${COR_SEMAFORO[cor] || COR_SEMAFORO.vermelho}`} title={titulo || TITULO_SEMAFORO[cor] || ''} data-teste="semaforo" data-cor={cor} />;
}

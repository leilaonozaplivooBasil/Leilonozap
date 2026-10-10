/**
 * Banca da REVISÃO DE DESCRIÇÕES (10/10/2026): a página de verdade com uma rota de mentira
 * (window.__plataformaFalsa.respostas.descricoesEmLote). O servidor falso guarda o "banco" em
 * memória e obedece às mesmas regras da rota real. Cenários por URL:
 *   ?ia=caiu → a IA falha em tudo (para sozinho após 3 falhas seguidas)
 *   ?ia=semchave → ia_indisponivel (para na hora)
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import RevisaoDeDescricoes from '@/pages/RevisaoDeDescricoes';

const q = new URLSearchParams(window.location.search);
window.__pausaDescricoesMs = 5;
window.__usuarioFalso = { id: 'adm', email: 'a@b.c', role: 'admin' };

const nomes = Array.from({ length: 14 }, (_, i) => `Produto sem descrição ${String(i + 1).padStart(2, '0')}`);
const bd = {
  produtos: nomes.map((nome, i) => ({ id: `p${i + 1}`, nome, nivel: i % 3 === 0 ? 'vazia' : i % 3 === 1 ? 'interna' : 'curta', fotos: 2, tem_rascunho: false, em_estoque: true, atual: i % 3 === 1 ? 'Gerado automaticamente do lote: X (Mercado Livre)' : '' })),
  boas: 2,
  rascunhos: [], aprovadas: [],
};
window.__bd = bd;
window.__chamadasDescricoes = [];

const TEXTO = (nome) => `${nome}: produto da loja, fotografado em detalhe.\n• Aparência conforme as fotos do anúncio\n• Condição informada pelo cadastro\n• Dimensões e peso no cadastro do produto`;

window.__plataformaFalsa = window.__plataformaFalsa || { chamadas: [], respostas: {} };
window.__plataformaFalsa.respostas.descricoesEmLote = (corpo) => {
  window.__chamadasDescricoes.push(corpo);
  if (corpo.action === 'fila') {
    const fila = bd.produtos.filter((p) => p.nivel !== 'boa').map((p) => ({ id: p.id, nome: p.nome, nivel: p.nivel, fotos: p.fotos, tem_rascunho: bd.rascunhos.some((r) => r.alvo_id === p.id), em_estoque: true }));
    const contagem = { vazia: 0, interna: 0, so_o_nome: 0, curta: 0, boa: bd.boas };
    bd.produtos.forEach((p) => { contagem[p.nivel] += 1; });
    return { ok: true, total: bd.produtos.length + bd.boas, contagem, fila };
  }
  if (corpo.action === 'rascunhos') return { ok: true, rascunhos: bd.rascunhos.map((r) => ({ ...r })) };
  if (corpo.action === 'gerar') {
    if (q.get('ia') === 'semchave') return { ok: false, motivo: 'ia_indisponivel' };
    if (q.get('ia') === 'caiu') return { ok: false, motivo: 'ia_falhou' };
    const p = bd.produtos.find((x) => x.id === corpo.id);
    const r = { id: `r-${p.id}`, alvo_id: p.id, nome: p.nome, texto: TEXTO(p.nome), anterior: p.atual, nivel_anterior: p.nivel, fotos: 2 };
    bd.rascunhos = [r, ...bd.rascunhos.filter((x) => x.alvo_id !== p.id)];
    return { ok: true, rascunho: r };
  }
  if (corpo.action === 'aprovar') {
    const resultado = corpo.ids.map((id) => {
      const r = bd.rascunhos.find((x) => x.id === id);
      if (!r) return { id, ok: false, motivo: 'nao_e_rascunho' };
      const p = bd.produtos.find((x) => x.id === r.alvo_id);
      p.nivel = 'boa'; p.atual = corpo.textos?.[id] || r.texto;
      bd.rascunhos = bd.rascunhos.filter((x) => x.id !== id);
      bd.aprovadas.push({ id, alvo_id: p.id, anterior: r.anterior, nivel: r.nivel_anterior });
      return { id, ok: true };
    });
    return { ok: true, resultado };
  }
  if (corpo.action === 'rejeitar') { bd.rascunhos = bd.rascunhos.filter((x) => !corpo.ids.includes(x.id)); return { ok: true }; }
  if (corpo.action === 'desfazer') {
    const a = bd.aprovadas.find((x) => x.id === corpo.id);
    if (!a) return { ok: false, motivo: 'nao_aprovada' };
    const p = bd.produtos.find((x) => x.id === a.alvo_id); p.nivel = a.nivel; p.atual = a.anterior;
    bd.aprovadas = bd.aprovadas.filter((x) => x.id !== corpo.id);
    return { ok: true };
  }
  return { ok: false, motivo: 'erro' };
};

createRoot(document.getElementById('raiz')).render(<MemoryRouter><RevisaoDeDescricoes /></MemoryRouter>);

import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, Check, AlertTriangle, Users, ArrowLeft } from 'lucide-react';
import {
  TIPOS_CONTATO, LIMITE_IMPORTACAO,
  lerVCard, mapearCabecalhos, prepararImportacao,
} from '@/lib/importarContatos';

// 📥 IMPORTADOR DE CONTATOS DA LISTA DE NETWORKING (Hábito 3).
//
// Ordem do dono (08/09/2026): "na lista de contatos tenha um campo de
// importação... duas opções, importar lista de contatos pessoais e lista de
// contatos business... A ideia é importar contatos em massa sendo opcional a
// escolha entre quem é um contato de negócios e quem é contato pessoal."
//
// POR QUE TEM UMA TELA DE CONFERÊNCIA NO MEIO, E NÃO IMPORTA DIRETO:
// o Hábito 3 é lista QUALIFICADA — cada pessoa ganha 3 notas de 1 a 5. Uma
// agenda de celular tem 800 linhas, e boa parte é SAC de banco, motoboy e
// iFood. Despejar tudo faria o contador virar "800 pessoas · 3 qualificadas" e
// o número deixaria de significar alguma coisa. Então o arquivo entra, é
// separado em três baldes, e a pessoa DESMARCA quem não é network antes de
// gravar. Importar é o meio; a lista continua sendo escolhida.
//
// A regra de separação toda mora em src/lib/importarContatos.js (testada sem
// navegador). Aqui é só tela.

const PASSOS = { ARQUIVO: 'arquivo', CONFERIR: 'conferir', FIM: 'fim' };

export default function CrmImportarContatosModal({ aberto, onFechar, existentes = [], onImportar }) {
  const fileRef = useRef(null);
  const [passo, setPasso] = useState(PASSOS.ARQUIVO);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [tipo, setTipo] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [mapa, setMapa] = useState({});
  const [cabecalhos, setCabecalhos] = useState([]);
  const [desmarcados, setDesmarcados] = useState(() => new Set());
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [verDescartados, setVerDescartados] = useState(false);

  const separado = useMemo(
    () => prepararImportacao({ linhas, mapa, tipo, existentes }),
    [linhas, mapa, tipo, existentes],
  );

  const selecionados = separado.prontos.filter((p) => !desmarcados.has(p.chave));

  const zerar = () => {
    setPasso(PASSOS.ARQUIVO); setNomeArquivo(''); setTipo(null);
    setLinhas([]); setMapa({}); setCabecalhos([]); setDesmarcados(new Set());
    setErro(''); setResultado(null); setVerDescartados(false);
  };

  const fechar = () => { if (!importando) { zerar(); onFechar?.(); } };

  const aoEscolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(''); setNomeArquivo(file.name); setDesmarcados(new Set());
    try {
      if (/\.vcf$/i.test(file.name)) {
        // A agenda do celular: o leitor já devolve {full_name, phone, email},
        // então não há coluna nenhuma pra mapear.
        const contatos = lerVCard(await file.text());
        if (!contatos.length) { setErro('Não achei nenhum contato nesse arquivo.'); return; }
        setLinhas(contatos); setCabecalhos([]); setMapa({});
      } else {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (!json.length) { setErro('Essa planilha está vazia.'); return; }
        const hdrs = Object.keys(json[0]);
        setCabecalhos(hdrs); setMapa(mapearCabecalhos(hdrs)); setLinhas(json);
      }
      setPasso(PASSOS.CONFERIR);
    } catch (err) {
      console.error('[IMPORTAR CONTATOS] leitura falhou:', err);
      setErro('Não consegui ler esse arquivo. Use .csv, .xlsx ou .vcf (a agenda exportada do celular).');
    } finally {
      // Sem isto, escolher o MESMO arquivo de novo não dispara o onChange.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const alternar = (chave) => {
    setDesmarcados((antes) => {
      const novo = new Set(antes);
      if (novo.has(chave)) novo.delete(chave); else novo.add(chave);
      return novo;
    });
  };

  const importar = async () => {
    if (!selecionados.length || importando) return;
    setImportando(true); setErro('');
    try {
      const r = await onImportar?.(selecionados);
      setResultado(r || { criados: selecionados.length, falhas: 0 });
      setPasso(PASSOS.FIM);
    } catch (err) {
      console.error('[IMPORTAR CONTATOS] gravação falhou:', err);
      // A mensagem real do servidor importa: "Sem permissão" (cargo sem CRM) é
      // um problema completamente diferente de "caiu a internet", e engolir os
      // dois num "erro ao importar" já custou tempo de suporte antes.
      setErro(err?.message || 'Não consegui gravar os contatos. Tente de novo.');
    } finally {
      setImportando(false);
    }
  };

  if (!aberto) return null;

  const descartados = [...separado.duplicados, ...separado.invalidos];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto space-y-4">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
                <Users className="w-5 h-5 text-nz-verde" /> Importar contatos
              </p>
              <p className="text-sm text-nz-tinta-fraca">
                {passo === PASSOS.ARQUIVO && 'Traga a sua agenda pra dentro da Lista de Networking.'}
                {passo === PASSOS.CONFERIR && (nomeArquivo || 'Confira antes de gravar.')}
                {passo === PASSOS.FIM && 'Pronto.'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={fechar} disabled={importando}>
              <X className="w-5 h-5 text-nz-tinta-fraca" />
            </Button>
          </div>

          {erro && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>
          )}

          {/* ── PASSO 1: o arquivo ─────────────────────────────────────── */}
          {passo === PASSOS.ARQUIVO && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-nz-borda hover:border-nz-verde/50 p-6 text-center transition-colors"
              >
                <Upload className="w-7 h-7 mx-auto text-nz-tinta-fraca mb-2" />
                <p className="text-sm font-semibold text-nz-tinta">Escolher arquivo</p>
                <p className="text-xs text-nz-tinta-fraca mt-1">
                  .vcf (agenda do celular), .csv ou .xlsx
                </p>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".vcf,.csv,.xlsx,.xls"
                onChange={aoEscolherArquivo}
                className="hidden"
              />
              <div className="text-xs text-nz-tinta-fraca space-y-1.5">
                <p><strong className="text-nz-tinta">No celular:</strong> Contatos → Exportar / Compartilhar → arquivo .vcf.</p>
                <p><strong className="text-nz-tinta">No Google Contacts:</strong> Exportar → Google CSV.</p>
                <p><strong className="text-nz-tinta">Planilha sua:</strong> uma coluna de nome e uma de telefone já bastam.</p>
              </div>
            </>
          )}

          {/* ── PASSO 2: tipo + conferência ─────────────────────────────── */}
          {passo === PASSOS.CONFERIR && (
            <>
              {/* O que o dono pediu com todas as letras: pessoal ou negócios,
                  e OPCIONAL — dá pra importar sem classificar. */}
              <div>
                <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">
                  Que tipo de contato é esta lista?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_CONTATO.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(tipo === t.id ? null : t.id)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${tipo === t.id ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white hover:border-nz-verde/40'}`}
                    >
                      <p className="text-sm font-bold text-nz-tinta">{t.emoji} {t.label}</p>
                      <p className="text-[11px] text-nz-tinta-fraca mt-0.5">{t.ajuda}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-nz-tinta-fraca mt-1.5">
                  {tipo
                    ? 'Clique de novo pra desmarcar — classificar é opcional.'
                    : 'Sem escolher, os contatos entram sem classificação. Dá pra definir depois.'}
                </p>
              </div>

              {/* Mapeamento só aparece pra planilha, e só quando precisa: quem
                  sobe um Google CSV não deveria ter que mexer em nada. */}
              {!!cabecalhos.length && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { campo: 'full_name', rotulo: 'Coluna do nome' },
                    { campo: 'phone', rotulo: 'Coluna do telefone' },
                    { campo: 'email', rotulo: 'Coluna do e-mail' },
                  ].map(({ campo, rotulo }) => (
                    <label key={campo} className="block">
                      <span className="text-[11px] font-semibold text-nz-tinta-fraca uppercase tracking-wide">{rotulo}</span>
                      <select
                        value={mapa[campo] || ''}
                        onChange={(e) => setMapa((m) => ({ ...m, [campo]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-nz-borda bg-white text-nz-tinta text-sm p-2"
                      >
                        <option value="">— nenhuma —</option>
                        {cabecalhos.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap border-t border-nz-borda pt-3">
                <p className="text-sm text-nz-tinta">
                  <strong>{selecionados.length}</strong> de {separado.prontos.length} contato{separado.prontos.length === 1 ? '' : 's'} marcado{selecionados.length === 1 ? '' : 's'} pra entrar
                </p>
                {separado.prontos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDesmarcados(desmarcados.size ? new Set() : new Set(separado.prontos.map((p) => p.chave)))}
                    className="text-xs font-semibold text-nz-verde hover:underline"
                  >
                    {desmarcados.size ? 'Marcar todos' : 'Desmarcar todos'}
                  </button>
                )}
              </div>

              {separado.excedente > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  O arquivo tem mais de {LIMITE_IMPORTACAO} linhas. Entraram as {LIMITE_IMPORTACAO} primeiras;
                  as outras {separado.excedente} ficaram de fora — importe o resto num segundo arquivo.
                </p>
              )}

              {separado.prontos.length === 0 ? (
                <p className="text-sm text-nz-tinta-fraca py-4 text-center">
                  Nenhum contato novo nesse arquivo.
                  {!!cabecalhos.length && !mapa.phone && ' Escolha qual coluna é o telefone.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {separado.prontos.map((p) => {
                    const dentro = !desmarcados.has(p.chave);
                    return (
                      <label
                        key={p.chave}
                        className={`flex items-center gap-3 rounded-lg border p-2 cursor-pointer transition-colors ${dentro ? 'border-nz-borda bg-white' : 'border-nz-borda/50 bg-gray-50 opacity-60'}`}
                      >
                        <input
                          type="checkbox"
                          checked={dentro}
                          onChange={() => alternar(p.chave)}
                          className="w-4 h-4 accent-nz-verde shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm truncate ${p.semNome ? 'text-nz-tinta-fraca italic' : 'text-nz-tinta font-medium'}`}>
                            {p.full_name}{p.semNome ? ' — sem nome na agenda' : ''}
                          </span>
                          <span className="block text-[11px] text-nz-tinta-fraca truncate">
                            {[p.telefoneVisivel, p.email].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {descartados.length > 0 && (
                <div className="border border-nz-borda rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setVerDescartados((v) => !v)}
                    className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-nz-tinta flex-1">
                      {descartados.length} linha{descartados.length === 1 ? '' : 's'} não {descartados.length === 1 ? 'entra' : 'entram'}
                    </span>
                    <span className="text-xs text-nz-tinta-fraca">{verDescartados ? 'ocultar' : 'ver por quê'}</span>
                  </button>
                  {verDescartados && (
                    <div className="max-h-40 overflow-y-auto border-t border-nz-borda divide-y divide-nz-borda/60">
                      {descartados.map((d, i) => (
                        <p key={`${d.linha}-${i}`} className="text-[11px] text-nz-tinta-fraca px-2.5 py-1.5">
                          <span className="text-nz-tinta">{d.nome || 'sem nome'}</span>
                          {' · '}{d.telefone}{' — '}{d.motivo}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={zerar} disabled={importando} className="border-nz-borda text-nz-tinta">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Outro arquivo
                </Button>
                <Button
                  onClick={importar}
                  disabled={!selecionados.length || importando}
                  className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white"
                >
                  {importando
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                    : <><Check className="w-4 h-4 mr-2" /> Importar {selecionados.length} contato{selecionados.length === 1 ? '' : 's'}</>}
                </Button>
              </div>
            </>
          )}

          {/* ── PASSO 3: o que aconteceu ───────────────────────────────── */}
          {passo === PASSOS.FIM && resultado && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-nz-verde-fundo flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-nz-verde" />
              </div>
              <p className="text-lg font-bold text-nz-tinta">
                {resultado.criados} contato{resultado.criados === 1 ? '' : 's'} na sua lista
              </p>
              {/* Falha parcial é dita, não escondida: o lote vai em partes, e
                  uma parte pode falhar sem derrubar as outras. */}
              {resultado.falhas > 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  {resultado.falhas} não {resultado.falhas === 1 ? 'entrou' : 'entraram'}. Tente importar esses de novo.
                </p>
              )}
              <p className="text-sm text-nz-tinta-fraca">
                Agora qualifique cada um de 1 a 5 — é a qualificação que coloca a pessoa na sua fila do Hábito 4.
              </p>
              <div className="flex gap-2 justify-center pt-1">
                <Button variant="outline" onClick={zerar} className="border-nz-borda text-nz-tinta">Importar outro arquivo</Button>
                <Button onClick={fechar} className="bg-nz-verde hover:bg-nz-verde-claro text-white">Ver minha lista</Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

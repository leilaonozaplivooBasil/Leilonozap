import React, { useState, useEffect, useMemo } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Megaphone, ExternalLink, AlertTriangle } from 'lucide-react';
import { leilaoAindaAberto, idDoLeilao } from '@/lib/popupLeilaoDestaque';

/**
 * "Pop-up do leilão" no Painel de Mídia — onde o dono escolhe o destaque.
 *
 * A escolha é por LISTA de leilões ativos, não por link colado. O link é
 * montado aqui a partir do id: assim ele nunca sai errado, que era o risco de
 * um campo de texto livre.
 *
 * Guarda em `banner_images` com context='popup_leilao' — tabela que já existe,
 * já é escrita pelo entityWrite e já tem os campos certos. Sem migração: hoje
 * migração não sobe sozinha, e esta demanda não podia depender disso.
 */
const CONTEXTO = 'popup_leilao';

export default function PopupLeilaoConfig({ banners = [], onSaved }) {
  const [leiloes, setLeiloes] = useState([]);
  const [escolhido, setEscolhido] = useState('');
  const [ligado, setLigado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const config = useMemo(
    () => banners.find((b) => b.context === CONTEXTO) || null,
    [banners]
  );

  useEffect(() => {
    setEscolhido(idDoLeilao(config?.link_url));
    setLigado(!!config?.is_active);
  }, [config]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const todos = await plataforma.entities.Auction.filter({ status: 'active' }, '-created_date', 300);
        if (!vivo) return;
        // Só o que ainda dá para anunciar — mesma regra que o pop-up usa na loja.
        setLeiloes((Array.isArray(todos) ? todos : []).filter((a) => leilaoAindaAberto(a)));
      } catch {
        if (vivo) setLeiloes([]);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // O leilão gravado pode ter encerrado desde a última troca. O pop-up já some
  // sozinho na loja; aqui o dono precisa VER que sumiu, senão fica no escuro.
  const gravadoEncerrou = !!escolhido && !carregando && !leiloes.some((a) => a.id === escolhido);

  const salvar = async () => {
    if (!escolhido) { toast.error('Escolha um leilão primeiro.'); return; }
    const leilao = leiloes.find((a) => a.id === escolhido);
    setSalvando(true);
    try {
      const dados = {
        context: CONTEXTO,
        link_url: `/AuctionRoom?id=${encodeURIComponent(escolhido)}`,
        title: leilao?.title || '',
        is_active: ligado,
        device_type: 'desktop',
      };
      if (config?.id) await plataforma.entities.BannerImage.update(config.id, dados);
      else await plataforma.entities.BannerImage.create({ ...dados, image_url: '', order: 0 });
      toast.success(ligado ? 'Pop-up no ar!' : 'Pop-up salvo (desligado).');
      onSaved?.();
    } catch (e) {
      console.error('Erro ao salvar o pop-up:', e);
      toast.error('Não foi possível salvar o pop-up.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gray-800/40 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Pop-up do leilão em destaque</h2>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Aparece uma vez por visita, em todas as páginas de cliente. <b>Não</b> aparece dentro
        da sala do leilão nem no pagamento, e some sozinho quando o leilão escolhido encerra.
      </p>

      <label className="mb-1.5 block text-sm text-gray-300">Leilão em destaque</label>
      <select
        value={escolhido}
        onChange={(e) => setEscolhido(e.target.value)}
        disabled={carregando}
        className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2.5 text-white disabled:opacity-60"
      >
        <option value="">
          {carregando ? 'Carregando leilões…' : `— Escolha entre ${leiloes.length} leilões ativos —`}
        </option>
        {leiloes.map((a) => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>

      {gravadoEncerrou && (
        <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          O leilão que estava no pop-up já encerrou. Ele parou de aparecer para os clientes —
          escolha outro para voltar ao ar.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <Switch checked={ligado} onCheckedChange={setLigado} />
          <span className="text-sm text-gray-300">{ligado ? 'Ligado' : 'Desligado'}</span>
        </label>

        <div className="flex items-center gap-2">
          {escolhido && (
            <a
              href={`/AuctionRoom?id=${encodeURIComponent(escolhido)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Ver o leilão <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Button onClick={salvar} disabled={salvando || carregando} className="bg-emerald-600 hover:bg-emerald-500">
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

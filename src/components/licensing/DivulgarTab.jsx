import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { createPageUrl } from '@/utils';
import { copyLink } from '@/lib/clipboard';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Download, QrCode as QrIcon, Megaphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { proxyImage } from "@/functions/proxyImage";

// 📣 Aba DIVULGAR — tudo que o licenciado precisa pra trazer gente, num lugar só.
// Antes: o link de cadastro vivia perdido na "Visão Geral", o modal de compartilhar era
// exclusivo do admin e não existia QR nem mensagem pronta de WhatsApp.
const BASE = 'https://leilaonozap.net';

// Cada link é um "produto" de divulgação com a mensagem pronta pro WhatsApp.
function buildLinks(user) {
  const ref = user?.referral_code || '';
  const nome = (user?.display_first_name || user?.full_name || '').split(' ')[0];
  return [
    {
      key: 'cadastro',
      title: '🪪 Link de Cadastro (sua equipe)',
      desc: 'Quem entrar por aqui vira seu indicado e conta como sua rede.',
      url: `${BASE}${createPageUrl('Licensing')}?ref=${ref}`,
      msg: `Vem comigo pro Leilão NoZap! 🚀\n\nVocê tem sua própria loja virtual, ganha comissão nas vendas e ainda arremata produto barato.\n\nCadastre-se pelo meu link:`,
    },
    {
      key: 'loja',
      title: '🛍️ Link da sua Loja Virtual',
      desc: 'Cada compra pelo seu link gera comissão pra você.',
      url: `${BASE}/Loja-Virtual?ref=${ref}`,
      msg: `Olha só a minha loja! 🛍️\n\nProduto bom com preço de atacado, entrega em todo o Brasil, PIX ou cartão.\n\nDá uma olhada:`,
    },
    {
      key: 'leiloes',
      title: '🔨 Link dos Leilões (5% por venda e arremate)',
      desc: 'Você ganha 5% sobre cada venda e arremate dos seus indicados.',
      url: `${BASE}${createPageUrl('Home')}?ref=${ref}`,
      msg: `Tem leilão rolando agora no Leilão NoZap! 🔨\n\nDá pra arrematar por uma fração do preço.\n\nEntra por aqui:`,
    },
  ].map((l) => ({ ...l, nome }));
}

export default function DivulgarTab({ user, isSaiDeBaixo = false }) {
  const links = buildLinks(user);
  const [qrs, setQrs] = useState({});
  // 🖼️ Imagem de produto em destaque (FeaturedProduct ativo) — anexada ao share
  // do link da LOJA pra o WhatsApp mostrar o produto e não a logo do app.
  const [featuredImage, setFeaturedImage] = useState('');

  useEffect(() => {
    // QR gerado LOCALMENTE (sem depender de serviço externo que pode cair)
    links.forEach((l) => {
      QRCode.toDataURL(l.url, { width: 320, margin: 1, color: { dark: '#0b1a12', light: '#ffffff' } })
        .then((data) => setQrs((prev) => ({ ...prev, [l.key]: data })))
        .catch(() => { /* sem QR, os outros botões seguem funcionando */ });
    });

    // Busca FeaturedProduct ativo (uma vez) pra usar no share da loja
    let alive = true;
    (async () => {
      try {
        const items = await base44.entities.FeaturedProduct.filter({ is_active: true }, 'order', 1);
        const fp = items && items[0];
        if (alive && fp && fp.image_url) setFeaturedImage(fp.image_url);
      } catch { /* sem destaque — segue sem imagem */ }
    })();
    return () => { alive = false; };
  }, [user?.referral_code]);

  const card = isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700';
  const titleC = isSaiDeBaixo ? 'text-gray-900' : 'text-white';
  const descC = isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400';
  const inputC = isSaiDeBaixo ? 'bg-gray-100 border-gray-300 text-gray-900 font-mono text-xs' : 'bg-gray-700 border-gray-600 text-white font-mono text-xs';

  const doCopy = async (url) => {
    const ok = await copyLink(url);
    ok ? toast.success('Link copiado!') : toast.error('Não consegui copiar — selecione e copie manualmente.');
  };

  // 🔗 SHARE COM IMAGEM — 3 níveis (igual Loja Virtual): imagem → texto → wa.me.
  // Só o link da LOJA anexa imagem (FeaturedProduct é representativo da loja).
  // Cadastro/leilões não têm produto específico honesto → Nível 2 (texto) → Nível 3.
  const doWhats = async (l) => {
    const fullText = `${l.msg}\n${l.url}`;
    const canUseImage = l.key === 'loja' && featuredImage;

    // NÍVEL 1: Web Share API com imagem (só link da loja)
    if (canUseImage && navigator.share && navigator.canShare) {
      try {
        let shareableUrl = featuredImage;
        const isLocalUrl = featuredImage.includes('supabase.co') || featuredImage.includes('base44.app') || featuredImage.startsWith('data:');
        if (!isLocalUrl) {
          const cacheKey = `proxy_img_${featuredImage}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            shareableUrl = cached;
          } else {
            const proxyResult = await proxyImage({ imageUrl: featuredImage });
            if (proxyResult?.data?.file_url) {
              shareableUrl = proxyResult.data.file_url;
              sessionStorage.setItem(cacheKey, shareableUrl);
            }
          }
        }

        let blob;
        if (shareableUrl.startsWith('data:')) {
          const [meta, base64] = shareableUrl.split(',');
          const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
          const bin = atob(base64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: mime });
        } else {
          const response = await fetch(shareableUrl, { mode: 'cors' });
          if (!response.ok) throw new Error('fetch falhou');
          blob = await response.blob();
        }

        const mimeType = blob.type || 'image/jpeg';
        const file = new File([blob], 'destaque-loja.jpg', { type: mimeType });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: l.title, text: fullText, url: l.url, files: [file] });
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // NÍVEL 2: Web Share API só texto+url (sem imagem)
    if (navigator.share) {
      try {
        await navigator.share({ title: l.title, text: fullText, url: l.url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // NÍVEL 3: WhatsApp direto (wa.me)
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank', 'noopener');
  };

  const baixarQr = (l) => {
    const data = qrs[l.key];
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `qrcode-${l.key}-${user?.referral_code || 'link'}.png`;
    a.click();
  };

  if (!user?.referral_code) {
    return (
      <Card className={card}>
        <CardContent className="py-10 text-center">
          <p className={descC}>Seu código de indicação ainda está sendo gerado. Recarregue a página em instantes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className={card}>
        <CardHeader>
          <CardTitle className={`${titleC} flex items-center gap-2`}><Megaphone className="w-5 h-5 text-green-500" /> Divulgue e ganhe</CardTitle>
          <CardDescription className={descC}>
            Copie o link, mande no WhatsApp ou use o QR Code no seu material. Tudo já vem com o seu código
            <strong className={isSaiDeBaixo ? 'text-gray-900' : ' text-green-400'}> {user.referral_code}</strong> — quem entrar por eles fica vinculado a você.
          </CardDescription>
        </CardHeader>
      </Card>

      {links.map((l) => (
        <Card key={l.key} className={card}>
          <CardHeader className="pb-3">
            <CardTitle className={`${titleC} text-base`}>{l.title}</CardTitle>
            <CardDescription className={descC}>{l.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-3">
                <Input value={l.url} readOnly className={inputC} onFocus={(e) => e.target.select()} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => doCopy(l.url)} className="bg-gray-600 hover:bg-gray-700">
                    <Copy className="w-4 h-4 mr-2" /> Copiar link
                  </Button>
                  <Button onClick={() => doWhats(l)} className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" /> Enviar no WhatsApp
                  </Button>
                  <Button onClick={() => baixarQr(l)} disabled={!qrs[l.key]} variant="outline" className={isSaiDeBaixo ? '' : 'bg-gray-900 border-gray-600 text-gray-200 hover:bg-gray-700'}>
                    <Download className="w-4 h-4 mr-2" /> Baixar QR Code
                  </Button>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center gap-1">
                {qrs[l.key] ? (
                  <img src={qrs[l.key]} alt={`QR Code — ${l.title}`} className="w-28 h-28 rounded-lg bg-white p-1" />
                ) : (
                  <div className="w-28 h-28 rounded-lg bg-gray-700/50 flex items-center justify-center">
                    <QrIcon className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <span className="text-[10px] text-gray-500">aponte a câmera</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
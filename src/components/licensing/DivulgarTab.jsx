import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { createPageUrl } from '@/utils';
import { copyLink } from '@/lib/clipboard';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Download, QrCode as QrIcon, Megaphone } from 'lucide-react';

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

  useEffect(() => {
    // QR gerado LOCALMENTE (sem depender de serviço externo que pode cair)
    links.forEach((l) => {
      QRCode.toDataURL(l.url, { width: 320, margin: 1, color: { dark: '#0b1a12', light: '#ffffff' } })
        .then((data) => setQrs((prev) => ({ ...prev, [l.key]: data })))
        .catch(() => { /* sem QR, os outros botões seguem funcionando */ });
    });

  }, [user?.referral_code]);

  const card = isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700';
  const titleC = isSaiDeBaixo ? 'text-gray-900' : 'text-white';
  const descC = isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400';
  const inputC = isSaiDeBaixo ? 'bg-gray-100 border-gray-300 text-gray-900 font-mono text-xs' : 'bg-gray-700 border-gray-600 text-white font-mono text-xs';

  const doCopy = async (url) => {
    const ok = await copyLink(url);
    ok ? toast.success('Link copiado!') : toast.error('Não consegui copiar — selecione e copie manualmente.');
  };

  const doWhats = (l) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${l.msg}\n${l.url}`)}`, '_blank', 'noopener');
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

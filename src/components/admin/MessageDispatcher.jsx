
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Mail, MessageCircle, Eye, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { sendBulkMessages } from "@/functions/sendBulkMessages";

const CAREER_LEVELS = [
  { id: 'usuario', name: 'Usuário', color: 'bg-gray-500' },
  { id: 'licenciado_aplicativo', name: 'Licenciado Aplicativo', color: 'bg-green-500' },
  { id: 'licenciado_catalogo', name: 'Licenciado Catálogo', color: 'bg-yellow-500' },
  { id: 'executivo', name: 'Executivo', color: 'bg-purple-500' },
  { id: 'diretor', name: 'Diretor', color: 'bg-orange-500' },
  { id: 'ceo', name: 'CEO', color: 'bg-red-500' },
  { id: 'conselheiro', name: 'Conselheiro', color: 'bg-cyan-500' },
  { id: 'fundador', name: 'Fundador', color: 'bg-amber-500' }
];

const MESSAGE_TEMPLATES = {
  usuario: [
    {
      id: 'invite_licensing',
      name: '🎯 Convite Programa de Licenciamento',
      subject: '🚀 {{name}}, você foi selecionado para o Programa de Licenciamento!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1DB24A, #16a34a); padding: 30px; text-align: center; }
    .logo { width: 120px; margin: 0 auto 15px; }
    .content { padding: 30px; }
    .valora-section { background: #1f2937; padding: 25px; text-align: center; margin: 20px 0; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" alt="Leilão NoZap" class="logo">
      <h1 style="color: white; margin: 0;">🚀 Programa de Licenciamento</h1>
    </div>
    
    <div class="content">
      <h2>Olá {{name}}! 🎉</h2>
      <p>Você foi SELECIONADO para nosso Programa de Licenciamento exclusivo!</p>
      
      <div class="valora-section">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/1cee75b0_90515FAF-DF1E-4B38-88A2-0DB1650A0338.png" alt="Valora Pay" style="width: 200px;">
        <h3 style="color: #1DB24A;">💰 VALORA PAY (V$)</h3>
        <p style="color: white;">Nossa Moeda Exclusiva!</p>
      </div>

      <h3>🌟 Benefícios:</h3>
      <p>💰 Ganhe V$ quando seus amigos comprarem!</p>
      <p>🛍️ Use V$ para comprar produtos!</p>
      <p>📈 Sistema de Alavancagem automático!</p>
      
      <p><strong>Cadastre-se:</strong> {{referral_link}}</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/51d72aa1d_C92CFAFF-FF7B-45A0-9148-2B1B09CE77A512.png" style="width: 120px; margin: 5px;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/940575a06_7E0EC402-D37F-4C7E-A9AF-9CBAFAEC67B5.png" style="width: 120px; margin: 5px;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/35cd22e8d_22E71172-1469-40C1-91F5-52FB1CEB81B7.png" style="width: 120px; margin: 5px;">
      </div>
    </div>

    <div class="footer">
      <p>Equipe Leilão NoZap</p>
    </div>
  </div>
</body>
</html>`,
      sms: 'Oi {{name}}! 🎯 Seja Licenciado e ganhe V$ quando seus amigos comprarem! Cadastre-se: {{referral_link}}'
    },
    {
      id: 'comparai_introduction',
      name: '🔍 Apresentando o Comparai',
      subject: '🔍 {{name}}, conheça o COMPARAI - Comparação Inteligente!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb, #1e40af); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png" alt="Comparai" style="width: 150px;">
      <h1 style="color: white; margin: 10px 0;">🔍 COMPARAI</h1>
      <p style="color: #dbeafe;">Comparação Inteligente de Preços</p>
    </div>
    
    <div class="content">
      <h2>Olá {{name}}! 👋</h2>
      <p>Conheça o <strong>COMPARAI</strong>, nossa ferramenta EXCLUSIVA que garante que você SEMPRE pague o melhor preço!</p>
      
      <h3>🤖 Como Funciona?</h3>
      <p>✅ Analisamos AUTOMATICAMENTE dezenas de lojas</p>
      <p>✅ Comparamos preços em TEMPO REAL</p>
      <p>✅ Mostramos se você está ECONOMIZANDO</p>
      <p>🛡️ Serviço 100% INDEPENDENTE e IMPARCIAL!</p>
      
      <p style="text-align: center;"><strong>Acesse nossos leilões e veja o Comparai em ação!</strong></p>
    </div>

    <div class="footer">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png" alt="Comparai" style="width: 60px;">
      <p>Equipe Leilão NoZap - Transparência garantida!</p>
    </div>
  </div>
</body>
</html>`,
      sms: 'Oi {{name}}! 🔍 Conheça o COMPARAI - Compare preços e economize! Acesse nossos leilões!'
    },
    {
      id: 'new_auction_alert',
      name: '🔥 Novo Leilão Disponível',
      subject: '🔥 {{name}}, NOVO LEILÃO acabou de abrir!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .valora-balance { background: #1f2937; padding: 25px; text-align: center; margin: 20px 0; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white; margin: 0;">🔥 NOVO LEILÃO ABERTO!</h1>
      <p style="color: #fecaca;">Corre! Estoque Limitado!</p>
    </div>
    
    <div class="content">
      <h2>Oi {{name}}! ⚡</h2>
      <p>Acabou de entrar um <strong>LEILÃO IMPERDÍVEL</strong>!</p>
      
      <div class="valora-balance">
        <p style="color: #d1d5db; margin: 0;">💰 SEU SALDO VALORA PAY:</p>
        <h2 style="color: #1DB24A; font-size: 36px;">V$ {{valora_balance}}</h2>
        <p style="color: #9ca3af;">Use para dar lances e arrematar!</p>
      </div>

      <h3>⚡ Como Funciona:</h3>
      <p><strong>1.</strong> Entre no leilão</p>
      <p><strong>2.</strong> Dê seus lances usando V$ ou adicione saldo</p>
      <p><strong>3.</strong> Arremate e receba em casa!</p>
      
      <p style="text-align: center; margin-top: 30px;">
        <strong>Ainda não é licenciado?</strong><br>
        Ganhe V$ quando seus amigos comprarem!<br>
        <a href="{{referral_link}}">Cadastre-se aqui</a>
      </p>
    </div>

    <div class="footer">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 60px;">
      <p>Equipe Leilão NoZap</p>
    </div>
  </div>
</body>
</html>`,
      sms: 'Oi {{name}}! 🔥 NOVO LEILÃO! Você tem V$ {{valora_balance}} para usar!'
    }
  ],
  licenciado_aplicativo: [
    {
      id: 'congratulations',
      name: '🎉 Parabéns por ser Licenciado!',
      subject: '🎉 {{name}}, parabéns por ser Licenciado Aplicativo!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1DB24A, #16a34a); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 120px;">
      <h1 style="color: white;">🎉 PARABÉNS!</h1>
    </div>
    
    <div class="content">
      <h2>{{name}}, você conseguiu! 🎊</h2>
      <p>Você agora é oficialmente um <strong>Licenciado Aplicativo</strong>!</p>
      
      <h3>💰 O que isso significa:</h3>
      <p>✅ Ganhe 3% em V$ de cada compra dos seus indicados</p>
      <p>✅ Seu link pessoal está ativo</p>
      <p>✅ Use V$ para comprar ou acumule</p>
      
      <p><strong>Seu link:</strong> {{referral_link}}</p>
      
      <p style="margin-top: 30px;">Estamos muito felizes em ter você conosco!</p>
    </div>

    <div class="footer">
      <p>Com orgulho,<br><strong>Equipe Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: 'Parabéns {{name}}! Você é Licenciado Aplicativo! 🎉'
    }
  ],
  licenciado_catalogo: [
    {
      id: 'catalog_welcome',
      name: '📚 Bem-vindo ao Catálogo!',
      subject: '📚 {{name}}, você é agora Licenciado Catálogo!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #eab308, #ca8a04); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 120px;">
      <h1 style="color: white;">📚 LICENCIADO CATÁLOGO!</h1>
    </div>
    
    <div class="content">
      <h2>{{name}}, você subiu de nível! 🚀</h2>
      <p>Agora você tem acesso ao <strong>Catálogo Premium</strong>!</p>
      
      <h3>💰 Seus novos benefícios em V$:</h3>
      <p>✅ Comissão de 5% em V$ (antes 3%!)</p>
      <p>✅ Acesso a produtos exclusivos do catálogo</p>
      <p>✅ Prioridade em novos lançamentos</p>
      <p>✅ Ferramentas avançadas de venda</p>
      
      <div style="background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h4 style="margin: 0; color: #92400e;">💰 Compare os ganhos:</h4>
        <p style="color: #78350f;">R$ 10.000 em vendas:</p>
        <p style="color: #1DB24A; font-weight: bold;">→ ANTES: V$ 300</p>
        <p style="color: #eab308; font-weight: bold;">→ AGORA: V$ 500 (+66%!)</p>
      </div>
      
      <p>Continue compartilhando seu link: {{referral_link}}</p>
    </div>

    <div class="footer">
      <p>Parabéns pelo crescimento!<br><strong>Equipe Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: 'Parabéns {{name}}! 📚 Agora você é Licenciado Catálogo com 5% em V$!'
    },
    {
      id: 'next_level_executive',
      name: '💼 Próximo Nível: Executivo',
      subject: '💼 {{name}}, você está perto de ser EXECUTIVO!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white;">💼 PRÓXIMO NÍVEL</h1>
      <p style="color: #ddd6fe;">Executivo está ao seu alcance!</p>
    </div>
    
    <div class="content">
      <h2>{{name}}, você está ARRASANDO! 🔥</h2>
      <p>Seus resultados como Licenciado Catálogo são impressionantes!</p>
      
      <h3>💼 O que te espera como Executivo:</h3>
      <p>✅ Ganhos exponenciais em V$</p>
      <p>✅ Lidere sua equipe de indicados</p>
      <p>✅ Participe de decisões estratégicas</p>
      <p>✅ Bônus exclusivos em V$</p>
      
      <p>Continue indicando amigos e compartilhando: {{referral_link}}</p>
      
      <p style="margin-top: 30px; font-style: italic; color: #6b7280;">
        "O sucesso é a soma de pequenos esforços repetidos todos os dias."
      </p>
    </div>

    <div class="footer">
      <p>Estamos torcendo por você!<br><strong>Equipe Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '💼 {{name}}, você está perto de ser Executivo! Continue assim!'
    }
  ],
  executivo: [
    {
      id: 'executive_welcome',
      name: '💼 Bem-vindo à Executiva!',
      subject: '💼 {{name}}, você é EXECUTIVO agora!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 120px;">
      <h1 style="color: white;">💼 EXECUTIVO!</h1>
      <p style="color: #ddd6fe;">Você chegou à elite!</p>
    </div>
    
    <div class="content">
      <h2>Parabéns, {{name}}! 🎊</h2>
      <p>Você alcançou o nível <strong>EXECUTIVO</strong>!</p>
      
      <h3>⭐ Seus privilégios:</h3>
      <p>✅ Ganhos exponenciais em V$</p>
      <p>✅ Lidere sua equipe</p>
      <p>✅ Participe de decisões estratégicas</p>
      <p>✅ Mentoria exclusiva</p>
      <p>✅ Eventos VIP</p>
      
      <div style="background: #8b5cf6; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0;">💰 V$ {{valora_balance}}</h3>
        <p style="margin: 5px 0;">Seu saldo atual em Valora Pay</p>
      </div>
      
      <p>Continue multiplicando: {{referral_link}}</p>
    </div>

    <div class="footer">
      <p>Elite Leilão NoZap<br><strong>Equipe de Liderança</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '💼 Parabéns {{name}}! Você é EXECUTIVO! V$ {{valora_balance}}'
    },
    {
      id: 'ceo_recognition',
      name: '👑 CEO reconhece você',
      subject: '👑 {{name}}, mensagem especial do CEO',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1f2937, #111827); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .ceo-message { background: #f9fafb; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; font-style: italic; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #8b5cf6;">👑 MENSAGEM DO CEO</h1>
    </div>
    
    <div class="content">
      <h2>{{name}},</h2>
      
      <div class="ceo-message">
        <p>"Executivos como você são a força motriz do Leilão NoZap.</p>
        <p>Sua dedicação em compartilhar oportunidades com seus amigos e construir um sistema de alavancagem sólido é inspiradora.</p>
        <p>Os V$ que você acumula são reflexo do seu trabalho excepcional.</p>
        <p>Continue liderando. Estamos construindo algo grandioso juntos."</p>
        <p style="text-align: right; margin-top: 20px;"><strong>- CEO, Leilão NoZap</strong></p>
      </div>
      
      <p style="text-align: center; margin-top: 30px;">
        <strong>Seu saldo V$:</strong> {{valora_balance}}<br>
        <strong>Seu link:</strong> {{referral_link}}
      </p>
    </div>

    <div class="footer">
      <p>Com admiração,<br><strong>Diretoria Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '👑 {{name}}, o CEO reconhece seu trabalho! V$ {{valora_balance}}'
    }
  ],
  diretor: [
    {
      id: 'director_elite',
      name: '⭐ Bem-vindo à Diretoria!',
      subject: '⭐ {{name}}, você é DIRETOR agora!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .elite-badge { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 120px;">
      <h1 style="color: white;">⭐ DIRETOR!</h1>
      <p style="color: #fed7aa;">Elite Absoluta</p>
    </div>
    
    <div class="content">
      <h2>{{name}}, VOCÊ CHEGOU AO TOPO! 🎊</h2>
      
      <div class="elite-badge">
        <h2 style="margin: 0; font-size: 32px;">⭐ DIRETOR ⭐</h2>
        <p style="margin: 10px 0;">Elite do Leilão NoZap</p>
        <h3 style="margin: 0;">V$ {{valora_balance}}</h3>
      </div>
      
      <h3>🏆 Seus privilégios de Diretor:</h3>
      <p>✅ Participe de TODAS as decisões estratégicas</p>
      <p>✅ Ganhos ILIMITADOS em V$</p>
      <p>✅ Acesso a produtos antes do lançamento</p>
      <p>✅ Eventos exclusivos para Diretores</p>
      <p>✅ Mentoria direta com a alta gestão</p>
      
      <p style="text-align: center; margin-top: 30px;">
        <strong>Continue liderando:</strong><br>
        {{referral_link}}
      </p>
      
      <p style="margin-top: 30px; font-style: italic; color: #6b7280; text-align: center;">
        "Diretores não seguem o caminho. Eles CRIAM o caminho."
      </p>
    </div>

    <div class="footer">
      <p>Com máximo respeito,<br><strong>Conselho Administrativo</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '⭐ PARABÉNS {{name}}! Você é DIRETOR! Elite absoluta!'
    }
  ],
  ceo: [
    {
      id: 'ceo_power',
      name: '👑 Poder Máximo - CEO',
      subject: '👑 {{name}}, você é o CEO agora!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #1f2937, #111827); border-radius: 10px; overflow: hidden; border: 2px solid #dc2626; }
    .header { background: linear-gradient(135deg, #dc2626, #991b1b); padding: 40px; text-align: center; }
    .content { padding: 40px; color: white; }
    .ceo-crown { font-size: 80px; text-align: center; margin: 20px 0; }
    .power-badge { background: #dc2626; color: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; border: 2px solid #fca5a5; }
    .footer { background: #000; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 150px;">
      <div class="ceo-crown">👑</div>
      <h1 style="color: white; font-size: 36px; margin: 0;">CEO</h1>
      <p style="color: #fca5a5;">PODER MÁXIMO</p>
    </div>
    
    <div class="content">
      <h2>{{name}}, VOCÊ É A LIDERANÇA MÁXIMA! 🔥</h2>
      
      <div class="power-badge">
        <h2 style="margin: 0; font-size: 40px;">👑 CEO 👑</h2>
        <p style="margin: 10px 0;">Comando Total</p>
        <h3 style="margin: 0; font-size: 28px;">V$ {{valora_balance}}</h3>
      </div>
      
      <h3 style="color: #fca5a5;">🔥 Poderes de CEO:</h3>
      <p>✅ CONTROLE TOTAL das operações</p>
      <p>✅ DEFINA as estratégias globais</p>
      <p>✅ GANHOS ILIMITADOS em V$</p>
      <p>✅ ACESSO a TUDO antes de todos</p>
      <p>✅ INFLUÊNCIA máxima nas decisões</p>
      <p>✅ RECONHECIMENTO público</p>
      
      <p style="text-align: center; margin-top: 40px; color: #fca5a5; font-size: 18px;">
        <strong>Você não é mais um participante.</strong><br>
        <strong>Você é o LÍDER.</strong>
      </p>
      
      <p style="text-align: center; margin-top: 30px;">
        {{referral_link}}
      </p>
    </div>

    <div class="footer">
      <p>Com a maior honra,<br><strong>Conselho de Fundadores</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '👑 {{name}} - CEO! PODER MÁXIMO! V$ {{valora_balance}}'
    }
  ],
  conselheiro: [
    {
      id: 'advisor_prestige',
      name: '💎 Elite Absoluta - Conselheiro',
      subject: '💎 {{name}}, você é CONSELHEIRO!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #0e7490, #164e63); border-radius: 10px; overflow: hidden; border: 3px solid #67e8f9; }
    .header { background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 40px; text-align: center; }
    .content { padding: 40px; color: white; }
    .diamond { font-size: 80px; text-align: center; margin: 20px 0; }
    .prestige-badge { background: #06b6d4; color: white; padding: 30px; margin: 20px 0; border-radius: 10px; text-align: center; border: 2px solid #a5f3fc; box-shadow: 0 0 20px #06b6d4; }
    .footer { background: #000; color: #9ca3af; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="diamond">💎</div>
      <h1 style="color: white; font-size: 36px; margin: 0;">CONSELHEIRO</h1>
      <p style="color: #a5f3fc;">Elite Absoluta</p>
    </div>
    
    <div class="content">
      <h2>{{name}}, VOCÊ É A SABEDORIA! 🌟</h2>
      
      <div class="prestige-badge">
        <h2 style="margin: 0; font-size: 40px;">💎 CONSELHEIRO 💎</h2>
        <p style="margin: 10px 0;">Influência Suprema</p>
        <h3 style="margin: 0; font-size: 28px;">V$ {{valora_balance}}</h3>
      </div>
      
      <h3 style="color: #a5f3fc;">🌟 Privilégios de Conselheiro:</h3>
      <p>✅ INFLUENCIE decisões críticas da empresa</p>
      <p>✅ MENTORIA para todos os níveis</p>
      <p>✅ GANHOS ILIMITADOS em V$</p>
      <p>✅ VOZ nas assembleias estratégicas</p>
      <p>✅ RECONHECIMENTO como autoridade máxima</p>
      <p>✅ ACESSO a informações privilegiadas</p>
      
      <p style="text-align: center; margin-top: 40px; color: #a5f3fc; font-size: 18px; font-style: italic;">
        "Conselheiros não seguem tendências.<br>
        Eles CRIAM o futuro."
      </p>
      
      <p style="text-align: center; margin-top: 30px;">
        {{referral_link}}
      </p>
    </div>

    <div class="footer">
      <p>Com reverência máxima,<br><strong>Fundadores do Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '💎 {{name}} é CONSELHEIRO! Elite Absoluta! V$ {{valora_balance}}'
    }
  ],
  fundador: [
    {
      id: 'founder_legend',
      name: '🏆 Lenda Imortal - Fundador',
      subject: '🏆 {{name}}, você é FUNDADOR!',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #78350f, #451a03); border-radius: 10px; overflow: hidden; border: 4px solid #fbbf24; box-shadow: 0 0 30px #fbbf24; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 50px; text-align: center; }
    .content { padding: 40px; color: white; }
    .trophy { font-size: 100px; text-align: center; margin: 20px 0; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    .legend-badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 40px; margin: 20px 0; border-radius: 10px; text-align: center; border: 3px solid #fef3c7; box-shadow: 0 0 30px #f59e0b; }
    .footer { background: #000; color: #fbbf24; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG" style="width: 150px;">
      <div class="trophy">🏆</div>
      <h1 style="color: white; font-size: 42px; margin: 0;">FUNDADOR</h1>
      <p style="color: #fef3c7; font-size: 18px;">LENDA IMORTAL</p>
    </div>
    
    <div class="content">
      <h2 style="font-size: 28px;">{{name}}, VOCÊ É A HISTÓRIA! ⚡</h2>
      
      <div class="legend-badge">
        <h2 style="margin: 0; font-size: 48px;">🏆 FUNDADOR 🏆</h2>
        <p style="margin: 10px 0; font-size: 18px;">Legado Eterno</p>
        <h3 style="margin: 0; font-size: 32px;">V$ {{valora_balance}}</h3>
      </div>
      
      <h3 style="color: #fbbf24; font-size: 22px;">⚡ Status de Fundador:</h3>
      <p style="font-size: 16px;">✅ CRIADOR e VISIONÁRIO do sistema</p>
      <p style="font-size: 16px;">✅ PATRIMÔNIO e LEGADO permanentes</p>
      <p style="font-size: 16px;">✅ GANHOS PERPÉTUOS em V$</p>
      <p style="font-size: 16px;">✅ SEU NOME na história do Leilão NoZap</p>
      <p style="font-size: 16px;">✅ AUTORIDADE MÁXIMA reconhecida</p>
      <p style="font-size: 16px;">✅ IMORTALIDADE no sistema</p>
      
      <div style="background: rgba(251, 191, 36, 0.2); padding: 30px; margin: 30px 0; border-radius: 10px; border: 2px solid #fbbf24;">
        <p style="text-align: center; font-size: 20px; color: #fef3c7; font-style: italic; line-height: 1.8;">
          "Fundadores não apenas participaram da história.<br>
          <strong style="font-size: 24px;">ELES SÃO A HISTÓRIA.</strong><br>
          Seu legado viverá para sempre."
        </p>
      </div>
      
      <p style="text-align: center; margin-top: 40px; font-size: 16px;">
        <strong style="color: #fbbf24;">Seu link eterno:</strong><br>
        {{referral_link}}
      </p>
    </div>

    <div class="footer">
      <p style="font-size: 16px;">Com gratidão eterna,<br><strong style="color: #fbbf24; font-size: 18px;">Toda a Equipe Leilão NoZap</strong></p>
    </div>
  </div>
</body>
</html>`,
      sms: '🏆 {{name}} - FUNDADOR! LENDA IMORTAL! V$ {{valora_balance}}'
    }
  ]
};

export default function MessageDispatcher({ isOpen, onClose, allUsers }) {
  const [selectedLevel, setSelectedLevel] = useState('usuario');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customSMS, setCustomSMS] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const targetUsers = useMemo(() => {
    return allUsers.filter(user => {
      const userLevels = Array.isArray(user.career_levels) 
        ? user.career_levels 
        : (user.career_levels ? [user.career_levels] : ['usuario']);
      
      const primaryLevel = user.primary_career_level || userLevels[0] || 'usuario';
      return primaryLevel === selectedLevel;
    });
  }, [allUsers, selectedLevel]);

  const emailCount = useMemo(() => {
    return targetUsers.filter(u => u.email && u.email.includes('@')).length;
  }, [targetUsers]);

  const smsCount = useMemo(() => {
    return targetUsers.filter(u => u.phone && u.phone.length >= 10).length;
  }, [targetUsers]);

  const availableTemplates = MESSAGE_TEMPLATES[selectedLevel] || [];

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      setCustomSubject(template.subject);
      setCustomBody(template.body);
      setCustomSMS(template.sms);
    }
  };

  const previewUser = useMemo(() => {
    return targetUsers[0] || { 
      full_name: "João Silva", 
      valora_pay_balance: 0,
      referred_by_id: null 
    };
  }, [targetUsers]);

  const previewMessage = useMemo(() => {
    const referrer = previewUser.referred_by_id 
      ? allUsers.find(u => u.id === previewUser.referred_by_id)
      : null;

    const referralLink = referrer && referrer.referral_code
      ? `https://leilaonozap.com?ref=${referrer.referral_code}`
      : 'https://leilaonozap.com';

    return {
      subject: customSubject
        .replace(/\{\{name\}\}/g, previewUser.full_name),
      body: customBody
        .replace(/\{\{name\}\}/g, previewUser.full_name)
        .replace(/\{\{valora_balance\}\}/g, (previewUser.valora_pay_balance || 0).toFixed(2))
        .replace(/\{\{referral_link\}\}/g, referralLink),
      sms: customSMS
        .replace(/\{\{name\}\}/g, previewUser.full_name)
        .replace(/\{\{valora_balance\}\}/g, (previewUser.valora_pay_balance || 0).toFixed(2))
        .replace(/\{\{referral_link\}\}/g, referralLink)
    };
  }, [customSubject, customBody, customSMS, previewUser, allUsers]);

  const handleSend = async () => {
    if (!customSubject || !customBody) {
      toast.error("❌ Preencha assunto e mensagem!");
      return;
    }

    if (!sendEmail && !sendSMS) {
      toast.error("❌ Selecione pelo menos um canal!");
      return;
    }

    if (targetUsers.length === 0) {
      toast.error("❌ Nenhum usuário neste nível!");
      return;
    }

    const emailsToSend = sendEmail ? emailCount : 0;
    const smsToSend = sendSMS ? smsCount : 0;

    const confirmSend = window.confirm(
      `📨 CONFIRMAR ENVIO?\n\n` +
      `👥 Total de destinatários: ${targetUsers.length}\n` +
      `📧 Emails a enviar: ${emailsToSend}\n` +
      `📱 SMS a enviar: ${smsToSend}\n\n` +
      `Nível: ${CAREER_LEVELS.find(l => l.id === selectedLevel)?.name}\n\n` +
      `Deseja continuar?`
    );

    if (!confirmSend) return;

    setIsSending(true);
    try {
      const response = await sendBulkMessages({
        users: targetUsers.map(u => {
          const referrer = u.referred_by_id 
            ? allUsers.find(user => user.id === u.referred_by_id)
            : null;

          return {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            valora_pay_balance: u.valora_pay_balance || 0,
            referral_link: referrer && referrer.referral_code
              ? `https://leilaonozap.com?ref=${referrer.referral_code}`
              : 'https://leilaonozap.com'
          };
        }),
        subject: customSubject,
        body: customBody,
        sms: customSMS,
        sendEmail,
        sendSMS
      });

      if (response.status === 200) {
        toast.success(`✅ Enviado! ${emailsToSend} emails + ${smsToSend} SMS`);
        onClose();
      }
    } catch (error) {
      console.error("❌ Erro:", error);
      toast.error("❌ Erro ao enviar: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Send className="w-5 h-5 mr-2 text-blue-400" />
            📨 Disparador de Mensagens em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">🎯 Público-Alvo</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {CAREER_LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${level.color} text-white text-xs`}>
                          {level.name}
                        </Badge>
                        <span className="text-gray-400">
                          ({targetUsers.length} usuários)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <h4 className="font-semibold text-blue-400 text-sm">Destinatários Selecionados</h4>
                </div>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>👥 Total: <strong className="text-white">{targetUsers.length}</strong> pessoas</li>
                  <li>📧 Com email: <strong className="text-white">{emailCount}</strong></li>
                  <li>📱 Com telefone: <strong className="text-white">{smsCount}</strong></li>
                </ul>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">📝 Template Pronto</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                  <SelectValue placeholder="Escolha um template..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  {availableTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">✉️ Assunto do Email</Label>
              <Textarea
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-2 h-16"
                placeholder="Use {{name}} para o nome da pessoa"
              />
            </div>

            <div>
              <Label className="text-gray-300">📧 Corpo do Email (HTML)</Label>
              <Textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-2 h-48 font-mono text-xs"
                placeholder="Cole o HTML do template..."
              />
              <p className="text-xs text-gray-400 mt-1">
                💡 Use: <code className="bg-gray-700 px-1 rounded">{`{{name}}`}</code>, 
                <code className="bg-gray-700 px-1 rounded mx-1">{`{{valora_balance}}`}</code>, 
                <code className="bg-gray-700 px-1 rounded">{`{{referral_link}}`}</code>
              </p>
            </div>

            <div>
              <Label className="text-gray-300">📱 Mensagem SMS</Label>
              <Textarea
                value={customSMS}
                onChange={(e) => setCustomSMS(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-2 h-24"
                placeholder="Mensagem curta para SMS..."
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Email ({emailCount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className="w-4 h-4"
                />
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">SMS ({smsCount})</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white">📧 Preview Email</h3>
              </div>
              
              <Card className="bg-white text-gray-900">
                <CardContent className="p-4">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Para: {previewUser.email || 'usuario@exemplo.com'}</p>
                    <p className="font-bold text-sm mt-1">{previewMessage.subject}</p>
                  </div>
                  <div 
                    className="text-sm max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: previewMessage.body }}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-green-400" />
                <h3 className="font-semibold text-white">📱 Preview SMS</h3>
              </div>
              
              <div className="bg-green-100 rounded-2xl p-3 text-gray-900 text-sm">
                {previewMessage.sms}
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <h4 className="font-semibold text-green-400">✅ Pronto para Enviar</h4>
              </div>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>👥 {targetUsers.length} destinatários</li>
                <li>📧 {sendEmail ? `${emailCount} emails` : 'Email desativado'}</li>
                <li>📱 {sendSMS ? `${smsCount} SMS` : 'SMS desativado'}</li>
                <li className="text-blue-400 font-bold mt-2">
                  🔗 Links personalizados por licenciado
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} className="bg-gray-700 text-white">
            Cancelar
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || targetUsers.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar {sendEmail ? `${emailCount}📧` : ''} {sendSMS ? `${smsCount}📱` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

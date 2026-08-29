import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import ParceiroApresentacao from '@/components/parceiro/ParceiroApresentacao';

// 🔗 LINK DE VISUALIZAÇÃO — USO INTERNO DA EQUIPE (29/08/2026, pedido do dono)
//
// A apresentação do Parceiro precisava de um endereço que a equipe pudesse mandar
// e a pessoa abrisse: sem baixar arquivo, sem fazer login, sem passar pela porta
// de ciência. É esta página. O conteúdo é o MESMO de /Partners — os dois lados
// montam ParceiroApresentacao, então não existe versão que fica para trás.
//
// Endereços que chegam aqui:
//   /ApresentacaoParceiro   ← a rota
//   /apresentacao           ← apelido curto (ROUTE_ALIASES em src/App.jsx)
//   /apresentacao-parceiro  ← apelido por extenso
//
// ⚠️ O QUE ESTA PÁGINA NÃO FAZ, E É DE PROPÓSITO
// Ela não confere nada. Quem tem o endereço, abre. Foi a escolha do dono para uso
// interno ("praticamente sem controle, só uma URL estável") e está registrada aqui
// para ninguém no futuro achar que é esquecimento e sair "consertando".
//
// O que existe de proteção é só o mínimo que não atrapalha ninguém da equipe:
//   • `noindex, nofollow` — o endereço não entra em buscador. O site não tem
//     robots.txt, então sem esta marca o Google acharia a página sozinho e a
//     captação privada viraria resultado de busca.
//   • nenhum link para cá em menu, rodapé ou botão. Só chega quem recebeu o
//     endereço de alguém.
//
// Se um dia isso precisar virar link para gente de fora (investidor avaliando
// aporte), o caminho é outro: token por pessoa, validade e registro de quem abriu
// — e aí a porta é de servidor, não daqui.
export default function ApresentacaoParceiroPage() {
  const navigate = useNavigate();

  // 🔎 Fora do buscador. O index.html já traz `<meta name="robots" content="index,
  // follow">` para o site inteiro — e é a PRIMEIRA que o buscador lê, então não
  // adianta acrescentar outra depois: a existente é reescrita enquanto esta página
  // está montada e devolvida ao valor original ao sair. Se a marca fosse fixa no
  // index.html, o site todo sairia do Google.
  useEffect(() => {
    const meta = document.head.querySelector('meta[name="robots"]');
    if (!meta) {
      const nova = document.createElement('meta');
      nova.name = 'robots';
      nova.content = 'noindex, nofollow';
      document.head.appendChild(nova);
      return () => nova.remove();
    }
    const anterior = meta.content;
    meta.content = 'noindex, nofollow';
    return () => { meta.content = anterior; };
  }, []);

  // Quem abrir o link e quiser de fato entrar (ver valores, cota, painel) vai pela
  // porta normal — a apresentação não mostra número financeiro nenhum.
  const irParaPorta = () => navigate('/AcessoParceiro');

  return <ParceiroApresentacao onSolicitarAcesso={irParaPorta} />;
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { fmtBR } from '@/lib/money';

// 📦 CRÉDITO EM PRODUTOS (26/09/2026)
//
// Quem fechou a adesão com crédito em produtos (seller_credit_balance) precisa
// VER esse crédito no painel e ter um caminho até a tela de escolha. Antes o
// saldo existia no banco e a única porta era digitar /VendedorEscolherProdutos
// na mão — a Parceira com R$ 5.000 a escolher não tinha como saber.
export default function CreditoProdutosCard({ user }) {
  const navigate = useNavigate();
  const credito = Number(user?.seller_credit_balance) || 0;
  if (!(credito > 0)) return null;
  return (
    <div className="mb-8" data-teste="credito-produtos">
      <div className="relative overflow-hidden rounded-2xl border border-nz-verde/30 bg-nz-verde/10 px-5 py-4 md:px-6 md:py-5 flex flex-col gap-2">
        <Package className="w-6 h-6 text-nz-verde" />
        <div>
          <p className="text-base md:text-lg font-bold leading-snug mb-0.5">
            Você tem <span className="text-nz-verde">R$ {fmtBR(credito)}</span> em produtos para escolher
          </p>
          <p className="text-sm text-nz-tinta-fraca mb-3">
            Faz parte da sua adesão. Escolha os produtos da Loja Virtual quando quiser: eles viram estoque da sua loja.
          </p>
          <button
            type="button"
            onClick={() => navigate('/VendedorEscolherProdutos')}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-nz-verde text-white rounded-full px-4 py-2 hover:bg-nz-verde-escuro transition-colors">
            Escolher meus produtos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

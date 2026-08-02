import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtBR } from "@/lib/money";

// 👀 Modal só de VISUALIZAÇÃO — sem clique em produto, sem carrinho.
// Serve pra mostrar a Loja Virtual sem tirar o usuário do ambiente de pagamento.
export default function VendedorProductPreviewModal({ open, onClose, products = [] }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Produtos da Loja Virtual</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-nz-tinta-fraca -mt-2 mb-2">
          Só pra visualizar — depois do pagamento você escolhe os seus.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ pointerEvents: "none" }}>
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-nz-borda overflow-hidden bg-white">
              <img
                src={p.image_urls?.[0] || "https://via.placeholder.com/200x200?text=Produto"}
                alt=""
                className="w-full aspect-square object-cover"
              />
              <div className="p-2">
                <p className="text-xs text-nz-tinta font-semibold line-clamp-2">{p.description}</p>
                <p className="text-sm text-nz-verde font-bold mt-1">R$ {fmtBR(p.price_catalog || 0)}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
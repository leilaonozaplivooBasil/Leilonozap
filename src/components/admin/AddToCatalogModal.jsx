import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ShoppingCart, Copy } from "lucide-react";

const Product = base44.entities.Product;

export default function AddToCatalogModal({ isOpen, onClose, auction }) {
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && auction) {
      // Pré-preenche o preço com o preço atual do leilão
      setPrice((auction.current_price || auction.starting_price || "").toString());
    }
  }, [isOpen, auction]);

  const handleAddToCatalog = async () => {
    if (!price) {
      toast.error("Digite um preço para o catálogo");
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Preço inválido");
      return;
    }

    setIsLoading(true);
    try {
      // Cria produto com TODOS os dados do leilão
      await Product.create({
        description: auction.title,
        cost_price: auction.starting_price || 0,
        price_catalog: priceValue,
        catalog_active: true,
        image_urls: auction.image_urls || [],
        linked_auctions: [auction.id],
        quantity: 1,
        status: "ESTOQUE"
      });

      toast.success("✅ Anúncio replicado no catálogo!");
      setPrice("");
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar catálogo:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!auction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Copy className="w-5 h-5" />
            Replicar no Catálogo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-500 text-xs uppercase mb-2 font-semibold">Anúncio a Copiar</p>
            {auction.image_urls?.[0] && (
              <img 
                src={auction.image_urls[0]} 
                alt={auction.title}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <p className="text-white font-semibold line-clamp-3">{auction.title}</p>
            <p className="text-gray-400 text-xs mt-2">
              {auction.image_urls?.length || 0} imagens | Será replicado com todos os dados
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block font-semibold">
              Preço de Venda no Catálogo (R$)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="bg-gray-900 border-gray-700 text-white text-lg font-bold"
            />
            <p className="text-gray-500 text-xs mt-2">
              Todos os dados do anúncio (título, descrição, imagens) serão copiados
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddToCatalog}
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading || !price}
          >
            {isLoading ? "Replicando..." : "Replicar no Catálogo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
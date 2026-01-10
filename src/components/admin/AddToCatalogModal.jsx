import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";

const Product = base44.entities.Product;

export default function AddToCatalogModal({ isOpen, onClose, auction }) {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState(auction?.title || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCatalog = async () => {
    if (!price || !description) {
      toast.error("Preencha todos os campos");
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Preço inválido");
      return;
    }

    setIsLoading(true);
    try {
      // Criar produto no catálogo
      await Product.create({
        description,
        cost_price: 0,
        price_catalog: priceValue,
        catalog_active: true,
        image_urls: auction?.image_urls || [],
        linked_auctions: [auction.id]
      });

      toast.success("✅ Produto adicionado ao catálogo!");
      setPrice("");
      setDescription(auction?.title || "");
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar catálogo:", error);
      toast.error("Erro ao adicionar produto: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShoppingCart className="w-5 h-5" />
            Adicionar ao Catálogo
          </DialogTitle>
        </DialogHeader>

        {auction && (
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Leilão Original</p>
              <p className="text-white font-semibold line-clamp-2">{auction.title}</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Descrição para Catálogo
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Como o produto deve aparecer no catálogo..."
                className="bg-gray-900 border-gray-700 text-white h-24"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Preço do Catálogo (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
        )}

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
            disabled={isLoading}
          >
            {isLoading ? "Adicionando..." : "Adicionar ao Catálogo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
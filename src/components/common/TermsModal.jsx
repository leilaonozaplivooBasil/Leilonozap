import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ShieldAlert, Check } from "lucide-react";

export default function TermsModal({ onAccept }) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[2000] p-4">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in-0 zoom-in-95">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-orange-500" />
            <span className="text-xl">Regras Importantes do Leilão NoZap</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <p className="text-lg font-semibold">Ao participar, você está ciente e concorda com o seguinte:</p>
          <ul className="list-disc list-inside space-y-3 pl-2">
            <li>
              <span className="font-bold">Estratégia de Venda:</span> O Leilão NoZap é uma estratégia de venda e não um leilão oficial regido por leiloeiro público.
            </li>
            <li>
              <span className="font-bold">Origem dos Produtos:</span> Trabalhamos com produtos de arremate, devoluções de e-commerce (dentro dos 7 dias) e itens de mostruário. Todos são testados e funcionais.
            </li>
            <li>
              <span className="font-bold">Sem Garantia de Fábrica:</span> Por serem produtos de repasse, eles <span className="underline">não possuem garantia</span> do fabricante. A oportunidade está no preço significativamente abaixo do mercado.
            </li>
            <li>
              <span className="font-bold">Sem Devolução:</span> Uma vez arrematado e pago, o produto é seu. <span className="underline">Não há direito a devolução ou troca</span>, exceto por defeito de funcionamento não descrito.
            </li>
            <li>
              <span className="font-bold">Consumo Inteligente:</span> Nossa proposta é clara: você compra muito mais barato porque a loja não pode vender como novo — e a gente pode.
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
            onClick={onAccept}
          >
            <Check className="w-5 h-5 mr-2" />
            Eu li, entendi e aceito os termos
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const Product = base44.entities.Product;
const CatalogSale = base44.entities.CatalogSale;

export default function CatalogCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip_code: ''
  });

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carrega produto
      if (productId) {
        const prod = await Product.filter({ id: productId });
        if (prod.length > 0) {
          setProduct(prod[0]);
        }
      }

      // Carrega usuário atual
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          address_street: user.address_street || '',
          address_number: user.address_number || '',
          address_complement: user.address_complement || '',
          address_neighborhood: user.address_neighborhood || '',
          address_city: user.address_city || '',
          address_state: user.address_state || '',
          address_zip_code: user.address_zip_code || ''
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const searchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado'); return; }
      setFormData(prev => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state
      }));
      toast.success('Endereço preenchido pelo CEP');
    } catch (e) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0,8);
    if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
    setFormData(prev => ({ ...prev, address_zip_code: v }));
    if (v.replace(/\D/g,'').length === 8) searchCep(v);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckout = async () => {
    // Validação
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!product) {
      toast.error("Produto não encontrado");
      return;
    }

    setIsProcessing(true);
    try {
      const licenseeCode = sessionStorage.getItem('licenseeCode');

      // Busca o ID real do licenciado pelo referral_code
      let licenseeId = null;
      if (licenseeCode) {
        try {
          const licensees = await base44.entities.AppUser.filter({ referral_code: licenseeCode });
          if (licensees && licensees.length > 0) {
            licenseeId = licensees[0].id;
            console.log(`✅ Licenciado encontrado: ${licensees[0].full_name} (ID: ${licenseeId})`);
          }
        } catch (err) {
          console.warn('Erro ao buscar licenciado:', err);
        }
      }

      // Cria registro de venda
      const sale = await CatalogSale.create({
        product_id: product.id,
        product_title: product.description,
        product_image: product.image_urls?.[0] || '',
        sale_price: product.price_catalog,
        total_amount: product.price_catalog,
        buyer_id: currentUser?.id || 'guest',
        buyer_name: formData.name,
        buyer_email: formData.email,
        buyer_phone: formData.phone,
        licensee_id: licenseeId || null, // ✅ ID REAL do licenciado (não o código!)
        referred_by_code: licenseeCode || '', // ✅ Código de referência separado
        status: 'pending_payment'
      });

      toast.success("Pedido criado! Redirecionando para pagamento...");
      
      // Redireciona para página de pagamento/confirmação
      sessionStorage.removeItem('licenseeCode');
      sessionStorage.removeItem('selectedProduct');
      
      setTimeout(() => {
        navigate(createPageUrl("Catalog"));
      }, 2000);

    } catch (error) {
      console.error("Erro ao criar venda:", error);
      toast.error("Erro ao processar pedido");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => navigate(createPageUrl("Catalog"))}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-red-400">Produto não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          onClick={() => navigate(createPageUrl("Catalog"))}
          variant="outline"
          className="mb-6 border-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Catálogo
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resumo do Produto */}
          <Card className="bg-gray-800 border-gray-700 h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="text-green-400">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.image_urls?.[0] && (
                <img
                  src={product.image_urls[0]}
                  alt={product.description}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg">{product.description}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Estoque: {product.quantity || 0} un.
                </p>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Preço Unitário</span>
                  <span className="text-white font-semibold">R$ {product.price_catalog?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-green-400 font-semibold">Total</span>
                  <span className="text-2xl font-bold text-green-400">
                    R$ {product.price_catalog?.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Confirmar Compra
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Formulário */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-green-400">Dados da Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-gray-300">Nome Completo *</Label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Email *</Label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Telefone *</Label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-300">Rua</Label>
                  <Input
                    name="address_street"
                    value={formData.address_street}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Número</Label>
                  <Input
                    name="address_number"
                    value={formData.address_number}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Complemento</Label>
                  <Input
                    name="address_complement"
                    value={formData.address_complement}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-300">Bairro</Label>
                  <Input
                    name="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Cidade</Label>
                  <Input
                    name="address_city"
                    value={formData.address_city}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">UF</Label>
                  <Input
                    name="address_state"
                    value={formData.address_state}
                    onChange={handleInputChange}
                    maxLength="2"
                    className="bg-gray-700 border-gray-600 text-white mt-1 uppercase"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-300">CEP</Label>
                  <Input
                     name="address_zip_code"
                     value={formData.address_zip_code}
                     onChange={handleCepChange}
                     placeholder="00000-000"
                     maxLength={9}
                     className="bg-gray-700 border-gray-600 text-white mt-1"
                   />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
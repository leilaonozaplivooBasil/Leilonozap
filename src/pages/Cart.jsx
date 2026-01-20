import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Loader2, 
  Truck, 
  MapPin,
  Store,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [coupon, setCoupon] = useState('');
  const [observation, setObservation] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    const loadUserData = async () => {
      const savedCart = localStorage.getItem('catalogCart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }

      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // Tenta buscar dados mais completos do AppUser
        try {
          const appUsers = await base44.entities.AppUser.filter({ id: user.id });
          if (appUsers && appUsers.length > 0) {
            const fullUser = appUsers[0];
            setFormData(prev => ({
              ...prev,
              name: fullUser.full_name || user.full_name || '',
              phone: fullUser.phone || user.phone || '',
              email: fullUser.email || user.email || '',
              cpf: fullUser.cpf || user.cpf || '',
              cep: fullUser.address_zip_code || user.address_zip_code || '',
              street: fullUser.address_street || user.address_street || '',
              number: fullUser.address_number || user.address_number || '',
              complement: fullUser.address_complement || user.address_complement || '',
              neighborhood: fullUser.address_neighborhood || user.address_neighborhood || '',
              city: fullUser.address_city || user.address_city || '',
              state: fullUser.address_state || user.address_state || ''
            }));
          } else {
            // Fallback para dados do localStorage
            setFormData(prev => ({
              ...prev,
              name: user.full_name || '',
              phone: user.phone || '',
              email: user.email || '',
              cpf: user.cpf || '',
              cep: user.address_zip_code || '',
              street: user.address_street || '',
              number: user.address_number || '',
              complement: user.address_complement || '',
              neighborhood: user.address_neighborhood || '',
              city: user.address_city || '',
              state: user.address_state || ''
            }));
          }
        } catch (error) {
          console.debug('Erro ao buscar dados do AppUser:', error);
          // Fallback para dados do localStorage
          setFormData(prev => ({
            ...prev,
            name: user.full_name || '',
            phone: user.phone || '',
            email: user.email || '',
            cpf: user.cpf || '',
            cep: user.address_zip_code || '',
            street: user.address_street || '',
            number: user.address_number || '',
            complement: user.address_complement || '',
            neighborhood: user.address_neighborhood || '',
            city: user.address_city || '',
            state: user.address_state || ''
          }));
        }
      }
    };

    loadUserData();
  }, []);

  const updateCart = (newCart) => {
    setCartItems(newCart);
    localStorage.setItem('catalogCart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (productId) => {
    const newCart = cartItems.filter(item => item.id !== productId);
    updateCart(newCart);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const newCart = cartItems.map(item => {
      if (item.id === productId) {
        const maxQty = item.availableStock || 999;
        if (newQuantity > maxQty) {
          toast.error(`Apenas ${maxQty} unidades disponíveis`);
          return { ...item, quantity: maxQty };
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price_catalog || item.selling_price_wholesale || 0;
      return total + (price * (item.quantity || 1));
    }, 0);
  };

  const searchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    setFormData(prev => ({ ...prev, cep: value }));
    if (value.replace(/\D/g, '').length === 8) {
      searchCep(value);
    }
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    // Validações
    if (!formData.name.trim()) {
      toast.error('Preencha seu nome');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Preencha seu telefone');
      return;
    }
    if (!formData.cpf.trim()) {
      toast.error('Preencha seu CPF');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Preencha seu email');
      return;
    }

    if (deliveryMethod === 'delivery') {
      if (!formData.cep.trim() || !formData.street.trim() || !formData.number.trim() || !formData.city.trim()) {
        toast.error('Preencha o endereço completo para entrega');
        return;
      }
    }

    setIsProcessing(true);
    
    try {
      const userData = {
        id: currentUser?.id,
        full_name: formData.name,
        email: formData.email || currentUser?.email,
        phone: formData.phone,
        cpf: formData.cpf
      };

      console.log('Enviando para MP:', { cart_items: cartItems, user_data: userData });

      const response = await base44.functions.invoke('createMPCartPreference', {
        cart_items: cartItems,
        user_data: userData
      });

      console.log('Resposta MP:', response);

      if (response?.error) {
        toast.error(response.error);
        setIsProcessing(false);
        return;
      }

      if (response?.init_point) {
        window.location.href = response.init_point;
      } else {
        toast.error('Erro ao gerar link de pagamento');
        console.error('Resposta sem init_point:', response);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de negociar sobre meu pedido do catálogo.');
    window.open(`https://wa.me/5521999999999?text=${message}`, '_blank');
  };

  const states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Catalog'))}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Finalizar Pedido</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Formulários */}
          <div className="space-y-4">
            
            {/* Seção 1 - Seus Dados */}
            <Card className="bg-gray-800 border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-white">Seus dados</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Nome</Label>
                  <Input
                    placeholder="Informe o seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm">Celular</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-md px-3 text-gray-300 text-sm h-11">
                        <span>BR</span>
                        <span>+55</span>
                      </div>
                      <Input
                        placeholder="Telefone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 flex-1 h-11"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                      maxLength={14}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Email</Label>
                  <Input
                    type="email"
                    placeholder="seu.email@provedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                  />
                </div>
              </div>
            </Card>

            {/* Seção 2 - Forma de Entrega */}
            <Card className="bg-gray-800 border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-semibold text-white">Como gostaria de receber o pedido</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Escolha a forma de entrega</Label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1.5 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="delivery" className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Entrega em domicílio
                        </div>
                      </SelectItem>
                      <SelectItem value="pickup" className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          Retirada na Loja
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliveryMethod === 'pickup' && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-gray-300 text-sm font-medium">Endereço para retirada:</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Estrada do Pontal, 6500 - Recreio dos Bandeirantes, Rio de Janeiro - RJ, 22790877
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">CEP</Label>
                        <Input
                          placeholder="00000-000"
                          value={formData.cep}
                          onChange={handleCepChange}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                          maxLength={9}
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Número</Label>
                        <Input
                          placeholder="Número"
                          value={formData.number}
                          onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300 text-sm">Endereço</Label>
                      <Input
                        placeholder="Nome da rua ou avenida"
                        value={formData.street}
                        onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">Bairro</Label>
                        <Input
                          placeholder="Bairro"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Complemento</Label>
                        <Input
                          placeholder="Complemento"
                          value={formData.complement}
                          onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300 text-sm">Cidade</Label>
                        <Input
                          placeholder="Cidade"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 mt-1.5 h-11"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Estado</Label>
                        <Select 
                          value={formData.state} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1.5 h-11">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                            {states.map(state => (
                              <SelectItem key={state} value={state} className="text-white hover:bg-gray-700">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Banner WhatsApp */}
                <div 
                  onClick={openWhatsApp}
                  className="bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-600/30 rounded-lg p-4 cursor-pointer hover:from-green-600/30 transition-all"
                >
                  <p className="text-green-400 text-sm">
                    <span className="font-semibold">A gente adora negociar!</span>{' '}
                    <span className="text-green-300">
                      Chama no Zap que a gente conversa sobre tudo — inclusive o frete.
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Coluna Direita - Resumo do Pedido */}
          <div className="space-y-4">
            {/* Seu Pedido */}
            <Card className="bg-gray-800 border-gray-700 border-2 border-green-600/30 p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">🛒</span>
                Seu pedido
              </h2>

              {cartItems.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Seu carrinho está vazio</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const price = item.price_catalog || item.selling_price_wholesale || 0;
                      const imageUrl = item.image_urls?.[0] || 'https://via.placeholder.com/80';
                      
                      return (
                        <div key={item.id} className="flex gap-4 p-4 bg-gray-700/40 rounded-xl border border-gray-600/50">
                          <img
                            src={imageUrl}
                            alt={item.description}
                            className="w-28 h-28 object-cover rounded-xl bg-gray-700"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="text-white font-medium line-clamp-2">
                                {item.description}
                              </h4>
                              <p className="text-green-400 font-bold text-lg mt-2">
                                R$ {price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-gray-600 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-white text-base w-10 text-center font-bold">{item.quantity || 1}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                  className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-600 pt-6 mt-6 space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-400">Total de itens ({cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)} itens)</span>
                      <span className="text-white font-medium">R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-400">Valor do frete</span>
                      <span className="text-green-400 font-medium">A combinar</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-600">
                      <span className="text-white">Valor total</span>
                      <span className="text-green-400">R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Cupom e Observação lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aplicar Cupom */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-medium mb-3">Aplicar cupom</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Insira o cupom aqui"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 flex-1 h-10"
                  />
                  <Button 
                    className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white h-10"
                  >
                    Aplicar
                  </Button>
                </div>
              </Card>

              {/* Observação */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-white font-medium mb-3">Adicionar uma observação</h3>
                <textarea
                  placeholder="Observações sobre o pedido"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white placeholder:text-gray-500 min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </Card>
            </div>

            {/* Botão Enviar Pedido */}
            <Button
              onClick={handleCheckout}
              disabled={isProcessing || cartItems.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-bold rounded-full disabled:opacity-50 shadow-lg shadow-green-600/30"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'PAGAR AGORA'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
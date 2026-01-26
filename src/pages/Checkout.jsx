import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
    const [auction, setAuction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressComplement, setAddressComplement] = useState('');
    const [addressNeighborhood, setAddressNeighborhood] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [addressZip, setAddressZip] = useState('');
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const navigate = useNavigate();

    const searchCep = async (cep) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        setIsLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (data.erro) { toast.error('CEP não encontrado'); return; }
            setAddressStreet(prev => data.logradouro || prev);
            setAddressNeighborhood(prev => data.bairro || prev);
            setAddressCity(prev => data.localidade || prev);
            setAddressState(prev => data.uf || prev);
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
        setAddressZip(v);
        if (v.replace(/\D/g,'').length === 8) searchCep(v);
    };

    const [pixData, setPixData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCreateAsaasPayment = async () => {
         if (!lastName || lastName.trim() === '') {
             toast.error('Por favor, preencha seu sobrenome');
             return;
         }

         if (!phone || phone.trim() === '') {
             toast.error('Telefone é obrigatório para pagamento');
             return;
         }

         if (!cpf || cpf.trim() === '') {
             toast.error('CPF é obrigatório para pagamento');
             return;
         }

         if (!addressStreet || addressStreet.trim() === '') {
             toast.error('Endereço é obrigatório para entrega');
             return;
         }

         if (!addressNumber || addressNumber.trim() === '') {
             toast.error('Número do endereço é obrigatório');
             return;
         }

         if (!addressCity || addressCity.trim() === '') {
             toast.error('Cidade é obrigatória');
             return;
         }

         if (!addressState || addressState.trim() === '') {
             toast.error('Estado é obrigatório');
             return;
         }

         if (!addressZip || addressZip.trim() === '') {
             toast.error('CEP é obrigatório');
             return;
         }

         if (!addressNeighborhood || addressNeighborhood.trim() === '') {
             toast.error('Bairro é obrigatório');
             return;
         }

         if (!auction) {
             toast.error('Leilão não encontrado');
             return;
         }

         setIsProcessing(true);
         toast.loading('Gerando pagamento...', { id: 'checkout-loading' });

         try {
             const savedUserJSON = localStorage.getItem('currentUser');
             const savedUser = JSON.parse(savedUserJSON);

             console.log('🔄 Criando pagamento ASAAS para leilão:', auction.id);

             const paymentResponse = await base44.functions.invoke('createAsaasPayment', {
                 auction_id: auction.id,
                 buyer_name: `${firstName.trim()} ${lastName.trim()}`,
                 buyer_email: email.trim(),
                 buyer_cpf: cpf.trim(),
                 buyer_phone: phone.trim(),
                 amount: auction.current_price,
                 billing_type: 'PIX',
                 description: `Arremate - ${auction.title}`
             });

             toast.dismiss('checkout-loading');

             if (paymentResponse?.data?.success) {
                 setPixData(paymentResponse.data);
                 toast.success('✅ PIX gerado! Escaneie o QR Code para pagar.');
             } else {
                 toast.error(paymentResponse?.data?.error || 'Erro ao gerar pagamento');
             }

         } catch (error) {
             console.error('Erro:', error);
             toast.dismiss('checkout-loading');
             toast.error('Erro ao criar pagamento');
         } finally {
             setIsProcessing(false);
         }
     };

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUserJSON = localStorage.getItem('currentUser');
                if (!savedUserJSON) {
                    toast.error('Faça login para continuar');
                    navigate(createPageUrl('Home'));
                    return;
                }
                const savedUser = JSON.parse(savedUserJSON);
                setCurrentUser(savedUser);

                const urlParams = new URLSearchParams(window.location.search);
                const auctionId = urlParams.get('auction_id');

                if (!auctionId) {
                    toast.error('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                const auctions = await base44.entities.Auction.filter({ id: auctionId });
                if (auctions.length === 0) {
                    toast.error('Leilão não encontrado');
                    navigate(createPageUrl('MyWinnings'));
                    return;
                }

                setAuction(auctions[0]);
                setFirstName(savedUser.full_name ? savedUser.full_name.split(' ')[0] : '');
                setLastName(savedUser.full_name ? savedUser.full_name.split(' ').slice(1).join(' ') : '');
                setEmail(savedUser.email || '');
                setPhone(savedUser.phone || '');
                setCpf(savedUser.cpf || '');
                setAddressStreet(savedUser.address_street || '');
                setAddressNumber(savedUser.address_number || '');
                setAddressComplement(savedUser.address_complement || '');
                setAddressNeighborhood(savedUser.address_neighborhood || '');
                setAddressCity(savedUser.address_city || '');
                setAddressState(savedUser.address_state || '');
                setAddressZip(savedUser.address_zip_code || '');

            } catch (error) {
                console.error('Erro:', error);
                toast.error('Erro ao carregar dados');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);



    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            </div>
        );
    }

    if (!auction) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Finalizar Pagamento</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumo do Pedido */}
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white">Resumo do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auction.image_urls && auction.image_urls[0] && (
                                    <img 
                                        src={auction.image_urls[0]} 
                                        alt={auction.title}
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                )}
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{auction.title}</h3>
                                    <p className="text-gray-400 mt-2">{auction.description}</p>
                                </div>
                                <div className="border-t border-gray-700 pt-4">
                                    <div className="flex justify-between text-lg">
                                        <span className="text-gray-300">Valor do Arremate:</span>
                                        <span className="text-green-400 font-bold">
                                            R$ {auction.current_price.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Método de Pagamento */}
                     <Card className="bg-gray-800 border-gray-700">
                         <CardHeader>
                             <CardTitle className="text-white">Finalizar Pagamento</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {/* Campo Nome */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Primeiro Nome *
                                 </label>
                                 <input
                                     type="text"
                                     value={firstName}
                                     onChange={(e) => setFirstName(e.target.value)}
                                     placeholder="Digite seu primeiro nome"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Campo Sobrenome */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Sobrenome *
                                 </label>
                                 <input
                                     type="text"
                                     value={lastName}
                                     onChange={(e) => setLastName(e.target.value)}
                                     placeholder="Digite seu sobrenome"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Campo Email */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Email *
                                 </label>
                                 <input
                                     type="email"
                                     value={email}
                                     onChange={(e) => setEmail(e.target.value)}
                                     placeholder="seu@email.com"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Campo Telefone */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     Telefone *
                                 </label>
                                 <input
                                     type="tel"
                                     value={phone}
                                     onChange={(e) => setPhone(e.target.value)}
                                     placeholder="(11) 99999-9999"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* Campo CPF */}
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">
                                     CPF *
                                 </label>
                                 <input
                                     type="text"
                                     value={cpf}
                                     onChange={(e) => setCpf(e.target.value)}
                                     placeholder="000.000.000-00"
                                     className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                     required
                                 />
                             </div>

                             {/* SEÇÃO DE ENDEREÇO */}
                             <div className="border-t border-gray-600 pt-4 mt-4">
                                 <h3 className="text-lg font-semibold text-white mb-4">Endereço de Entrega *</h3>

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2">
                                         Logradouro *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressStreet}
                                         onChange={(e) => setAddressStreet(e.target.value)}
                                         placeholder="Rua, Avenida, etc"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-3 mt-3">
                                     <div>
                                         <label className="block text-sm font-medium text-gray-300 mb-2">
                                             Número *
                                         </label>
                                         <input
                                             type="text"
                                             value={addressNumber}
                                             onChange={(e) => setAddressNumber(e.target.value)}
                                             placeholder="123"
                                             className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                             required
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-gray-300 mb-2">
                                             Complemento
                                         </label>
                                         <input
                                             type="text"
                                             value={addressComplement}
                                             onChange={(e) => setAddressComplement(e.target.value)}
                                             placeholder="Apto, Bloco, etc"
                                             className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2 mt-3">
                                         Bairro *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressNeighborhood}
                                         onChange={(e) => setAddressNeighborhood(e.target.value)}
                                         placeholder="Digite o bairro"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>

                                 <div className="grid grid-cols-2 gap-3 mt-3">
                                     <div>
                                         <label className="block text-sm font-medium text-gray-300 mb-2">
                                             Cidade *
                                         </label>
                                         <input
                                             type="text"
                                             value={addressCity}
                                             onChange={(e) => setAddressCity(e.target.value)}
                                             placeholder="São Paulo"
                                             className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                             required
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-gray-300 mb-2">
                                             Estado *
                                         </label>
                                         <input
                                             type="text"
                                             value={addressState}
                                             onChange={(e) => setAddressState(e.target.value)}
                                             placeholder="SP"
                                             maxLength="2"
                                             className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                             required
                                         />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-sm font-medium text-gray-300 mb-2 mt-3">
                                         CEP *
                                     </label>
                                     <input
                                         type="text"
                                         value={addressZip}
                                         onChange={(e) => setAddressZip(e.target.value)}
                                         placeholder="00000-000"
                                         className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                                         required
                                     />
                                 </div>
                             </div>

                             {/* QR Code PIX */}
                             {pixData ? (
                                 <div className="space-y-4 border-t border-gray-600 pt-4">
                                     <h3 className="text-lg font-bold text-green-400 text-center">💚 Pague com PIX</h3>
                                     <div className="bg-white rounded-lg p-4">
                                         <img 
                                             src={pixData.pix_qr_code} 
                                             alt="QR Code PIX" 
                                             className="w-64 h-64 mx-auto"
                                         />
                                     </div>
                                     <button
                                         onClick={() => {
                                             navigator.clipboard.writeText(pixData.pix_payload);
                                             toast.success('Código PIX copiado!');
                                         }}
                                         className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg"
                                     >
                                         📋 Copiar Código PIX
                                     </button>
                                     <div className="bg-gray-700 rounded-lg p-3">
                                         <p className="text-xs text-gray-400 mb-2">Código PIX (Copia e Cola):</p>
                                         <p className="text-xs text-white font-mono break-all">{pixData.pix_payload}</p>
                                     </div>
                                     <button
                                         onClick={() => navigate(createPageUrl('MyWinnings'))}
                                         className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
                                     >
                                         Ver Meus Arremates
                                     </button>
                                 </div>
                             ) : (
                                 <>
                                     <div className="border-t border-gray-600 pt-4 mb-4">
                                         <div className="bg-green-600/10 rounded-lg p-3 border border-green-500/30">
                                             <p className="text-green-400 font-semibold text-center">💚 Pagamento via PIX</p>
                                             <p className="text-gray-400 text-xs text-center mt-1">Aprovação imediata</p>
                                         </div>
                                     </div>

                                     <div className="space-y-3">
                                         <button
                                             onClick={handleCreateAsaasPayment}
                                             disabled={isProcessing || !firstName || firstName.trim() === '' || !lastName || lastName.trim() === '' || !email || email.trim() === '' || !phone || phone.trim() === '' || !cpf || cpf.trim() === '' || !addressStreet || addressStreet.trim() === '' || !addressNumber || addressNumber.trim() === '' || !addressNeighborhood || addressNeighborhood.trim() === '' || !addressCity || addressCity.trim() === '' || !addressState || addressState.trim() === '' || !addressZip || addressZip.trim() === ''}
                                             className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                         >
                                             {isProcessing ? (
                                                 <Loader2 className="w-5 h-5 animate-spin" />
                                             ) : (
                                                 <>
                                                     <ShoppingCart className="w-5 h-5" />
                                                     Gerar PIX
                                                 </>
                                             )}
                                         </button>
                                         {(!firstName || firstName.trim() === '' || !lastName || lastName.trim() === '' || !email || email.trim() === '' || !phone || phone.trim() === '' || !cpf || cpf.trim() === '' || !addressStreet || addressStreet.trim() === '' || !addressNumber || addressNumber.trim() === '' || !addressNeighborhood || addressNeighborhood.trim() === '' || !addressCity || addressCity.trim() === '' || !addressState || addressState.trim() === '' || !addressZip || addressZip.trim() === '') && (
                                             <p className="text-xs text-yellow-400">Preencha todos os campos obrigatórios</p>
                                         )}
                                     </div>

                                     <p className="text-xs text-gray-500 text-center mt-4">
                                        Pagamento seguro via ASAAS
                                     </p>
                                 </>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
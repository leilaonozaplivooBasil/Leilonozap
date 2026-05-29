import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const Product = base44.entities.Product;
const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const UploadFile = (params) => base44.integrations.Core.UploadFile(params);
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save, Image, Edit, Package } from 'lucide-react';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export default function EditCatalogProduct() {
    const navigate = useNavigate();
    const location = useLocation();
    const productId = new URLSearchParams(location.search).get('id');

    const [product, setProduct] = useState(null);
    const [formData, setFormData] = useState({
      description: "",
      cost_price: "",
      price_catalog: "",
      quantity: 1,
      status: "ESTOQUE",
      catalog_active: false
    });
    const [imageUrls, setImageUrls] = useState([]);
    const [linkedAuctions, setLinkedAuctions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fileInputRef = useRef(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        
        if (!productId) {
            navigate(createPageUrl("Catalog"), { replace: true });
            return;
        }
        
        try {
            let userFound = null;
            const savedUserJSON = localStorage.getItem('currentUser');
            if (savedUserJSON) {
                userFound = JSON.parse(savedUserJSON);
            } else {
                userFound = await User.me();
            }

            if (userFound?.role !== 'admin' && userFound?.role !== 'super_admin') {
                 alert("Acesso negado. Apenas administradores podem editar produtos.");
                 navigate(createPageUrl("Catalog"), { replace: true });
                 return;
            }

            const products = await Product.filter({ id: productId });
            if (products.length === 0) {
                alert("Produto não encontrado.");
                navigate(createPageUrl("Catalog"));
                return;
            }
            
            const currentProduct = products[0];
            setProduct(currentProduct);
            setImageUrls(currentProduct.image_urls || []);
            
            setFormData({
              description: currentProduct.description || "",
              cost_price: currentProduct.cost_price || "",
              price_catalog: currentProduct.price_catalog || "",
              quantity: currentProduct.quantity || 1,
              status: currentProduct.status || "ESTOQUE",
              catalog_active: currentProduct.catalog_active || false
            });

            // Carrega leilões vinculados
            if (currentProduct.linked_auctions && currentProduct.linked_auctions.length > 0) {
                const auctions = await Promise.all(
                    currentProduct.linked_auctions.map(id => Auction.filter({ id }))
                );
                setLinkedAuctions(auctions.flat().filter(a => a));
            }

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            alert("Erro ao carregar dados. Verifique o console.");
            navigate(createPageUrl("Catalog"));
        } finally {
            setIsLoading(false);
        }
    }, [productId, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = reorder(imageUrls, result.source.index, result.destination.index);
        setImageUrls(items);
    };

    const handleRemoveImage = (indexToRemove) => {
        setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAddImages = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        const uploadedUrls = [];
        
        for (const file of files) {
            try {
                const result = await UploadFile({ file });
                if(result?.file_url) {
                    uploadedUrls.push(result.file_url);
                }
            } catch (error) {
                console.error("Falha no upload do arquivo:", file.name, error);
                alert(`Falha ao enviar a imagem: ${file.name}`);
            }
        }
        
        setImageUrls(prev => [...prev, ...uploadedUrls]);
        setIsUploading(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const updatePayload = {
                description: formData.description,
                cost_price: parseFloat(formData.cost_price) || 0,
                price_catalog: parseFloat(formData.price_catalog) || 0,
                quantity: parseInt(formData.quantity) || 1,
                status: formData.status,
                catalog_active: formData.catalog_active,
                image_urls: imageUrls
            };
            
            await Product.update(productId, updatePayload);
            
            setIsSaving(false);
            alert("✅ Produto atualizado com sucesso!");
            navigate(createPageUrl("Catalog"), { replace: true });
            
        } catch (error) {
            console.error("Erro ao salvar alterações:", error);
            alert("❌ Erro ao salvar alterações. Tente novamente.");
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!window.confirm("Tem certeza que deseja DELETAR este produto? Esta ação é irreversível.")) {
            return;
        }

        setIsDeleting(true);
        try {
            await Product.delete(productId);
            
            setIsDeleting(false);
            alert("✅ Produto excluído com sucesso!");
            navigate(createPageUrl("Catalog"), { replace: true });
            
        } catch (error) {
            console.error("Erro ao deletar produto:", error);
            alert("❌ Erro ao deletar o produto. Tente novamente.");
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-gray-500" />
          </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => navigate(createPageUrl("Catalog"))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-800 hidden sm:block">
                        Editar Produto
                    </h1>
                     <Button onClick={handleSaveChanges} disabled={isSaving || isUploading || isDeleting}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>

                {/* FOTOS DO PRODUTO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Image className="w-5 h-5 text-gray-600" />
                           Fotos do Produto
                        </CardTitle>
                        <p className="text-sm text-gray-500">Arraste as fotos para reordenar. A primeira foto será a capa.</p>
                    </CardHeader>
                    <CardContent>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="image-list" direction="horizontal">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6"
                                    >
                                        {imageUrls.map((url, index) => (
                                            <Draggable key={url + index} draggableId={url + index} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`relative group border-2 rounded-lg aspect-square overflow-hidden shadow-sm ${snapshot.isDragging ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}`}
                                                    >
                                                        <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                                                            {index === 0 ? 'Capa' : index + 1}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="destructive" size="icon" className="w-7 h-7" onClick={() => handleRemoveImage(index)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <div {...provided.dragHandleProps} className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-white/80 p-1 rounded">
                                                            <GripVertical className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        
                        <div className="mt-6 flex justify-center">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleAddImages}
                                className="hidden"
                            />
                            <Button 
                                variant="outline" 
                                className="w-full md:w-auto"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || isSaving || isDeleting}
                            >
                                {isUploading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Adicionar Fotos</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* DETALHES DO PRODUTO */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-gray-600" />
                      Detalhes do Produto
                    </CardTitle>
                    <p className="text-sm text-gray-500">Ajuste as informações e valores do produto.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="description">Descrição do Produto</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} className="mt-1 min-h-[120px]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
                        <Input id="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={(e) => handleInputChange('cost_price', e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="price_catalog">Preço Catálogo (R$)</Label>
                        <Input id="price_catalog" type="number" step="0.01" value={formData.price_catalog} onChange={(e) => handleInputChange('price_catalog', e.target.value)} className="mt-1" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="quantity">Quantidade</Label>
                        <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ESTOQUE">📦 Estoque</SelectItem>
                            <SelectItem value="VENDIDO PIX">💸 Vendido PIX</SelectItem>
                            <SelectItem value="VENDIDO DINHEIRO">💵 Vendido Dinheiro</SelectItem>
                            <SelectItem value="CONSERTO">🔧 Conserto</SelectItem>
                            <SelectItem value="BRINDE VENDEDOR">🎁 Brinde Vendedor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="catalog_active" 
                        checked={formData.catalog_active} 
                        onCheckedChange={(checked) => handleInputChange('catalog_active', checked)}
                      />
                      <Label htmlFor="catalog_active" className="text-sm font-medium leading-none cursor-pointer">
                        ✅ Ativo no Catálogo
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* LEILÕES VINCULADOS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="w-5 h-5 text-gray-600" />
                           Leilões Vinculados
                        </CardTitle>
                        <p className="text-sm text-gray-500">Leilões criados a partir deste produto.</p>
                    </CardHeader>
                    <CardContent>
                        {linkedAuctions && linkedAuctions.length > 0 ? (
                            <div className="space-y-2">
                                {linkedAuctions.map((auction) => (
                                    <div key={auction.id} className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800">{auction.title}</p>
                                            <p className="text-gray-500 text-sm">Status: <span className={auction.status === 'active' ? 'text-green-600' : 'text-gray-600'}>{auction.status}</span></p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(createPageUrl("EditAuction") + `?id=${auction.id}`)}
                                        >
                                            Editar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Nenhum leilão vinculado a este produto.</p>
                        )}
                    </CardContent>
                </Card>

                {/* EXCLUIR PRODUTO */}
                <Card className="border-red-400 bg-red-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <Trash2 className="w-5 h-5" />
                            Excluir Produto
                        </CardTitle>
                        <p className="text-sm text-red-600">
                            Esta ação excluirá permanentemente o produto e todos os dados associados. Esta ação é irreversível.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteProduct}
                            disabled={isDeleting || isSaving || isUploading}
                            className="w-full"
                        >
                            {isDeleting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo...</>
                            ) : (
                                <><Trash2 className="w-4 h-4 mr-2" /> Excluir Produto Permanentemente</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
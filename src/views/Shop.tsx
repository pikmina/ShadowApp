import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2, Edit2, Save, X, Search, ShieldAlert } from "lucide-react";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";


export default function Shop() {
  const { user, dbUser } = useAuth();
  const role = dbUser?.role;
  const { data: offers, mutate: mutateOffers } = useSWR(user ? "/api/shop/offers" : null, fetcher);
  const { data: elements } = useSWR(user ? "/api/admin/elements" : null, fetcher);
  const { data: characters } = useSWR(role && user ? "/api/admin/characters" : null, fetcher);

  const [activeTab, setActiveTab] = useState("store");
  
  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [checkoutCharacter, setCheckoutCharacter] = useState<string>("");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Admin state
  const [editingOffer, setEditingOffer] = useState<any | null>(null);

  const isAdmin = role === 'moderator' || role === 'superadmin';

  const addToCart = (offer: any, element: any, currency: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.offerId === offer.id && item.selectedCurrency === currency);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { offerId: offer.id, offer, element, quantity: 1, selectedCurrency: currency }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      copy[index].quantity += delta;
      if (copy[index].quantity <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      return copy;
    });
  };

  const totalExp = cart.reduce((sum, item) => sum + (item.selectedCurrency === 'exp' ? item.offer.prices.find((p: any) => p.currency === 'exp').amount * item.quantity : 0), 0);
  const totalYen = cart.reduce((sum, item) => sum + (item.selectedCurrency === 'yen' ? item.offer.prices.find((p: any) => p.currency === 'yen').amount * item.quantity : 0), 0);

  const handleCheckout = async () => {
    if (!isAdmin) {
      alert("Solo los moderadores pueden procesar la compra.");
      return;
    }
    if (!checkoutCharacter) {
      setCheckoutError("Selecciona un personaje.");
      return;
    }

    try {
      setCheckoutError("");
      const res = await apiFetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(checkoutCharacter, 10),
          cartItems: cart.map(c => ({
            offerId: c.offerId,
            quantity: c.quantity,
            selectedCurrency: c.selectedCurrency
          }))
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      setCart([]);
      setIsCheckoutModalOpen(false);
      alert("Compra procesada con éxito.");
    } catch (error: any) {
      setCheckoutError(error.message);
    }
  };

  const handleSaveOffer = async () => {
    try {
      await apiFetch("/api/shop/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingOffer)
      });
      mutateOffers();
      setEditingOffer(null);
    } catch (error) {
      alert("Error al guardar la oferta.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex-none p-6 border-b border-border bg-card/40 backdrop-blur-sm z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-1 flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" /> Tienda del Sistema
          </h1>
          <p className="text-sm text-muted-foreground">Catálogo de objetos, consumibles y mejoras.</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 py-2 border-b border-border bg-background/50">
            <TabsList>
              <TabsTrigger value="store">Escaparate</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Gestión de Ofertas</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="store" className="flex-1 overflow-hidden m-0 data-[state=active]:flex">
            {/* Split view: items on left, cart on right */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {offers?.filter((o:any) => o.shop_offers.status === 'available').map((offer: any) => {
                  const element = offer.system_elements;
                  const shopData = offer.shop_offers;
                  if (!element) return null;
                  return (
                    <div key={shopData.id} className="bg-card border border-border p-4 flex flex-col relative group overflow-hidden">
                      <div className="absolute top-0 right-0 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-b border-l border-primary/20">
                        {element.kind}
                      </div>
                      <h3 className="font-bold text-lg mb-1 mt-2 text-foreground truncate" title={element.name}>{element.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8" title={element.description}>{element.description}</p>
                      
                      <div className="mt-auto flex flex-col gap-2">
                        {shopData.prices.map((price: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 border border-border">
                            <span className="font-mono font-bold text-sm">
                              {price.amount} <span className={price.currency === 'exp' ? 'text-indigo-400' : 'text-emerald-400'}>{price.currency.toUpperCase()}</span>
                            </span>
                            <Button size="sm" variant="outline" className="h-7 text-xs uppercase tracking-widest" onClick={() => addToCart(shopData, element, price.currency)}>
                              Añadir
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Panel */}
            <div className="w-80 border-l border-border bg-card flex flex-col">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-bold uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" /> Carrito
                </h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center italic mt-10">El carrito está vacío.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="bg-background border border-border p-2 text-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold truncate" title={item.element.name}>{item.element.name}</span>
                          <button onClick={() => removeFromCart(idx)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground uppercase tracking-widest">
                            {item.offer.prices.find((p:any) => p.currency === item.selectedCurrency).amount} {item.selectedCurrency} c/u
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(idx, -1)} className="bg-muted p-0.5 rounded hover:bg-muted-foreground/20"><Minus className="w-3 h-3" /></button>
                            <span className="font-mono w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(idx, 1)} className="bg-muted p-0.5 rounded hover:bg-muted-foreground/20"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-border bg-background">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Total EXP:</span>
                  <span className="font-mono font-bold text-indigo-400">{totalExp}</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-muted-foreground">Total Yen:</span>
                  <span className="font-mono font-bold text-emerald-400">{totalYen}</span>
                </div>
                {isAdmin ? (
                  <Button className="w-full uppercase tracking-widest font-bold" disabled={cart.length === 0} onClick={() => setIsCheckoutModalOpen(true)}>
                    Procesar Compra
                  </Button>
                ) : (
                  <div className="bg-muted/50 border border-border p-3 text-xs text-muted-foreground text-center">
                    Copia estos totales y solicita la compra a un moderador en tu tema correspondiente.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
               <div className="p-6 border-b border-border flex justify-between items-center">
                 <h2 className="font-bold text-xl uppercase tracking-wider">Gestión de Ofertas</h2>
                 <Button onClick={() => setEditingOffer({
                   elementId: elements?.[0]?.id || "",
                   status: "draft",
                   prices: [{ currency: "exp", amount: 100 }]
                 })} className="gap-2">
                   <Plus className="w-4 h-4" /> Nueva Oferta
                 </Button>
               </div>
               <ScrollArea className="flex-1 p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Elemento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Precios</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers?.map((offer: any) => {
                        const el = offer.system_elements;
                        const shopData = offer.shop_offers;
                        if(!shopData) return null;
                        return (
                          <TableRow key={shopData.id}>
                            <TableCell className="font-medium">{el ? el.name : <span className="text-destructive">Elemento Borrado</span>}</TableCell>
                            <TableCell>
                              <Badge variant={shopData.status === 'available' ? 'default' : 'secondary'}>
                                {shopData.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {shopData.prices.map((p: any, i: number) => (
                                  <Badge key={i} variant="outline" className="font-mono">
                                    {p.amount} {p.currency}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setEditingOffer(shopData)}>
                                <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
               </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="uppercase tracking-widest font-black flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Procesar Compra
            </DialogTitle>
            <DialogDescription>
              Asigna esta compra al inventario del personaje seleccionado y descuenta los recursos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Personaje Destino</Label>
              <Select value={checkoutCharacter} onValueChange={setCheckoutCharacter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un personaje" />
                </SelectTrigger>
                <SelectContent>
                  {characters?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted p-3 border border-border">
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-muted-foreground">Costo EXP:</span>
                <span className="font-bold font-mono">{totalExp}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo Yen:</span>
                <span className="font-bold font-mono">{totalYen}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 border border-destructive/20">
                {checkoutError}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCheckout}>Confirmar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Modal */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
        <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Oferta de Tienda</DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Elemento del Catálogo</Label>
              <Select 
                value={editingOffer?.elementId} 
                onValueChange={v => setEditingOffer({...editingOffer, elementId: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {elements?.map((el: any) => (
                    <SelectItem key={el.id} value={el.id}>{el.name} ({el.kind})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select 
                value={editingOffer?.status} 
                onValueChange={v => setEditingOffer({...editingOffer, status: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                Precios
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => {
                  setEditingOffer({...editingOffer, prices: [...(editingOffer?.prices||[]), { currency: 'exp', amount: 0 }]})
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Añadir Precio
                </Button>
              </Label>
              <div className="flex flex-col gap-2">
                {editingOffer?.prices?.map((p: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={p.currency} onValueChange={(v) => {
                      const np = [...editingOffer.prices];
                      np[i].currency = v;
                      setEditingOffer({...editingOffer, prices: np});
                    }}>
                      <SelectTrigger className="w-[120px]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exp">EXP</SelectItem>
                        <SelectItem value="yen">Yen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" value={p.amount} onChange={e => {
                      const np = [...editingOffer.prices];
                      np[i].amount = parseInt(e.target.value) || 0;
                      setEditingOffer({...editingOffer, prices: np});
                    }} className="font-mono" />
                    <Button variant="ghost" size="sm" onClick={() => {
                      const np = [...editingOffer.prices];
                      np.splice(i, 1);
                      setEditingOffer({...editingOffer, prices: np});
                    }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setEditingOffer(null)}>Cancelar</Button>
            <Button onClick={handleSaveOffer}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

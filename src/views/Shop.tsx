import { useEffect, useState, useMemo, useRef } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { cn } from "cn";
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
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Edit2,
  X,
  Search,
  ShieldAlert,
  Coins,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Wallet,
  ArrowRight,
  ChevronDown,
  Check,
  Loader2
} from "lucide-react";
import { SectionHeader } from "../components/common/SectionHeader";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";
import { calculateProgressionCost } from "../domain/progressionCosts";

const KIND_TYPES: Record<string, string> = {
  trait: "Rasgo",
  weakness: "Debilidad",
  skill: "Habilidad",
  altered_status: "Estado Alterado",
  equipment: "Equipamiento",
  weapon: "Arma",
  consumable: "Consumible",
  ammunition: "Munición",
  license: "Licencia",
  permission: "Permiso",
  certification: "Certificación",
  character_resource: "Recurso de personaje",
  attribute_upgrade: "Mejora de atributo",
  plus_ultra_effect: "Efecto Plus Ultra",
  crafting_material: "Material de fabricación",
  ingredient: "Ingrediente",
  background: "Trasfondo",
  vehicle: "Vehículo",
  real_estate: "Inmueble",
  clandestine_asset: "Activo Clandestino"
};

const ATTRIBUTE_OPTIONS = [
  { id: "FUE", name: "Fuerza (FUE)" },
  { id: "DES", name: "Destreza (DES)" },
  { id: "RES", name: "Resistencia (RES)" },
  { id: "INT", name: "Inteligencia (INT)" },
  { id: "VOL", name: "Voluntad (VOL)" },
  { id: "VEL", name: "Velocidad (VEL)" },
];

const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  attribute: "Requiere Atributo",
  owns_element: "Poseer Elemento",
  skill_level: "Nivel de Habilidad",
  stage: "Etapa",
  age: "Edad",
  character_field: "Campo de Personaje",
  custom_info: "Ingresa información adicional"
};

function CharacterSelector({
  characters,
  value,
  onChange,
  placeholder = "Selecciona un personaje...",
  className,
}: {
  characters: any[];
  value: string;
  onChange: (charId: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => characters.find((c) => c.id.toString() === value?.toString()),
    [characters, value]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background/90 hover:bg-muted/40 px-3 py-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer text-left",
          isOpen && "ring-2 ring-primary border-primary"
        )}
      >
        {selected ? (
          <div className="flex items-center justify-between flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 truncate">
              <User className="size-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground truncate">{selected.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">#{selected.id}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
              <span className="text-emerald-400 font-semibold">{selected.yen?.toLocaleString("es-ES") ?? 0} ¥</span>
              <span className="text-indigo-400 font-semibold">{selected.exp?.toLocaleString("es-ES") ?? 0} EXP</span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground italic">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full z-[120] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 max-h-64 overflow-y-auto divide-y divide-border/40 p-1">
          {characters.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground italic">
              No hay personajes disponibles
            </div>
          ) : (
            characters.map((char) => {
              const isCurrent = char.id.toString() === value?.toString();
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => {
                    onChange(char.id.toString());
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-md text-xs text-left transition-colors cursor-pointer",
                    isCurrent
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        isCurrent ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="truncate">
                      <div className="font-semibold text-sm truncate leading-snug">{char.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">ID: #{char.id}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 font-mono text-[11px] gap-0.5 pl-2">
                    <span className="text-emerald-400 font-bold">
                      {char.yen?.toLocaleString("es-ES") ?? 0} ¥
                    </span>
                    <span className="text-indigo-400 font-bold">
                      {char.exp?.toLocaleString("es-ES") ?? 0} EXP
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const OFFER_STATUS_LABELS: Record<string, string> = {
  available: "Disponible (Visible en Tienda)",
  draft: "Borrador (Oculto)",
  paused: "Pausado",
  ended: "Finalizado"
};

function renderRequirementLabel(req: any, elementMap: Map<string, any>): string {
  if (!req) return "";
  if (req.type === "attribute") {
    const attrNames: Record<string, string> = {
      FUE: "FUE",
      DES: "DES",
      RES: "RES",
      INT: "INT",
      VOL: "VOL",
      VEL: "VEL",
    };
    const compSymbols: Record<string, string> = {
      gte: "≥",
      lte: "≤",
      eq: "=",
      includes: "contiene",
    };
    const name = attrNames[req.attributeId] || req.attributeId;
    const comp = compSymbols[req.comparison] || "≥";
    return `${name} ${comp} ${req.value}`;
  }
  if (req.type === "owns_element") {
    const targetEl = elementMap.get(req.elementId);
    const name = targetEl ? targetEl.name : req.elementId;
    const qty = req.quantity && req.quantity > 1 ? ` (x${req.quantity})` : "";
    return `Poseer: ${name}${qty}`;
  }
  if (req.type === "skill_level") {
    const targetEl = elementMap.get(req.skillElementId);
    const name = targetEl ? targetEl.name : req.skillElementId;
    const compSymbols: Record<string, string> = { gte: "≥", lte: "≤", eq: "=" };
    const comp = compSymbols[req.comparison] || "≥";
    return `${name} Nv. ${comp} ${req.value}`;
  }
  if (req.type === "stage") {
    const compText = req.comparison === "eq" ? "= " : "≥ ";
    return `Etapa ${compText}${req.stageId}`;
  }
  if (req.type === "age") {
    const compSymbols: Record<string, string> = { gte: "≥", lte: "≤" };
    return `Edad ${compSymbols[req.comparison] || "≥"} ${req.value}`;
  }
  if (req.type === "custom_info") {
    return `📝 ${req.label || "Información adicional"}${req.required !== false ? " (Obligatorio)" : ""}`;
  }
  return "Requisito especial";
}

export default function Shop() {
  const { user, dbUser } = useAuth();
  const role = dbUser?.role;
  const { data: offers, mutate: mutateOffers } = useSWR(user ? "/api/shop/offers" : null, fetcher);
  const { data: rawElements } = useSWR(user ? "/api/admin/elements" : null, fetcher);
  const { data: rawAdminCharacters, mutate: mutateCharacters } = useSWR(role && user ? "/api/admin/characters" : null, fetcher);
  const { data: myCharacter } = useSWR(user ? "/api/character" : null, fetcher);
  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);

  const availableCharacters = useMemo(() => {
    if (Array.isArray(rawAdminCharacters) && rawAdminCharacters.length > 0) {
      return rawAdminCharacters;
    }
    if (myCharacter && myCharacter.id) {
      return [myCharacter];
    }
    return [];
  }, [rawAdminCharacters, myCharacter]);

  const [activeTab, setActiveTab] = useState("store");
  const [storeSearch, setStoreSearch] = useState("");
  const [offerElementSearch, setOfferElementSearch] = useState("");
  const [offerModalTab, setOfferModalTab] = useState("info");

  // Stages list from rules
  const stagesList = useMemo(() => {
    return Array.isArray(rules) ? rules.find((r: any) => r.key === "system_stages")?.value || [] : [];
  }, [rules]);

  // Map of elements by ID for quick lookup
  const elementMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(rawElements)) {
      rawElements.forEach((el: any) => map.set(el.id, el));
    }
    return map;
  }, [rawElements]);

  // All elements list
  const allElements = useMemo(() => {
    return Array.isArray(rawElements) ? rawElements : [];
  }, [rawElements]);

  // Only published elements for offers
  const publishedElements = useMemo(() => {
    return allElements.filter((el: any) => el.status === "published");
  }, [allElements]);

  // Skill elements only for skill requirements
  const skillElements = useMemo(() => {
    return allElements.filter((el: any) => el.kind === "skill");
  }, [allElements]);

  // Filtered elements for offer modal search
  const filteredOfferElements = useMemo(() => {
    const q = offerElementSearch.trim().toLowerCase();
    if (!q) return allElements;
    return allElements.filter((el: any) => {
      const name = (el.name || "").toLowerCase();
      const kind = (el.kind || "").toLowerCase();
      const kindLabel = (KIND_TYPES[el.kind] || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      return name.includes(q) || kind.includes(q) || kindLabel.includes(q) || id.includes(q);
    });
  }, [allElements, offerElementSearch]);
  
  // Cart & Drawer state
  const [cart, setCart] = useState<any[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [checkoutCharacter, setCheckoutCharacter] = useState<string>("");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  // Local progression selections per offerId: { [offerId]: { fromLevel: number, toLevel: number } }
  const [progressionSelections, setProgressionSelections] = useState<Record<string, { fromLevel: number; toLevel: number }>>({});

  // Automatically default to the first available character
  useEffect(() => {
    if (!checkoutCharacter && availableCharacters.length > 0) {
      setCheckoutCharacter(availableCharacters[0].id.toString());
    }
  }, [availableCharacters, checkoutCharacter]);

  // Admin state
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [saveOfferError, setSaveOfferError] = useState("");
  const [adminOfferActionError, setAdminOfferActionError] = useState("");

  const isAdmin = role === "moderator" || role === "superadmin";

  const maxPurchasedAttributes = useMemo(() => {
    if (!Array.isArray(rules)) return 5;
    const r = rules.find((item: any) => item.key === "max_purchased_attributes");
    return Number(r?.value?.max ?? r?.value) || 5;
  }, [rules]);

  const selectedCheckoutChar = useMemo(() => {
    if (!checkoutCharacter || availableCharacters.length === 0) return null;
    return availableCharacters.find((c: any) => c.id.toString() === checkoutCharacter.toString()) || null;
  }, [availableCharacters, checkoutCharacter]);

  const charExistingAttrUpgrades = useMemo(() => {
    if (!selectedCheckoutChar?.possessions || !Array.isArray(selectedCheckoutChar.possessions)) return 0;
    return selectedCheckoutChar.possessions.reduce((sum: number, p: any) => {
      const elKind = p.element?.kind || p.kind;
      if (elKind === "attribute_upgrade") {
        return sum + (p.possession?.quantity ?? p.quantity ?? 1);
      }
      return sum;
    }, 0);
  }, [selectedCheckoutChar]);

  const cartAttrUpgradesCount = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.element?.kind !== "attribute_upgrade") return sum;
      if (item.isProgression) {
        return sum + Math.max(0, (item.toLevel ?? 0) - (item.fromLevel ?? 0));
      }
      return sum + (item.quantity || 1);
    }, 0);
  }, [cart]);

  const exceedsAttrLimit = selectedCheckoutChar && (charExistingAttrUpgrades + cartAttrUpgradesCount > maxPurchasedAttributes);

  const addStandardToCart = (offer: any, element: any, currency: string) => {
    setCart(prev => {
      const existing = prev.find(item => !item.isProgression && item.offerId === offer.id && item.selectedCurrency === currency);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        isProgression: false,
        offerId: offer.id,
        offer,
        element,
        quantity: 1,
        selectedCurrency: currency,
        priceAmount: offer.prices.find((p: any) => p.currency === currency)?.amount || 0
      }];
    });
    setIsCartDrawerOpen(true);
  };

  const addProgressionToCart = (offer: any, element: any, currency: string, fromLevel: number, toLevel: number) => {
    const baseCost = Number(element.metadata?.baseExpCost) || (offer.prices?.find((p: any) => p.currency === currency)?.amount ?? 100);
    const cost = calculateProgressionCost(baseCost, fromLevel, toLevel);

    setCart(prev => {
      // Remove any existing progression for same element to avoid conflicting level updates in same checkout
      const filtered = prev.filter(item => !(item.isProgression && item.element.id === element.id));
      return [...filtered, {
        isProgression: true,
        offerId: offer.id,
        offer,
        element,
        quantity: 1,
        fromLevel,
        toLevel,
        selectedCurrency: currency,
        cost,
        baseCost
      }];
    });
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      if (!copy[index] || copy[index].isProgression) return prev;
      copy[index].quantity += delta;
      if (copy[index].quantity <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      return copy;
    });
  };

  const updateCartItemCustomInfo = (index: number, text: string) => {
    setCart(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], customInfo: text };
      }
      return copy;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalExp = cart.reduce((sum, item) => {
    if (item.selectedCurrency !== "exp") return sum;
    if (item.isProgression) return sum + (item.cost || 0);
    const p = item.offer.prices?.find((p: any) => p.currency === "exp");
    return sum + (p ? p.amount * item.quantity : 0);
  }, 0);

  const totalYen = cart.reduce((sum, item) => {
    if (item.selectedCurrency !== "yen") return sum;
    if (item.isProgression) return sum + (item.cost || 0);
    const p = item.offer.prices?.find((p: any) => p.currency === "yen");
    return sum + (p ? p.amount * item.quantity : 0);
  }, 0);

  const totalItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const isInsufficientFunds = selectedCheckoutChar && (
    (totalYen > (selectedCheckoutChar.yen || 0)) ||
    (totalExp > (selectedCheckoutChar.exp || 0))
  );

  const handleCheckout = async () => {
    if (!isAdmin) {
      alert("Solo los moderadores pueden procesar la compra.");
      return;
    }
    if (!checkoutCharacter) {
      setCheckoutError("Selecciona un personaje.");
      return;
    }

    // Validate required custom_info for items in cart
    for (const item of cart) {
      const customReqs = (item.offer?.requirements?.requirements || []).filter((r: any) => r.type === "custom_info" && r.required !== false);
      if (customReqs.length > 0 && (!item.customInfo || !item.customInfo.trim())) {
        const reqLabel = customReqs[0].label || "Información adicional";
        setCheckoutError(`Debes ingresar "${reqLabel}" para ${item.element.name}.`);
        return;
      }
    }

    try {
      setCheckoutError("");
      const res = await apiFetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: parseInt(checkoutCharacter, 10),
          cartItems: cart.map(c => {
            if (c.isProgression) {
              return {
                offerId: c.offerId,
                selectedCurrency: c.selectedCurrency,
                fromLevel: c.fromLevel,
                toLevel: c.toLevel,
                quantity: 1,
                customInfo: c.customInfo || null
              };
            }
            return {
              offerId: c.offerId,
              quantity: c.quantity,
              selectedCurrency: c.selectedCurrency,
              customInfo: c.customInfo || null
            };
          })
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      setCart([]);
      setIsCheckoutModalOpen(false);
      setIsCartDrawerOpen(false);
      mutateCharacters?.();
      mutateOffers?.();
      alert("Compra procesada con éxito.");
    } catch (error: any) {
      setCheckoutError(error.message);
    }
  };

  const handleOpenCreateOffer = () => {
    const initialElement = publishedElements[0] || allElements[0];
    setEditingOffer({
      elementId: initialElement?.id || "",
      status: "available",
      prices: [{ currency: "exp", amount: 100 }],
      requirements: { operator: "all", requirements: [] },
      globalStock: null,
      perCharacterLimit: null,
    });
    setOfferElementSearch("");
    setOfferModalTab("info");
    setSaveOfferError("");
    setAdminOfferActionError("");
  };

  const handleOpenEditOffer = (shopData: any) => {
    setEditingOffer({
      ...shopData,
      requirements: shopData.requirements || { operator: "all", requirements: [] },
      prices: shopData.prices || [{ currency: "exp", amount: 100 }],
    });
    setOfferElementSearch("");
    setOfferModalTab("info");
    setSaveOfferError("");
    setAdminOfferActionError("");
  };

  const handleSaveOffer = async () => {
    if (!editingOffer?.elementId) {
      setSaveOfferError("Debes seleccionar un elemento del catálogo.");
      return;
    }
    setSaveOfferError("");
    setIsSavingOffer(true);
    try {
      const sanitizedPrices = (editingOffer.prices || []).map((p: any) => ({
        currency: p.currency === "yen" ? "yen" : "exp",
        amount: Math.max(0, parseInt(p.amount, 10) || 0)
      }));

      const payload = {
        id: editingOffer.id || undefined,
        elementId: editingOffer.elementId,
        status: editingOffer.status || "available",
        prices: sanitizedPrices.length > 0 ? sanitizedPrices : [{ currency: "exp", amount: 0 }],
        requirements: editingOffer.requirements || { operator: "all", requirements: [] },
        globalStock: (editingOffer.globalStock === null || editingOffer.globalStock === undefined || editingOffer.globalStock === "" || Number(editingOffer.globalStock) <= 0)
          ? null
          : parseInt(editingOffer.globalStock, 10),
        perCharacterLimit: (editingOffer.perCharacterLimit === null || editingOffer.perCharacterLimit === undefined || editingOffer.perCharacterLimit === "" || Number(editingOffer.perCharacterLimit) <= 0)
          ? null
          : parseInt(editingOffer.perCharacterLimit, 10),
      };

      const res = await apiFetch("/api/shop/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar la oferta");
      }
      await mutateOffers();
      setEditingOffer(null);
      setSaveOfferError("");
    } catch (error: any) {
      setSaveOfferError(error.message || "Error al guardar la oferta");
    } finally {
      setIsSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta oferta de la tienda?")) return;
    try {
      setAdminOfferActionError("");
      const res = await apiFetch(`/api/shop/offers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al eliminar la oferta");
      await mutateOffers();
    } catch (error: any) {
      setAdminOfferActionError(error.message || "Error al eliminar la oferta");
    }
  };

  // Requirement management inside Offer Modal
  const addRequirementToOffer = (type: "attribute" | "owns_element" | "skill_level" | "stage" | "custom_info" = "attribute") => {
    const currentReqs = editingOffer?.requirements?.requirements || [];
    let newReq: any;
    if (type === "attribute") {
      newReq = { id: nanoid(8), type: "attribute", attributeId: "FUE", comparison: "gte", value: 1 };
    } else if (type === "owns_element") {
      newReq = { id: nanoid(8), type: "owns_element", elementId: publishedElements[0]?.id || allElements[0]?.id || "", quantity: 1 };
    } else if (type === "skill_level") {
      const skillEl = skillElements[0] || allElements[0];
      newReq = { id: nanoid(8), type: "skill_level", skillElementId: skillEl?.id || "", comparison: "gte", value: 1 };
    } else if (type === "stage") {
      const defaultStage = stagesList[0]?.name || "Infancia";
      newReq = { id: nanoid(8), type: "stage", stageId: defaultStage, comparison: "gte" };
    } else if (type === "custom_info") {
      newReq = {
        id: nanoid(8),
        type: "custom_info",
        label: "Ingresa información adicional",
        placeholder: "Especifica la información o detalles requeridos...",
        required: true
      };
    }

    setEditingOffer({
      ...editingOffer,
      requirements: {
        operator: editingOffer?.requirements?.operator || "all",
        requirements: [...currentReqs, newReq]
      }
    });
  };

  const removeRequirementFromOffer = (id: string) => {
    setEditingOffer({
      ...editingOffer,
      requirements: {
        ...editingOffer.requirements,
        requirements: (editingOffer.requirements?.requirements || []).filter((r: any) => r.id !== id)
      }
    });
  };

  const updateRequirementInOffer = (id: string, updates: any) => {
    setEditingOffer({
      ...editingOffer,
      requirements: {
        ...editingOffer.requirements,
        requirements: (editingOffer.requirements?.requirements || []).map((r: any) => r.id === id ? { ...r, ...updates } : r)
      }
    });
  };

  const updateRequirementTypeInOffer = (id: string, newType: string) => {
    setEditingOffer({
      ...editingOffer,
      requirements: {
        ...editingOffer.requirements,
        requirements: (editingOffer.requirements?.requirements || []).map((r: any) => {
          if (r.id !== id) return r;
          if (newType === "attribute") {
            return { id, type: "attribute", attributeId: "FUE", comparison: "gte", value: 1 };
          }
          if (newType === "owns_element") {
            return { id, type: "owns_element", elementId: publishedElements[0]?.id || allElements[0]?.id || "", quantity: 1 };
          }
          if (newType === "skill_level") {
            const skillEl = skillElements[0] || allElements[0];
            return { id, type: "skill_level", skillElementId: skillEl?.id || "", comparison: "gte", value: 1 };
          }
          if (newType === "stage") {
            const defaultStage = stagesList[0]?.name || "Infancia";
            return { id, type: "stage", stageId: defaultStage, comparison: "gte" };
          }
          if (newType === "custom_info") {
            return {
              id,
              type: "custom_info",
              label: "Ingresa información adicional",
              placeholder: "Especifica la información o detalles requeridos...",
              required: true
            };
          }
          return r;
        })
      }
    });
  };

  const selectedOfferElement = editingOffer?.elementId ? elementMap.get(editingOffer.elementId) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative space-y-4">
      <SectionHeader
        icon={ShoppingCart}
        title="Tienda del Sistema"
        description="Catálogo de objetos, consumibles y mejoras de personajes."
      />

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 py-2 border-b border-border bg-background/50">
            <TabsList>
              <TabsTrigger value="store">Escaparate</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Gestión de Ofertas</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="store" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
            {/* Top Toolbar: Search + Quick Character Balance + Cart Drawer Button */}
            <div className="p-4 px-6 border-b border-border bg-card/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, tipo o descripción..."
                  value={storeSearch}
                  onChange={e => setStoreSearch(e.target.value)}
                  className="h-9 pl-9 pr-8 text-xs bg-background/80"
                />
                {storeSearch && (
                  <button
                    type="button"
                    onClick={() => setStoreSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Limpiar búsqueda"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Character quick status & Cart Drawer Trigger */}
              <div className="flex items-center flex-wrap gap-2.5 ml-auto">
                {selectedCheckoutChar && (
                  <div className="hidden lg:flex items-center gap-3 bg-muted/40 border border-border/70 rounded-md px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="size-3.5 text-primary" />
                      <span className="truncate max-w-[120px]">{selectedCheckoutChar.name}</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1 font-mono text-emerald-400 font-semibold" title="Yenes Disponibles">
                      <Coins className="size-3.5" />
                      {selectedCheckoutChar.yen?.toLocaleString("es-ES") ?? 0} ¥
                    </div>
                    <div className="flex items-center gap-1 font-mono text-indigo-400 font-semibold" title="EXP Disponible">
                      <Sparkles className="size-3.5" />
                      {selectedCheckoutChar.exp?.toLocaleString("es-ES") ?? 0} EXP
                    </div>
                  </div>
                )}

                <Button
                  variant="default"
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="relative gap-2 font-bold uppercase tracking-wider text-xs h-9 px-4 shadow-sm"
                >
                  <ShoppingCart className="size-4" />
                  <span>Carrito</span>
                  {totalItemsCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-mono font-bold bg-background text-foreground border-none">
                      {totalItemsCount}
                    </Badge>
                  )}
                  {(totalYen > 0 || totalExp > 0) && (
                    <div className="hidden sm:flex items-center gap-1.5 ml-1 pl-1.5 border-l border-primary-foreground/20 font-mono text-[11px]">
                      {totalYen > 0 && <span className="text-emerald-200">{totalYen.toLocaleString("es-ES")}¥</span>}
                      {totalExp > 0 && <span className="text-indigo-200">{totalExp.toLocaleString("es-ES")}EXP</span>}
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Main Offers Grid */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {offers?.filter((o: any) => {
                  if (o.shop_offers.status !== "available") return false;
                  const el = o.system_elements;
                  if (!el) return false;
                  if (!storeSearch.trim()) return true;
                  const q = storeSearch.trim().toLowerCase();
                  const kindLabel = (KIND_TYPES[el.kind] || "").toLowerCase();
                  return el.name.toLowerCase().includes(q) || el.kind.toLowerCase().includes(q) || kindLabel.includes(q) || (el.description || "").toLowerCase().includes(q);
                }).map((offer: any) => {
                  const element = offer.system_elements;
                  const shopData = offer.shop_offers;
                  if (!element) return null;

                  const isProgression = element.kind === "skill" || element.kind === "attribute_upgrade";
                  const maxLevel = Number(element.metadata?.maxLevel) || (element.kind === "attribute_upgrade" ? 10 : 5);
                  const baseCost = Number(element.metadata?.baseExpCost) || (shopData.prices?.find((p: any) => p.currency === "exp")?.amount ?? 100);

                  const curProgression = progressionSelections[shopData.id] || { fromLevel: 0, toLevel: 1 };
                  const calculatedProgCost = calculateProgressionCost(baseCost, curProgression.fromLevel, curProgression.toLevel);

                  const offerReqs = shopData.requirements?.requirements || [];

                  return (
                    <div key={shopData.id} className="bg-card border border-border p-4 flex flex-col relative group overflow-hidden rounded-md shadow-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                          {KIND_TYPES[element.kind] || element.kind.replace("_", " ")}
                        </Badge>
                        {isProgression && (
                          <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/30 bg-amber-500/10">
                            Nv. 1-{maxLevel}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-base mb-1 text-foreground truncate" title={element.name}>{element.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-8" title={element.description}>{element.description}</p>
                      
                      {/* Requirements pill list */}
                      {offerReqs.length > 0 && (
                        <div className="mb-3 p-2 rounded bg-muted/40 border border-border/50 space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert className="size-3 text-amber-400" />
                            Requisitos:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {offerReqs.map((req: any) => (
                              <Badge key={req.id || nanoid()} variant="secondary" className="text-[10px] font-medium bg-background/80 text-foreground border border-border/60">
                                {renderRequirementLabel(req, elementMap)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {isProgression ? (
                        <div className="mt-auto pt-2 border-t border-border/60 space-y-2">
                          <div className="bg-muted/40 p-2 rounded border border-border/50 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <Label className="text-[10px] text-muted-foreground block mb-0.5">Nivel Actual</Label>
                                <Select
                                  value={String(curProgression.fromLevel)}
                                  onValueChange={(v) => {
                                    const from = parseInt(v, 10) || 0;
                                    const to = Math.max(from + 1, curProgression.toLevel);
                                    setProgressionSelections(prev => ({
                                      ...prev,
                                      [shopData.id]: { fromLevel: from, toLevel: Math.min(maxLevel, to) }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs bg-background">
                                    <SelectValue>Nv. {curProgression.fromLevel}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: maxLevel }, (_, i) => (
                                      <SelectItem key={i} value={String(i)}>Nv. {i}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-[10px] text-muted-foreground block mb-0.5">Nivel Deseado</Label>
                                <Select
                                  value={String(curProgression.toLevel)}
                                  onValueChange={(v) => {
                                    const to = parseInt(v, 10) || 1;
                                    setProgressionSelections(prev => ({
                                      ...prev,
                                      [shopData.id]: { fromLevel: curProgression.fromLevel, toLevel: to }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs bg-background">
                                    <SelectValue>Nv. {curProgression.toLevel}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: maxLevel - curProgression.fromLevel }, (_, i) => {
                                      const lvl = curProgression.fromLevel + 1 + i;
                                      return (
                                        <SelectItem key={lvl} value={String(lvl)}>Nv. {lvl}</SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40">
                              <span className="text-[11px] text-muted-foreground">
                                Coste Base: <strong className="font-mono text-foreground">{baseCost}</strong>
                              </span>
                              <span className="font-mono font-bold text-amber-400 inline-flex items-center gap-1">
                                <Sparkles className="size-3" />
                                {calculatedProgCost.toLocaleString("es-ES")} EXP
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full h-8 text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40"
                            onClick={() => addProgressionToCart(shopData, element, "exp", curProgression.fromLevel, curProgression.toLevel)}
                          >
                            <Sparkles className="size-3.5 mr-1" />
                            Añadir Mejora (Nv {curProgression.fromLevel} ➔ {curProgression.toLevel})
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-auto flex flex-col gap-2">
                          {shopData.prices.map((price: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 border border-border rounded">
                              <span className="font-mono font-bold text-sm inline-flex items-center gap-1.5">
                                {price.currency === "exp" ? (
                                  <Sparkles className="size-3.5 text-indigo-400" />
                                ) : (
                                  <Coins className="size-3.5 text-emerald-400" />
                                )}
                                {price.amount} <span className={price.currency === "exp" ? "text-indigo-400" : "text-emerald-400"}>{price.currency.toUpperCase()}</span>
                              </span>
                              <Button size="sm" variant="outline" className="h-7 text-xs uppercase tracking-widest" onClick={() => addStandardToCart(shopData, element, price.currency)}>
                                Añadir
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Cart Quick Access Button */}
            {totalItemsCount > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <Button
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="rounded-full shadow-xl bg-primary text-primary-foreground font-bold px-4 py-6 gap-2.5 border border-primary-foreground/20 hover:scale-105 transition-all"
                >
                  <ShoppingCart className="size-5" />
                  <span className="font-mono text-sm">{totalItemsCount}</span>
                  <div className="flex items-center gap-1.5 pl-2 border-l border-primary-foreground/30 font-mono text-xs">
                    {totalYen > 0 && <span className="text-emerald-300">{totalYen.toLocaleString("es-ES")}¥</span>}
                    {totalExp > 0 && <span className="text-indigo-300">{totalExp.toLocaleString("es-ES")}EXP</span>}
                  </div>
                </Button>
              </div>
            )}

            {/* ShadCN Sheet Component for Cart */}
            <Sheet open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
              <SheetContent side="right" showCloseButton={false} className="sm:max-w-md w-full h-full max-h-screen flex flex-col bg-card border-l border-border shadow-2xl p-0">
                <SheetHeader className="p-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between shrink-0">
                  <div className="text-left">
                    <SheetTitle className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
                      <ShoppingCart className="size-4 text-primary" /> Carrito de Compras
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                      {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"} seleccionados
                    </SheetDescription>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="size-8 rounded-full">
                      <X className="size-4" />
                    </Button>
                  </SheetClose>
                </SheetHeader>

                {/* Character Selection & Balance Overview */}
                <div className="p-4 border-b border-border bg-background space-y-3 shrink-0">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" /> Personaje Seleccionado
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {availableCharacters.length} {availableCharacters.length === 1 ? "disponible" : "disponibles"}
                      </span>
                    </Label>
                    
                    {availableCharacters.length === 0 ? (
                      <div className="p-2.5 rounded bg-muted/50 border border-border text-xs text-muted-foreground text-center italic">
                        No hay personajes registrados.
                      </div>
                    ) : (
                      <CharacterSelector
                        characters={availableCharacters}
                        value={checkoutCharacter}
                        onChange={setCheckoutCharacter}
                      />
                    )}
                  </div>

                  {/* Character Balances & Projection */}
                  {selectedCheckoutChar && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Wallet className="size-3.5 text-primary" /> Saldo Actual:
                        </span>
                        <div className="flex items-center gap-3 font-mono font-bold">
                          <span className="text-emerald-400 flex items-center gap-1" title="Yenes">
                            <Coins className="size-3" />
                            {(selectedCheckoutChar.yen || 0).toLocaleString("es-ES")} ¥
                          </span>
                          <span className="text-indigo-400 flex items-center gap-1" title="Experiencia">
                            <Sparkles className="size-3" />
                            {(selectedCheckoutChar.exp || 0).toLocaleString("es-ES")} EXP
                          </span>
                        </div>
                      </div>

                      {/* Remaining simulation if cart has items */}
                      {cart.length > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                            <ArrowRight className="size-3" /> Saldo tras compra:
                          </span>
                          <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                            <span className={((selectedCheckoutChar.yen || 0) - totalYen) < 0 ? "text-destructive" : "text-emerald-300"}>
                              {((selectedCheckoutChar.yen || 0) - totalYen).toLocaleString("es-ES")} ¥
                            </span>
                            <span className={((selectedCheckoutChar.exp || 0) - totalExp) < 0 ? "text-destructive" : "text-indigo-300"}>
                              {((selectedCheckoutChar.exp || 0) - totalExp).toLocaleString("es-ES")} EXP
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {isInsufficientFunds && (
                        <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-medium flex items-center gap-1.5">
                          <AlertCircle className="size-3.5 shrink-0" />
                          <span>Fondos insuficientes para completar esta compra.</span>
                        </div>
                      )}

                      {exceedsAttrLimit && (
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium flex items-center gap-1.5">
                          <ShieldAlert className="size-3.5 shrink-0" />
                          <span>Supera el límite máximo permitido de mejoras de atributos ({maxPurchasedAttributes}).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart Items List */}
                <ScrollArea className="flex-1 p-4">
                  {cart.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                      <ShoppingCart className="size-10 stroke-1 mb-2 opacity-40" />
                      <p className="text-sm font-medium">El carrito está vacío</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Selecciona objetos o mejoras en la tienda para agregarlos aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs text-muted-foreground pb-1">
                        <span>{cart.length} {cart.length === 1 ? "tipo de ítem" : "tipos de ítems"}</span>
                        <button
                          type="button"
                          onClick={clearCart}
                          className="text-destructive hover:underline text-[11px] font-medium flex items-center gap-1"
                        >
                          <Trash2 className="size-3" /> Vaciar Carrito
                        </button>
                      </div>

                      {cart.map((item, idx) => (
                        <div key={idx} className="bg-background border border-border p-3 rounded-lg text-sm flex flex-col gap-2 shadow-sm relative group">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <span className="font-bold block truncate text-foreground" title={item.element.name}>
                                {item.element.name}
                              </span>
                              {item.isProgression ? (
                                <Badge variant="outline" className="text-[10px] mt-0.5 font-mono text-amber-400 border-amber-500/30 bg-amber-500/10">
                                  Mejora: Nv. {item.fromLevel} ➔ Nv. {item.toLevel}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
                                  {KIND_TYPES[item.element.kind] || item.element.kind}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(idx)}
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              title="Eliminar del carrito"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-2 border-t border-border/40">
                            {item.isProgression ? (
                              <>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  Base: {item.baseCost} EXP
                                </span>
                                <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                                  <Sparkles className="size-3.5" />
                                  {item.cost?.toLocaleString("es-ES")} EXP
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="font-mono text-xs">
                                  <span className="font-bold text-foreground">
                                    {(item.priceAmount * item.quantity).toLocaleString("es-ES")}
                                  </span>{" "}
                                  <span className={item.selectedCurrency === "exp" ? "text-indigo-400 uppercase" : "text-emerald-400 uppercase"}>
                                    {item.selectedCurrency}
                                  </span>
                                  {item.quantity > 1 && (
                                    <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                                      ({item.priceAmount} c/u)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded border border-border/60">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuantity(idx, -1)}
                                    className="size-6 h-6 w-6 rounded hover:bg-muted-foreground/20 p-0"
                                    title="Disminuir"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <span className="font-mono w-6 text-center text-xs font-bold">{item.quantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateQuantity(idx, 1)}
                                    className="size-6 h-6 w-6 rounded hover:bg-muted-foreground/20 p-0"
                                    title="Aumentar"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Custom info input inside cart item if required */}
                          {(() => {
                            const customReqs = (item.offer?.requirements?.requirements || []).filter((r: any) => r.type === "custom_info");
                            if (customReqs.length === 0) return null;
                            return (
                              <div className="pt-2 border-t border-border/40 space-y-1.5 bg-muted/20 -mx-3 -mb-3 p-3 rounded-b-lg">
                                {customReqs.map((req: any) => (
                                  <div key={req.id} className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                                      <FileText className="size-3" /> {req.label || "Info adicional"}
                                      {req.required !== false && <span className="text-destructive">*</span>}
                                    </Label>
                                    <Textarea
                                      value={item.customInfo || ""}
                                      placeholder={req.placeholder || "Especifique detalles o identidad..."}
                                      onChange={e => updateCartItemCustomInfo(idx, e.target.value)}
                                      className="min-h-14 text-xs resize-none bg-background"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Sheet Footer & Checkout Action */}
                <SheetFooter className="p-4 border-t border-border bg-background shrink-0 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-indigo-400" /> Total EXP:
                      </span>
                      <span className="font-mono font-bold text-sm text-indigo-400">
                        {totalExp.toLocaleString("es-ES")} EXP
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Coins className="size-3.5 text-emerald-400" /> Total Yenes:
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {totalYen.toLocaleString("es-ES")} ¥
                      </span>
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-2.5 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-1.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {isAdmin ? (
                    <Button
                      className="w-full uppercase tracking-widest font-bold h-10 gap-2"
                      disabled={cart.length === 0 || !checkoutCharacter}
                      onClick={handleCheckout}
                    >
                      <CheckCircle2 className="size-4" /> Procesar Compra
                    </Button>
                  ) : (
                    <div className="bg-muted/50 border border-border p-2.5 rounded text-xs text-muted-foreground text-center">
                      Copia estos totales y solicita la compra a un moderador en tu tema correspondiente.
                    </div>
                  )}
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col">
               <div className="p-6 border-b border-border flex justify-between items-center">
                 <div>
                   <h2 className="font-bold text-xl uppercase tracking-wider">Gestión de Ofertas</h2>
                   <p className="text-xs text-muted-foreground mt-0.5">Crea y configura las ofertas de la tienda y sus requisitos de obtención.</p>
                 </div>
                 <Button onClick={handleOpenCreateOffer} className="gap-2">
                   <Plus className="w-4 h-4" /> Nueva Oferta
                 </Button>
               </div>
               {adminOfferActionError && (
                 <div className="mx-6 mt-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                   <AlertCircle className="size-4 shrink-0" />
                   <span>{adminOfferActionError}</span>
                 </div>
               )}
               <ScrollArea className="flex-1 p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Elemento</TableHead>
                        <TableHead>Requisitos de Compra</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Precios</TableHead>
                        <TableHead className="w-[120px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers?.map((offer: any) => {
                        const el = offer.system_elements;
                        const shopData = offer.shop_offers;
                        if (!shopData) return null;
                        const offerReqs = shopData.requirements?.requirements || [];
                        return (
                          <TableRow key={shopData.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">
                                  {el ? el.name : <span className="text-destructive">Elemento Borrado</span>}
                                </span>
                                {el && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 py-0 h-4">
                                      {KIND_TYPES[el.kind] || el.kind}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      ID: {shopData.elementId}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {offerReqs.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {offerReqs.map((req: any) => (
                                    <Badge key={req.id || nanoid()} variant="secondary" className="text-[10px] font-mono bg-background text-foreground border border-border">
                                      {renderRequirementLabel(req, elementMap)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin requisitos</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={shopData.status === "available" ? "default" : shopData.status === "paused" ? "secondary" : "outline"} className={shopData.status === "available" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                                {shopData.status === "available" ? "Disponible" : shopData.status === "draft" ? "Borrador" : shopData.status === "paused" ? "Pausado" : shopData.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-1.5">
                                  {shopData.prices?.map((p: any, i: number) => (
                                    <Badge key={i} variant="outline" className="font-mono text-xs">
                                      {p.amount} {p.currency.toUpperCase()}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                  <span>Stock: {shopData.globalStock !== null && Number(shopData.globalStock) > 0 ? shopData.globalStock : "∞"}</span>
                                  <span>•</span>
                                  <span>Límite/PJ: {shopData.perCharacterLimit !== null && Number(shopData.perCharacterLimit) > 0 ? shopData.perCharacterLimit : "∞"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" title="Editar oferta" onClick={() => handleOpenEditOffer(shopData)}>
                                  <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Eliminar oferta" onClick={() => handleDeleteOffer(shopData.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive hover:text-destructive/80" />
                                </Button>
                              </div>
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
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
              <CharacterSelector
                characters={availableCharacters}
                value={checkoutCharacter}
                onChange={setCheckoutCharacter}
                placeholder="Selecciona un personaje..."
              />
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

            {/* Custom Information fields for items requiring it */}
            {(() => {
              const itemsNeedingInfo = cart
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => (item.offer?.requirements?.requirements || []).some((r: any) => r.type === "custom_info"));

              if (itemsNeedingInfo.length === 0) return null;

              return (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-amber-400" />
                    <Label className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      Información Adicional Requerida
                    </Label>
                  </div>
                  {itemsNeedingInfo.map(({ item, idx }) => {
                    const customReqs = (item.offer?.requirements?.requirements || []).filter((r: any) => r.type === "custom_info");
                    return (
                      <div key={idx} className="p-3 bg-muted/40 border border-amber-500/20 rounded-md space-y-2">
                        <div className="font-medium text-xs text-foreground flex items-center justify-between">
                          <span>{item.element.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            {KIND_TYPES[item.element.kind] || item.element.kind}
                          </span>
                        </div>
                        {customReqs.map((req: any) => (
                          <div key={req.id} className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                              <span>{req.label || "Información Adicional"}</span>
                              {req.required !== false && <span className="text-destructive text-[10px] font-mono">* Obligatorio</span>}
                            </Label>
                            <Textarea
                              value={item.customInfo || ""}
                              placeholder={req.placeholder || "Especifica la información o detalles requeridos..."}
                              onChange={e => updateCartItemCustomInfo(idx, e.target.value)}
                              className="min-h-16 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {cartAttrUpgradesCount > 0 && (
              <div className={`p-3 border rounded text-xs space-y-1 ${exceedsAttrLimit ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-amber-500/10 border-amber-500/20 text-foreground'}`}>
                <div className="flex justify-between font-semibold">
                  <span>Mejoras de Atributo:</span>
                  <span className="font-mono">
                    {selectedCheckoutChar ? `${charExistingAttrUpgrades + cartAttrUpgradesCount}` : `+${cartAttrUpgradesCount}`} / {maxPurchasedAttributes} máx.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {selectedCheckoutChar ? `El personaje tiene ${charExistingAttrUpgrades} y esta compra suma +${cartAttrUpgradesCount}.` : `Esta compra incluye +${cartAttrUpgradesCount} mejoras de atributo.`}
                </p>
                {exceedsAttrLimit && (
                  <p className="font-medium text-destructive mt-1">
                    ⚠️ Se supera el límite máximo de {maxPurchasedAttributes} atributos por personaje configurado en las reglas.
                  </p>
                )}
              </div>
            )}

            {checkoutError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 border border-destructive/20">
                {checkoutError}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCheckout} disabled={Boolean(exceedsAttrLimit)}>Confirmar Compra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Create Offer Modal */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-lg font-bold">
              {editingOffer?.id ? "Editar Oferta de Tienda" : "Nueva Oferta de Tienda"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura el elemento, precios de compra y los requisitos para poder adquirirlo.
            </DialogDescription>
          </DialogHeader>

          {saveOfferError && (
            <div className="mx-6 mt-3 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2 shrink-0">
              <AlertCircle className="size-4 shrink-0" />
              <span>{saveOfferError}</span>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            <Tabs value={offerModalTab} onValueChange={setOfferModalTab} className="flex-1 flex flex-col w-full h-full">
              <div className="px-6 pt-3 pb-2 border-b bg-muted/40 shrink-0">
                <TabsList className="inline-flex h-auto p-1 gap-1 bg-card border border-border/50">
                  <TabsTrigger value="info" className="px-3.5 py-1.5 text-xs font-medium">1. Datos y Precios</TabsTrigger>
                  <TabsTrigger value="reqs" className="px-3.5 py-1.5 text-xs font-medium">
                    2. Requisitos ({editingOffer?.requirements?.requirements?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="info" className="mt-0 space-y-4">
                  {/* Element Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Elemento del Catálogo</Label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {allElements.length} elemento{allElements.length === 1 ? "" : "s"} registrados
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Buscar por nombre, tipo o ID..."
                        value={offerElementSearch}
                        onChange={e => setOfferElementSearch(e.target.value)}
                        className="h-8 pl-8 pr-7 text-xs bg-background/50"
                      />
                      {offerElementSearch && (
                        <button
                          type="button"
                          onClick={() => setOfferElementSearch("")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                          title="Limpiar búsqueda"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <Select 
                      value={editingOffer?.elementId || ""} 
                      onValueChange={v => setEditingOffer({...editingOffer, elementId: v})}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder={allElements.length === 0 ? "No hay elementos en catálogo" : "Selecciona un elemento..."}>
                          {selectedOfferElement ? (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-muted-foreground font-mono text-[10px]">
                                [{KIND_TYPES[selectedOfferElement.kind] || selectedOfferElement.kind}]
                              </span>
                              <span className="font-semibold text-foreground">{selectedOfferElement.name}</span>
                              {selectedOfferElement.status === "draft" && (
                                <span className="text-[10px] text-amber-400 font-medium">· Borrador</span>
                              )}
                            </div>
                          ) : (editingOffer?.elementId || "Selecciona un elemento...")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredOfferElements.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            No se encontraron elementos coincidentes
                          </div>
                        ) : (
                          filteredOfferElements.map((el: any) => (
                            <SelectItem key={el.id} value={el.id} className="text-xs">
                              <div className="flex items-center justify-between gap-2 w-full">
                                <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                                  [{KIND_TYPES[el.kind] || el.kind}]
                                </span>
                                <span className="font-medium text-foreground truncate">{el.name}</span>
                                {el.status === "draft" ? (
                                  <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30 bg-amber-500/10 shrink-0 ml-auto">
                                    Borrador
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0 ml-auto">
                                    Publicado
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    {/* Selected element summary card */}
                    {selectedOfferElement && (
                      <div className="p-3 rounded-md bg-muted/40 border border-border/70 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">{selectedOfferElement.name}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4 shrink-0">
                              {KIND_TYPES[selectedOfferElement.kind] || selectedOfferElement.kind}
                            </Badge>
                            <Badge variant={selectedOfferElement.status === "published" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                              {selectedOfferElement.status === "published" ? "Publicado" : "Borrador"}
                            </Badge>
                          </div>
                        </div>
                        {selectedOfferElement.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {selectedOfferElement.description}
                          </p>
                        )}
                        {selectedOfferElement.status === "draft" && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium pt-1">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>Este elemento está en Borrador. No se mostrará en la tienda hasta ser publicado en el Catálogo.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estado de la Oferta</Label>
                    <Select 
                      value={editingOffer?.status || "available"} 
                      onValueChange={v => setEditingOffer({...editingOffer, status: v})}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecciona estado...">
                          {OFFER_STATUS_LABELS[editingOffer?.status] || editingOffer?.status}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponible (Visible en Tienda)</SelectItem>
                        <SelectItem value="draft">Borrador (Oculto)</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="ended">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prices */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Precios de Venta</Label>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1" onClick={() => {
                        setEditingOffer({
                          ...editingOffer,
                          prices: [...(editingOffer?.prices || []), { currency: "exp", amount: 100 }]
                        });
                      }}>
                        <Plus className="size-3.5" /> Añadir Precio
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {editingOffer?.prices?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No hay precios definidos para esta oferta.</p>
                      ) : (
                        editingOffer?.prices?.map((p: any, i: number) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Select value={p.currency} onValueChange={(v) => {
                              const np = [...editingOffer.prices];
                              np[i].currency = v;
                              setEditingOffer({...editingOffer, prices: np});
                            }}>
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue>
                                  {p.currency === "exp" ? "EXP (Experiencia)" : "Yen (Moneda)"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exp">EXP (Experiencia)</SelectItem>
                                <SelectItem value="yen">Yen (Moneda)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={0}
                              value={p.amount}
                              onChange={e => {
                                const np = [...editingOffer.prices];
                                np[i].amount = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setEditingOffer({...editingOffer, prices: np});
                              }}
                              className="font-mono h-8 text-xs flex-1"
                              placeholder="Cantidad..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                const np = [...editingOffer.prices];
                                np.splice(i, 1);
                                setEditingOffer({...editingOffer, prices: np});
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Limits and Stock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Stock Global</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ilimitado (dejar vacío o 0)"
                        value={editingOffer?.globalStock ?? ""}
                        onChange={e => setEditingOffer({
                          ...editingOffer,
                          globalStock: e.target.value === "" ? null : (parseInt(e.target.value, 10) || 0)
                        })}
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Deja vacío o ingresa 0 para stock global ilimitado.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Límite por Personaje</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ilimitado (dejar vacío o 0)"
                        value={editingOffer?.perCharacterLimit ?? ""}
                        onChange={e => setEditingOffer({
                          ...editingOffer,
                          perCharacterLimit: e.target.value === "" ? null : (parseInt(e.target.value, 10) || 0)
                        })}
                        className="h-8 text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Deja vacío o ingresa 0 para permitir compras ilimitadas por personaje.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Requirements Tab */}
                <TabsContent value="reqs" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Requisitos para Comprar esta Oferta</h3>
                      <p className="text-xs text-muted-foreground">Los personajes deben cumplir estos requisitos para poder adquirir este elemento.</p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addRequirementToOffer("attribute")}>
                        <Plus className="size-3.5" /> Atributo
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addRequirementToOffer("owns_element")}>
                        <Plus className="size-3.5" /> Elemento
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addRequirementToOffer("skill_level")}>
                        <Plus className="size-3.5" /> Nv. Habilidad
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addRequirementToOffer("stage")}>
                        <Plus className="size-3.5" /> Etapa
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={() => addRequirementToOffer("custom_info")}>
                        <FileText className="size-3.5" /> Info Adicional
                      </Button>
                    </div>
                  </div>

                  {(!editingOffer?.requirements?.requirements || editingOffer.requirements.requirements.length === 0) ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm space-y-2">
                      <CheckCircle2 className="size-8 text-emerald-400 mx-auto stroke-1" />
                      <p className="font-medium text-foreground">Sin requisitos de compra</p>
                      <p className="text-xs">Cualquier personaje con los fondos suficientes podrá adquirir esta oferta.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingOffer.requirements.requirements.map((req: any, idx: number) => (
                        <div key={req.id} className="p-3 bg-muted/40 border border-border/70 rounded-md space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs font-mono">#{idx + 1}</Badge>
                            <Select value={req.type} onValueChange={v => updateRequirementTypeInOffer(req.id, v)}>
                              <SelectTrigger className="h-8 text-xs w-[220px]">
                                <SelectValue placeholder="Tipo de requisito">
                                  {REQUIREMENT_TYPE_LABELS[req.type] || req.type}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="attribute">Requiere Atributo</SelectItem>
                                <SelectItem value="owns_element">Poseer Elemento</SelectItem>
                                <SelectItem value="skill_level">Nivel de Habilidad</SelectItem>
                                <SelectItem value="stage">Etapa del Personaje</SelectItem>
                                <SelectItem value="custom_info">Ingresa información adicional</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive ml-auto"
                              onClick={() => removeRequirementFromOffer(req.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          {req.type === "attribute" && (
                            <div className="flex items-center gap-2 text-xs">
                              <Select value={req.attributeId} onValueChange={v => updateRequirementInOffer(req.id, { attributeId: v })}>
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Selecciona atributo">
                                    {ATTRIBUTE_OPTIONS.find(a => a.id === req.attributeId)?.name || req.attributeId}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTRIBUTE_OPTIONS.map(attr => (
                                    <SelectItem key={attr.id} value={attr.id}>{attr.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="font-bold text-sm">≥</span>
                              <Input
                                type="number"
                                min={0}
                                value={req.value}
                                onChange={e => updateRequirementInOffer(req.id, { value: Number(e.target.value) || 0 })}
                                className="h-8 text-xs w-20 font-mono"
                              />
                            </div>
                          )}

                          {req.type === "owns_element" && (
                            <div className="space-y-1.5 text-xs">
                              <Select
                                value={req.elementId}
                                onValueChange={v => updateRequirementInOffer(req.id, { elementId: v })}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue placeholder="Selecciona el elemento requerido...">
                                    {(() => {
                                      const found = elementMap.get(req.elementId);
                                      return found ? `[${KIND_TYPES[found.kind] || found.kind}] ${found.name}` : (req.elementId || "Selecciona un elemento...");
                                    })()}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {allElements.map((el: any) => (
                                    <SelectItem key={el.id} value={el.id} className="text-xs">
                                      <span className="text-muted-foreground font-mono text-[10px] mr-1.5">
                                        [{KIND_TYPES[el.kind] || el.kind}]
                                      </span>
                                      <span className="font-medium">{el.name}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {req.type === "skill_level" && (
                            <div className="flex items-center gap-2 text-xs">
                              <Select
                                value={req.skillElementId}
                                onValueChange={v => updateRequirementInOffer(req.id, { skillElementId: v })}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Selecciona la habilidad...">
                                    {(() => {
                                      const found = elementMap.get(req.skillElementId);
                                      return found ? `[Habilidad] ${found.name}` : (req.skillElementId || "Selecciona una habilidad...");
                                    })()}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {skillElements.length === 0 ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                      No hay habilidades registradas en el catálogo
                                    </div>
                                  ) : (
                                    skillElements.map((el: any) => (
                                      <SelectItem key={el.id} value={el.id} className="text-xs">
                                        <span className="text-muted-foreground font-mono text-[10px] mr-1.5">[Habilidad]</span>
                                        <span className="font-medium">{el.name}</span>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <span className="font-bold text-sm">Nv. ≥</span>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={req.value}
                                onChange={e => updateRequirementInOffer(req.id, { value: Number(e.target.value) || 1 })}
                                className="h-8 text-xs w-16 font-mono"
                              />
                            </div>
                          )}

                          {req.type === "stage" && (
                            <div className="flex items-center gap-2 text-xs">
                              <Select
                                value={req.comparison || "gte"}
                                onValueChange={v => updateRequirementInOffer(req.id, { comparison: v })}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue>
                                    {req.comparison === "eq" ? "Exactamente (=)" : "Mínimo (≥)"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gte">Mínimo (≥)</SelectItem>
                                  <SelectItem value="eq">Exactamente (=)</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={req.stageId}
                                onValueChange={v => updateRequirementInOffer(req.id, { stageId: v })}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Selecciona etapa...">
                                    {req.stageId || "Selecciona etapa..."}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {stagesList.length === 0 ? (
                                    <div className="p-2 text-xs text-muted-foreground text-center">
                                      No hay etapas configuradas en Reglas
                                    </div>
                                  ) : (
                                    stagesList.map((st: any, sIdx: number) => {
                                      const stName = st.name || st.id || `Etapa ${sIdx + 1}`;
                                      return (
                                        <SelectItem key={stName} value={stName} className="text-xs">
                                          <span className="font-medium">{stName}</span>
                                          {st.minAge !== undefined && st.maxAge !== undefined && (
                                            <span className="text-muted-foreground text-[10px] ml-1.5 font-mono">
                                              ({st.minAge}-{st.maxAge} años)
                                            </span>
                                          )}
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {req.type === "custom_info" && (
                            <div className="space-y-2 text-xs bg-background/60 p-2.5 rounded border border-border/60">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-foreground">Etiqueta o Título del campo</Label>
                                <Input
                                  type="text"
                                  placeholder="Ej: Ingresa información adicional / Nombre o Alias falso"
                                  value={req.label ?? ""}
                                  onChange={e => updateRequirementInOffer(req.id, { label: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-foreground">Texto de ayuda o instrucción (Placeholder)</Label>
                                <Input
                                  type="text"
                                  placeholder="Ej: Especifica la identidad falsa, nombre suplantado o detalles..."
                                  value={req.placeholder ?? ""}
                                  onChange={e => updateRequirementInOffer(req.id, { placeholder: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  id={`req-required-${req.id}`}
                                  checked={req.required !== false}
                                  onChange={e => updateRequirementInOffer(req.id, { required: e.target.checked })}
                                  className="rounded border-border size-3.5"
                                />
                                <Label htmlFor={`req-required-${req.id}`} className="text-xs cursor-pointer font-normal text-muted-foreground">
                                  Campo de texto obligatorio para poder comprar
                                </Label>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setEditingOffer(null)}>Cancelar</Button>
            <Button onClick={handleSaveOffer} disabled={isSavingOffer} className="gap-2">
              {isSavingOffer && <Loader2 className="size-4 animate-spin" />}
              {isSavingOffer ? "Guardando..." : "Guardar Oferta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

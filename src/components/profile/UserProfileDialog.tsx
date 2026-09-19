import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Camera,
  Upload,
  Sparkles,
  Check,
  Loader2,
  Shield,
  Mail,
  Link2,
  X,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Curated cyberpunk & high-tech avatars for quick selection
const AVATAR_PRESETS = [
  {
    name: "Operativo",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80",
  },
  {
    name: "Netrunner",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=160&auto=format&fit=crop&q=80",
  },
  {
    name: "Ciber-Vigilante",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80",
  },
  {
    name: "Sintético",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80",
  },
  {
    name: "Táctico",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
  },
];

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { user, dbUser, updateProfileData } = useAuth();

  const currentDisplayName = dbUser?.displayName || user?.displayName || "";
  const currentAvatarUrl = dbUser?.avatarUrl || user?.photoURL || "";

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with active user data when dialog opens
  useEffect(() => {
    if (open) {
      setDisplayName(currentDisplayName);
      setAvatarUrl(currentAvatarUrl);
    }
  }, [open, currentDisplayName, currentAvatarUrl]);

  const email = dbUser?.email || user?.email || "";
  const role = dbUser?.role || "player";
  const roleLabel =
    role === "superadmin"
      ? "Superadministrador"
      : role === "moderator"
      ? "Moderador"
      : "Jugador";

  const effectiveInitial = (displayName || email || "U").charAt(0).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo seleccionado no es una imagen válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 2MB de tamaño");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        toast.success("Imagen cargada en la vista previa");
      }
    };
    reader.onerror = () => {
      toast.error("No se pudo leer el archivo de imagen");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (trimmedName && trimmedName.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileData({
        displayName: trimmedName || null,
        avatarUrl: avatarUrl.trim() || null,
      });

      toast.success("Perfil actualizado con éxito");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error?.message || "No se pudo actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    displayName.trim() !== currentDisplayName.trim() ||
    avatarUrl.trim() !== currentAvatarUrl.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl p-0 overflow-hidden" id="user-profile-dialog">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <UserCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-oxanium text-lg font-semibold tracking-wide text-foreground">
                Editar Perfil de Usuario
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Personaliza tu nombre visible y tu imagen de avatar en el sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Avatar Preview & Controls */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border border-border/60 bg-muted/30">
            <div className="relative group shrink-0">
              <Avatar className="size-20 border-2 border-primary/40 ring-2 ring-primary/10 shadow-md">
                <AvatarImage src={avatarUrl || undefined} alt={displayName || email} />
                <AvatarFallback className="font-oxanium text-2xl font-bold bg-primary/15 text-primary uppercase">
                  {effectiveInitial}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Subir imagen"
              >
                <Camera className="size-5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-oxanium font-medium text-sm text-foreground truncate max-w-[200px]">
                  {displayName || "Sin nombre asignado"}
                </span>
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-[10px] uppercase font-oxanium">
                  {roleLabel}
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Soporta enlaces URL directos (JPG, PNG, WebP) o subida directa desde tu equipo.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 font-oxanium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  Subir archivo
                </Button>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                    onClick={() => setAvatarUrl("")}
                  >
                    <X className="size-3.5" />
                    Quitar foto
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-display-name" className="text-xs font-semibold text-foreground font-oxanium flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                Nombre de Usuario / Alias
              </Label>
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Akari, Cipher, Saxagenia..."
                className="font-oxanium text-sm h-9"
                maxLength={40}
              />
              <p className="text-[11px] text-muted-foreground">
                Este es el nombre visible en la barra lateral, registros y paneles del sistema.
              </p>
            </div>

            {/* Avatar URL */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-avatar-url" className="text-xs font-semibold text-foreground font-oxanium flex items-center gap-1.5">
                <Link2 className="size-3.5 text-primary" />
                URL de Imagen / Avatar
              </Label>
              <div className="relative">
                <Input
                  id="profile-avatar-url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-avatar.png"
                  className="font-mono text-xs h-9 pr-8"
                />
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Limpiar URL"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2 pt-1">
              <Label className="text-[11px] text-muted-foreground font-oxanium flex items-center gap-1">
                <Sparkles className="size-3 text-accent1" />
                O selecciona un avatar temático predefinido:
              </Label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`relative rounded-lg overflow-hidden border transition-all shrink-0 group ${
                      avatarUrl === preset.url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100"
                    }`}
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="size-11 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {avatarUrl === preset.url && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center text-white">
                        <Check className="size-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Info (Read-only) */}
            <div className="pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                  <Mail className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground text-[11px]" title={email}>
                    {email}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                  <Shield className="size-3.5 text-primary shrink-0" />
                  <span className="truncate text-foreground text-[11px] font-oxanium font-medium">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/60 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="font-oxanium text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="font-oxanium text-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

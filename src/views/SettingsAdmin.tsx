import { SectionHeader } from "../components/common/SectionHeader";
import { Settings as SectionIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch, fetcher } from "../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Loader2, Calendar, Users, Plus, Trash2, User, Camera, Upload, Link2, Sparkles, Check, X, Shield, Mail, UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function SettingsAdmin() {
  const [loading, setLoading] = useState(true);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gameDate, setGameDate] = useState({
    year: 2201,
    month: 1,
    day: 1,
  });

  const [groups, setGroups] = useState<{ id: string; name: string; color: string }[]>([]);

  // Staff users state (Superadmin only)
  const { user, dbUser, updateProfileData } = useAuth();
  const isSuperadmin = dbUser?.role === 'superadmin';
  const { data: staffUsers, mutate: mutateStaffUsers } = useSWR(
    isSuperadmin && user ? "/api/admin/users" : null,
    fetcher
  );

  const [isInviteStaffOpen, setIsInviteStaffOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<"moderator" | "superadmin">("moderator");
  const [isInviting, setIsInviting] = useState(false);

  const [deleteStaffId, setDeleteStaffId] = useState<number | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/api/settings", {
        headers: {
          Accept: "application/json"
        }
      });
      if (!res.ok) throw new Error("Error fetching settings");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }
      const data = await res.json();
      if (data.updatedAt) setExpectedUpdatedAt(data.updatedAt);
      setGameDate(data.gameDate || { year: 2201, month: 1, day: 1 });
      setGroups(data.groups || []);
      setLoadError(null);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      setLoadError("Error al cargar los ajustes: " + error.message);
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState("time");
  
  // Profile settings state
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dbUser || user) {
      setProfileName(dbUser?.displayName || user?.displayName || "");
      setProfileAvatar(dbUser?.avatarUrl || user?.photoURL || "");
    }
  }, [dbUser, user]);

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo no es una imagen válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe exceder 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileAvatar(reader.result);
        toast.success("Imagen cargada");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileName.trim();
    if (trimmed && trimmed.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfileData({
        displayName: trimmed || null,
        avatarUrl: profileAvatar.trim() || null,
      });
      toast.success("Perfil actualizado correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveDate = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameDate, expectedUpdatedAt })
      });
      if (res.ok) {
        toast.success("Tiempo guardado correctamente");
        fetchSettings(); // refresh to get new expectedUpdatedAt
      } else {
        if (res.status === 409) {
          toast.error("Conflicto: Otro administrador modificó los ajustes. Recarga la página.");
        } else {
          throw new Error("Error saving");
        }
      }
    } catch (error) {
      toast.error("Error al guardar el tiempo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroups = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups, expectedUpdatedAt })
      });
      if (res.ok) {
        toast.success("Grupos guardados correctamente");
        fetchSettings(); // refresh to get new expectedUpdatedAt
      } else {
        if (res.status === 409) {
          toast.error("Conflicto: Otro administrador modificó los ajustes. Recarga la página.");
        } else {
          throw new Error("Error saving");
        }
      }
    } catch (error) {
      toast.error("Error al guardar los grupos");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = inviteEmail.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    setIsInviting(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          displayName: inviteDisplayName.trim() || undefined,
          role: inviteRole
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al registrar miembro del staff");
      }

      toast.success("Miembro del staff registrado correctamente");
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteRole("moderator");
      setIsInviteStaffOpen(false);
      mutateStaffUsers();
    } catch (err: any) {
      toast.error(err.message || "Error al registrar miembro del staff");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (targetUserId: number, newRole: "moderator" | "superadmin") => {
    try {
      const res = await apiFetch(`/api/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al actualizar el rol");
      }

      toast.success("Rol actualizado correctamente");
      mutateStaffUsers();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar rol");
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;
    setIsDeletingStaff(true);
    try {
      const res = await apiFetch(`/api/admin/users/${deleteStaffId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al eliminar miembro del staff");
      }

      toast.success("Miembro del staff eliminado");
      setDeleteStaffId(null);
      mutateStaffUsers();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar staff");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-destructive font-semibold">{loadError}</div>
        <Button onClick={() => { setLoading(true); fetchSettings(); }}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <SectionHeader icon={SectionIcon} title="Ajustes globales" description="Configura la cronología, grupos y equipo de staff de Shadowmore." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 no-scrollbar mb-6">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto">
            <TabsTrigger value="time">Tiempo On-Rol</TabsTrigger>
            <TabsTrigger value="groups">Grupos / Facciones</TabsTrigger>
            {isSuperadmin && <TabsTrigger value="staff">Staff y Moderadores</TabsTrigger>}
            <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Tiempo On-Rol
              </CardTitle>
              <CardDescription>
                Define la fecha actual dentro del juego. Los personajes pueden usar esto como referencia para su edad o eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Día</Label>
                  <Input 
                    id="day" 
                    type="number" 
                    min={1} 
                    max={31}
                    value={gameDate.day}
                    onChange={(e) => setGameDate({ ...gameDate, day: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <Input 
                    id="month" 
                    type="number" 
                    min={1} 
                    max={12}
                    value={gameDate.month}
                    onChange={(e) => setGameDate({ ...gameDate, month: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    value={gameDate.year}
                    onChange={(e) => setGameDate({ ...gameDate, year: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border mt-4 flex justify-end">
                <Button onClick={handleSaveDate} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Tiempo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Grupos / Facciones
              </CardTitle>
              <CardDescription>
                Define los grupos o facciones que los usuarios pueden seleccionar para sus personajes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <div key={group.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input 
                        placeholder="Nombre del Grupo" 
                        value={group.name}
                        onChange={(e) => {
                          const newGroups = [...groups];
                          newGroups[index].name = e.target.value;
                          setGroups(newGroups);
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Input 
                        type="color" 
                        value={group.color}
                        onChange={(e) => {
                          const newGroups = [...groups];
                          newGroups[index].color = e.target.value;
                          setGroups(newGroups);
                        }}
                        className="p-1 h-10 w-full cursor-pointer"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                      setGroups(groups.filter((_, i) => i !== index));
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-2 border-dashed border-2" onClick={() => {
                setGroups([...groups, { id: Date.now().toString(), name: "Nuevo Grupo", color: "#3b82f6" }]);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Grupo
              </Button>
              <div className="pt-4 border-t border-border mt-4 flex justify-end">
                <Button onClick={handleSaveGroups} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Grupos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff & Moderadores Tab */}
        {isSuperadmin && (
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Gestión de Staff y Moderadores
                  </CardTitle>
                  <CardDescription>
                    Administra quiénes tienen acceso al panel de moderación y a las herramientas de gestión de personajes y canon.
                  </CardDescription>
                </div>
                <Button onClick={() => setIsInviteStaffOpen(true)} className="gap-1.5 text-xs font-oxanium">
                  <Plus className="w-4 h-4" /> Añadir Moderador / Admin
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>Miembro del Staff</TableHead>
                        <TableHead>Email de Google</TableHead>
                        <TableHead>Rol Asignado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(staffUsers) && staffUsers.map((u: any) => {
                        const isSelf = u.id === dbUser?.id;
                        const isInvited = u.uid?.startsWith("invited_");
                        return (
                          <TableRow key={u.id} className="hover:bg-muted/20">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8 border border-border">
                                  <AvatarImage src={u.avatarUrl || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                                    {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-xs text-foreground">
                                  {u.displayName || u.email.split("@")[0]}
                                  {isSelf && <span className="text-primary ml-1.5 text-[10px]">(Tú)</span>}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {u.email}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={u.role}
                                disabled={isSelf}
                                onValueChange={(val: "moderator" | "superadmin") => handleUpdateRole(u.id, val)}
                              >
                                <SelectTrigger className="h-7 text-xs w-36 bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="moderator">Moderador</SelectItem>
                                  <SelectItem value="superadmin">Superadmin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {isInvited ? (
                                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/40 bg-amber-950/20">
                                  Pendiente de Primer Acceso
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800/40 bg-emerald-950/20">
                                  Activo / Vinculado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isSelf}
                                onClick={() => setDeleteStaffId(u.id)}
                                className="size-8 text-destructive hover:bg-destructive/10"
                                title={isSelf ? "No puedes eliminar tu propia cuenta" : "Eliminar staff"}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!Array.isArray(staffUsers) || staffUsers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                            No hay otros miembros de staff registrados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Modal Añadir Staff */}
            <Dialog open={isInviteStaffOpen} onOpenChange={setIsInviteStaffOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <UserCheck className="w-5 h-5 text-primary" />
                    Añadir Miembro del Staff
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Registra la cuenta de correo de Google de la persona que tendrá acceso como Moderador o Superadministrador.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateStaff} className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-email" className="text-xs">Correo de Google (Obligatorio)</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      required
                      placeholder="usuario@gmail.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="staff-name" className="text-xs">Nombre o Alias Visible (Opcional)</Label>
                    <Input
                      id="staff-name"
                      placeholder="Ej. Moderador Carlos"
                      value={inviteDisplayName}
                      onChange={(e) => setInviteDisplayName(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rol Asignado</Label>
                    <Select value={inviteRole} onValueChange={(v: "moderator" | "superadmin") => setInviteRole(v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moderator">
                          <span className="font-semibold block">Moderador</span>
                          <span className="text-[11px] text-muted-foreground">Gestión de personajes, canon, jugadores, técnicas y compras.</span>
                        </SelectItem>
                        <SelectItem value="superadmin">
                          <span className="font-semibold block">Superadministrador</span>
                          <span className="text-[11px] text-muted-foreground">Acceso total a reglas de sistema, diseño de ficha y staff.</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="pt-3">
                    <Button type="button" variant="ghost" onClick={() => setIsInviteStaffOpen(false)} disabled={isInviting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isInviting} className="gap-1.5 text-xs">
                      {isInviting && <Loader2 className="size-3.5 animate-spin" />}
                      Guardar Miembro
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Confirm Delete Staff */}
            <AlertDialog open={!!deleteStaffId} onOpenChange={(open) => !open && setDeleteStaffId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Revocar acceso al miembro del Staff?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Esta acción eliminará los permisos administrativos de este usuario. Ya no podrá iniciar sesión en el panel.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingStaff}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteStaff}
                    disabled={isDeletingStaff}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeletingStaff ? <Loader2 className="size-4 animate-spin" /> : "Revocar Acceso"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-oxanium">
                <User className="w-5 h-5 text-primary" />
                Mi Perfil de Usuario
              </CardTitle>
              <CardDescription>
                Personaliza tu nombre visible y tu imagen de avatar en la consola administrativa y en el registro de auditoría.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="relative group shrink-0">
                    <Avatar className="size-24 border-2 border-primary/40 ring-2 ring-primary/10 shadow-md">
                      <AvatarImage src={profileAvatar || undefined} alt={profileName || user?.email || "U"} />
                      <AvatarFallback className="font-oxanium text-3xl font-bold bg-primary/15 text-primary uppercase">
                        {(profileName || user?.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => profileFileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Cambiar foto"
                    >
                      <Camera className="size-6" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="font-oxanium font-semibold text-base text-foreground truncate max-w-[240px]">
                        {profileName || "Sin nombre asignado"}
                      </span>
                      <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs font-oxanium uppercase">
                        {dbUser?.role === "superadmin" ? "Superadministrador" : dbUser?.role === "moderator" ? "Moderador" : "Jugador"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                      <Mail className="size-3.5" />
                      <span>{dbUser?.email || user?.email}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                      <input
                        ref={profileFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfileFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-oxanium gap-1.5"
                        onClick={() => profileFileInputRef.current?.click()}
                      >
                        <Upload className="size-3.5" />
                        Subir desde equipo
                      </Button>
                      {profileAvatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                          onClick={() => setProfileAvatar("")}
                        >
                          <X className="size-3.5" />
                          Quitar foto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="settings-display-name" className="text-xs font-semibold font-oxanium flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" />
                      Nombre de Usuario / Alias
                    </Label>
                    <Input
                      id="settings-display-name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Ej. Akari, Cipher, Saxagenia..."
                      className="font-oxanium"
                      maxLength={40}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Visible en la barra lateral, auditoría y paneles.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settings-avatar-url" className="text-xs font-semibold font-oxanium flex items-center gap-1.5">
                      <Link2 className="size-3.5 text-primary" />
                      URL de Imagen Avatar
                    </Label>
                    <div className="relative">
                      <Input
                        id="settings-avatar-url"
                        value={profileAvatar}
                        onChange={(e) => setProfileAvatar(e.target.value)}
                        placeholder="https://ejemplo.com/avatar.png"
                        className="font-mono text-xs pr-8"
                      />
                      {profileAvatar && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatar("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          title="Limpiar URL"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Pega un enlace web directo a tu imagen.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button type="submit" disabled={savingProfile} className="font-oxanium gap-1.5">
                    {savingProfile ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Guardar Perfil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


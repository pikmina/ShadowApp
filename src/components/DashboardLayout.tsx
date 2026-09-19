import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Database, ChevronRight, FileText, LayoutTemplate, Library, LogOut, Menu, Settings, ShieldCheck, ShoppingCart, Swords, UserRound, Component, History, UserCog } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { UserProfileDialog } from "./profile/UserProfileDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from "./ui/sidebar";

const navigation = [
  { label: "Principal", roles: ["superadmin", "moderator"], items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ] },
  { label: "Sistema", roles: ["superadmin"], items: [
    { to: "/rules", label: "Reglas del sistema", icon: BookOpen },
    { to: "/catalog", label: "Catálogo", icon: Library },
    { to: "/techniques", label: "Técnicas", icon: Swords },
  ] },
  { label: "Gestión", roles: ["superadmin", "moderator"], items: [
    { to: "/character-editor", label: "Personajes", icon: UserRound },
    { to: "/canon", label: "Catálogo Canon", icon: Library },
    { to: "/employments", label: "Empleos", icon: FileText },
    { to: "/classes", label: "Clases", icon: FileText },
    { to: "/shop", label: "Tienda", icon: ShoppingCart },
  ] },
  { label: "Documentación", roles: ["superadmin", "moderator", "user"], items: [
    { to: "/manual", label: "Manual del Sistema", icon: BookOpen, external: true },
    { to: "/registry", label: "Registros", icon: Database, external: true },
  ] },
  { label: "Administración", roles: ["superadmin"], items: [
    { to: "/sheet-builder", label: "Diseño de ficha", icon: LayoutTemplate },
    { to: "/settings", label: "Ajustes globales", icon: Settings },
    { to: "/showcase", label: "Componentes UI", icon: Component },
    { to: "/showcase-variables", label: "Guía de Variables", icon: FileText },
    { to: "/audit", label: "Auditoría", icon: History },
  ] },
];

export default function DashboardLayout() {
  const { user, dbUser, logout } = useAuth();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const userRole = dbUser?.role;

  // Filter navigation based on role
  const filteredNavigation = navigation
    .filter(section => section.roles.includes(userRole))
    .map(section => ({
      ...section,
      items: section.items
    }));

  const currentSection = filteredNavigation.find(section => section.items.some(item => item.to === location.pathname));
  const currentPage = currentSection?.items.find(item => item.to === location.pathname);
  const email = dbUser?.email || user?.email || "Usuario";
  const displayName = dbUser?.displayName || user?.displayName || (email.includes("@") ? email.split("@")[0] : "Usuario");
  const avatarUrl = dbUser?.avatarUrl || user?.photoURL || "";
  const displayInitial = (displayName || email || "U").charAt(0).toUpperCase();
  const roleLabel = dbUser?.role === "superadmin" ? "Administrador" : dbUser?.role === "moderator" ? "Moderador" : "Sesión iniciada";

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:ring-2 focus:ring-ring">Saltar al contenido</a>
        
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-oxanium text-lg font-semibold tracking-wide text-foreground">SHADOWMORE</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">v 4.5.0</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            {filteredNavigation.map((section) => (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-4">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.to}>
                          {item.external ? (
                            <a href={item.to} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full font-oxanium">
                              <item.icon className="size-[18px] shrink-0 text-accent1" aria-hidden="true" />
                              <span className="flex-1">{item.label}</span>
                            </a>
                          ) : (
                            <NavLink to={item.to} className="flex items-center gap-3 w-full font-oxanium">
                              <item.icon className="size-[18px] shrink-0 text-accent1" aria-hidden="true" />
                              <span className="flex-1">{item.label}</span>
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          
          <SidebarFooter className="border-t border-border p-3 space-y-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-full text-left p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
              title="Haz clic para editar tu perfil"
              id="sidebar-profile-trigger"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="size-8 shrink-0 border border-border/80 group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="font-oxanium text-xs font-bold uppercase bg-primary/15 text-primary">
                    {displayInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground font-oxanium group-hover:text-primary transition-colors" title={displayName}>
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground" title={email}>
                    {email}
                  </p>
                </div>
              </div>
              <div className="size-6 rounded-md flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                <UserCog className="size-3.5" />
              </div>
            </button>

            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 gap-2" onClick={() => void logout()}>
              <LogOut className="size-3.5" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background h-full">
          <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 sm:px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="hidden text-muted-foreground sm:inline">{currentSection?.label || "Sistema"}</span>
              <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
              <span className="truncate font-medium">{currentPage?.label || "Shadowmore"}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-muted/40 transition-all group cursor-pointer"
                title="Editar mi perfil"
                id="header-profile-trigger"
              >
                <Avatar className="size-5 border border-border/80">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="font-oxanium text-[9px] font-bold text-primary bg-primary/10">
                    {displayInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="font-oxanium text-[11px] font-medium text-foreground group-hover:text-primary transition-colors max-w-[130px] truncate">
                  {displayName}
                </span>
              </button>

              <span className="shrink-0 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-oxanium">
                {roleLabel}
              </span>
            </div>
          </header>
          
          <main id="workspace-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
            <div className="admin-workspace mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>

      <UserProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </SidebarProvider>
  );
}

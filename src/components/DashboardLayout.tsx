import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, ChevronRight, FileText, LayoutTemplate, Library, LogOut, Menu, Settings, ShieldCheck, ShoppingCart, Swords, UserRound, X, Component } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";

const navigation = [
  { label: "Sistema", roles: ["superadmin"], items: [
    { to: "/rules", label: "Reglas del sistema", icon: BookOpen },
    { to: "/catalog", label: "Catálogo", icon: Library },
    { to: "/techniques", label: "Técnicas", icon: Swords },
  ] },
  { label: "Gestión", roles: ["superadmin", "moderator"], items: [
    { to: "/character-editor", label: "Personajes", icon: UserRound },
    { to: "/canon", label: "Catálogo Canon", icon: Library },
    { to: "/employments", label: "Empleos y Cargos", icon: FileText },
    { to: "/classes", label: "Clases y Grupos", icon: FileText },
    { to: "/shop", label: "Tienda", icon: ShoppingCart },
  ] },
  { label: "Documentación", roles: ["superadmin", "moderator", "user"], items: [
    { to: "/manual", label: "Manual del Sistema", icon: BookOpen },
  ] },
  { label: "Administración", roles: ["superadmin"], items: [
    { to: "/sheet-builder", label: "Diseño de ficha", icon: LayoutTemplate },
    { to: "/settings", label: "Ajustes globales", icon: Settings },
    { to: "/showcase", label: "Componentes UI", icon: Component },
    { to: "/audit", label: "Auditoría", icon: FileText },
  ] },
];

export default function DashboardLayout() {
  const { user, dbUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const userRole = dbUser?.role;

  // Filter navigation based on role
  const filteredNavigation = navigation
    .filter(section => section.roles.includes(userRole))
    .map(section => ({
      ...section,
      items: section.items // If we wanted to filter specific items within a section, we would do it here
    }));

  const currentSection = filteredNavigation.find(section => section.items.some(item => item.to === location.pathname));
  const currentPage = currentSection?.items.find(item => item.to === location.pathname);
  const email = dbUser?.email || user?.email || "Usuario";
  const roleLabel = dbUser?.role === "superadmin" ? "Administrador" : dbUser?.role === "moderator" ? "Moderador" : "Sesión iniciada";
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const renderNavigation = () => (
    <>
      <div className="border-b border-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><ShieldCheck className="size-5" aria-hidden="true" /></div>
          <div><p className="font-oxanium text-lg font-semibold tracking-wide text-foreground">SHADOWMORE</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Administración del sistema</p></div>
        </div>
      </div>
      <nav aria-label="Navegación principal" className="min-h-0 flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {filteredNavigation.map(section => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.label}</p>
            <div className="space-y-1">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `admin-nav-link ${isActive ? "admin-nav-link-active" : ""}`}>
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" /><span className="flex-1">{label}</span>{location.pathname === to && <ChevronRight className="size-3.5" aria-hidden="true" />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-oxanium font-semibold uppercase">{email.charAt(0)}</div>
          <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground" title={email}>{email}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{roleLabel}</p></div>
        </div>
        <Button variant="ghost" className="min-h-11 w-full justify-start text-muted-foreground" onClick={() => { setMobileMenuOpen(false); void logout(); }}><LogOut className="size-4" aria-hidden="true" />Cerrar sesión</Button>
      </div>
    </>
  );
  return (
    <div className="admin-shell flex h-dvh overflow-hidden bg-background text-foreground">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:ring-2 focus:ring-ring">Saltar al contenido</a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">{renderNavigation()}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 sm:px-6">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir navegación" />}><Menu className="size-5" /></SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="admin-mobile-nav !w-72 !max-w-[90vw] gap-0 bg-card">
              <SheetTitle className="sr-only">Navegación de Shadowmore</SheetTitle>
              <SheetDescription className="sr-only">Accede a los módulos de administración y gestión.</SheetDescription>
              <SheetClose render={<Button variant="ghost" size="icon-sm" className="absolute right-1 top-1" aria-label="Cerrar navegación" />}><X className="size-4" /></SheetClose>
              {renderNavigation()}
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 items-center gap-2 text-xs"><span className="hidden text-muted-foreground sm:inline">{currentSection?.label || "Sistema"}</span><ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" /><span className="truncate font-medium">{currentPage?.label || "Shadowmore"}</span></div>
          <span className="ml-auto shrink-0 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{roleLabel}</span>
        </header>
        <main id="workspace-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="admin-workspace mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

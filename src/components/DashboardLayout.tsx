import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Database, ChevronRight, FileText, LayoutTemplate, Library, LogOut, Menu, Settings, ShieldCheck, ShoppingCart, Swords, UserRound, Component } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
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
    { to: "/audit", label: "Auditoría", icon: FileText },
  ] },
];

export default function DashboardLayout() {
  const { user, dbUser, logout } = useAuth();
  const location = useLocation();
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
          
          <SidebarFooter className="border-t border-border p-4">
            <div className="mb-3 flex items-center gap-3 px-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-oxanium font-semibold uppercase">{email.charAt(0)}</div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground" title={email}>{email}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <Button variant="ghost" className="min-h-11 w-full justify-start text-muted-foreground" onClick={() => void logout()}>
              <LogOut className="size-4" aria-hidden="true" />
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
            <span className="ml-auto shrink-0 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{roleLabel}</span>
          </header>
          
          <main id="workspace-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
            <div className="admin-workspace mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

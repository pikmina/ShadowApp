import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Book, ShoppingCart, ShieldAlert, Settings, Menu, X, FileText, User } from "lucide-react";
import { Button } from "./ui/button";

export default function DashboardLayout() {
  const { user, dbUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile navigation on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle body scroll locking and Escape key when mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const adminLinks = [
    { to: "/settings", label: "Ajustes Globales", icon: <Settings className="w-5 h-5" /> },
    { to: "/rules", label: "Reglas", icon: <FileText className="w-5 h-5" /> },
    { to: "/sheet-builder", label: "Diseño de Ficha", icon: <FileText className="w-5 h-5" /> },
    { to: "/catalog", label: "Catálogo", icon: <Book className="w-5 h-5" /> },
    { to: "/techniques", label: "Técnicas", icon: <Book className="w-5 h-5" /> },
    { to: "/shop", label: "Tienda", icon: <ShoppingCart className="w-5 h-5" /> },
    { to: "/audit", label: "Auditoría", icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  const playerLinks = [
    { to: "/my-sheet", label: "Mi Ficha (Mock)", icon: <User className="w-5 h-5" /> },
  ];

  const renderNavContent = (isMobile = false) => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Shadowmore
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
            System Admin
          </p>
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú de navegación"
          >
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-4 overflow-y-auto">
        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Administración</h3>
          <div className="space-y-1">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => {
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium min-h-[44px] ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jugador</h3>
          <div className="space-y-1">
            {playerLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => {
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium min-h-[44px] ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-foreground uppercase">
            {dbUser?.email ? dbUser.email.charAt(0) : (user?.email ? user.email.charAt(0) : "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{dbUser?.email || user?.email || "Usuario"}</p>
            <p className="text-xs text-muted-foreground capitalize">{dbUser?.role || "player"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px]"
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
            logout();
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border text-muted-foreground hidden md:flex flex-col flex-shrink-0">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border text-muted-foreground flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menú de navegación móvil"
      >
        {renderNavContent(true)}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border text-foreground p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Shadowmore
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

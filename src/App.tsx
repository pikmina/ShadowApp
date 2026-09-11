/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import DashboardLayout from "./components/DashboardLayout";
import RulesAdmin from "./views/RulesAdmin";
import Shop from "./views/Shop";
import CatalogAdmin from "./views/CatalogAdmin";
import TechniquesAdmin from "./views/TechniquesAdmin";

import SheetBuilderAdmin from "./views/SheetBuilderAdmin";
import SettingsAdmin from "./views/SettingsAdmin";

import CharactersAdmin from "./views/CharactersAdmin";
import PublicSheet from "./views/PublicSheet";
import ComponentShowcase from "./views/ComponentShowcase";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading, unauthorized } = useAuth();
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background">Cargando sistema...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (unauthorized || !dbUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Acceso No Autorizado</h1>
        <p className="text-muted-foreground mb-4">Tu cuenta no tiene privilegios administrativos en este sistema.</p>
        <button onClick={() => window.location.href = '/login'} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Volver</button>
      </div>
    );
  }
  
  return <>{children}</>;
}


function IndexRedirector() {
  const { dbUser } = useAuth();
  const role = dbUser?.role;
  
  if (role === "superadmin") {
    return <Navigate to="/rules" replace />;
  }
  return <Navigate to="/character-editor" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background">Iniciando...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/sheet/:id" element={<PublicSheet />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<IndexRedirector />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="rules" element={<RulesAdmin />} />
        <Route path="catalog" element={<CatalogAdmin />} />
        <Route path="techniques" element={<TechniquesAdmin />} />
        <Route path="sheet-builder" element={<SheetBuilderAdmin />} />
        <Route path="character-editor" element={<CharactersAdmin />} />
        <Route path="shop" element={<Shop />} />
        <Route path="showcase" element={<ComponentShowcase />} />
        <Route path="audit" element={<div className="p-8 text-center text-muted-foreground">Log de Auditoría (Próxima Fase)</div>} />
      </Route>
    </Routes>
  );
}

import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

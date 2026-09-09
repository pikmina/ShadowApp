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

import PlayerSheet from "./views/PlayerSheet";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background">Cargando sistema...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background">Iniciando...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/rules" replace />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="rules" element={<RulesAdmin />} />
        <Route path="catalog" element={<CatalogAdmin />} />
        <Route path="techniques" element={<TechniquesAdmin />} />
        <Route path="sheet-builder" element={<SheetBuilderAdmin />} />
        <Route path="my-sheet" element={<PlayerSheet />} />
        <Route path="shop" element={<Shop />} />
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

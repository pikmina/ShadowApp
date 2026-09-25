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
import CanonCharactersAdmin from "./views/CanonCharactersAdmin";
import EmploymentsAdmin from "./views/EmploymentsAdmin";
import ClassesAdmin from "./views/ClassesAdmin";
import PublicSheet from "./views/PublicSheet";
import SuperSheet from "./views/SuperSheet";
import ComponentShowcase from "./views/ComponentShowcase";
import SystemManual from "./views/SystemManual";
import AuditLogsAdmin from "./views/AuditLogsAdmin";
import AdminDashboard from "./views/AdminDashboard";


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
  
  if (role === "superadmin" || role === "moderator") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/character-editor" replace />;
}

import DevVariablesShowcase from "./views/DevVariablesShowcase";
import PublicRegistry from "./views/PublicRegistry";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-background">Iniciando...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/sheet/:id" element={<PublicSheet />} />
      <Route path="/supersheet/:identifier" element={<SuperSheet />} />
      <Route path="/supersheet" element={<PublicRegistry />} />
      <Route path="/registry" element={<PublicRegistry />} />
      <Route path="/manual" element={<SystemManual />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<IndexRedirector />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="rules" element={<RulesAdmin />} />
        <Route path="catalog" element={<CatalogAdmin />} />
        <Route path="techniques" element={<TechniquesAdmin />} />
        <Route path="sheet-builder" element={<SheetBuilderAdmin />} />
        <Route path="character-editor" element={<CharactersAdmin />} />
        <Route path="characters" element={<CharactersAdmin />} />
        <Route path="canon" element={<CanonCharactersAdmin />} />
        <Route path="employments" element={<EmploymentsAdmin />} />
        <Route path="classes" element={<ClassesAdmin />} />
        <Route path="shop" element={<Shop />} />
        <Route path="showcase" element={<ComponentShowcase />} />
        <Route path="showcase-variables" element={<DevVariablesShowcase />} />
        <Route path="audit" element={<AuditLogsAdmin />} />
      </Route>
    </Routes>
  );
}

import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

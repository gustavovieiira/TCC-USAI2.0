import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CadastroPage } from '@/pages/CadastroPage';
import { CatalogoPage } from '@/pages/CatalogoPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ItemDetalhePage } from '@/pages/ItemDetalhePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { MinhasLocacoesPage } from '@/pages/MinhasLocacoesPage';
import { PublicarItemPage } from '@/pages/PublicarItemPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalogo" element={<CatalogoPage />} />
          <Route path="/itens/novo" element={<PublicarItemPage />} />
          <Route path="/itens/:id" element={<ItemDetalhePage />} />
          <Route path="/locacoes" element={<MinhasLocacoesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

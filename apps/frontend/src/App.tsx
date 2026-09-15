import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AcompanhamentoPage } from '@/pages/AcompanhamentoPage';
import { AnunciarPage } from '@/pages/AnunciarPage';
import { CadastroPage } from '@/pages/CadastroPage';
import { CatalogoPage } from '@/pages/CatalogoPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/anunciar" element={<AnunciarPage />} />
        <Route path="/acompanhamento" element={<AcompanhamentoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

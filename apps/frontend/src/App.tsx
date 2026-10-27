import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { AdminPage } from '@/pages/AdminPage';
import { CadastroPage } from '@/pages/CadastroPage';
import { CatalogoPage } from '@/pages/CatalogoPage';
import { ConversaPage } from '@/pages/ConversaPage';
import { ItemDetalhePage } from '@/pages/ItemDetalhePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { MinhasConversasPage } from '@/pages/MinhasConversasPage';
import { MinhasLocacoesPage } from '@/pages/MinhasLocacoesPage';
import { MuralPage } from '@/pages/MuralPage';
import { PerfilPage } from '@/pages/PerfilPage';
import { PostDetalhePage } from '@/pages/PostDetalhePage';
import { PublicarItemPage } from '@/pages/PublicarItemPage';
import { NotificacoesPage } from '@/pages/NotificacoesPage';
import { SaquesPage } from '@/pages/SaquesPage';
import { SindicoPage } from '@/pages/SindicoPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/notificacoes" element={<NotificacoesPage />} />

          <Route element={<RoleRoute allow={['MORADOR']} />}>
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/itens/novo" element={<PublicarItemPage />} />
            <Route path="/itens/:id" element={<ItemDetalhePage />} />
            <Route path="/locacoes" element={<MinhasLocacoesPage />} />
          </Route>

          <Route element={<RoleRoute allow={['MORADOR', 'SINDICO']} />}>
            <Route path="/saques" element={<SaquesPage />} />
            <Route path="/mural" element={<MuralPage />} />
            <Route path="/mural/:id" element={<PostDetalhePage />} />
            <Route path="/conversas" element={<MinhasConversasPage />} />
            <Route path="/conversas/:id" element={<ConversaPage />} />
          </Route>

          <Route element={<RoleRoute allow={['SINDICO']} />}>
            <Route path="/sindico" element={<SindicoPage />} />
          </Route>

          <Route element={<RoleRoute allow={['ADMIN']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

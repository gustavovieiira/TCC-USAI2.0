import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth/login/LoginForm';
import { homeRouteFor, saveSession } from '@/lib/authStorage';
import { AuthShell } from './AuthShell';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Entrar na USAI"
      subtitle="Acesse sua conta para ver o catálogo do seu condomínio."
    >
      <LoginForm
        onSuccess={(result) => {
          saveSession(result.accessToken, result.refreshToken, result.user);
          navigate(homeRouteFor(result.user.papel));
        }}
      />
      <p className="mt-6 text-center text-sm text-slate-500">
        Recebeu um link de convite do seu condomínio?{' '}
        <Link to="/cadastro" className="font-medium text-brand-600 hover:underline">
          Cadastre-se por aqui
        </Link>
      </p>
    </AuthShell>
  );
}

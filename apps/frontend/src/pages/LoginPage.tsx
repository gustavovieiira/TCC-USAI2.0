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
          void navigate(homeRouteFor(result.user.papel));
        }}
      />
      <p className="mt-4 text-center text-sm">
        <Link
          to="/esqueci-senha"
          className="inline-block py-2 font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-fachada-tinta-suave">
        Recebeu um link de convite do seu condomínio?{' '}
        <Link
          to="/cadastro"
          className="inline-block py-2 font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          Cadastre-se por aqui
        </Link>
      </p>
    </AuthShell>
  );
}

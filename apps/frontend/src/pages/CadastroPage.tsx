import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CadastroForm } from '@/features/auth/cadastro/CadastroForm';
import { homeRouteFor, saveSession } from '@/lib/authStorage';
import { AuthShell } from './AuthShell';

export function CadastroPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linkSlug, setLinkSlug] = useState(searchParams.get('condominio') ?? '');

  if (!linkSlug) {
    return (
      <AuthShell
        title="Entrar no seu condomínio"
        subtitle="Informe o código do link exclusivo enviado pelo síndico."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = form.elements.namedItem('linkSlug') as HTMLInputElement;
            setLinkSlug(input.value.trim());
          }}
        >
          <input
            name="linkSlug"
            placeholder="ex.: residencial-jardim-europa"
            required
            className="min-h-[48px] rounded-[12px] border-2 border-fachada-tinta/25 bg-white px-3.5 py-2 text-fachada-tinta outline-none focus:border-fachada-coral-texto"
          />
          <button type="submit" className="botao-coral w-full">
            Continuar
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar sua conta" subtitle={`Condomínio: ${linkSlug}`}>
      <CadastroForm
        linkSlug={linkSlug}
        onSuccess={(result) => {
          saveSession(result.accessToken, result.refreshToken, result.user);
          void navigate(homeRouteFor(result.user.papel));
        }}
      />
      <p className="mt-6 text-center text-sm text-fachada-tinta-suave">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

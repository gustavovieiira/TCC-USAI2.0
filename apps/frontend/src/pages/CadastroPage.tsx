import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500
              focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700"
          >
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
          navigate(homeRouteFor(result.user.papel));
        }}
      />
    </AuthShell>
  );
}

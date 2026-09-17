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
            className="min-h-[44px] border border-ink/40 bg-paper-surface px-3 py-2 text-ink
              outline-none focus:border-ink"
          />
          <button
            type="submit"
            className="notch min-h-[44px] bg-barro-500 px-4 py-2.5 font-bold text-paper-surface
              shadow-press hover:bg-barro-700"
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

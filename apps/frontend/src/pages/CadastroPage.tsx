import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CadastroForm } from '@/features/auth/cadastro/CadastroForm';
import { extrairCodigoDoCondominio } from '@/features/auth/cadastro/codigoDoCondominio';
import { homeRouteFor, saveSession } from '@/lib/authStorage';
import { AuthShell } from './AuthShell';

export function CadastroPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [linkSlug, setLinkSlug] = useState(
    extrairCodigoDoCondominio(searchParams.get('condominio') ?? '') ?? '',
  );
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

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
            const codigo = extrairCodigoDoCondominio(input.value);
            if (!codigo) {
              setErroCodigo(
                'Não reconheci esse código. Cole o link que o síndico enviou ou só o código (ex.: residencial-jardim-europa).',
              );
              return;
            }
            setErroCodigo(null);
            setLinkSlug(codigo);
          }}
        >
          <input
            name="linkSlug"
            placeholder="ex.: residencial-jardim-europa"
            aria-label="Código ou link do condomínio"
            aria-invalid={erroCodigo ? true : undefined}
            aria-describedby={erroCodigo ? 'erro-codigo' : undefined}
            required
            className="min-h-[48px] rounded-[12px] border-2 border-fachada-tinta/25 bg-white px-3.5 py-2 text-fachada-tinta outline-none focus:border-fachada-coral-texto"
          />
          {erroCodigo && (
            <p id="erro-codigo" role="alert" className="text-sm text-fachada-coral-texto">
              {erroCodigo}
            </p>
          )}
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
      <p className="mt-4 text-center text-sm text-fachada-tinta-suave">
        Não é esse condomínio?{' '}
        <button
          type="button"
          onClick={() => setLinkSlug('')}
          className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          Trocar o código
        </button>
      </p>
      <p className="mt-3 text-center text-sm text-fachada-tinta-suave">
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

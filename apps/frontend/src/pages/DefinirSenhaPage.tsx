import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { definirSenha } from '@/features/auth/auth.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { saveSession } from '@/lib/authStorage';
import { AuthShell } from './AuthShell';

/** Destino do link do e-mail de acesso: o síndico cria a primeira senha e já entra no painel. */
export function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);
    try {
      const result = await definirSenha(token, senha);
      saveSession(result.accessToken, result.refreshToken, result.user);
      navigate('/sindico', { replace: true });
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Link inválido" subtitle="Use o link que enviamos para o seu e-mail.">
        <p className="text-center text-sm text-fachada-tinta-suave">
          Esse endereço não tem o código de acesso. Abra o e-mail da USAI e clique no botão de lá.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Ir para o login
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crie a sua senha"
      subtitle="Bem-vindo à USAI! Defina a senha do síndico para entrar no painel."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nova senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <TextField
          label="Repita a senha"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        <p className="text-xs text-fachada-tinta-suave">Use pelo menos 8 caracteres.</p>

        {erro && (
          <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
            {erro}
          </p>
        )}

        <Button type="submit" isLoading={enviando}>
          Criar senha e entrar
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-fachada-tinta/20 pt-4 text-center text-xs text-fachada-tinta-suave">
        <p>
          Depois de criar a senha, você entra sempre pela página <strong>Entrar</strong>, com o seu
          e-mail e a senha que definiu.
        </p>
        <p>
          Já criou a sua senha?{' '}
          <Link
            to="/login"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

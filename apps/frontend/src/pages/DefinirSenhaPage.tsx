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
        <p className="text-center text-sm text-ink-soft">
          Esse endereço não tem o código de acesso. Abra o e-mail da USAI e clique no botão de lá.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-barro-700 hover:underline">
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
        <p className="text-xs text-ink-faint">Use pelo menos 8 caracteres.</p>

        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}

        <Button type="submit" isLoading={enviando}>
          Criar senha e entrar
        </Button>
      </form>
    </AuthShell>
  );
}

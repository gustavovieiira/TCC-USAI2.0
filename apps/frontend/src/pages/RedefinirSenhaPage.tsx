import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { redefinirSenha } from '@/features/auth/auth.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { AuthShell } from './AuthShell';

/** Destino do link do e-mail "Esqueci minha senha": escolhe a senha nova e volta para o Entrar. */
export function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);
    try {
      await redefinirSenha(token, senha);
      setConcluido(true);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <AuthShell title="Senha alterada" subtitle="Pronto! Agora é só entrar com a senha nova.">
        <p role="status" className="text-center text-sm text-fachada-tinta-suave">
          Use o seu e-mail e a senha que você acabou de criar na página <strong>Entrar</strong>.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/login" className="botao-coral">
            Ir para Entrar
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell title="Link inválido" subtitle="Use o link que enviamos para o seu e-mail.">
        <p className="text-center text-sm text-fachada-tinta-suave">
          Esse endereço não tem o código para criar a nova senha. Abra o e-mail da USAI e clique no
          botão de lá, ou peça um novo link.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/esqueci-senha"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Pedir um novo link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crie uma nova senha"
      subtitle="Escolha a senha que você vai usar para entrar."
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
          Salvar nova senha
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-fachada-tinta-suave">
        O link expirou ou não funciona?{' '}
        <Link
          to="/esqueci-senha"
          className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          Pedir um novo link
        </Link>
      </p>
    </AuthShell>
  );
}

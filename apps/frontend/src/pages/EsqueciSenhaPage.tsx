import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { esqueciSenha } from '@/features/auth/auth.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { AuthShell } from './AuthShell';

/** "Esqueci minha senha": pede o e-mail da conta e manda um link para criar uma senha nova. */
export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await esqueciSenha(email.trim());
      setEnviadoPara(email.trim());
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  if (enviadoPara) {
    return (
      <AuthShell
        title="Confira o seu e-mail"
        subtitle="Se houver uma conta com esse endereço, o link já está a caminho."
      >
        <div className="flex flex-col gap-3 text-center text-sm text-fachada-tinta-suave">
          <p role="status">
            Enviamos para <strong className="text-fachada-tinta">{enviadoPara}</strong> um link para
            criar uma nova senha. Ele vale por 1 hora e só pode ser usado uma vez.
          </p>
          <p className="text-xs text-fachada-tinta-suave">
            Não chegou? Veja a caixa de spam (marque como &quot;não é spam&quot;) e confira se o
            e-mail está escrito certo.
          </p>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Voltar para Entrar
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {erro && (
          <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
            {erro}
          </p>
        )}

        <Button type="submit" isLoading={enviando}>
          Enviar link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fachada-tinta-suave">
        Lembrou a senha?{' '}
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

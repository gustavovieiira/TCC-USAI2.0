import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { AuthResponse, cadastrarMorador } from '../auth.api';

interface CadastroFormProps {
  linkSlug: string;
  onSuccess: (result: AuthResponse) => void;
}

export function CadastroForm({ linkSlug, onSuccess }: CadastroFormProps) {
  const [pin, setPin] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [aceito, setAceito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await cadastrarMorador({
        linkSlug,
        pin,
        nome,
        email,
        senha,
        apartamento,
        aceiteTermos: aceito,
      });
      onSuccess(result);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="PIN do condomínio"
        name="pin"
        inputMode="numeric"
        required
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <TextField
        label="Nome completo"
        name="nome"
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />
      <p className="-mt-2 text-xs text-fachada-tinta-suave">
        Use de 8 a 72 caracteres e evite senhas óbvias, como 12345678.
      </p>
      <TextField
        label="Apartamento (opcional)"
        name="apartamento"
        value={apartamento}
        onChange={(e) => setApartamento(e.target.value)}
      />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-fachada-coral-texto"
        />
        <span>
          Li e aceito os{' '}
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
          >
            Política de Privacidade
          </a>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
          {error}
        </p>
      )}
      <Button type="submit" isLoading={isLoading} disabled={!aceito}>
        Criar conta
      </Button>
    </form>
  );
}

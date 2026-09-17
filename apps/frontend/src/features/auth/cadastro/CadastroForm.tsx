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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await cadastrarMorador({ linkSlug, pin, nome, email, senha, apartamento });
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
      <TextField
        label="Apartamento (opcional)"
        name="apartamento"
        value={apartamento}
        onChange={(e) => setApartamento(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-carmim-700">
          {error}
        </p>
      )}
      <Button type="submit" isLoading={isLoading}>
        Criar conta
      </Button>
    </form>
  );
}

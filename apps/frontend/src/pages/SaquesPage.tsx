import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SaqueStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { listarMeusSaques, solicitarSaque } from '@/features/saques/saques.api';
import { SaqueDTO } from '@/features/saques/saques.types';

export function SaquesPage() {
  const [saques, setSaques] = useState<SaqueDTO[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [valor, setValor] = useState('');
  const [chavePixUsada, setChavePixUsada] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function carregar() {
    listarMeusSaques()
      .then(setSaques)
      .catch((err) => setErroLista(extractErrorMessage(err)));
  }

  useEffect(carregar, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroForm(null);
    setIsLoading(true);

    try {
      const novo = await solicitarSaque({ valor: Number(valor), chavePixUsada });
      setSaques((atual) => (atual ? [novo, ...atual] : [novo]));
      setValor('');
      setChavePixUsada('');
    } catch (err) {
      setErroForm(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Saques</h1>
        <p className="text-sm text-ink-soft">
          Solicite o saque do que você já recebeu em locações.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 font-display font-semibold text-ink">Solicitar saque</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Valor (R$)"
            name="valor"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <TextField
            label="Chave PIX"
            name="chavePixUsada"
            required
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={chavePixUsada}
            onChange={(e) => setChavePixUsada(e.target.value)}
          />
          {erroForm && (
            <p role="alert" className="text-sm text-carmim-700">
              {erroForm}
            </p>
          )}
          <Button type="submit" isLoading={isLoading}>
            Solicitar
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-display font-semibold text-ink">Minhas solicitações</h2>

        {erroLista && <p className="text-sm text-carmim-700">{erroLista}</p>}

        {!saques && !erroLista && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {saques && saques.length === 0 && (
          <EmptyState
            title="Nenhuma solicitação ainda"
            description="Suas solicitações de saque aparecem aqui."
          />
        )}

        {saques && saques.length > 0 && (
          <div className="flex flex-col gap-3">
            {saques.map((saque) => (
              <Card key={saque.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-ink">
                    {formatCurrency(saque.valor)}
                  </span>
                  <SaqueStatusBadge status={saque.status} />
                </div>
                <p className="text-sm text-ink-soft">
                  Chave PIX: {saque.chavePixUsada} · {formatDateTime(saque.createdAt)}
                </p>
                {saque.status === 'REJEITADO' && saque.motivoRejeicao && (
                  <p className="text-sm text-carmim-700">Motivo: {saque.motivoRejeicao}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

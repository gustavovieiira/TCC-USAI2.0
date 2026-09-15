import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { Locacao, solicitarLocacao } from './locacoes.api';

interface SolicitarLocacaoFormProps {
  itemId: string;
  valorDiaria: number;
  onSuccess: (locacao: Locacao) => void;
  onCancel: () => void;
}

function calcularDias(dataInicio: string, dataFim: string): number {
  if (!dataInicio || !dataFim) return 0;
  const inicio = new Date(dataInicio).getTime();
  const fim = new Date(dataFim).getTime();
  const dias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
}

export function SolicitarLocacaoForm({
  itemId,
  valorDiaria,
  onSuccess,
  onCancel,
}: SolicitarLocacaoFormProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const dias = calcularDias(dataInicio, dataFim);
  const valorTotal = dias * valorDiaria;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const locacao = await solicitarLocacao({ itemId, dataInicio, dataFim });
      onSuccess(locacao);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Data de início"
          name="dataInicio"
          type="date"
          required
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />
        <TextField
          label="Data de fim"
          name="dataFim"
          type="date"
          required
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />
      </div>

      {dias > 0 && (
        <p className="text-sm text-slate-600">
          {dias} {dias === 1 ? 'dia' : 'dias'} × R$ {valorDiaria.toFixed(2)} ={' '}
          <span className="font-semibold text-slate-900">R$ {valorTotal.toFixed(2)}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" isLoading={isLoading}>
          Confirmar solicitação
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700
            hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

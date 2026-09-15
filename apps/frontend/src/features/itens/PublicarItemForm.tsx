import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { criarItem, Item } from './itens.api';

const CATEGORIAS = ['Ferramentas', 'Eletrodomésticos', 'Lazer', 'Utensílios domésticos', 'Outros'];

interface PublicarItemFormProps {
  onSuccess: (item: Item) => void;
}

export function PublicarItemForm({ onSuccess }: PublicarItemFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [valorDiaria, setValorDiaria] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const item = await criarItem({
        titulo,
        descricao,
        categoria,
        valorDiaria: Number(valorDiaria),
      });
      setTitulo('');
      setDescricao('');
      setValorDiaria('');
      onSuccess(item);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Título"
        name="titulo"
        required
        minLength={3}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className="text-sm font-medium text-slate-700">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          minLength={10}
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition
            focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium text-slate-700">
          Categoria
        </label>
        <select
          id="categoria"
          name="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition
            focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {CATEGORIAS.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label="Valor por dia (R$)"
        name="valorDiaria"
        type="number"
        min={1}
        step="0.01"
        required
        value={valorDiaria}
        onChange={(e) => setValorDiaria(e.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={isLoading}>
        Publicar item
      </Button>
    </form>
  );
}

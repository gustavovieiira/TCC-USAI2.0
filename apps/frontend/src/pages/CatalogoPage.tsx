import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ItemCard } from '@/features/itens/ItemCard';
import { Item, listarItens } from '@/features/itens/itens.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/authStorage';

const CATEGORIAS = [
  'Todas',
  'Ferramentas',
  'Eletrodomésticos',
  'Lazer',
  'Utensílios domésticos',
  'Outros',
];

export function CatalogoPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [categoria, setCategoria] = useState('Todas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const usuario = getStoredUser();

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setError(null);

    listarItens(categoria === 'Todas' ? undefined : categoria)
      .then((resultado) => {
        if (!cancelado) setItens(resultado);
      })
      .catch((err) => {
        if (!cancelado) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [categoria]);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Vitrine do condomínio</h1>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none
            focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {CATEGORIAS.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-8 text-slate-500">Carregando itens...</p>}
      {error && (
        <p role="alert" className="mt-8 text-red-600">
          {error}
        </p>
      )}

      {!isLoading && !error && itens.length === 0 && (
        <p className="mt-8 text-slate-500">
          Nenhum item disponível ainda{categoria !== 'Todas' ? ` em "${categoria}"` : ''}.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isOwnItem={item.ownerId === usuario?.id}
            onLocacaoSolicitada={() => {}}
          />
        ))}
      </div>
    </AppShell>
  );
}

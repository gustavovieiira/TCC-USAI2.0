import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { ItemCard } from '@/features/itens/ItemCard';
import { listarItens } from '@/features/itens/itens.api';
import { ItemDTO } from '@/features/itens/itens.types';

export function CatalogoPage() {
  const [itens, setItens] = useState<ItemDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    listarItens()
      .then(setItens)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  const categorias = useMemo(() => {
    if (!itens) return [];
    return Array.from(new Set(itens.map((item) => item.categoria))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    if (!itens) return [];
    return itens.filter((item) => {
      const combinaCategoria = !categoriaAtiva || item.categoria === categoriaAtiva;
      const combinaBusca = item.titulo.toLowerCase().includes(busca.trim().toLowerCase());
      return combinaCategoria && combinaBusca;
    });
  }, [itens, categoriaAtiva, busca]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink">Catálogo</h1>
        <p className="text-sm text-ink-soft">Itens disponíveis pra locação no seu condomínio.</p>
      </div>

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar item, categoria, vizinho…"
        className="notch-sm min-h-[44px] w-full border border-ink/40 bg-paper-surface px-4 py-2.5
          text-sm text-ink outline-none transition focus:border-ink"
      />

      {categorias.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`notch-sm shrink-0 px-3.5 py-1.5 text-sm font-semibold transition ${
              categoriaAtiva === null
                ? 'bg-ink text-ink-inverse'
                : 'border border-paper-line bg-paper-surface text-ink-soft'
            }`}
          >
            Tudo
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setCategoriaAtiva(categoria)}
              className={`notch-sm shrink-0 px-3.5 py-1.5 text-sm font-semibold transition ${
                categoriaAtiva === categoria
                  ? 'bg-jade-500 text-jade-100'
                  : 'border border-paper-line bg-paper-surface text-ink-soft'
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}

      {!itens && !erro && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {itens && itensFiltrados.length === 0 && (
        <EmptyState
          title={
            itens.length === 0
              ? 'Ainda não há itens no catálogo'
              : `Nada por "${busca || categoriaAtiva}"`
          }
          description={
            itens.length === 0
              ? 'Seja o primeiro morador a anunciar um item pros vizinhos.'
              : 'Ninguém cadastrou isso ainda — mas alguém no condomínio provavelmente tem. Pergunta no mural?'
          }
          action={
            itens.length === 0 && (
              <Link
                to="/itens/novo"
                className="notch inline-flex min-h-[44px] items-center bg-barro-500 px-4 py-2
                  text-sm font-bold text-paper-surface shadow-press hover:bg-barro-700"
              >
                Publicar item
              </Link>
            )
          }
        />
      )}

      {itens && itensFiltrados.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {itensFiltrados.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

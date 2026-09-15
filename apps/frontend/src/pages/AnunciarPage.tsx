import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PublicarItemForm } from '@/features/itens/PublicarItemForm';
import { Item } from '@/features/itens/itens.api';

export function AnunciarPage() {
  const [publicado, setPublicado] = useState<Item | null>(null);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold text-slate-900">Anunciar item</h1>
        <p className="mt-1 text-slate-600">
          Publique um item que você não usa com frequência para os vizinhos do seu condomínio
          alugarem.
        </p>

        {publicado && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
            "{publicado.titulo}" publicado com sucesso no catálogo.
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <PublicarItemForm onSuccess={setPublicado} />
        </div>
      </div>
    </AppShell>
  );
}

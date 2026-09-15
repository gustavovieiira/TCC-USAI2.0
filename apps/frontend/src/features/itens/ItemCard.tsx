import { useState } from 'react';
import { SolicitarLocacaoForm } from '@/features/locacoes/SolicitarLocacaoForm';
import { Locacao } from '@/features/locacoes/locacoes.api';
import { Item } from './itens.api';

interface ItemCardProps {
  item: Item;
  isOwnItem: boolean;
  onLocacaoSolicitada: (locacao: Locacao) => void;
}

export function ItemCard({ item, isOwnItem, onLocacaoSolicitada }: ItemCardProps) {
  const [solicitando, setSolicitando] = useState(false);
  const [locacaoEnviada, setLocacaoEnviada] = useState(false);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{item.titulo}</h3>
          <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {item.categoria}
          </span>
        </div>
        {isOwnItem && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Seu item
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-600">{item.descricao}</p>

      <p className="mt-3 text-sm font-medium text-slate-900">
        R$ {item.valorDiaria.toFixed(2)} / dia
      </p>

      {!isOwnItem && !locacaoEnviada && !solicitando && (
        <button
          onClick={() => setSolicitando(true)}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white
            hover:bg-brand-700"
        >
          Solicitar locação
        </button>
      )}

      {locacaoEnviada && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
          Solicitação enviada! Acompanhe em "Acompanhamento".
        </p>
      )}

      {solicitando && !locacaoEnviada && (
        <SolicitarLocacaoForm
          itemId={item.id}
          valorDiaria={item.valorDiaria}
          onCancel={() => setSolicitando(false)}
          onSuccess={(locacao) => {
            setSolicitando(false);
            setLocacaoEnviada(true);
            onLocacaoSolicitada(locacao);
          }}
        />
      )}
    </div>
  );
}

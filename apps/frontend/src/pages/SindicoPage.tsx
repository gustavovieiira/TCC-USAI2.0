import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  atualizarPin,
  buscarCondominio,
  listarLocacoesAtivas,
  listarMoradores,
} from '@/features/sindico/sindico.api';
import { CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from '@/features/sindico/sindico.types';

type Aba = 'moradores' | 'locacoes';

export function SindicoPage() {
  const [condominio, setCondominio] = useState<CondominioDTO | null>(null);
  const [moradores, setMoradores] = useState<MoradorDTO[] | null>(null);
  const [locacoes, setLocacoes] = useState<LocacaoAtivaDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('moradores');

  const [editandoPin, setEditandoPin] = useState(false);
  const [novoPin, setNovoPin] = useState('');
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [erroPin, setErroPin] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([buscarCondominio(), listarMoradores(), listarLocacoesAtivas()])
      .then(([cond, mor, loc]) => {
        setCondominio(cond);
        setMoradores(mor);
        setLocacoes(loc);
      })
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  async function handleSalvarPin(event: FormEvent) {
    event.preventDefault();
    setErroPin(null);
    setSalvandoPin(true);

    try {
      const atualizado = await atualizarPin(novoPin);
      setCondominio(atualizado);
      setEditandoPin(false);
      setNovoPin('');
    } catch (err) {
      setErroPin(extractErrorMessage(err));
    } finally {
      setSalvandoPin(false);
    }
  }

  if (erro) {
    return <p className="text-sm text-red-600">{erro}</p>;
  }

  if (!condominio) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel do síndico</h1>
        <p className="text-sm text-slate-500">{condominio.nome}</p>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Link de acesso
          </p>
          <p className="font-mono text-sm text-slate-900">
            /cadastro?condominio={condominio.linkSlug}
          </p>
        </div>

        {!editandoPin ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">PIN</p>
              <p className="font-mono text-lg font-semibold text-slate-900">{condominio.pin}</p>
            </div>
            <Button variant="secondary" fullWidth={false} onClick={() => setEditandoPin(true)}>
              Alterar PIN
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSalvarPin} className="flex flex-col gap-3">
            <TextField
              label="Novo PIN"
              name="novoPin"
              inputMode="numeric"
              required
              value={novoPin}
              onChange={(e) => setNovoPin(e.target.value)}
            />
            {erroPin && (
              <p role="alert" className="text-sm text-red-600">
                {erroPin}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" isLoading={salvandoPin} fullWidth={false}>
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth={false}
                onClick={() => {
                  setEditandoPin(false);
                  setErroPin(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setAba('moradores')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            aba === 'moradores' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'
          }`}
        >
          Moradores
        </button>
        <button
          onClick={() => setAba('locacoes')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            aba === 'locacoes' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'
          }`}
        >
          Locações ativas
        </button>
      </div>

      {aba === 'moradores' &&
        (moradores && moradores.length > 0 ? (
          <div className="flex flex-col gap-2">
            {moradores.map((morador) => (
              <Card key={morador.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{morador.nome}</p>
                  <p className="text-sm text-slate-500">{morador.email}</p>
                </div>
                {morador.apartamento && (
                  <span className="text-sm text-slate-500">Apto {morador.apartamento}</span>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum morador cadastrado ainda" />
        ))}

      {aba === 'locacoes' &&
        (locacoes && locacoes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {locacoes.map((locacao) => (
              <Card key={locacao.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{locacao.item.titulo}</p>
                  <StatusBadge status={locacao.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(locacao.dataInicio)} → {formatDate(locacao.dataFim)} · locatário{' '}
                  {locacao.locatario.nome}
                </p>
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {formatCurrency(locacao.valorTotal)}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma locação ativa no momento" />
        ))}
    </div>
  );
}

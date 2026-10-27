import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/format';
import { ListaExtrato, ResumoExtrato } from '@/features/saques/ExtratoView';
import { buscarExtrato, solicitarSaque } from '@/features/saques/saques.api';
import { ExtratoDTO } from '@/features/saques/saques.types';

type Aba = 'extrato' | 'saque';

export function SaquesPage() {
  const [aba, setAba] = useState<Aba>('extrato');
  const [extrato, setExtrato] = useState<ExtratoDTO | null>(null);
  const [erroExtrato, setErroExtrato] = useState<string | null>(null);

  function carregar() {
    buscarExtrato()
      .then(setExtrato)
      .catch((err) => setErroExtrato(extractErrorMessage(err)));
  }

  useEffect(carregar, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Saques e extrato</h1>
        <p className="text-sm text-ink-soft">
          Veja o que entrou, de onde veio, que taxa foi aplicada, o que saiu — e peça o saque do que
          você já recebeu.
        </p>
      </div>

      <ResumoExtrato extrato={extrato} />
      {erroExtrato && <p className="text-sm text-carmim-700">{erroExtrato}</p>}

      <div className="flex gap-1 border border-paper-line bg-paper-surface p-1">
        {(
          [
            ['extrato', 'Extrato'],
            ['saque', 'Pedir saque'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setAba(valor)}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${
              aba === valor ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'extrato' && <ListaExtrato extrato={extrato} semErro={!erroExtrato} />}
      {aba === 'saque' && (
        <AbaPedirSaque
          saldo={extrato?.resumo.saldoDisponivel ?? null}
          onSolicitado={() => {
            carregar();
            setAba('extrato');
          }}
        />
      )}
    </div>
  );
}

function AbaPedirSaque({
  saldo,
  onSolicitado,
}: {
  saldo: number | null;
  onSolicitado: () => void;
}) {
  const [valor, setValor] = useState('');
  const [chavePixUsada, setChavePixUsada] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroForm(null);
    setIsLoading(true);

    try {
      await solicitarSaque({ valor: Number(valor), chavePixUsada });
      onSolicitado();
    } catch (err) {
      setErroForm(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display font-semibold text-ink">Solicitar saque</h2>
      <p className="mb-4 text-sm text-ink-soft">
        Você pode sacar até {saldo === null ? '···' : formatCurrency(saldo)}. A equipe USAI analisa
        o pedido e paga na chave PIX informada.
      </p>
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
  );
}

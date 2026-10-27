import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { extractErrorMessage } from '@/lib/apiClient';
import { DocumentoMovimentacao } from '@/features/movimentacoes/DocumentoMovimentacao';
import {
  aceitarMovimentacao,
  buscarMovimentacao,
  cancelarMovimentacao,
  retificarMovimentacao,
} from '@/features/movimentacoes/movimentacoes.api';
import { MovimentacaoDetalheDTO } from '@/features/movimentacoes/movimentacoes.types';

export function MovimentacaoPage() {
  const { id } = useParams<{ id: string }>();
  const [detalhe, setDetalhe] = useState<MovimentacaoDetalheDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!id) return;
    buscarMovimentacao(id)
      .then(setDetalhe)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, [id]);

  useEffect(carregar, [carregar]);

  if (erro && !detalhe) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
        <Link to="/locacoes" className="text-sm font-semibold text-barro-700 hover:underline">
          ← Voltar
        </Link>
      </div>
    );
  }

  if (!detalhe) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/locacoes" className="text-sm font-semibold text-barro-700 hover:underline">
          ← Voltar às locações
        </Link>
        <Button variant="secondary" fullWidth={false} onClick={() => window.print()}>
          Imprimir / salvar em PDF
        </Button>
      </div>

      <DocumentoMovimentacao detalhe={detalhe} />

      {detalhe.permissoes.aceitar && (
        <FormularioDeAceite detalhe={detalhe} onConcluido={setDetalhe} />
      )}
      {detalhe.permissoes.cancelar && (
        <CancelarRegistro detalhe={detalhe} onCancelado={setDetalhe} />
      )}
      {detalhe.permissoes.retificar && (
        <FormularioDeRetificacao detalhe={detalhe} onRegistrada={setDetalhe} />
      )}
    </div>
  );
}

/**
 * Aceite obrigatório de quem recebe: o termo completo está logo acima, nenhuma declaração vem
 * marcada, e só conclui com todas marcadas + a senha reconfirmada (assinatura eletrônica simples).
 */
function FormularioDeAceite({
  detalhe,
  onConcluido,
}: {
  detalhe: MovimentacaoDetalheDTO;
  onConcluido: (detalhe: MovimentacaoDetalheDTO) => void;
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const declaracoes = detalhe.termo.declaracoes;
  const todasMarcadas = declaracoes.every((d) => marcadas.has(d.id));
  const pronto = todasMarcadas && senha.length > 0;

  function alternar(id: string) {
    setMarcadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!pronto) return;

    setErro(null);
    setEnviando(true);
    try {
      onConcluido(await aceitarMovimentacao(detalhe.id, { declaracoes: [...marcadas], senha }));
    } catch (err) {
      setErro(extractErrorMessage(err));
      setSenha('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="no-print">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Conferência e aceite</h2>
          <p className="text-sm text-ink-soft">
            Leia o termo completo acima e confira os dados registrados. Para concluir, marque todas
            as declarações e confirme a sua senha.
          </p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Declarações obrigatórias</legend>
          {declaracoes.map((declaracao) => (
            <label key={declaracao.id} className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={marcadas.has(declaracao.id)}
                onChange={() => alternar(declaracao.id)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-barro-500"
              />
              <span>{declaracao.texto}</span>
            </label>
          ))}
        </fieldset>

        <TextField
          label="Confirme sua senha para assinar"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" fullWidth={false} isLoading={enviando} disabled={!pronto}>
            Assinar e concluir
          </Button>
          {!todasMarcadas && (
            <span className="text-xs text-ink-faint">
              Marque todas as declarações ({marcadas.size} de {declaracoes.length}).
            </span>
          )}
        </div>
        <p className="text-xs text-ink-faint">
          Ficam registrados: seu nome, a data e o horário, a versão do termo, o texto de cada
          declaração e uma impressão digital da assinatura. Depois de concluído, o documento não
          pode ser alterado.
        </p>
      </form>
    </Card>
  );
}

function CancelarRegistro({
  detalhe,
  onCancelado,
}: {
  detalhe: MovimentacaoDetalheDTO;
  onCancelado: (detalhe: MovimentacaoDetalheDTO) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cancelar() {
    setErro(null);
    setEnviando(true);
    try {
      onCancelado(await cancelarMovimentacao(detalhe.id));
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="no-print flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold text-ink">Registro com algum erro?</h2>
      <p className="text-sm text-ink-soft">
        Enquanto {detalhe.recebidoPor.nome} não aceitar, você pode cancelar este registro e criar
        outro. O cancelamento fica no histórico.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
      )}
      {!confirmando ? (
        <div>
          <Button variant="danger" fullWidth={false} onClick={() => setConfirmando(true)}>
            Cancelar este registro
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="danger" fullWidth={false} isLoading={enviando} onClick={cancelar}>
            Confirmar cancelamento
          </Button>
          <Button variant="ghost" fullWidth={false} onClick={() => setConfirmando(false)}>
            Voltar
          </Button>
        </div>
      )}
    </Card>
  );
}

function FormularioDeRetificacao({
  detalhe,
  onRegistrada,
}: {
  detalhe: MovimentacaoDetalheDTO;
  onRegistrada: (detalhe: MovimentacaoDetalheDTO) => void;
}) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      onRegistrada(await retificarMovimentacao(detalhe.id, texto));
      setTexto('');
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="no-print">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Registrar uma retificação</h2>
          <p className="text-sm text-ink-soft">
            Encontrou algo a corrigir ou acrescentar? O documento original não é alterado: a
            retificação entra no histórico com o seu nome e a data, e a outra parte é avisada.
          </p>
        </div>
        <Textarea
          label="Descreva a correção"
          name="retificacao"
          rows={3}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="secondary"
            fullWidth={false}
            isLoading={enviando}
            disabled={texto.trim().length < 5}
          >
            Registrar retificação
          </Button>
        </div>
      </form>
    </Card>
  );
}

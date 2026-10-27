import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';
import {
  aprovarTermo,
  criarVersaoDoTermo,
  listarTermos,
} from '@/features/movimentacoes/movimentacoes.api';
import {
  DeclaracaoTermo,
  TermoDTO,
  TipoMovimentacao,
} from '@/features/movimentacoes/movimentacoes.types';
import { ROTULO_TIPO } from '@/features/movimentacoes/rotulos';

const TIPOS: TipoMovimentacao[] = ['RETIRADA', 'DEVOLUCAO'];

/** Uma declaração por linha, no formato `identificador | texto da declaração`. */
function declaracoesParaTexto(declaracoes: DeclaracaoTermo[]): string {
  return declaracoes.map((d) => `${d.id} | ${d.texto}`).join('\n');
}

function textoParaDeclaracoes(texto: string): DeclaracaoTermo[] | null {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const declaracoes = linhas.map((linha) => {
    const [id, ...resto] = linha.split('|');
    return { id: (id ?? '').trim(), texto: resto.join('|').trim() };
  });

  return declaracoes.every((d) => d.id && d.texto) ? declaracoes : null;
}

/**
 * Termos de responsabilidade (um por tipo de operação). Editar cria uma NOVA versão — as anteriores
 * ficam como estão porque os aceites já registrados apontam pra elas. Toda versão nasce como
 * "modelo" e só passa a "aprovada" quando o Admin registra que a revisão da empresa aconteceu.
 */
export function AbaTermos() {
  const [termos, setTermos] = useState<TermoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<TipoMovimentacao | null>(null);
  const [aprovandoId, setAprovandoId] = useState<string | null>(null);

  useEffect(() => {
    listarTermos()
      .then(setTermos)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  async function aprovar(id: string) {
    setErro(null);
    setAprovandoId(id);
    try {
      const aprovado = await aprovarTermo(id);
      setTermos((atual) => atual?.map((t) => (t.id === id ? aprovado : t)) ?? atual);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setAprovandoId(null);
    }
  }

  if (!termos && !erro) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-soft">
        Os textos abaixo são <strong>modelos</strong>. Antes de usá-los como definitivos, faça a
        revisão jurídica da empresa/condomínio, edite o que for preciso e então registre a
        aprovação. Enquanto isso, os documentos mostram o aviso de que o texto ainda não foi
        validado.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
      )}

      {TIPOS.map((tipo) => {
        const versoes = (termos ?? []).filter((t) => t.tipo === tipo);
        const vigente = versoes[0];

        return (
          <section
            key={tipo}
            aria-label={`Termo de ${ROTULO_TIPO[tipo]}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-ink">
                Termo de {ROTULO_TIPO[tipo].toLowerCase()}
              </h2>
              {editando !== tipo && (
                <Button
                  variant="secondary"
                  fullWidth={false}
                  onClick={() => setEditando(tipo)}
                  aria-label={`Criar nova versão do termo de ${ROTULO_TIPO[tipo].toLowerCase()}`}
                >
                  Criar nova versão
                </Button>
              )}
            </div>

            {editando === tipo && (
              <EditorDeTermo
                tipo={tipo}
                base={vigente}
                onCancelar={() => setEditando(null)}
                onCriado={(novo) => {
                  setTermos((atual) => [novo, ...(atual ?? [])]);
                  setEditando(null);
                }}
              />
            )}

            {versoes.length === 0 && <EmptyState title="Nenhuma versão cadastrada" />}

            {versoes.map((termo, indice) => (
              <Card key={termo.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-semibold text-ink">
                    Versão {termo.versao}
                    {indice === 0 && (
                      <span className="ml-2 font-meta text-xs font-normal uppercase text-barro-700">
                        em vigor
                      </span>
                    )}
                  </p>
                  <span
                    className={`notch-sm px-2.5 py-1 text-xs font-bold ${
                      termo.statusRevisao === 'APROVADO'
                        ? 'bg-jade-100 text-jade-700'
                        : 'bg-mostarda-100 text-mostarda-700'
                    }`}
                  >
                    {termo.statusRevisao === 'APROVADO'
                      ? `Aprovado em ${termo.aprovadoEm ? formatDate(termo.aprovadoEm) : ''}`
                      : 'Modelo — pendente de revisão'}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">{termo.titulo}</p>
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold text-barro-700">
                    Ver cláusulas e declarações
                  </summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
                    {termo.clausulas.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ol>
                  <p className="mt-2 font-semibold text-ink">Declarações de aceite</p>
                  <ul className="mt-1 space-y-1 text-ink-soft">
                    {termo.declaracoes.map((d) => (
                      <li key={d.id}>☐ {d.texto}</li>
                    ))}
                  </ul>
                </details>
                {termo.statusRevisao !== 'APROVADO' && (
                  <div>
                    <Button
                      fullWidth={false}
                      isLoading={aprovandoId === termo.id}
                      onClick={() => aprovar(termo.id)}
                      aria-label={`Registrar aprovação da versão ${termo.versao} do termo de ${ROTULO_TIPO[tipo].toLowerCase()}`}
                    >
                      Registrar revisão e aprovar
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function EditorDeTermo({
  tipo,
  base,
  onCancelar,
  onCriado,
}: {
  tipo: TipoMovimentacao;
  base?: TermoDTO;
  onCancelar: () => void;
  onCriado: (termo: TermoDTO) => void;
}) {
  const [titulo, setTitulo] = useState(base?.titulo ?? '');
  const [clausulas, setClausulas] = useState((base?.clausulas ?? []).join('\n\n'));
  const [declaracoes, setDeclaracoes] = useState(declaracoesParaTexto(base?.declaracoes ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    const listaClausulas = clausulas
      .split(/\n{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);
    const listaDeclaracoes = textoParaDeclaracoes(declaracoes);

    if (listaClausulas.length === 0) {
      setErro('Informe ao menos uma cláusula (separe as cláusulas por uma linha em branco).');
      return;
    }
    if (!listaDeclaracoes || listaDeclaracoes.length === 0) {
      setErro('Cada declaração deve estar numa linha, no formato "identificador | texto".');
      return;
    }

    setSalvando(true);
    try {
      onCriado(
        await criarVersaoDoTermo({
          tipo,
          titulo,
          clausulas: listaClausulas,
          declaracoes: listaDeclaracoes,
        }),
      );
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <p className="text-sm text-ink-soft">
          Parte do texto em vigor. Ao salvar, nasce a próxima versão (como modelo, pendente de
          revisão); a atual continua intacta para os aceites que já a usam.
        </p>
        <TextField
          label="Título do termo"
          name="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <Textarea
          label="Cláusulas (separe por uma linha em branco)"
          name="clausulas"
          rows={10}
          value={clausulas}
          onChange={(e) => setClausulas(e.target.value)}
        />
        <Textarea
          label="Declarações de aceite (uma por linha: identificador | texto)"
          name="declaracoes"
          rows={5}
          value={declaracoes}
          onChange={(e) => setDeclaracoes(e.target.value)}
        />
        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" fullWidth={false} isLoading={salvando}>
            Salvar nova versão
          </Button>
          <Button type="button" variant="ghost" fullWidth={false} onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

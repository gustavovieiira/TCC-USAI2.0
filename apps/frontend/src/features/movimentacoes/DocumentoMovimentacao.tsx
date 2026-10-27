import { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';
import { formatCurrency, formatDate, formatDateHora } from '@/lib/format';
import { MovimentacaoDetalheDTO, ParteDTO } from './movimentacoes.types';
import { CLASSE_STATUS, ROTULO_ESTADO, ROTULO_EVENTO, ROTULO_STATUS, ROTULO_TIPO } from './rotulos';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="doc-secao break-inside-avoid">
      <h2 className="border-b border-paper-line pb-1 font-display text-sm font-bold uppercase tracking-wide text-ink">
        {titulo}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <dt className="font-meta text-[11px] uppercase tracking-wide text-ink-faint">{rotulo}</dt>
      <dd className="text-ink">{valor || '—'}</dd>
    </div>
  );
}

function Parte({ titulo, parte }: { titulo: string; parte: ParteDTO }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Campo rotulo="Nome completo" valor={parte.nome} />
        <Campo rotulo="Unidade (apto.)" valor={parte.apartamento} />
        <Campo rotulo="Condomínio" valor={parte.condominio} />
        <Campo rotulo="CPF" valor={parte.cpfMascarado} />
      </dl>
    </div>
  );
}

/**
 * Documento de retirada/devolução, pronto pra ler na tela, imprimir ou salvar em PDF (a classe
 * `documento-print` ativa o CSS de impressão em index.css: só o documento sai, em A4, com a
 * paginação e o rodapé institucional). Mostra sempre o que foi registrado — nunca dados
 * recalculados: o `snapshot` guarda o item e as partes como estavam no momento do registro.
 */
export function DocumentoMovimentacao({ detalhe }: { detalhe: MovimentacaoDetalheDTO }) {
  const { configuracao } = useConfiguracao();
  const { snapshot, termo, aceite } = detalhe;
  const concluida = detalhe.status === 'CONCLUIDA';
  const criacao = detalhe.eventos.find((e) => e.acao === 'CRIADA');
  const retirada = detalhe.tipo === 'RETIRADA';
  const entregador = retirada ? snapshot.dono : snapshot.locatario;
  const recebedor = retirada ? snapshot.locatario : snapshot.dono;
  const conferidos = detalhe.acessorios.filter((a) => a.conferido).length;

  return (
    <article className="documento-print flex flex-col gap-5 border border-paper-line bg-paper-surface p-6 shadow-paper md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div className="flex flex-col gap-1">
          <Logo altura={46} className="text-ink" />
          <p className="font-meta text-[11px] uppercase tracking-wide text-ink-faint">
            {configuracao.nomeInstitucional}
          </p>
        </div>
        <div className="text-right">
          <p className="font-meta text-[11px] uppercase tracking-wide text-ink-faint">
            Documento nº
          </p>
          <p className="font-display text-xl font-bold text-ink">{detalhe.numeroDocumento}</p>
          <span
            className={`notch-sm mt-1 inline-block px-2.5 py-1 text-xs font-bold ${CLASSE_STATUS[detalhe.status]}`}
          >
            {ROTULO_STATUS[detalhe.status]}
          </span>
        </div>
      </header>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{termo.titulo}</h1>
        <p className="text-sm text-ink-soft">
          {ROTULO_TIPO[detalhe.tipo]} de item locado · registrado em{' '}
          {formatDateHora(detalhe.ocorridoEm)}
        </p>
      </div>

      <Secao titulo="Partes">
        <div className="grid gap-5 sm:grid-cols-2">
          <Parte
            titulo={
              retirada
                ? 'Responsável pela entrega (proprietário)'
                : 'Responsável pela entrega (locatário)'
            }
            parte={entregador}
          />
          <Parte
            titulo={
              retirada
                ? 'Responsável pelo recebimento (locatário)'
                : 'Responsável pelo recebimento (proprietário)'
            }
            parte={recebedor}
          />
        </div>
      </Secao>

      <Secao titulo="Identificação do item">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Campo rotulo="Item" valor={snapshot.item.titulo} />
          <Campo rotulo="Categoria" valor={snapshot.item.categoria} />
          <Campo rotulo="Fabricante" valor={snapshot.item.fabricante} />
          <Campo rotulo="Modelo" valor={snapshot.item.modelo} />
          <Campo rotulo="Número de série" valor={snapshot.item.numeroSerie} />
          <Campo rotulo="Descrição" valor={snapshot.item.descricao} />
        </dl>
      </Secao>

      <Secao titulo="Locação de origem">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Campo
            rotulo="Período"
            valor={`${formatDate(snapshot.locacao.dataInicio)} a ${formatDate(snapshot.locacao.dataFim)}`}
          />
          <Campo rotulo="Valor da locação" valor={formatCurrency(snapshot.locacao.valorTotal)} />
          <Campo rotulo="Finalidade informada" valor={snapshot.locacao.finalidade} />
        </dl>
      </Secao>

      <Secao titulo="Operação realizada">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Campo rotulo="Tipo" valor={ROTULO_TIPO[detalhe.tipo]} />
          <Campo rotulo="Data e horário" valor={formatDateHora(detalhe.ocorridoEm)} />
          <Campo rotulo="Estado de conservação" valor={ROTULO_ESTADO[detalhe.estadoConservacao]} />
        </dl>

        <p className="mt-3 text-sm font-semibold text-ink">
          Acessórios e itens vinculados{' '}
          <span className="font-normal text-ink-soft">
            ({conferidos} de {detalhe.acessorios.length} acompanham a operação)
          </span>
        </p>
        {detalhe.acessorios.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum acessório relacionado.</p>
        ) : (
          <ul className="mt-1 grid gap-x-4 sm:grid-cols-2">
            {detalhe.acessorios.map((acessorio) => (
              <li key={acessorio.nome} className="text-sm text-ink">
                <span aria-hidden="true">{acessorio.conferido ? '☑' : '☐'}</span> {acessorio.nome}
                <span className="text-ink-faint">
                  {acessorio.conferido ? ' — acompanha' : ' — não entregue'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-sm font-semibold text-ink">Observações adicionais</p>
        <p className="whitespace-pre-line text-sm text-ink-soft">
          {detalhe.observacoes ?? 'Nenhuma observação registrada.'}
        </p>
      </Secao>

      <Secao titulo={`Termo de responsabilidade — versão ${termo.versao}`}>
        <p
          className={`mb-2 border px-3 py-2 text-xs ${
            termo.statusRevisao === 'APROVADO'
              ? 'border-jade-300 bg-jade-50 text-jade-700'
              : 'border-mostarda-300 bg-mostarda-50 text-mostarda-700'
          }`}
        >
          {termo.statusRevisao === 'APROVADO' && termo.aprovadoEm
            ? `Texto revisado e aprovado em ${formatDate(termo.aprovadoEm)}.`
            : 'Texto modelo, pendente de revisão e aprovação jurídica pela empresa/condomínio.'}
        </p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink">
          {termo.clausulas.map((clausula) => (
            <li key={clausula}>{clausula}</li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="Confirmações de ciência">
        <ul className="flex flex-col gap-1.5">
          {termo.declaracoes.map((declaracao) => (
            <li key={declaracao.id} className="text-sm text-ink">
              <span aria-hidden="true">{aceite ? '☑' : '☐'}</span> {declaracao.texto}
            </li>
          ))}
        </ul>
        {aceite ? (
          <p className="mt-2 text-xs text-ink-soft">
            Aceito por <strong>{aceite.usuario.nome}</strong> em {formatDateHora(aceite.aceitoEm)} ·
            versão {termo.versao} do termo · assinatura eletrônica{' '}
            <code className="break-all">{aceite.assinatura.slice(0, 24)}…</code>
            {aceite.ip && ` · IP ${aceite.ip}`}
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">
            {detalhe.status === 'CANCELADA'
              ? 'Registro cancelado antes do aceite.'
              : `Aguardando o aceite de ${detalhe.recebidoPor.nome}.`}
          </p>
        )}
      </Secao>

      <Secao titulo="Assinaturas">
        <div className="grid gap-8 pt-6 sm:grid-cols-2">
          {[
            { papel: 'Entrega', nome: entregador.nome },
            { papel: 'Recebimento', nome: recebedor.nome },
          ].map(({ papel, nome }) => (
            <div key={papel} className="text-center">
              <div className="border-t border-ink pt-1 text-sm font-semibold text-ink">{nome}</div>
              <p className="text-xs text-ink-faint">Responsável pelo(a) {papel.toLowerCase()}</p>
            </div>
          ))}
        </div>
        {concluida && aceite && (
          <p className="mt-3 text-center text-xs text-ink-soft">
            Recebimento assinado eletronicamente por {aceite.usuario.nome} em{' '}
            {formatDateHora(aceite.aceitoEm)}.
          </p>
        )}
      </Secao>

      <Secao titulo="Histórico e retificações">
        <ol className="flex flex-col gap-2">
          {detalhe.eventos.map((evento) => (
            <li key={evento.id} className="text-sm">
              <span className="font-semibold text-ink">
                {ROTULO_EVENTO[evento.acao] ?? evento.acao}
              </span>{' '}
              <span className="text-xs text-ink-faint">
                · {evento.usuario.nome} · {formatDateHora(evento.createdAt)}
              </span>
              {evento.detalhe && <p className="text-ink-soft">{evento.detalhe}</p>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-faint">
          Registro original{criacao ? ` criado por ${criacao.usuario.nome}` : ''}. Correções não
          alteram o documento: entram aqui como retificações, com autor e data.
        </p>
      </Secao>

      <Secao titulo="Integridade do documento">
        {detalhe.integridade.hash ? (
          <>
            <p className="text-sm text-ink">
              {detalhe.integridade.verificada ? (
                <span className="font-semibold text-jade-700">
                  ✔ Verificada: o conteúdo corresponde ao registrado no aceite.
                </span>
              ) : (
                <span className="font-semibold text-carmim-700">
                  ⚠ Divergência: o conteúdo difere do que foi registrado no aceite.
                </span>
              )}
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-ink-faint">
              SHA-256: {detalhe.integridade.hash}
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            A impressão digital de integridade é gerada quando o aceite é concluído.
          </p>
        )}
      </Secao>

      <footer className="doc-rodape border-t border-paper-line pt-3 text-center text-[11px] text-ink-faint">
        {configuracao.rodapeInstitucional} · {detalhe.numeroDocumento}
      </footer>
    </article>
  );
}

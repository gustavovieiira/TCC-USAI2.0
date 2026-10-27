import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CardClicavel } from '@/components/ui/CardClicavel';
import { Detalhe, DetalheModal } from '@/components/ui/DetalheModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ExtratoView } from '@/features/saques/ExtratoView';
import { detalheMovimentoPlataforma } from '@/features/saques/detalhes';
import { extratoDoUsuario, extratoPlataforma, listarUsuarios } from './admin.api';
import { ExtratoDeUsuarioDTO, ExtratoPlataformaDTO, UsuarioAdminDTO } from './admin.types';

type Visao = 'usuarios' | 'plataforma';

const ROTULO_PAPEL: Record<string, string> = {
  MORADOR: 'Morador',
  SINDICO: 'Síndico',
  ADMIN: 'Admin USAI',
};

/**
 * Extratos pro Admin (auditoria e suporte): o extrato completo de QUALQUER usuário — o mesmo que
 * ele vê no próprio app, mas com a chave PIX inteira — e a conta da USAI, com tudo que ficou com a
 * plataforma e de onde veio.
 */
export function AbaExtratos() {
  const [visao, setVisao] = useState<Visao>('usuarios');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 self-start border border-paper-line bg-paper-surface p-1">
        {(
          [
            ['usuarios', 'Extrato de um usuário'],
            ['plataforma', 'Conta da USAI'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setVisao(valor)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${
              visao === valor ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {visao === 'usuarios' ? <ExtratoDeUsuario /> : <ExtratoDaPlataforma />}
    </div>
  );
}

function ExtratoDeUsuario() {
  const [busca, setBusca] = useState('');
  const [usuarios, setUsuarios] = useState<UsuarioAdminDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<ExtratoDeUsuarioDTO | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);

  useEffect(() => {
    const termo = busca.trim();
    let ativo = true;
    // Pequena espera pra não buscar a cada tecla.
    const timer = setTimeout(
      () => {
        listarUsuarios(termo || undefined)
          .then((lista) => ativo && setUsuarios(lista))
          .catch((err) => ativo && setErro(extractErrorMessage(err)));
      },
      termo ? 300 : 0,
    );

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [busca]);

  async function abrir(usuario: UsuarioAdminDTO) {
    setErro(null);
    setAbrindoId(usuario.id);
    try {
      setAberto(await extratoDoUsuario(usuario.id));
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setAbrindoId(null);
    }
  }

  if (aberto) {
    const { usuario, extrato } = aberto;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAberto(null)}
            aria-label="Voltar à busca"
            className="notch-sm flex h-11 w-11 items-center justify-center bg-ink text-lg text-ink-inverse"
          >
            ←
          </button>
          <Avatar nome={usuario.nome} />
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{usuario.nome}</h2>
            <p className="text-sm text-ink-soft">
              {ROTULO_PAPEL[usuario.papel] ?? usuario.papel} · {usuario.email}
              {usuario.condominio && ` · ${usuario.condominio}`}
              {!usuario.ativo && ' · conta inativa'}
            </p>
          </div>
        </div>
        <ExtratoView extrato={extrato} perspectiva="terceiro" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="busca-usuario" className="text-sm font-medium text-ink">
        Buscar usuário
      </label>
      <input
        id="busca-usuario"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome ou e-mail..."
        className="min-h-[44px] w-full border border-ink/40 bg-paper-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-ink"
      />
      {erro && (
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
      )}

      {!usuarios && !erro && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {usuarios && usuarios.length === 0 && <EmptyState title="Nenhum usuário encontrado" />}
      {usuarios && usuarios.length > 0 && (
        <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
          {usuarios.map((usuario) => (
            <button
              key={usuario.id}
              type="button"
              onClick={() => abrir(usuario)}
              disabled={abrindoId === usuario.id}
              className="notch-sm flex items-center gap-3 border border-paper-line bg-paper-surface p-3 text-left transition hover:bg-paper disabled:opacity-60"
            >
              <Avatar nome={usuario.nome} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {usuario.nome}{' '}
                  <span className="font-meta text-xs font-normal text-ink-faint">
                    {ROTULO_PAPEL[usuario.papel] ?? usuario.papel}
                    {!usuario.ativo && ' · inativo'}
                  </span>
                </span>
                <span className="block truncate text-sm text-ink-soft">
                  {usuario.email}
                  {usuario.condominio && ` · ${usuario.condominio}`}
                </span>
              </span>
              <span className="text-xs font-semibold text-barro-700">Ver extrato ›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExtratoDaPlataforma() {
  const [extrato, setExtrato] = useState<ExtratoPlataformaDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  useEffect(() => {
    extratoPlataforma()
      .then(setExtrato)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  if (erro) return <p className="text-sm text-carmim-700">{erro}</p>;

  if (!extrato) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {detalhe && <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />}

      <Card>
        <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">Retido pela USAI</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {formatCurrency(extrato.totalRetido)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Taxa dos aluguéis em condomínios sem síndico ativo e dos aluguéis anteriores à comissão do
          síndico. O resto da taxa vai para a conta do síndico do condomínio.
        </p>
      </Card>

      {extrato.movimentos.length === 0 ? (
        <EmptyState
          title="Nada retido pela plataforma"
          description="Quando um aluguel for pago num condomínio sem síndico ativo, a taxa aparece aqui."
        />
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
          {extrato.movimentos.map((movimento) => (
            <CardClicavel
              key={movimento.id}
              onAbrir={() => setDetalhe(detalheMovimentoPlataforma(movimento))}
              className="flex flex-col gap-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">{movimento.descricao}</p>
                  {movimento.origem && (
                    <p className="text-sm text-ink-soft">
                      Aluguel pago por {movimento.origem.locatario.nome} a{' '}
                      {movimento.origem.dono.nome}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-display text-lg font-bold text-jade-700">
                  + {formatCurrency(movimento.valor)}
                </p>
              </div>
              {movimento.baseCalculo !== null && movimento.taxaPercentual !== null && (
                <p className="text-sm text-ink-soft">
                  Taxa de {String(movimento.taxaPercentual).replace('.', ',')}% sobre{' '}
                  {formatCurrency(movimento.baseCalculo)}
                </p>
              )}
              <span className="text-xs text-ink-faint">{formatDateTime(movimento.data)}</span>
            </CardClicavel>
          ))}
        </div>
      )}
    </div>
  );
}

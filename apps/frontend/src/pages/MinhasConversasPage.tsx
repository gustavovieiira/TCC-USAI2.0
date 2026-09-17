import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PapelTag } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import {
  abrirConversa,
  listarMinhasConversas,
  listarUsuariosDoCondominio,
} from '@/features/conversas/conversas.api';
import { ConversaDTO, ParticipanteDTO } from '@/features/conversas/conversas.types';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDiasRestantes, formatRelativeTime } from '@/lib/format';

export function MinhasConversasPage() {
  const navigate = useNavigate();

  const [conversas, setConversas] = useState<ConversaDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<ParticipanteDTO[] | null>(null);
  const [busca, setBusca] = useState('');
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [erroAbrir, setErroAbrir] = useState<string | null>(null);

  useEffect(() => {
    listarMinhasConversas()
      .then(setConversas)
      .catch((err) => setErro(extractErrorMessage(err)));
    listarUsuariosDoCondominio()
      .then(setUsuarios)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  async function handleIniciar(usuarioId: string) {
    setErroAbrir(null);
    setAbrindoId(usuarioId);

    try {
      const conversa = await abrirConversa({ usuarioId });
      navigate(`/conversas/${conversa.id}`);
    } catch (err) {
      setErroAbrir(extractErrorMessage(err));
    } finally {
      setAbrindoId(null);
    }
  }

  const termo = busca.trim().toLowerCase();
  const resultados = termo
    ? (usuarios ?? []).filter((usuario) => usuario.nome.toLowerCase().includes(termo))
    : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Conversas</h1>
        <p className="text-sm text-ink-soft">
          Chats privados abertos a partir do Mural. Ficam disponíveis por até 7 dias.
        </p>
      </div>

      <div className="notch border border-paper-line bg-paper-surface p-4 shadow-paper">
        <label htmlFor="busca-morador" className="text-sm font-medium text-ink">
          Buscar morador
        </label>
        <input
          id="busca-morador"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome do morador ou síndico..."
          className="mt-2 min-h-[44px] w-full border border-ink/40 bg-paper-surface px-3 py-2
            text-sm text-ink outline-none transition focus:border-ink"
        />

        {erroAbrir && (
          <p role="alert" className="mt-2 text-sm text-carmim-700">
            {erroAbrir}
          </p>
        )}

        {termo && resultados.length === 0 && (
          <p className="mt-3 text-sm text-ink-faint">Nenhum morador encontrado com esse nome.</p>
        )}

        {resultados.length > 0 && (
          <div className="mt-3 flex flex-col divide-y divide-dashed divide-paper-line">
            {resultados.map((usuario) => (
              <button
                key={usuario.id}
                type="button"
                onClick={() => handleIniciar(usuario.id)}
                disabled={abrindoId === usuario.id}
                className="flex items-center gap-3 py-2 text-left transition hover:bg-paper
                  disabled:opacity-60"
              >
                <Avatar nome={usuario.nome} />
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {usuario.nome}
                  <PapelTag papel={usuario.papel} />
                </span>
                {abrindoId === usuario.id && <Spinner />}
              </button>
            ))}
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}

      {!conversas && !erro && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {conversas && conversas.length === 0 && (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="Busque um morador acima, ou abra um chat a partir de um post ou comentário no Mural."
        />
      )}

      {conversas && conversas.length > 0 && (
        <div className="flex flex-col gap-3">
          {conversas.map((conversa) => (
            <Link
              key={conversa.id}
              to={`/conversas/${conversa.id}`}
              className="notch flex gap-3 border border-paper-line bg-paper-surface p-4
                shadow-paper transition hover:bg-paper"
            >
              <Avatar nome={conversa.outroParticipante.nome} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{conversa.outroParticipante.nome}</span>
                  {conversa.ultimaMensagem && (
                    <span className="shrink-0 font-meta text-xs text-ink-faint">
                      {formatRelativeTime(conversa.ultimaMensagem.createdAt)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">
                  {conversa.ultimaMensagem?.conteudo ?? 'Nenhuma mensagem ainda.'}
                </p>
                <p className="mt-1 font-meta text-xs text-ink-faint">
                  {formatDiasRestantes(conversa.expiraEm)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

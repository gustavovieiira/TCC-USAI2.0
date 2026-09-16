import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PapelTag } from '@/components/ui/Badge';
import { Avatar } from '@/features/mural/PostCard';
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
        <h1 className="text-2xl font-bold text-slate-900">Conversas</h1>
        <p className="text-sm text-slate-500">
          Chats privados abertos a partir do Mural. Ficam disponíveis por até 7 dias.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
        <label htmlFor="busca-morador" className="text-sm font-medium text-slate-700">
          Buscar morador
        </label>
        <input
          id="busca-morador"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome do morador ou síndico..."
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none
            transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        {erroAbrir && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {erroAbrir}
          </p>
        )}

        {termo && resultados.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">Nenhum morador encontrado com esse nome.</p>
        )}

        {resultados.length > 0 && (
          <div className="mt-3 flex flex-col divide-y divide-slate-100">
            {resultados.map((usuario) => (
              <button
                key={usuario.id}
                type="button"
                onClick={() => handleIniciar(usuario.id)}
                disabled={abrindoId === usuario.id}
                className="flex items-center gap-3 py-2 text-left transition hover:bg-slate-50
                  disabled:opacity-60"
              >
                <Avatar nome={usuario.nome} />
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  {usuario.nome}
                  <PapelTag papel={usuario.papel} />
                </span>
                {abrindoId === usuario.id && <Spinner />}
              </button>
            ))}
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

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
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-100">
          {conversas.map((conversa) => (
            <Link
              key={conversa.id}
              to={`/conversas/${conversa.id}`}
              className="flex gap-3 border-b border-slate-100 p-4 transition last:border-0
                hover:bg-slate-50"
            >
              <Avatar nome={conversa.outroParticipante.nome} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {conversa.outroParticipante.nome}
                  </span>
                  {conversa.ultimaMensagem && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatRelativeTime(conversa.ultimaMensagem.createdAt)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {conversa.ultimaMensagem?.conteudo ?? 'Nenhuma mensagem ainda.'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
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

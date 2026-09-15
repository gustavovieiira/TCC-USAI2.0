import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/authStorage';
import { formatTime } from '@/lib/format';
import { createLocacaoSocket, LocacaoSocket } from '@/lib/socket';
import { listarMensagens } from '@/features/mensagens/mensagens.api';
import { MensagemDTO } from '@/features/mensagens/mensagens.types';

interface LocationState {
  itemTitulo?: string;
}

export function MensagensLocacaoPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const itemTitulo = (location.state as LocationState | null)?.itemTitulo;

  const [mensagens, setMensagens] = useState<MensagemDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const socketRef = useRef<LocacaoSocket | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;

    listarMensagens(id)
      .then((historico) => {
        if (ativo) setMensagens(historico);
      })
      .catch((err) => ativo && setErro(extractErrorMessage(err)));

    const socket = createLocacaoSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('locacao:entrar', id, (ok) => {
        if (!ativo) return;
        if (ok) {
          setConectado(true);
        } else {
          setErro('Você não participa desta locação.');
        }
      });
    });

    socket.on('mensagem:nova', (mensagem) => {
      if (!ativo || mensagem.locacaoId !== id) return;
      setMensagens((atual) => (atual ? [...atual, mensagem] : [mensagem]));
    });

    return () => {
      ativo = false;
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function handleEnviar(event: FormEvent) {
    event.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !id || !socketRef.current) return;

    setEnviando(true);
    socketRef.current.emit('mensagem:enviar', { locacaoId: id, conteudo }, (ack) => {
      setEnviando(false);
      if (ack.ok) {
        setTexto('');
      } else {
        setErro(ack.erro);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          ←
        </button>
        <div>
          <h1 className="font-semibold text-slate-900">{itemTitulo ?? 'Conversa da locação'}</h1>
          <p className="text-xs text-slate-400">{conectado ? 'Conectado' : 'Conectando...'}</p>
        </div>
      </div>

      <Card className="flex h-[65vh] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!mensagens && !erro && (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          )}

          {mensagens && mensagens.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhuma mensagem ainda. Diga oi 👋
            </p>
          )}

          {mensagens?.map((mensagem) => {
            const ehMinha = mensagem.remetenteId === user?.id;
            return (
              <div
                key={mensagem.id}
                className={`flex ${ehMinha ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    ehMinha ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="whitespace-pre-line">{mensagem.conteudo}</p>
                  <p
                    className={`mt-1 text-[10px] ${ehMinha ? 'text-brand-100' : 'text-slate-400'}`}
                  >
                    {formatTime(mensagem.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={fimRef} />
        </div>

        {erro && (
          <p role="alert" className="px-4 pb-2 text-sm text-red-600">
            {erro}
          </p>
        )}

        <form onSubmit={handleEnviar} className="flex gap-2 border-t border-slate-100 p-3">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva uma mensagem..."
            disabled={!conectado}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none
              transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
          />
          <Button
            type="submit"
            fullWidth={false}
            isLoading={enviando}
            disabled={!conectado || !texto.trim()}
          >
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
}

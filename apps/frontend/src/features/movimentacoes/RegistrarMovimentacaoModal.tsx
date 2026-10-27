import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { extractErrorMessage } from '@/lib/apiClient';
import { registrarMovimentacao } from './movimentacoes.api';
import {
  AcessorioMovimentacao,
  EstadoConservacao,
  MovimentacaoResumoDTO,
  TipoMovimentacao,
} from './movimentacoes.types';
import { ROTULO_ESTADO } from './rotulos';

interface RegistrarMovimentacaoModalProps {
  locacaoId: string;
  itemTitulo: string;
  tipo: TipoMovimentacao;
  /** Acessórios cadastrados no item — viram a lista de conferência. */
  acessoriosDoItem: string[];
  onFechar: () => void;
  onRegistrado: (movimentacao: MovimentacaoResumoDTO) => void;
}

const TEXTOS: Record<
  TipoMovimentacao,
  { titulo: string; quem: string; botao: string; ajuda: string }
> = {
  RETIRADA: {
    titulo: 'Registrar a entrega do item',
    quem: 'o locatário',
    botao: 'Registrar entrega',
    ajuda:
      'Confira o item e os acessórios com o locatário. Depois de registrar, ele recebe um aviso para conferir os dados e aceitar o termo de responsabilidade.',
  },
  DEVOLUCAO: {
    titulo: 'Registrar a devolução do item',
    quem: 'o proprietário',
    botao: 'Registrar devolução',
    ajuda:
      'Informe como o item está sendo devolvido. Depois de registrar, o proprietário recebe um aviso para conferir e aceitar o termo.',
  },
};

/**
 * Quem ENTREGA registra a operação: estado de conservação, conferência dos acessórios e
 * observações. Nada vem marcado de antemão — cada acessório é conferido de propósito. Quem recebe
 * confere e aceita o termo na tela do documento.
 */
export function RegistrarMovimentacaoModal({
  locacaoId,
  itemTitulo,
  tipo,
  acessoriosDoItem,
  onFechar,
  onRegistrado,
}: RegistrarMovimentacaoModalProps) {
  const textos = TEXTOS[tipo];
  const [estado, setEstado] = useState<EstadoConservacao | ''>('');
  const [acessorios, setAcessorios] = useState<AcessorioMovimentacao[]>(
    acessoriosDoItem.map((nome) => ({ nome, conferido: false })),
  );
  const [novoAcessorio, setNovoAcessorio] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternar(indice: number) {
    setAcessorios((atual) =>
      atual.map((a, i) => (i === indice ? { ...a, conferido: !a.conferido } : a)),
    );
  }

  function adicionarAcessorio() {
    const nome = novoAcessorio.trim();
    if (!nome) return;
    if (acessorios.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) {
      setErro('Este acessório já está na lista.');
      return;
    }
    setErro(null);
    setAcessorios((atual) => [...atual, { nome, conferido: true }]);
    setNovoAcessorio('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!estado) {
      setErro('Informe o estado de conservação do item.');
      return;
    }

    setEnviando(true);
    try {
      const registrada = await registrarMovimentacao(locacaoId, {
        tipo,
        estadoConservacao: estado,
        acessorios,
        observacoes: observacoes.trim() || undefined,
      });
      onRegistrado(registrada);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={textos.titulo} onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="pr-6">
          <h2 className="font-display text-xl font-bold text-ink">{textos.titulo}</h2>
          <p className="text-sm text-ink-soft">{itemTitulo}</p>
        </div>
        <p className="text-sm text-ink-soft">{textos.ajuda}</p>

        <Select
          label="Estado de conservação"
          name="estadoConservacao"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoConservacao | '')}
          required
        >
          <option value="">Selecione…</option>
          {(Object.keys(ROTULO_ESTADO) as EstadoConservacao[]).map((chave) => (
            <option key={chave} value={chave}>
              {ROTULO_ESTADO[chave]}
            </option>
          ))}
        </Select>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">Acessórios e itens vinculados</legend>
          {acessorios.length === 0 && (
            <p className="text-sm text-ink-faint">Nenhum acessório cadastrado para este item.</p>
          )}
          {acessorios.map((acessorio, indice) => (
            <label key={acessorio.nome} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={acessorio.conferido}
                onChange={() => alternar(indice)}
                className="h-5 w-5 accent-barro-500"
              />
              {acessorio.nome}
            </label>
          ))}
          <p className="text-xs text-ink-faint">
            Marque o que acompanha {tipo === 'RETIRADA' ? 'a entrega' : 'a devolução'}; o que ficar
            sem marcar é registrado como não entregue.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label="Outro acessório"
                name="novoAcessorio"
                value={novoAcessorio}
                maxLength={80}
                onChange={(e) => setNovoAcessorio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarAcessorio();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={adicionarAcessorio}
            >
              Adicionar
            </Button>
          </div>
        </fieldset>

        <Textarea
          label="Observações adicionais (opcional)"
          name="observacoes"
          rows={3}
          maxLength={1000}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex.: pequeno risco na tampa, bateria com carga parcial…"
        />

        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" fullWidth={false} isLoading={enviando}>
            {textos.botao}
          </Button>
          <Button type="button" variant="ghost" fullWidth={false} onClick={onFechar}>
            Cancelar
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          Quem recebe é {textos.quem}: ele confere estes dados e assina o termo antes de a operação
          ser concluída.
        </p>
      </form>
    </Modal>
  );
}

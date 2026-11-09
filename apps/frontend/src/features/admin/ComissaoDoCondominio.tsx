import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { atualizarCondominio } from './admin.api';
import { CondominioAdminDTO } from './admin.types';

/** "7,5%": como o percentual aparece para o Admin (0 fica "0%"). */
export function formatarPercentual(valor: number): string {
  return `${String(valor).replace('.', ',')}%`;
}

/**
 * Lê o que o Admin digitou ("7,5", "10", "0") e devolve o número, ou uma mensagem de erro. Aceita vírgula ou ponto,
 * de 0 a 100, com no máximo 2 casas decimais (o servidor confere de novo).
 */
export function lerPercentual(texto: string): { valor: number } | { erro: string } {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '' || !/^\d+(\.\d+)?$/.test(limpo)) {
    return { erro: 'Digite um número, por exemplo 0, 5 ou 7,5.' };
  }
  const valor = Number(limpo);
  if (valor > 100) return { erro: 'A comissão não pode passar de 100%.' };
  if (Math.round(valor * 100) / 100 !== valor) return { erro: 'Use no máximo 2 casas decimais.' };
  return { valor };
}

interface ModalComissaoProps {
  condominio: CondominioAdminDTO;
  onFechar: () => void;
  onSalvo: (condominio: CondominioAdminDTO) => void;
}

/**
 * Só o Admin altera. A comissão é um percentual do valor de cada aluguel pago, descontado do que o dono recebe e
 * creditado ao(s) síndico(s) do condomínio. O padrão é 0: sem comissão.
 */
export function ModalComissao({ condominio, onFechar, onSalvo }: ModalComissaoProps) {
  const [texto, setTexto] = useState(String(condominio.percentualComissao).replace('.', ','));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    const lido = lerPercentual(texto);
    if ('erro' in lido) {
      setErro(lido.erro);
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const atualizado = await atualizarCondominio(condominio.id, {
        percentualComissao: lido.valor,
      });
      onSalvo(atualizado);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="Comissão do condomínio" onFechar={onFechar}>
      <h2 className="font-display text-lg font-bold text-ink">Comissão de {condominio.nome}</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Percentual de cada aluguel pago neste condomínio que vai para o síndico. Ele sai do valor
        que o dono do item receberia, junto com a taxa do PIX. Com 0% (o padrão) o dono recebe o
        valor pago menos só a taxa do PIX.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Vale para os aluguéis pagos daqui para frente. Os que já foram pagos continuam como foram.
      </p>

      <form onSubmit={aoSalvar} className="mt-4 flex flex-col gap-4" noValidate>
        <TextField
          label="Comissão (% do aluguel)"
          name="percentualComissao"
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          error={erro ?? undefined}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" fullWidth={false} isLoading={salvando}>
            Salvar comissão
          </Button>
          <Button type="button" variant="ghost" fullWidth={false} onClick={onFechar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from './admin.api';
import { CondominioAdminDTO } from './admin.types';
import { formatarPercentual, lerPercentual, ModalComissao } from './ComissaoDoCondominio';

const condominio: CondominioAdminDTO = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  percentualComissao: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};

afterEach(() => vi.restoreAllMocks());

describe('lerPercentual', () => {
  it.each([
    ['0', 0],
    ['10', 10],
    ['7,5', 7.5],
    ['7.5', 7.5],
    ['100', 100],
    [' 12,25 ', 12.25],
  ])('aceita "%s"', (texto, esperado) => {
    expect(lerPercentual(texto)).toEqual({ valor: esperado });
  });

  it.each([[''], ['abc'], ['-5'], ['1e3'], ['10%'], ['1,2,3']])(
    'recusa "%s" como número',
    (texto) => {
      expect(lerPercentual(texto)).toHaveProperty('erro');
    },
  );

  it('recusa acima de 100 e mais de 2 casas decimais', () => {
    expect(lerPercentual('100,01')).toEqual({ erro: 'A comissão não pode passar de 100%.' });
    expect(lerPercentual('3,456')).toEqual({ erro: 'Use no máximo 2 casas decimais.' });
  });
});

describe('formatarPercentual', () => {
  it('mostra com vírgula e o sinal de %', () => {
    expect(formatarPercentual(0)).toBe('0%');
    expect(formatarPercentual(7.5)).toBe('7,5%');
    expect(formatarPercentual(10)).toBe('10%');
  });
});

describe('ModalComissao', () => {
  it('explica a regra e começa com o percentual atual do condomínio', () => {
    render(
      <ModalComissao
        condominio={{ ...condominio, percentualComissao: 7.5 }}
        onFechar={() => undefined}
        onSalvo={() => undefined}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Comissão do condomínio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Comissão (% do aluguel)')).toHaveValue('7,5');
    expect(screen.getByText(/Com 0% \(o padrão\)/)).toBeInTheDocument();
    expect(screen.getByText(/Os que já foram pagos continuam como foram/)).toBeInTheDocument();
  });

  it('salva o percentual digitado (aceita vírgula) e devolve o condomínio atualizado', async () => {
    const atualizado = { ...condominio, percentualComissao: 7.5 };
    const atualizar = vi.spyOn(adminApi, 'atualizarCondominio').mockResolvedValue(atualizado);
    const onSalvo = vi.fn();
    render(<ModalComissao condominio={condominio} onFechar={() => undefined} onSalvo={onSalvo} />);

    const campo = screen.getByLabelText('Comissão (% do aluguel)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '7,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comissão' }));

    expect(atualizar).toHaveBeenCalledWith('cond-1', { percentualComissao: 7.5 });
    expect(onSalvo).toHaveBeenCalledWith(atualizado);
  });

  it('valor inválido mostra o erro e não chama o servidor', async () => {
    const atualizar = vi.spyOn(adminApi, 'atualizarCondominio');
    render(
      <ModalComissao
        condominio={condominio}
        onFechar={() => undefined}
        onSalvo={() => undefined}
      />,
    );

    const campo = screen.getByLabelText('Comissão (% do aluguel)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comissão' }));

    expect(screen.getByText('A comissão não pode passar de 100%.')).toBeInTheDocument();
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('se o servidor recusar, mostra o motivo e mantém a janela aberta', async () => {
    vi.spyOn(adminApi, 'atualizarCondominio').mockRejectedValue(new Error('rede caiu'));
    const onSalvo = vi.fn();
    render(<ModalComissao condominio={condominio} onFechar={() => undefined} onSalvo={onSalvo} />);

    await userEvent.type(screen.getByLabelText('Comissão (% do aluguel)'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comissão' }));

    expect(await screen.findByText(/Algo deu errado|rede caiu|erro/i)).toBeInTheDocument();
    expect(onSalvo).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancelar fecha sem salvar', async () => {
    const atualizar = vi.spyOn(adminApi, 'atualizarCondominio');
    const onFechar = vi.fn();
    render(<ModalComissao condominio={condominio} onFechar={onFechar} onSalvo={() => undefined} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onFechar).toHaveBeenCalled();
    expect(atualizar).not.toHaveBeenCalled();
  });
});

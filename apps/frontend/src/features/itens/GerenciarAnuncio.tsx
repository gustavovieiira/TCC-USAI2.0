import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { extractErrorMessage } from '@/lib/apiClient';
import { atualizarItem, removerItem } from './itens.api';
import { ItemDTO } from './itens.types';
import { MENSAGEM_VALOR_MINIMO, VALOR_MINIMO_DIARIA } from './valores';

interface GerenciarAnuncioProps {
  item: ItemDTO;
  aoAtualizar: (item: ItemDTO) => void;
  aoRemover: () => void;
}

/** O que o dono vê no próprio item: editar os dados do anúncio ou tirá-lo do catálogo. */
export function GerenciarAnuncio({ item, aoAtualizar, aoRemover }: GerenciarAnuncioProps) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [categoria, setCategoria] = useState(item.categoria);
  const [descricao, setDescricao] = useState(item.descricao);
  const [valorDiaria, setValorDiaria] = useState(String(item.valorDiaria));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [salvoAgora, setSalvoAgora] = useState(false);

  function abrirEdicao() {
    setTitulo(item.titulo);
    setCategoria(item.categoria);
    setDescricao(item.descricao);
    setValorDiaria(String(item.valorDiaria));
    setErro(null);
    setSalvoAgora(false);
    setEditando(true);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const valor = Number(valorDiaria);
    if (!Number.isFinite(valor) || valor < VALOR_MINIMO_DIARIA) {
      setErro(MENSAGEM_VALOR_MINIMO);
      return;
    }
    if (titulo.trim().length < 3 || categoria.trim().length < 2 || descricao.trim().length < 10) {
      setErro(
        'Confira o título (3 letras ou mais), a categoria (2 ou mais) e a descrição (10 ou mais).',
      );
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await atualizarItem(item.id, {
        titulo: titulo.trim(),
        categoria: categoria.trim(),
        descricao: descricao.trim(),
        valorDiaria: valor,
      });
      aoAtualizar(atualizado);
      setEditando(false);
      setSalvoAgora(true);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    setErro(null);
    setRemovendo(true);
    try {
      await removerItem(item.id);
      aoRemover();
    } catch (err) {
      setConfirmando(false);
      setErro(extractErrorMessage(err));
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <>
      {confirmando && (
        <Modal titulo={`Remover "${item.titulo}"?`} onFechar={() => setConfirmando(false)}>
          <h2 className="pr-8 font-marca text-xl font-extrabold leading-tight text-fachada-tinta">
            Remover &quot;{item.titulo}&quot;?
          </h2>
          <p className="mt-2 text-sm text-fachada-tinta-suave">
            O item sai do catálogo e ninguém mais consegue pedi-lo. As locações que já aconteceram
            continuam no histórico.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="danger" fullWidth={false} isLoading={removendo} onClick={remover}>
              Sim, remover
            </Button>
            <Button variant="secondary" fullWidth={false} onClick={() => setConfirmando(false)}>
              Manter no catálogo
            </Button>
          </div>
        </Modal>
      )}

      <Card className="flex flex-col gap-4 text-sm text-ink-soft">
        <p>
          Este item é seu. Acompanhe as solicitações em{' '}
          <Link to="/locacoes" className="font-semibold text-barro-700 hover:underline">
            Minhas locações
          </Link>
          .
        </p>

        {salvoAgora && !editando && (
          <p role="status" className="font-semibold text-fachada-folha-texto">
            Anúncio atualizado.
          </p>
        )}
        {erro && !editando && (
          <p role="alert" className="font-medium text-fachada-coral-texto">
            {erro}
          </p>
        )}

        {editando ? (
          <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
            <TextField
              label="Título"
              name="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <TextField
              label="Categoria"
              name="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
            <Textarea
              label="Descrição"
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
            <TextField
              label="Valor por diária (R$)"
              name="valorDiaria"
              type="number"
              min={VALOR_MINIMO_DIARIA}
              step="0.01"
              inputMode="decimal"
              value={valorDiaria}
              onChange={(e) => setValorDiaria(e.target.value)}
            />
            {erro && (
              <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
                {erro}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" fullWidth={false} isLoading={salvando}>
                Salvar alterações
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth={false}
                onClick={() => setEditando(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" fullWidth={false} onClick={abrirEdicao}>
              Editar anúncio
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth={false}
              onClick={() => setConfirmando(true)}
            >
              Remover do catálogo
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

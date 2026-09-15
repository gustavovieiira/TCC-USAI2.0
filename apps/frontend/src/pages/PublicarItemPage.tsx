import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { criarItem } from '@/features/itens/itens.api';

export function PublicarItemPage() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setIsLoading(true);

    try {
      const item = await criarItem({
        titulo,
        categoria,
        descricao,
        valorDiaria: Number(valorDiaria),
        imagens: imagemUrl ? [imagemUrl] : undefined,
      });
      navigate(`/itens/${item.id}`);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Publicar item</h1>
        <p className="text-sm text-slate-500">Anuncie um item ocioso pros vizinhos alugarem.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Título"
            name="titulo"
            required
            minLength={3}
            placeholder="Ex.: Furadeira Bosch"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <TextField
            label="Categoria"
            name="categoria"
            required
            minLength={2}
            placeholder="Ex.: Ferramentas"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Textarea
            label="Descrição"
            name="descricao"
            required
            minLength={10}
            placeholder="Estado do item, o que está incluso, cuidados na devolução..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <TextField
            label="Valor por diária (R$)"
            name="valorDiaria"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            value={valorDiaria}
            onChange={(e) => setValorDiaria(e.target.value)}
          />
          <TextField
            label="URL de uma foto (opcional)"
            name="imagemUrl"
            type="url"
            placeholder="https://..."
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
          />
          {erro && (
            <p role="alert" className="text-sm text-red-600">
              {erro}
            </p>
          )}
          <Button type="submit" isLoading={isLoading}>
            Publicar
          </Button>
        </form>
      </Card>
    </div>
  );
}

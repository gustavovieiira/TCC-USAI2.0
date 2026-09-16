import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { criarItem, uploadImagemItem } from '@/features/itens/itens.api';

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

export function PublicarItemPage() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Revoga o object URL da pré-visualização anterior sempre que troca ou desmonta.
  useEffect(() => {
    return () => {
      if (imagemPreview) URL.revokeObjectURL(imagemPreview);
    };
  }, [imagemPreview]);

  function handleImagemChange(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null;

    if (arquivo && !TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato de imagem não suportado. Use JPEG, PNG ou WebP.');
      event.target.value = '';
      return;
    }

    setErro(null);
    setImagemArquivo(arquivo);
    setImagemPreview((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setIsLoading(true);

    try {
      let imagens: string[] | undefined;
      if (imagemArquivo) {
        const { url } = await uploadImagemItem(imagemArquivo);
        imagens = [url];
      }

      const item = await criarItem({
        titulo,
        categoria,
        descricao,
        valorDiaria: Number(valorDiaria),
        imagens,
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

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Foto (opcional)</span>
            <div className="flex items-center gap-3">
              {imagemPreview ? (
                <img
                  src={imagemPreview}
                  alt="Pré-visualização"
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                  Sem foto
                </div>
              )}
              <label
                htmlFor="imagem"
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm
                  font-medium text-slate-700 hover:bg-slate-50"
              >
                {imagemArquivo ? 'Trocar foto' : 'Escolher foto'}
              </label>
              <input
                id="imagem"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImagemChange}
              />
            </div>
          </div>

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

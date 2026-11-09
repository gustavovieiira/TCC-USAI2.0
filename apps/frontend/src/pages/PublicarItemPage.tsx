import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { AvisoResponsabilidade } from '@/features/privacidade/AvisoResponsabilidade';
import { criarItem, uploadImagemItem } from '@/features/itens/itens.api';
import { FiltroChips } from '@/components/ui/FiltroChips';
import {
  MENSAGEM_VALOR_SERVICO,
  ROTULO_UNIDADE_DO_SERVICO,
  rotuloDoCampoDeValor,
} from '@/features/itens/anuncio';
import { TipoAnuncio } from '@/features/itens/itens.types';
import { MENSAGEM_VALOR_MINIMO, VALOR_MINIMO_DIARIA } from '@/features/itens/valores';

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

export function PublicarItemPage() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoAnuncio>('ITEM');
  const [unidadeServico, setUnidadeServico] = useState<'HORA' | 'SERVICO'>('HORA');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [acessorios, setAcessorios] = useState<string[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState('');
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

  function adicionarAcessorio() {
    const nome = novoAcessorio.trim();
    if (!nome) return;
    if (acessorios.some((a) => a.toLowerCase() === nome.toLowerCase())) {
      setErro('Este acessório já está na lista.');
      return;
    }
    setErro(null);
    setAcessorios((atual) => [...atual, nome]);
    setNovoAcessorio('');
  }

  const ehServico = tipo === 'SERVICO';

  function trocarTipo(novo: TipoAnuncio) {
    setTipo(novo);
    setErroValor(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (ehServico) {
      // Serviço é combinado direto entre os moradores: não tem o piso do PIX, só precisa de um valor.
      if (!(Number(valorDiaria) > 0)) {
        setErroValor(MENSAGEM_VALOR_SERVICO);
        return;
      }
    } else if (!(Number(valorDiaria) >= VALOR_MINIMO_DIARIA)) {
      // Abaixo do mínimo o PIX seria recusado na hora de pagar; barra já na publicação.
      setErroValor(MENSAGEM_VALOR_MINIMO);
      return;
    }

    setIsLoading(true);

    try {
      let imagens: string[] | undefined;
      if (imagemArquivo) {
        const { url } = await uploadImagemItem(imagemArquivo);
        imagens = [url];
      }

      const item = await criarItem({
        tipo,
        unidadeCobranca: ehServico ? unidadeServico : 'DIA',
        titulo,
        categoria,
        descricao,
        valorDiaria: Number(valorDiaria),
        fabricante: !ehServico ? fabricante.trim() || undefined : undefined,
        modelo: !ehServico ? modelo.trim() || undefined : undefined,
        numeroSerie: !ehServico ? numeroSerie.trim() || undefined : undefined,
        acessorios: !ehServico && acessorios.length > 0 ? acessorios : undefined,
        imagens,
      });
      void navigate(`/itens/${item.id}`);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {ehServico ? 'Publicar serviço' : 'Publicar item'}
        </h1>
        <p className="text-sm text-ink-soft">
          {ehServico
            ? 'Ofereça um serviço seu pros vizinhos, com o valor por hora ou por serviço.'
            : 'Anuncie um item ocioso pros vizinhos alugarem.'}
        </p>
      </div>

      <FiltroChips<TipoAnuncio>
        rotulo="O que você quer publicar"
        valor={tipo}
        onChange={trocarTipo}
        opcoes={[
          { valor: 'ITEM', rotulo: 'Item para alugar' },
          { valor: 'SERVICO', rotulo: 'Serviço' },
        ]}
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Título"
            name="titulo"
            required
            minLength={3}
            placeholder={ehServico ? 'Ex.: Eletricista residencial' : 'Ex.: Furadeira Bosch'}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <TextField
            label="Categoria"
            name="categoria"
            required
            minLength={2}
            placeholder={ehServico ? 'Ex.: Elétrica, Beleza, Unhas, Aulas' : 'Ex.: Ferramentas'}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Textarea
            label="Descrição"
            name="descricao"
            required
            minLength={10}
            placeholder={
              ehServico
                ? 'O que você faz, sua experiência, o que está incluso, dias e horários e a região que atende...'
                : 'Estado do item, o que está incluso, cuidados na devolução...'
            }
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          {ehServico && (
            <FiltroChips<'HORA' | 'SERVICO'>
              rotulo="Como você cobra"
              valor={unidadeServico}
              onChange={setUnidadeServico}
              opcoes={[
                { valor: 'HORA', rotulo: ROTULO_UNIDADE_DO_SERVICO.HORA },
                { valor: 'SERVICO', rotulo: ROTULO_UNIDADE_DO_SERVICO.SERVICO },
              ]}
            />
          )}
          <TextField
            label={rotuloDoCampoDeValor(tipo, ehServico ? unidadeServico : 'DIA')}
            name="valorDiaria"
            type="number"
            min={ehServico ? 0.01 : VALOR_MINIMO_DIARIA}
            step="0.01"
            inputMode="decimal"
            required
            value={valorDiaria}
            error={erroValor ?? undefined}
            aria-describedby="dica-valor-minimo"
            onChange={(e) => {
              setValorDiaria(e.target.value);
              setErroValor(null);
            }}
          />
          <p id="dica-valor-minimo" className="-mt-2 text-xs text-ink-faint">
            {ehServico
              ? 'O pagamento é combinado direto com quem contratar. A USAI não cobra nem recebe pelo serviço.'
              : 'Mínimo de R$ 5,00 por diária (o menor valor que a cobrança por PIX aceita).'}
          </p>

          {!ehServico && (
            <fieldset className="flex min-w-0 flex-col gap-3 border border-paper-line p-3">
              <legend className="px-1 text-sm font-medium text-ink">
                Identificação do bem (opcional)
              </legend>
              <p className="text-xs text-ink-faint">
                O que você souber informar. Aparece no documento de retirada e devolução, e ajuda a
                identificar o item sem dúvida.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Fabricante"
                  name="fabricante"
                  maxLength={120}
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                />
                <TextField
                  label="Modelo"
                  name="modelo"
                  maxLength={120}
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>
              <TextField
                label="Número de série"
                name="numeroSerie"
                maxLength={120}
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">Acessórios que acompanham</span>
                {acessorios.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {acessorios.map((nome) => (
                      <li
                        key={nome}
                        className="notch-sm flex items-center gap-1 bg-paper px-2 py-1 text-sm text-ink"
                      >
                        {nome}
                        <button
                          type="button"
                          aria-label={`Remover ${nome}`}
                          onClick={() => setAcessorios((atual) => atual.filter((a) => a !== nome))}
                          className="text-ink-faint hover:text-carmim-700"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label="Novo acessório"
                      name="novoAcessorio"
                      maxLength={80}
                      placeholder="Ex.: Maleta, jogo de brocas…"
                      value={novoAcessorio}
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
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">
              {ehServico ? 'Foto (opcional, do seu trabalho)' : 'Foto (opcional)'}
            </span>
            <div className="flex items-center gap-3">
              {imagemPreview ? (
                <img
                  src={imagemPreview}
                  alt="Pré-visualização"
                  className="notch-sm h-16 w-16 object-cover"
                />
              ) : (
                <div
                  className="notch-sm flex h-16 w-16 items-center justify-center bg-paper
                  font-meta text-xs text-ink-faint"
                >
                  SEM FOTO
                </div>
              )}
              <label
                htmlFor="imagem"
                className="notch-sm min-h-[44px] cursor-pointer border border-ink/40 px-4 py-2
                  text-sm font-semibold text-ink hover:bg-paper"
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
            <p role="alert" className="text-sm text-carmim-700">
              {erro}
            </p>
          )}
          <AvisoResponsabilidade papel={ehServico ? 'prestador' : 'proprietario'} />

          <Button type="submit" isLoading={isLoading}>
            Publicar
          </Button>
        </form>
      </Card>
    </div>
  );
}

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { extractErrorMessage } from '@/lib/apiClient';
import {
  atualizarTextosInstitucionais,
  enviarLogo,
  removerLogo,
} from '@/features/configuracao/configuracao.api';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';

const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
const LIMITE_BYTES = 2 * 1024 * 1024;

/**
 * Identidade da plataforma: a logo oficial (upload, mantida como enviada — sem recompressão, com a
 * proporção original) e o nome e rodapé institucionais que saem nos documentos. A troca vale pro
 * app inteiro na hora (cabeçalho, tela inicial, login e documentos).
 */
export function AbaIdentidade() {
  const { configuracao, atualizar } = useConfiguracao();
  const entradaArquivo = useRef<HTMLInputElement>(null);

  const [previa, setPrevia] = useState<{ arquivo: File; url: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nome, setNome] = useState(configuracao.nomeInstitucional);
  const [rodape, setRodape] = useState(configuracao.rodapeInstitucional);
  const [salvandoTextos, setSalvandoTextos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Os campos acompanham o que está salvo quando a configuração chega do servidor.
  useEffect(() => {
    setNome(configuracao.nomeInstitucional);
    setRodape(configuracao.rodapeInstitucional);
  }, [configuracao.nomeInstitucional, configuracao.rodapeInstitucional]);

  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa.url);
    };
  }, [previa]);

  function limparMensagens() {
    setErro(null);
    setSucesso(null);
  }

  function escolherArquivo(event: ChangeEvent<HTMLInputElement>) {
    limparMensagens();
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato não suportado. Use PNG, JPEG ou WebP.');
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro('A logo pode ter no máximo 2 MB.');
      return;
    }

    setPrevia({ arquivo, url: URL.createObjectURL(arquivo) });
  }

  async function confirmarEnvio() {
    if (!previa) return;
    limparMensagens();
    setEnviando(true);

    try {
      atualizar(await enviarLogo(previa.arquivo));
      setPrevia(null);
      setSucesso('Logo atualizada. Ela já aparece no cabeçalho, na tela inicial e nos documentos.');
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover() {
    limparMensagens();
    try {
      atualizar(await removerLogo());
      setSucesso('Logo removida. O sistema voltou a usar a marca padrão da USAI.');
    } catch (err) {
      setErro(extractErrorMessage(err));
    }
  }

  async function handleSalvarTextos(event: FormEvent) {
    event.preventDefault();
    limparMensagens();
    setSalvandoTextos(true);

    try {
      atualizar(
        await atualizarTextosInstitucionais({
          nomeInstitucional: nome,
          rodapeInstitucional: rodape,
        }),
      );
      setSucesso('Nome e rodapé institucionais salvos.');
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setSalvandoTextos(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Logo oficial</h2>
          <p className="text-sm text-ink-soft">
            Aparece no cabeçalho, na tela inicial, no login e em todos os documentos gerados. Use
            PNG, JPEG ou WebP de até 2 MB; de preferência com fundo transparente. O arquivo é
            guardado como foi enviado, sem perder qualidade nem proporção.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-meta text-xs uppercase tracking-wide text-ink-faint">Atual</p>
            <div className="flex min-h-[96px] items-center justify-center border border-paper-line bg-paper p-4">
              <Logo altura={56} className="text-ink" />
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {configuracao.logoUrl ? 'Logo enviada pelo Admin.' : 'Marca padrão da USAI.'}
            </p>
          </div>
          {previa && (
            <div>
              <p className="mb-1 font-meta text-xs uppercase tracking-wide text-ink-faint">
                Nova (pré-visualização)
              </p>
              <div className="flex min-h-[96px] items-center justify-center border border-dashed border-ink/40 bg-paper p-4">
                <img
                  src={previa.url}
                  alt="Pré-visualização da nova logo"
                  style={{ height: 56, width: 'auto' }}
                  className="max-w-full object-contain"
                />
              </div>
              <p className="mt-1 text-xs text-ink-faint">{previa.arquivo.name}</p>
            </div>
          )}
        </div>

        <input
          ref={entradaArquivo}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={escolherArquivo}
          className="sr-only"
          aria-label="Selecionar arquivo da logo"
        />
        <div className="flex flex-wrap gap-2">
          {previa ? (
            <>
              <Button fullWidth={false} isLoading={enviando} onClick={confirmarEnvio}>
                Usar esta logo
              </Button>
              <Button variant="ghost" fullWidth={false} onClick={() => setPrevia(null)}>
                Descartar
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => entradaArquivo.current?.click()}
            >
              Enviar nova logo
            </Button>
          )}
          {configuracao.logoUrl && !previa && (
            <Button variant="danger" fullWidth={false} onClick={handleRemover}>
              Remover logo
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSalvarTextos} className="flex flex-col gap-4" noValidate>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Textos institucionais</h2>
            <p className="text-sm text-ink-soft">
              O nome aparece no cabeçalho dos documentos; o rodapé, na base de cada página.
            </p>
          </div>
          <TextField
            label="Nome da empresa"
            name="nomeInstitucional"
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Textarea
            label="Rodapé institucional"
            name="rodapeInstitucional"
            rows={3}
            maxLength={500}
            value={rodape}
            onChange={(e) => setRodape(e.target.value)}
          />
          <div>
            <Button type="submit" fullWidth={false} isLoading={salvandoTextos}>
              Salvar textos
            </Button>
          </div>
        </form>
      </Card>

      {erro && (
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className="text-sm text-jade-700">
          {sucesso}
        </p>
      )}
    </div>
  );
}

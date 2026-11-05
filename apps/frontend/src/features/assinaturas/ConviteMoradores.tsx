import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { IconeWhatsApp } from '@/components/ui/IconesContato';

interface ConviteMoradoresProps {
  nomeCondominio: string;
  linkSlug: string;
  pin: string;
  /** Espaço sob os botões, usado pelo painel para trocar o PIN no mesmo cartão. */
  children?: ReactNode;
}

type Copiado = 'link' | 'pin' | 'convite' | null;

/** Link completo de cadastro dos moradores (o morador entra com o link e o PIN do condomínio). */
export function linkDeConvite(linkSlug: string): string {
  return `${window.location.origin}/cadastro?condominio=${encodeURIComponent(linkSlug)}`;
}

/** Mensagem pronta pra colar no grupo de moradores. */
export function textoDoConvite(nomeCondominio: string, linkSlug: string, pin: string): string {
  return [
    `Olá, vizinhos! O ${nomeCondominio} agora está na USAI: dá pra emprestar e alugar itens entre nós, com pagamento por PIX.`,
    '',
    `Cadastre-se por este link: ${linkDeConvite(linkSlug)}`,
    `PIN do condomínio: ${pin}`,
  ].join('\n');
}

/** Cartão do painel do síndico com o link e o PIN para repassar aos moradores. */
export function ConviteMoradores({
  nomeCondominio,
  linkSlug,
  pin,
  children,
}: ConviteMoradoresProps) {
  const [copiado, setCopiado] = useState<Copiado>(null);
  const [falhou, setFalhou] = useState(false);

  async function copiar(qual: Exclude<Copiado, null>, texto: string) {
    setFalhou(false);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setFalhou(true);
    }
  }

  const link = linkDeConvite(linkSlug);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Convidar moradores</h2>
        <p className="text-sm text-ink-soft">
          Envie o link e o PIN aos moradores. Eles se cadastram sozinhos e já entram no catálogo do
          condomínio.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">Link</p>
          <p className="truncate font-meta text-sm text-ink" title={link}>
            {link}
          </p>
        </div>
        <button
          type="button"
          onClick={() => copiar('link', link)}
          className="min-h-[44px] text-left text-sm font-semibold text-fachada-coral-texto hover:underline sm:text-right"
        >
          {copiado === 'link' ? 'Link copiado!' : 'Copiar link'}
        </button>

        <div>
          <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">PIN do convite</p>
          <p className="font-display text-lg font-semibold tracking-widest text-ink">{pin}</p>
        </div>
        <button
          type="button"
          onClick={() => copiar('pin', pin)}
          className="min-h-[44px] text-left text-sm font-semibold text-fachada-coral-texto hover:underline sm:text-right"
        >
          {copiado === 'pin' ? 'PIN copiado!' : 'Copiar PIN'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textoDoConvite(nomeCondominio, linkSlug, pin))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-coral inline-flex items-center gap-2"
        >
          <IconeWhatsApp />
          Enviar pelo WhatsApp
        </a>
        <button
          type="button"
          onClick={() => copiar('convite', textoDoConvite(nomeCondominio, linkSlug, pin))}
          className="min-h-[44px] px-2 text-sm font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
        >
          {copiado === 'convite' ? 'Convite copiado!' : 'Copiar mensagem de convite'}
        </button>
      </div>

      {falhou && (
        <p role="alert" className="text-sm text-carmim-700">
          Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.
        </p>
      )}

      {children}
    </Card>
  );
}

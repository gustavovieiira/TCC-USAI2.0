import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface ConviteMoradoresProps {
  nomeCondominio: string;
  linkSlug: string;
  pin: string;
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
export function ConviteMoradores({ nomeCondominio, linkSlug, pin }: ConviteMoradoresProps) {
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
          className="text-left text-sm font-semibold text-barro-700 hover:underline sm:text-right"
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
          className="text-left text-sm font-semibold text-barro-700 hover:underline sm:text-right"
        >
          {copiado === 'pin' ? 'PIN copiado!' : 'Copiar PIN'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => copiar('convite', textoDoConvite(nomeCondominio, linkSlug, pin))}
        className="notch min-h-[44px] self-start bg-barro-500 px-5 py-2 text-sm font-bold
          text-ink shadow-press transition hover:bg-barro-700"
      >
        {copiado === 'convite' ? 'Convite copiado!' : 'Copiar mensagem de convite'}
      </button>

      {falhou && (
        <p role="alert" className="text-sm text-carmim-700">
          Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.
        </p>
      )}
    </Card>
  );
}

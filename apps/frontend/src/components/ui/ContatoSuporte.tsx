import { IconeEmail, IconeWhatsApp } from '@/components/ui/IconesContato';
import {
  linkEmailSuporte,
  linkWhatsAppSuporte,
  SUPORTE_EMAIL,
  SUPORTE_WHATSAPP_EXIBICAO,
} from '@/lib/suporte';

interface ContatoSuporteProps {
  /** Mensagem que já vem escrita quando a pessoa abre o WhatsApp. */
  mensagem?: string;
  /** Para uso sobre a parede escura do hall (links em latão claro). */
  escuro?: boolean;
  className?: string;
}

const LINK_CLARO =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';
const LINK_ESCURO =
  'font-semibold text-fachada-luz underline underline-offset-2 hover:no-underline';

/** "Precisa de ajuda?" com os dois canais de suporte (WhatsApp e e-mail), cada um com seu ícone. */
export function ContatoSuporte({ mensagem, escuro = false, className = '' }: ContatoSuporteProps) {
  const link = escuro ? LINK_ESCURO : LINK_CLARO;

  return (
    <div className={className}>
      <p>Precisa de ajuda? Fale com o suporte.</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <a
          href={linkWhatsAppSuporte(mensagem)}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 ${link}`}
        >
          <IconeWhatsApp />
          WhatsApp {SUPORTE_WHATSAPP_EXIBICAO}
        </a>
        <a href={linkEmailSuporte} className={`inline-flex items-center gap-2 ${link}`}>
          <IconeEmail />
          {SUPORTE_EMAIL}
        </a>
      </div>
    </div>
  );
}

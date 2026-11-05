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

/** "Precisa de ajuda?" com os dois canais de suporte (WhatsApp e e-mail). */
export function ContatoSuporte({ mensagem, escuro = false, className = '' }: ContatoSuporteProps) {
  const link = escuro ? LINK_ESCURO : LINK_CLARO;

  return (
    <p className={className}>
      Precisa de ajuda? Fale com o suporte pelo{' '}
      <a
        href={linkWhatsAppSuporte(mensagem)}
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        WhatsApp {SUPORTE_WHATSAPP_EXIBICAO}
      </a>{' '}
      ou por e-mail em{' '}
      <a href={linkEmailSuporte} className={link}>
        {SUPORTE_EMAIL}
      </a>
      .
    </p>
  );
}

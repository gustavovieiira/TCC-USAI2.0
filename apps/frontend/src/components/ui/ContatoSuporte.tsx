import {
  linkEmailSuporte,
  linkWhatsAppSuporte,
  SUPORTE_EMAIL,
  SUPORTE_WHATSAPP_EXIBICAO,
} from '@/lib/suporte';

interface ContatoSuporteProps {
  /** Mensagem que já vem escrita quando a pessoa abre o WhatsApp. */
  mensagem?: string;
  className?: string;
}

const LINK = 'font-semibold text-barro-700 underline-offset-2 hover:underline';

/** "Precisa de ajuda?" com os dois canais de suporte (WhatsApp e e-mail). */
export function ContatoSuporte({ mensagem, className = '' }: ContatoSuporteProps) {
  return (
    <p className={className}>
      Precisa de ajuda? Fale com o suporte pelo{' '}
      <a
        href={linkWhatsAppSuporte(mensagem)}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK}
      >
        WhatsApp {SUPORTE_WHATSAPP_EXIBICAO}
      </a>{' '}
      ou por e-mail em{' '}
      <a href={linkEmailSuporte} className={LINK}>
        {SUPORTE_EMAIL}
      </a>
      .
    </p>
  );
}

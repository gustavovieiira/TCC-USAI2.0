interface IconeProps {
  className?: string;
}

/** Balãozinho do WhatsApp com o fone dentro. Desenhado à mão, herda a cor do texto. */
export function IconeWhatsApp({ className = 'h-5 w-5' }: IconeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.2a8.8 8.8 0 0 0-7.55 13.33L3.2 20.8l4.37-1.2A8.8 8.8 0 1 0 12 3.2Z" />
      <path
        d="M9.2 8.1c-.4.4-.7 1-.5 1.8.5 2.2 2.6 4.3 4.8 4.8.8.2 1.4-.1 1.8-.5l.3-.5c.1-.2 0-.4-.2-.5l-1.3-.7c-.2-.1-.4 0-.5.1l-.5.6c-1.1-.4-2-1.3-2.4-2.4l.6-.5c.1-.1.2-.3.1-.5l-.7-1.3c-.1-.2-.3-.3-.5-.2l-.5.2Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Envelope de e-mail. */
export function IconeEmail({ className = 'h-5 w-5' }: IconeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7.5 8 6 8-6" />
    </svg>
  );
}

/** Seta para cima, usada no "voltar ao topo". */
export function IconeSetaCima({ className = 'h-4 w-4' }: IconeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  );
}

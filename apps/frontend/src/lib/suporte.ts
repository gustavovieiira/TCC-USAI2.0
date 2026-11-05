/** Canais de suporte da USAI, um só lugar, usado na landing, nas telas de acesso e dentro da plataforma. */
export const SUPORTE_EMAIL = 'usaisuporte@gmail.com';

/** WhatsApp só com dígitos, com o código do país (55) na frente. */
const SUPORTE_WHATSAPP = '5547999252028';

/** Como o número aparece escrito na tela. */
export const SUPORTE_WHATSAPP_EXIBICAO = '(47) 99925-2028';

const MENSAGEM_PADRAO = 'Olá! Preciso de ajuda com a USAI.';

export function linkWhatsAppSuporte(mensagem: string = MENSAGEM_PADRAO): string {
  return `https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

export const linkEmailSuporte = `mailto:${SUPORTE_EMAIL}`;

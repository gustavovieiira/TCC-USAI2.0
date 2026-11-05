import { Link } from 'react-router-dom';
import { IconeEmail, IconeSetaCima, IconeWhatsApp } from '@/components/ui/IconesContato';
import { Logo } from '@/components/ui/Logo';
import {
  linkEmailSuporte,
  linkWhatsAppSuporte,
  SUPORTE_EMAIL,
  SUPORTE_WHATSAPP_EXIBICAO,
} from '@/lib/suporte';

/** Cada assunto abre o WhatsApp com a mensagem já escrita, para a conversa começar no ponto certo. */
const ASSUNTOS = [
  {
    titulo: 'Contratação e planos',
    mensagem: 'Olá! Tenho uma dúvida sobre a contratação e os planos da USAI.',
  },
  {
    titulo: 'Pagamento por PIX',
    mensagem: 'Olá! Preciso de ajuda com um pagamento por PIX na USAI.',
  },
  {
    titulo: 'Acesso, senha e convite dos vizinhos',
    mensagem: 'Olá! Preciso de ajuda com o acesso, a senha ou o convite dos vizinhos na USAI.',
  },
  {
    titulo: 'Locações, termos e documentos',
    mensagem: 'Olá! Tenho uma dúvida sobre locações, termos ou documentos na USAI.',
  },
] as const;

const LINK_RODAPE =
  'inline-block rounded-sm py-1.5 text-fachada-papel-suave transition-colors hover:text-fachada-papel hover:underline hover:underline-offset-4';

const TITULO_COLUNA = 'font-marca text-base font-bold text-fachada-papel';

interface RodapeLandingProps {
  rodapeInstitucional: string;
  nomeInstitucional: string;
  /** Mesma largura e margens do resto da página. */
  miolo: string;
}

/** Rodapé da página inicial: como falar com a USAI, em que o suporte ajuda e para onde ir. */
export function RodapeLanding({
  rodapeInstitucional,
  nomeInstitucional,
  miolo,
}: RodapeLandingProps) {
  return (
    <div className="bg-fachada-noite-fundo">
      <footer className={`${miolo} pb-8 pt-14 text-sm text-fachada-papel-suave`}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.15fr_1.3fr_1.2fr_1fr] lg:gap-12">
          <div className="flex flex-col gap-4">
            <Logo altura={34} className="text-fachada-papel" />
            <p className="max-w-xs text-[0.95rem] leading-relaxed">
              Vizinhos que compartilham. Aluguel de itens entre moradores do mesmo condomínio, com
              pagamento por PIX e termo de responsabilidade em cada locação.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={TITULO_COLUNA}>Fale com a gente</h2>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href={linkWhatsAppSuporte(
                    'Olá! Vim pela página da USAI e gostaria de tirar uma dúvida.',
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-[18px] bg-fachada-predio px-4 py-3.5 transition-colors hover:bg-fachada-predio-claro"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fachada-folha text-fachada-tinta">
                    <IconeWhatsApp className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-marca text-base font-bold text-fachada-papel">
                      WhatsApp
                    </span>
                    <span className="block text-fachada-papel">{SUPORTE_WHATSAPP_EXIBICAO}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={linkEmailSuporte}
                  className="group flex items-center gap-4 rounded-[18px] bg-fachada-predio px-4 py-3.5 transition-colors hover:bg-fachada-predio-claro"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fachada-luz text-fachada-tinta">
                    <IconeEmail className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-marca text-base font-bold text-fachada-papel">
                      E-mail
                    </span>
                    <span className="block break-all text-fachada-papel">{SUPORTE_EMAIL}</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className={TITULO_COLUNA}>Em que o suporte ajuda</h2>
            <ul className="flex flex-col gap-2.5">
              {ASSUNTOS.map((assunto) => (
                <li key={assunto.titulo}>
                  <a
                    href={linkWhatsAppSuporte(assunto.mensagem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${LINK_RODAPE} inline-flex items-start gap-2`}
                  >
                    <IconeWhatsApp className="mt-0.5 h-4 w-4 shrink-0 text-fachada-folha" />
                    {assunto.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Navegação do rodapé" className="flex flex-col gap-4">
            <h2 className={TITULO_COLUNA}>Navegue</h2>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="#como-funciona" className={LINK_RODAPE}>
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#seguranca" className={LINK_RODAPE}>
                  Segurança
                </a>
              </li>
              <li>
                <a href="#planos" className={LINK_RODAPE}>
                  Planos
                </a>
              </li>
              <li>
                <a href="#perguntas" className={LINK_RODAPE}>
                  Perguntas frequentes
                </a>
              </li>
              <li>
                <Link to="/login" className={LINK_RODAPE}>
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/contratar" className={LINK_RODAPE}>
                  Contratar para o meu condomínio
                </Link>
              </li>
            </ul>
            <p className="text-sm leading-relaxed">
              Moradores entram com o link de cadastro que o síndico compartilha.
            </p>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-fachada-papel-suave/20 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <p className="max-w-2xl text-xs leading-relaxed text-fachada-papel-suave">
              {rodapeInstitucional}
            </p>
            <p className="text-xs text-fachada-papel-suave">{nomeInstitucional}</p>
          </div>
          <a href="#topo" className={`${LINK_RODAPE} inline-flex items-center gap-1.5 text-xs`}>
            Voltar ao topo
            <IconeSetaCima />
          </a>
        </div>
      </footer>
    </div>
  );
}

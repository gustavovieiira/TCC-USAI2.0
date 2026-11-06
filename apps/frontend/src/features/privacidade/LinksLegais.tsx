import { Link } from 'react-router-dom';

const ESTILO =
  'inline-block py-1.5 font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

/** "Termos de Uso" e "Política de Privacidade", lado a lado (rodapés e telas de acesso). */
export function LinksLegais({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Documentos legais" className={`flex flex-wrap gap-x-5 ${className}`}>
      <Link to="/termos" className={ESTILO}>
        Termos de Uso
      </Link>
      <Link to="/privacidade" className={ESTILO}>
        Política de Privacidade
      </Link>
    </nav>
  );
}

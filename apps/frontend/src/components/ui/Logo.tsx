import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';

interface LogoProps {
  /** Altura da imagem em px (a largura acompanha a proporção original, sem distorcer). */
  altura?: number;
  /** Texto ao lado da marca padrão; some quando há logo oficial (ela já traz o nome). */
  comNome?: boolean;
  className?: string;
}

/**
 * Marca da empresa: a logo oficial enviada pelo Admin (mantém a proporção) ou, enquanto não houver
 * uma, a marca padrão da USAI. Usada no cabeçalho, na tela inicial, no login e nos documentos.
 */
export function Logo({ altura = 32, comNome = true, className = '' }: LogoProps) {
  const { configuracao } = useConfiguracao();

  if (configuracao.logoUrl) {
    return (
      <img
        src={configuracao.logoUrl}
        alt={configuracao.nomeInstitucional}
        style={{ height: altura, width: 'auto' }}
        className={`max-w-[220px] object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold ${className}`}>
      <span
        className="notch-sm bg-barro-500"
        style={{ height: altura * 0.6, width: altura * 0.6 }}
        aria-hidden="true"
      />
      {comNome && <span style={{ fontSize: altura * 0.7 }}>USAI</span>}
      {!comNome && <span className="sr-only">USAI</span>}
    </span>
  );
}

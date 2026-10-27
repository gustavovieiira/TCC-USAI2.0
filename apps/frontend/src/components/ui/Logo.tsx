import { MarcaUsai } from '@/components/ui/MarcaUsai';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';

interface LogoProps {
  /** Altura da marca em px (a largura da logo enviada acompanha a proporção original, sem distorcer). */
  altura?: number;
  /** Mostra o nome "USAI" ao lado do símbolo; some quando há logo oficial (ela já traz o nome). */
  comNome?: boolean;
  className?: string;
}

/**
 * Marca da empresa: a logo oficial enviada pelo Admin (mantém a proporção) ou, enquanto não houver
 * uma, a marca da USAI (símbolo + nome). Usada no cabeçalho, na tela inicial, no login e nos
 * documentos.
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
    <span className={`inline-flex items-center gap-2.5 font-display font-bold ${className}`}>
      <MarcaUsai tamanho={altura} />
      {comNome ? (
        <span style={{ fontSize: altura * 0.78, lineHeight: 1 }} className="tracking-tight">
          USAI
        </span>
      ) : (
        <span className="sr-only">USAI</span>
      )}
    </span>
  );
}

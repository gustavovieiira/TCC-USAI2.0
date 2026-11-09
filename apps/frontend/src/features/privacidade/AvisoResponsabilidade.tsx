const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

/**
 * Lembrete curto, nas telas de pedir e de anunciar um item, de que a USAI não responde pelo item:
 * a responsabilidade é de quem empresta e de quem aluga, que resolvem tudo entre si.
 */
export function AvisoResponsabilidade({ papel }: { papel: 'locatario' | 'proprietario' }) {
  return (
    <p
      role="note"
      className="rounded-[14px] bg-fachada-tinta/5 px-4 py-3 text-sm leading-relaxed text-fachada-tinta-suave"
    >
      <strong className="text-fachada-tinta">A USAI só conecta vizinhos.</strong>{' '}
      {papel === 'locatario'
        ? 'Quem aluga cuida do item e responde por perda, furto ou dano enquanto estiver com ele. '
        : 'Quem empresta responde pelas informações do anúncio e pelo estado do item. '}
      A USAI não é parte da locação e não responde por itens perdidos, furtados ou danificados: o
      dono e quem aluga resolvem qualquer problema entre si, de comum acordo.{' '}
      <a
        href="/termos#responsabilidade-pelos-itens"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK}
      >
        Ler a regra completa
      </a>
      .
    </p>
  );
}

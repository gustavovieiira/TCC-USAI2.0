const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

type Papel = 'locatario' | 'proprietario' | 'prestador' | 'contratante';

const FRASE_DO_PAPEL: Record<Papel, string> = {
  locatario:
    'Quem aluga cuida do item e responde por perda, furto ou dano enquanto estiver com ele. ',
  proprietario: 'Quem empresta responde pelas informações do anúncio e pelo estado do item. ',
  prestador:
    'Quem presta o serviço responde pela qualidade, pela segurança e pelo que combinar com quem contratar, inclusive o pagamento, que é feito direto entre vocês. ',
  contratante:
    'Data, valor e pagamento são combinados direto com quem presta o serviço, fora da USAI. ',
};

const FRASE_FINAL: Record<Papel, string> = {
  locatario:
    'A USAI não é parte da locação e não responde por itens perdidos, furtados ou danificados: o dono e quem aluga resolvem qualquer problema entre si, de comum acordo.',
  proprietario:
    'A USAI não é parte da locação e não responde por itens perdidos, furtados ou danificados: o dono e quem aluga resolvem qualquer problema entre si, de comum acordo.',
  prestador:
    'A USAI não é parte, não cobra nem recebe pelo serviço e não responde por ele: as duas partes resolvem qualquer problema entre si, de comum acordo.',
  contratante:
    'A USAI não é parte, não cobra nem recebe pelo serviço e não responde por ele: as duas partes resolvem qualquer problema entre si, de comum acordo.',
};

/**
 * Lembrete curto, nas telas de pedir e de anunciar, de que a USAI não responde pelo item nem pelo serviço:
 * a responsabilidade é das duas pessoas, que resolvem tudo entre si.
 */
export function AvisoResponsabilidade({ papel }: { papel: Papel }) {
  return (
    <p
      role="note"
      className="rounded-[14px] bg-fachada-tinta/5 px-4 py-3 text-sm leading-relaxed text-fachada-tinta-suave"
    >
      <strong className="text-fachada-tinta">A USAI só conecta vizinhos.</strong>{' '}
      {FRASE_DO_PAPEL[papel]}
      {FRASE_FINAL[papel]}{' '}
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

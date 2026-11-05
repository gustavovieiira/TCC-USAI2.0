import { CSSProperties, ElementType, ReactNode, useEffect, useRef, useState } from 'react';

function semMovimento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Diz se o elemento já apareceu na tela (e fica `true` depois, sem voltar). Sem IntersectionObserver
 * (testes, navegadores antigos) ou com "reduzir movimento", devolve `true` desde o início: o estado final
 * é sempre o que está visível, a animação é só um adicional.
 */
export function useNaTela<T extends HTMLElement>(
  margem = '0px 0px -12% 0px',
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [naTela, setNaTela] = useState(
    () => typeof IntersectionObserver === 'undefined' || semMovimento(),
  );

  useEffect(() => {
    if (naTela) return;
    const elemento = ref.current;
    if (!elemento) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setNaTela(true);
          observador.disconnect();
        }
      },
      { rootMargin: margem, threshold: 0.08 },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [naTela, margem]);

  return [ref, naTela];
}

interface RevelarProps {
  as?: ElementType;
  /** Atraso em ms (para escalonar irmãos). */
  atraso?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Faz o bloco subir e aparecer quando chega à tela. O conteúdo é visível por padrão: só o que está abaixo
 * da dobra é marcado como "antes" depois que a página monta, então sem JavaScript (ou se algo falhar) nada
 * fica escondido.
 */
export function Revelar({
  as: Elemento = 'div',
  atraso = 0,
  className = '',
  children,
}: RevelarProps) {
  const [ref, naTela] = useNaTela<HTMLElement>();
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    // Só "arma" (esconde) quem ainda não está na tela e só se a animação for possível.
    if (naTela || semMovimento()) return;
    setArmado(true);
  }, [naTela]);

  const estado = armado ? (naTela ? 'depois' : 'antes') : undefined;
  const estilo = { '--atraso': `${atraso}ms` } as CSSProperties;

  return (
    <Elemento ref={ref} data-revelar={estado} style={estilo} className={className}>
      {children}
    </Elemento>
  );
}

import { Link } from 'react-router-dom';
import { PaginaLegal, Secao } from '@/features/privacidade/PaginaLegal';
import { SUPORTE_EMAIL, linkEmailSuporte } from '@/lib/suporte';

const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

/** Termos de Uso da plataforma (as regras de uso e as responsabilidades de cada lado). */
export function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      resumo="As regras para usar a USAI e a responsabilidade de cada pessoa."
    >
      <Secao titulo="1. O que é a USAI">
        <p>
          A USAI é uma plataforma que ajuda moradores de um mesmo condomínio a emprestar e alugar
          itens entre si, com catálogo, aprovação do dono, pagamento por PIX, termo de
          responsabilidade e histórico. A USAI é um projeto de portfólio acadêmico (Engenharia de
          Software, Católica SC).
        </p>
        <p>
          A USAI <strong>não é dona dos itens nem parte da locação</strong>: ela oferece a
          ferramenta. A locação é um acordo entre o dono do item e quem o aluga.
        </p>
      </Secao>

      <Secao titulo="2. Quem pode usar">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Moradores maiores de idade de um condomínio que contratou a USAI, com o link e o PIN
            enviados pelo síndico.
          </li>
          <li>
            Síndicos (ou representantes legais) que contratam o plano do condomínio e se
            responsabilizam por convidar apenas moradores.
          </li>
          <li>
            Cada pessoa tem uma conta, pessoal e intransferível. Guarde a sua senha e não a divida
            com ninguém.
          </li>
        </ul>
      </Secao>

      <Secao titulo="3. Como funcionam as locações">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            O dono aprova ou recusa cada pedido. Aprovado, o locatário paga por PIX para confirmar a
            reserva.
          </li>
          <li>
            Na retirada e na devolução, as duas partes registram o estado do item e aceitam o termo
            de responsabilidade com a própria senha. Esse documento fica guardado.
          </li>
          <li>
            Cada locação tem uma taxa de 10%, repassada ao condomínio. O restante vai para o dono do
            item, que pode pedir o saque pelo PIX.
          </li>
          <li>
            O locatário responde pelo item enquanto estiver com ele, conforme o termo de
            responsabilidade de cada locação. Anuncie só o que é seu e descreva o item com
            honestidade.
          </li>
        </ul>
      </Secao>

      <Secao titulo="4. O que não pode">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Anunciar item ilegal, roubado, perigoso ou que não seja seu, ou usar a plataforma para
            fraude.
          </li>
          <li>
            Ofender, ameaçar ou expor outras pessoas no Mural, nos comentários ou nas conversas.
          </li>
          <li>
            Tentar acessar dados de outra pessoa ou de outro condomínio, ou testar a segurança do
            sistema sem autorização.
          </li>
          <li>
            Burlar a plataforma, por exemplo combinando o pagamento por fora para fugir da taxa do
            condomínio.
          </li>
        </ul>
        <p>
          O síndico pode remover moradores do condomínio na plataforma, e a USAI pode suspender
          contas que violem estes termos.
        </p>
      </Secao>

      <Secao titulo="5. Contratação do condomínio">
        <p>
          O plano é escolhido pela quantidade de moradores e pelo período de cobrança (mensal,
          trimestral, semestral ou anual, com desconto), sempre por PIX. O acesso é liberado depois
          que o pagamento é confirmado. Se a mensalidade vencer há mais de 5 dias, o acesso dos
          moradores é suspenso até o pagamento (o síndico continua entrando para pagar). Os valores
          exibidos no ambiente de demonstração são fictícios.
        </p>
      </Secao>

      <Secao titulo="6. Responsabilidades e limites">
        <p>
          Fazemos o possível para manter a plataforma disponível e correta, mas ela é oferecida no
          estado em que está, sem garantia de funcionamento ininterrupto. A USAI não se
          responsabiliza por danos ao item, atrasos na devolução ou acordos feitos entre moradores
          fora da plataforma, nos limites permitidos pela lei.
        </p>
      </Secao>

      <Secao titulo="7. Dados pessoais">
        <p>
          O tratamento dos seus dados está descrito na{' '}
          <Link to="/privacidade" className={LINK}>
            Política de Privacidade
          </Link>
          . Ao criar a conta ou contratar o plano, você declara que leu e aceita estes Termos de Uso
          e a Política de Privacidade; guardamos a data e a versão do seu aceite.
        </p>
      </Secao>

      <Secao titulo="8. Mudanças e contato">
        <p>
          Podemos atualizar estes termos. A versão e a data ficam no alto da página, e pediremos um
          novo aceite quando a mudança for relevante. Dúvidas:{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          .
        </p>
        <p className="text-sm text-fachada-tinta-suave">
          Este é um texto modelo para um projeto acadêmico e ainda passará por revisão jurídica
          antes de uso comercial. Os termos de responsabilidade de cada locação são documentos à
          parte e valem para aquela transação.
        </p>
      </Secao>
    </PaginaLegal>
  );
}

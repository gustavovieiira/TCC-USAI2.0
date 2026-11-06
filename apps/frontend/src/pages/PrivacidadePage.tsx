import { PaginaLegal, Secao } from '@/features/privacidade/PaginaLegal';
import { SUPORTE_EMAIL, linkEmailSuporte } from '@/lib/suporte';

const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

/** Política de Privacidade (LGPD, Lei 13.709/2018): descreve o que o sistema realmente coleta e faz. */
export function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      resumo="Como a USAI trata os seus dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD)."
    >
      <Secao titulo="1. Quem somos">
        <p>
          A USAI é uma plataforma de aluguel de itens entre moradores de um mesmo condomínio. É um
          projeto de portfólio acadêmico (Engenharia de Software, Católica SC). A USAI decide como
          os dados são usados e responde por eles (a &ldquo;controladora&rdquo;, na linguagem da
          LGPD). Para qualquer assunto sobre os seus dados, escreva para{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          .
        </p>
      </Secao>

      <Secao titulo="2. Que dados coletamos, e para quê">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Conta:</strong> nome, e-mail, senha (guardada só em forma criptografada, que
            ninguém consegue ler), apartamento e o condomínio a que você pertence. Servem para você
            entrar e ser reconhecido pelos vizinhos.
          </li>
          <li>
            <strong>Identificação e pagamento:</strong> CPF (ou CNPJ do condomínio, na contratação),
            chave PIX para receber saques e, quando você paga ou contrata, os dados da cobrança.
            Servem para cobrar, repassar valores e emitir os recibos e documentos.
          </li>
          <li>
            <strong>Uso da plataforma:</strong> itens que você anuncia (com fotos), locações,
            documentos de retirada e devolução com o seu aceite, posts e comentários do Mural,
            mensagens de chat e notificações.
          </li>
          <li>
            <strong>Segurança:</strong> registros de ações administrativas e dados técnicos de
            acesso (como o endereço IP, usado para limitar tentativas de invasão).
          </li>
        </ul>
        <p>
          Não vendemos os seus dados e não os usamos para publicidade. Não coletamos dados de
          crianças: a plataforma é para moradores adultos.
        </p>
      </Secao>

      <Secao titulo="3. Em que a lei nos autoriza a usar os dados (bases legais)">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Execução do contrato</strong> (art. 7º, V): criar a conta, intermediar as
            locações, cobrar e repassar valores.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): guardar os registros
            financeiros e os documentos de cada transação pelo prazo que a lei exige.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX): manter a plataforma segura e impedir
            fraudes e abusos.
          </li>
          <li>
            <strong>Consentimento</strong> (art. 7º, I): você aceita estes termos ao criar a conta.
            Guardamos a data e a versão do aceite.
          </li>
        </ul>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Outros moradores do seu condomínio:</strong> veem o seu nome, o apartamento (se
            você informar), os seus anúncios, posts e comentários. Nunca veem o seu e-mail, CPF ou
            chave PIX.
          </li>
          <li>
            <strong>O síndico do condomínio:</strong> vê o nome, e-mail e apartamento dos moradores,
            e as locações ativas, para administrar o condomínio na plataforma.
          </li>
          <li>
            <strong>Asaas (instituição de pagamento):</strong> recebe os dados necessários para
            gerar e confirmar cobranças por PIX, como nome, CPF ou CNPJ e e-mail.
          </li>
          <li>
            <strong>Serviço de envio de e-mail e hospedagem:</strong> operam a infraestrutura em
            nosso nome, sob nossas instruções.
          </li>
        </ul>
        <p>
          Também podemos informar dados a autoridades quando a lei ou uma ordem judicial exigir.
        </p>
      </Secao>

      <Secao titulo="5. Por quanto tempo guardamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Conversas privadas abertas pelo Mural: até 7 dias, depois são apagadas.</li>
          <li>Notificações: os últimos 30 dias.</li>
          <li>
            Conta e anúncios: enquanto a conta existir. Ao excluí-la, os dados que identificam você
            são removidos.
          </li>
          <li>
            Registros financeiros, documentos de retirada e devolução e aceites: pelo prazo que a
            lei exigir, mesmo depois de excluída a conta, sem identificar você (veja o item 7).
          </li>
        </ul>
      </Secao>

      <Secao titulo="6. Como protegemos os dados">
        <p>
          Senhas criptografadas, conexão segura (HTTPS), acesso restrito por perfil (morador,
          síndico e administrador), isolamento total entre condomínios, limite de tentativas de
          login e de PIN, sessões que podem ser encerradas e verificação do conteúdo das imagens
          enviadas. Nenhum sistema é totalmente imune a falhas: se houver um incidente que possa
          causar dano a você, avisaremos você e a Autoridade Nacional de Proteção de Dados, como
          manda a lei.
        </p>
      </Secao>

      <Secao titulo="7. Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir, a qualquer momento:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Confirmar e acessar</strong> os seus dados: em{' '}
            <em>Perfil, Seus dados e privacidade, Baixar meus dados</em> você recebe uma cópia em
            arquivo.
          </li>
          <li>
            <strong>Corrigir</strong> dados incorretos: em <em>Perfil, Editar</em>.
          </li>
          <li>
            <strong>Excluir</strong> a sua conta: em{' '}
            <em>Perfil, Seus dados e privacidade, Excluir minha conta</em>. A conta é anonimizada
            (nome, e-mail, CPF, chave PIX e apartamento deixam de existir, e o que você escreveu no
            Mural é apagado). Só não dá para excluir enquanto houver locação em andamento, saque
            pendente, saldo a sacar ou assinatura de condomínio sob a sua responsabilidade. Os
            registros que a lei manda guardar continuam, sem identificar você.
          </li>
          <li>
            <strong>Retirar o consentimento</strong>, pedir informação sobre o compartilhamento e se
            opor a um uso: escreva para o contato abaixo.
          </li>
        </ul>
        <p>
          Se achar que seus direitos não foram respeitados, você também pode reclamar à Autoridade
          Nacional de Proteção de Dados (ANPD).
        </p>
      </Secao>

      <Secao titulo="8. Contato e mudanças">
        <p>
          Dúvidas, pedidos e reclamações sobre privacidade:{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          . Se este texto mudar de forma relevante, mudaremos a versão no alto da página e pediremos
          um novo aceite.
        </p>
        <p className="text-sm text-fachada-tinta-suave">
          Este texto descreve o funcionamento real do sistema. Por ser um projeto acadêmico, ainda
          passará por revisão jurídica antes de uso comercial.
        </p>
      </Secao>
    </PaginaLegal>
  );
}

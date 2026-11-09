import { Link } from 'react-router-dom';
import { Destaque, Indice, PaginaLegal, Secao } from '@/features/privacidade/PaginaLegal';
import { SUPORTE_EMAIL, linkEmailSuporte } from '@/lib/suporte';

const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';
const LISTA = 'list-disc space-y-2 pl-5';

const INDICE = [
  { id: 'quem-somos', titulo: '1. Quem somos e como falar com a gente' },
  { id: 'dados-coletados', titulo: '2. Que dados coletamos' },
  { id: 'finalidades', titulo: '3. Para que usamos os dados (bases legais)' },
  { id: 'outras-pessoas', titulo: '4. Dados de outras pessoas' },
  { id: 'compartilhamento', titulo: '5. Com quem os dados são compartilhados' },
  { id: 'exterior', titulo: '6. Transferência para fora do Brasil' },
  { id: 'armazenamento-local', titulo: '7. Cookies e armazenamento no navegador' },
  { id: 'prazos', titulo: '8. Por quanto tempo guardamos' },
  { id: 'seguranca', titulo: '9. Como protegemos os dados' },
  { id: 'direitos', titulo: '10. Seus direitos' },
  { id: 'exclusao', titulo: '11. Excluir a conta e o que continua guardado' },
  { id: 'decisoes-automatizadas', titulo: '12. Decisões automatizadas' },
  { id: 'menores', titulo: '13. Crianças e adolescentes' },
  { id: 'mudancas', titulo: '14. Mudanças nesta Política' },
  { id: 'contato', titulo: '15. Contato e reclamações' },
];

/** Política de Privacidade (LGPD, Lei 13.709/2018): descreve o que o sistema realmente coleta e faz. */
export function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      resumo="Como a USAI trata os seus dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD)."
    >
      <Indice itens={INDICE} />

      <Destaque>
        Em poucas palavras: usamos os seus dados só para a USAI funcionar (conta, locações,
        pagamentos e segurança), não os vendemos e não os usamos para publicidade. Você pode baixar
        uma cópia deles e excluir a conta pelo próprio perfil.
      </Destaque>

      <Secao id="quem-somos" titulo="1. Quem somos e como falar com a gente">
        <p>
          A USAI é uma plataforma de aluguel de itens entre moradores de um mesmo condomínio,
          desenvolvida como projeto de portfólio acadêmico (Engenharia de Software, Católica SC). O
          responsável pelo tratamento dos dados (o &ldquo;controlador&rdquo;, na linguagem da LGPD)
          é <strong>Gustavo Vieira Wesolowski</strong>, pessoa física, autor do projeto.
        </p>
        <p>
          Para qualquer assunto sobre os seus dados, inclusive para exercer os seus direitos,
          escreva para{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          . Esse é também o canal do encarregado pelo tratamento de dados pessoais.
        </p>
      </Secao>

      <Secao id="dados-coletados" titulo="2. Que dados coletamos">
        <p>Coletamos apenas o que a plataforma precisa para funcionar:</p>
        <ul className={LISTA}>
          <li>
            <strong>Conta:</strong> nome, e-mail, senha (guardada só de forma criptografada, que
            ninguém consegue ler), apartamento (opcional) e o condomínio a que você pertence.
          </li>
          <li>
            <strong>Identificação e pagamento:</strong> CPF (do morador, para pagar uma locação, ou
            CPF ou CNPJ de quem contrata o plano do condomínio), chave PIX (para receber saques) e
            os dados das cobranças e dos saques.
          </li>
          <li>
            <strong>Uso da plataforma:</strong> itens que você anuncia (textos e fotos), pedidos de
            locação e a finalidade de uso informada, documentos de retirada e devolução (estado do
            item, acessórios, observações e o aceite com data e hora), posts e comentários do Mural,
            mensagens de chat e notificações.
          </li>
          <li>
            <strong>Aceite dos Termos:</strong> a data e a versão dos Termos de Uso e desta Política
            que você aceitou.
          </li>
          <li>
            <strong>Segurança:</strong> registros de ações administrativas e o endereço IP de quem
            acessa, usado na hora para limitar tentativas de invasão (não o guardamos como histórico
            de navegação).
          </li>
        </ul>
        <p>
          Os dados vêm de você (quando preenche e usa a plataforma), do uso do sistema (por exemplo,
          registros de locação) e da instituição de pagamento (a confirmação de que um PIX foi
          pago). Não coletamos dados sensíveis (como saúde, religião ou origem racial) e não pedimos
          a sua localização.
        </p>
      </Secao>

      <Secao id="finalidades" titulo="3. Para que usamos os dados (bases legais)">
        <ul className={LISTA}>
          <li>
            <strong>
              Criar a conta, intermediar locações, cobrar e repassar valores, emitir recibos e
              documentos:
            </strong>{' '}
            execução do contrato que você faz ao usar a USAI (LGPD, art. 7º, V).
          </li>
          <li>
            <strong>Guardar os registros financeiros e os documentos de cada transação:</strong>{' '}
            cumprimento de obrigação legal e regulatória (art. 7º, II) e exercício regular de
            direitos (art. 7º, VI).
          </li>
          <li>
            <strong>Manter a plataforma segura, evitar fraudes e abusos:</strong> legítimo interesse
            (art. 7º, IX).
          </li>
          <li>
            <strong>Registrar o seu aceite dos Termos e desta Política:</strong> consentimento (art.
            7º, I). Você pode retirá-lo (item 10), o que pode impedir o uso da plataforma.
          </li>
          <li>
            <strong>Enviar e-mails do serviço</strong> (acesso do síndico, recibo, recuperação de
            senha, avisos de segurança): execução do contrato. Não enviamos propaganda.
          </li>
        </ul>
      </Secao>

      <Secao id="outras-pessoas" titulo="4. Dados de outras pessoas">
        <p>
          Ao usar a USAI você vê dados de outros usuários, e eles veem os seus, só no que a locação
          e o convívio exigem: o nome e o apartamento aparecem para os vizinhos e na outra parte de
          uma locação, e o documento de retirada e devolução identifica as duas partes. Use esses
          dados só para a locação e para o convívio. Não os copie, divulgue nem use para outra
          finalidade.
        </p>
      </Secao>

      <Secao id="compartilhamento" titulo="5. Com quem os dados são compartilhados">
        <ul className={LISTA}>
          <li>
            <strong>Outros moradores do seu condomínio:</strong> veem o seu nome, o apartamento (se
            informar), os seus anúncios, posts e comentários. Não veem o seu e-mail, CPF nem chave
            PIX.
          </li>
          <li>
            <strong>A outra parte da locação:</strong> vê os dados do documento da locação (nome,
            apartamento, item, datas, estado do item).
          </li>
          <li>
            <strong>O síndico do condomínio:</strong> vê o nome, o e-mail e o apartamento dos
            moradores e as locações ativas, para administrar o condomínio na plataforma.
          </li>
          <li>
            <strong>Asaas (instituição de pagamento):</strong> recebe o necessário para gerar e
            confirmar cobranças por PIX, como nome, CPF ou CNPJ e e-mail, e trata esses dados
            conforme a sua própria política.
          </li>
          <li>
            <strong>Prestadores de infraestrutura:</strong> o serviço de envio de e-mail e a
            hospedagem do sistema, que tratam dados em nosso nome e sob nossas instruções.
          </li>
          <li>
            <strong>Google Fonts:</strong> as fontes das telas são carregadas dos servidores do
            Google, que recebe o endereço IP de quem abre a página. Se você clicar em um link de
            WhatsApp da plataforma, quem o recebe é o WhatsApp, que tem a política dele.
          </li>
          <li>
            <strong>Autoridades:</strong> quando a lei ou uma ordem judicial exigir, ou para
            defender direitos em um processo.
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os compartilhamos para publicidade.</p>
      </Secao>

      <Secao id="exterior" titulo="6. Transferência para fora do Brasil">
        <p>
          Alguns prestadores (como o de e-mail e o das fontes) podem tratar dados em servidores fora
          do Brasil. Nesses casos, a transferência é feita para fornecedores que oferecem proteção
          compatível com a LGPD (art. 33) e apenas no necessário para o serviço funcionar.
        </p>
      </Secao>

      <Secao id="armazenamento-local" titulo="7. Cookies e armazenamento no navegador">
        <p>
          A USAI não usa cookies de publicidade nem de rastreamento e não usa ferramentas de análise
          de audiência. Para manter você conectado, guardamos o seu login (os códigos de sessão e o
          seu nome) no armazenamento local do navegador. Ao sair da conta, esses dados são apagados
          do aparelho, e o servidor encerra as sessões.
        </p>
      </Secao>

      <Secao id="prazos" titulo="8. Por quanto tempo guardamos">
        <ul className={LISTA}>
          <li>
            <strong>Conta e anúncios:</strong> enquanto a conta existir. Ao excluí-la, os dados que
            identificam você são removidos (item 11).
          </li>
          <li>
            <strong>Conversas privadas abertas pelo Mural:</strong> até 7 dias, depois são apagadas.
            O chat de uma locação fica enquanto o histórico da locação existir.
          </li>
          <li>
            <strong>Notificações:</strong> os últimos 30 dias.
          </li>
          <li>
            <strong>Posts e comentários do Mural:</strong> até você apagá-los ou excluir a conta.
          </li>
          <li>
            <strong>
              Registros financeiros, locações e documentos de retirada e devolução, com os aceites:
            </strong>{' '}
            pelo prazo que a lei exigir (em regra, 5 anos) ou enquanto houver direito a exercer ou
            defender, mesmo depois de excluída a conta, sem identificar você.
          </li>
          <li>
            <strong>Cópias de segurança:</strong> dados já excluídos podem permanecer por um curto
            período nas cópias de segurança, até serem substituídas.
          </li>
        </ul>
      </Secao>

      <Secao id="seguranca" titulo="9. Como protegemos os dados">
        <p>
          Usamos medidas técnicas e organizacionais para proteger os dados: senhas criptografadas,
          conexão segura (HTTPS), acesso restrito por perfil (morador, síndico e administrador),
          isolamento entre condomínios, limite de tentativas de login e de PIN, sessões que podem
          ser encerradas, verificação do conteúdo das imagens enviadas e política de segurança de
          conteúdo nas páginas.
        </p>
        <p>
          Nenhum sistema é totalmente imune a falhas. Se houver um incidente de segurança que possa
          causar risco ou dano relevante a você, avisaremos você e a Autoridade Nacional de Proteção
          de Dados (ANPD), como manda a lei. Proteja também a sua conta: use uma senha forte e
          exclusiva e não a compartilhe.
        </p>
      </Secao>

      <Secao id="direitos" titulo="10. Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir, a qualquer momento e sem custo:</p>
        <ul className={LISTA}>
          <li>
            <strong>Confirmação e acesso:</strong> saber se tratamos dados seus e receber uma cópia.
            No seu perfil, em <em>Seus dados e privacidade, Baixar meus dados</em>, você recebe um
            arquivo com tudo.
          </li>
          <li>
            <strong>Correção:</strong> corrigir dados incompletos ou errados. Em{' '}
            <em>Perfil, Editar</em>.
          </li>
          <li>
            <strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários ou
            tratados em desacordo com a lei, e <strong>eliminação</strong> dos dados tratados com o
            seu consentimento. Em <em>Seus dados e privacidade, Excluir minha conta</em>.
          </li>
          <li>
            <strong>Portabilidade</strong> dos dados a outro fornecedor, quando a regulamentação
            permitir (o arquivo baixado serve de base).
          </li>
          <li>
            <strong>Informação</strong> sobre com quem compartilhamos os dados e sobre a
            possibilidade de não consentir e suas consequências.
          </li>
          <li>
            <strong>Retirada do consentimento</strong> e <strong>oposição</strong> a um tratamento
            feito sem consentimento, se houver descumprimento da lei.
          </li>
          <li>
            <strong>Revisão</strong> de decisões tomadas apenas por tratamento automatizado (veja o
            item 12).
          </li>
        </ul>
        <p>
          O que é possível fazer sozinho está no perfil. Para o resto, escreva para{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          . Responderemos em até 15 dias. Para a sua segurança, podemos pedir uma confirmação de que
          você é o titular da conta.
        </p>
      </Secao>

      <Secao id="exclusao" titulo="11. Excluir a conta e o que continua guardado">
        <p>
          Quando você exclui a conta, ela é <strong>anonimizada</strong>: o seu nome, e-mail, CPF,
          chave PIX e apartamento deixam de existir, os seus anúncios saem do ar e o que você
          escreveu no Mural e as suas notificações são apagados. As sessões em todos os aparelhos
          são encerradas.
        </p>
        <p>
          Os registros que a lei manda guardar (financeiros e de locações) e os documentos de
          retirada e devolução continuam, <strong>sem identificar você</strong>, porque protegem
          também a outra parte de cada transação e servem para cumprir obrigações legais e para a
          defesa de direitos (art. 16, I, da LGPD).
        </p>
        <p>
          A exclusão só é barrada enquanto houver locação em andamento, saque em análise ou
          aguardando o PIX, saldo a sacar ou assinatura de condomínio sob a sua responsabilidade,
          para ninguém ficar com um compromisso ou um dinheiro sem destino. A conta de administrador
          não é excluída por esse caminho.
        </p>
      </Secao>

      <Secao id="decisoes-automatizadas" titulo="12. Decisões automatizadas">
        <p>
          A USAI não toma decisões sobre você baseadas apenas em tratamento automatizado de dados
          que afetem os seus interesses, como perfilamento de crédito. Aprovações de locação são
          decididas pelo proprietário do item, e os saques são analisados pela equipe da USAI.
        </p>
      </Secao>

      <Secao id="menores" titulo="13. Crianças e adolescentes">
        <p>
          A USAI é para pessoas maiores de 18 anos e não coleta dados de crianças ou adolescentes de
          propósito. Se você acha que um menor criou uma conta, avise o suporte para que a conta
          seja removida.
        </p>
      </Secao>

      <Secao id="mudancas" titulo="14. Mudanças nesta Política">
        <p>
          Podemos atualizar esta Política. A versão e a data ficam no alto da página, e quando a
          mudança for relevante avisaremos e pediremos um novo aceite. As regras de uso da
          plataforma estão nos{' '}
          <Link to="/termos" className={LINK}>
            Termos de Uso
          </Link>
          .
        </p>
      </Secao>

      <Secao id="contato" titulo="15. Contato e reclamações">
        <p>
          Dúvidas, pedidos e reclamações sobre privacidade:{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          . Se achar que os seus direitos não foram respeitados, você também pode reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.
        </p>
      </Secao>
    </PaginaLegal>
  );
}

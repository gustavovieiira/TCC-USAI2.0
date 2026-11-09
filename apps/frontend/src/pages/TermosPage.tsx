import { Link } from 'react-router-dom';
import { Destaque, Indice, PaginaLegal, Secao } from '@/features/privacidade/PaginaLegal';
import { SUPORTE_EMAIL, linkEmailSuporte } from '@/lib/suporte';

const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';
const LISTA = 'list-disc space-y-2 pl-5';

const INDICE = [
  { id: 'aceitacao', titulo: '1. Aceitação destes Termos' },
  { id: 'o-que-e', titulo: '2. O que é a USAI e o que ela não é' },
  { id: 'quem-pode-usar', titulo: '3. Quem pode usar' },
  { id: 'conta', titulo: '4. Sua conta e sua senha' },
  { id: 'responsabilidade-pelos-itens', titulo: '5. Responsabilidade pelos itens' },
  { id: 'como-funcionam-locacoes', titulo: '6. Como funcionam as locações' },
  { id: 'pagamentos', titulo: '7. Pagamentos, taxa, planos e saques' },
  { id: 'conduta', titulo: '8. O que pode e o que não pode' },
  { id: 'conteudo', titulo: '9. O que você publica' },
  { id: 'sindico', titulo: '10. O papel do síndico' },
  { id: 'mural-e-conversas', titulo: '11. Mural e conversas' },
  { id: 'disponibilidade', titulo: '12. Disponibilidade e mudanças no serviço' },
  { id: 'limitacao', titulo: '13. Limites da responsabilidade da USAI' },
  { id: 'encerramento', titulo: '14. Suspensão, encerramento e exclusão da conta' },
  { id: 'propriedade-intelectual', titulo: '15. Propriedade intelectual' },
  { id: 'dados-pessoais', titulo: '16. Dados pessoais' },
  { id: 'mudancas', titulo: '17. Mudanças nestes Termos' },
  { id: 'lei-e-foro', titulo: '18. Lei aplicável e foro' },
  { id: 'contato', titulo: '19. Contato' },
];

/** Termos de Uso da plataforma: regras de uso e, principalmente, quem responde pelos itens (não é a USAI). */
export function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      resumo="As regras para usar a USAI e a responsabilidade de cada pessoa."
    >
      <Indice itens={INDICE} />

      <Destaque>
        Resumo do mais importante: a USAI é só a ferramenta que aproxima vizinhos. O item emprestado
        é de quem empresta e fica sob a guarda de quem aluga. Se algo for perdido, furtado, roubado,
        danificado ou der defeito, a responsabilidade é{' '}
        <strong>exclusivamente de quem empresta e de quem aluga</strong>, que resolvem tudo entre
        si, em comum acordo. A USAI não participa, não decide e não responde por isso (item 5). O
        mesmo vale para os serviços que os moradores oferecem uns aos outros: a USAI só os divulga,
        e o serviço e o pagamento são combinados entre quem presta e quem contrata.
      </Destaque>

      <Secao id="aceitacao" titulo="1. Aceitação destes Termos">
        <p>
          Estes Termos de Uso valem para quem cria uma conta, contrata um plano ou usa a USAI de
          qualquer forma. Ao marcar a caixa de aceite antes de criar a conta (ou de contratar o
          plano), você declara que leu e concorda com estes Termos e com a{' '}
          <Link to="/privacidade" className={LINK}>
            Política de Privacidade
          </Link>
          . Guardamos a data e a versão do seu aceite. Se não concordar com algum ponto, não crie a
          conta nem use a plataforma.
        </p>
        <p>
          Você pode reler estes Termos a qualquer momento, antes e depois de criar a conta, pelo
          link no rodapé das telas e no seu perfil.
        </p>
      </Secao>

      <Secao id="o-que-e" titulo="2. O que é a USAI e o que ela não é">
        <p>
          A USAI é uma plataforma de tecnologia que ajuda moradores de um mesmo condomínio a
          emprestar e alugar itens entre si e a divulgar serviços que prestam aos vizinhos. Ela
          oferece catálogo, pedido e aprovação, pagamento por PIX, registro da retirada e da
          devolução em documento numerado, chat, mural e painel para o síndico. É um projeto de
          portfólio acadêmico (Engenharia de Software, Católica SC), de autoria de Gustavo Vieira
          Wesolowski.
        </p>
        <p>
          <strong>A USAI não é dona dos itens nem parte da locação.</strong> Ela não é proprietária,
          depositária, transportadora, seguradora, fiadora, intermediária de venda, corretora nem
          representante de nenhum usuário. Ela não vê, não guarda, não confere nem testa os itens
          anunciados, e não garante a existência, a qualidade, a segurança, o funcionamento ou a
          legalidade de nenhum item. A locação é um acordo feito diretamente entre quem empresta (o
          proprietário) e quem aluga (o locatário).
        </p>
      </Secao>

      <Secao id="quem-pode-usar" titulo="3. Quem pode usar">
        <ul className={LISTA}>
          <li>
            <strong>Moradores</strong> maiores de 18 anos e plenamente capazes, de um condomínio que
            contratou a USAI, com o link de cadastro e o PIN enviados pelo síndico.
          </li>
          <li>
            <strong>Síndicos</strong> (ou representantes legais do condomínio), que contratam o
            plano e se responsabilizam por convidar apenas moradores.
          </li>
          <li>
            A USAI não é destinada a menores de 18 anos. Se descobrirmos uma conta de menor, ela
            poderá ser removida.
          </li>
          <li>
            Você declara que os dados informados no cadastro são verdadeiros e que mora no
            condomínio ou o representa.
          </li>
        </ul>
      </Secao>

      <Secao id="conta" titulo="4. Sua conta e sua senha">
        <ul className={LISTA}>
          <li>A conta é pessoal e intransferível. Não a empreste nem compartilhe a senha.</li>
          <li>
            Tudo o que for feito com a sua conta é considerado feito por você. Se suspeitar de uso
            indevido, troque a senha (em &ldquo;Esqueci minha senha&rdquo;) e avise o suporte.
          </li>
          <li>
            Mantenha o e-mail atualizado: é por ele que enviamos o acesso, os recibos e os avisos de
            segurança.
          </li>
          <li>Você pode sair da conta, o que encerra as sessões abertas em todos os aparelhos.</li>
        </ul>
      </Secao>

      <Secao id="responsabilidade-pelos-itens" titulo="5. Responsabilidade pelos itens">
        <Destaque>
          A USAI está <strong>por fora</strong> da relação entre quem empresta e quem aluga. Nenhum
          item alugado pela plataforma é de responsabilidade da USAI, nem do seu autor, nem de quem
          a opera.
        </Destaque>

        <h3 className="font-marca text-base font-extrabold">5.1 A USAI não responde pelos itens</h3>
        <p>
          A USAI não responde, direta, solidária ou subsidiariamente, por perda, extravio, furto,
          roubo, dano, avaria, desgaste, defeito, mau funcionamento, atraso na devolução, devolução
          incompleta, uso indevido, acidente, lesão a pessoas ou prejuízo a terceiros ligados a
          qualquer item anunciado, retirado, usado ou devolvido por meio da plataforma, nem por
          qualquer outro prejuízo decorrente da locação, nos limites permitidos pela lei.
        </p>

        <h3 className="font-marca text-base font-extrabold">
          5.2 Responsabilidade de quem empresta (proprietário)
        </h3>
        <ul className={LISTA}>
          <li>Declarar que o item é seu ou que você pode legitimamente emprestá-lo.</li>
          <li>
            Descrever o item com verdade (estado, acessórios, limitações, defeitos conhecidos) e
            informar os riscos que conhece.
          </li>
          <li>
            Só anunciar item em condição segura de uso e que não seja proibido (item 8). Responde
            pelo que informou e por defeitos que já existiam e não foram avisados.
          </li>
          <li>
            Conferir o item na entrega e na devolução e registrar divergências no documento da
            locação, no prazo e na forma previstos no termo.
          </li>
        </ul>

        <h3 className="font-marca text-base font-extrabold">
          5.3 Responsabilidade de quem aluga (locatário)
        </h3>
        <ul className={LISTA}>
          <li>
            Cuidar do item como se fosse seu, usá-lo só para a finalidade informada e durante o
            período combinado, e devolvê-lo no prazo, completo e no estado registrado na retirada,
            salvo o desgaste natural do uso adequado.
          </li>
          <li>
            Responder por perda, furto, roubo, dano, avaria e extravio do item e dos acessórios
            enquanto estiverem com você, inclusive se alguém os usar com a sua permissão ou sem ela
            por descuido seu.
          </li>
          <li>
            Não emprestar, ceder, sublocar nem deixar terceiros usarem o item sem autorização do
            proprietário.
          </li>
          <li>
            Responder por qualquer dano que o uso do item causar a pessoas, a bens ou ao condomínio,
            e comunicar de imediato ao proprietário (e, se for o caso, ao síndico) qualquer
            incidente.
          </li>
        </ul>

        <h3 className="font-marca text-base font-extrabold">
          5.4 As partes resolvem entre si, de comum acordo
        </h3>
        <p>
          Se algo der errado, quem empresta e quem aluga se comprometem a conversar e a chegar a uma
          solução alinhada <strong>diretamente entre eles, sem envolver a USAI</strong>. A solução
          pode ser, por exemplo:
        </p>
        <ul className={LISTA}>
          <li>o conserto do item, feito ou pago por quem o danificou;</li>
          <li>a substituição por um item igual ou equivalente;</li>
          <li>
            o pagamento do valor do conserto ou do valor de mercado do item, em dinheiro, em PIX ou
            em parcelas;
          </li>
          <li>um desconto, uma compensação por outro favor ou serviço, ou o perdão do prejuízo;</li>
          <li>qualquer outra solução que as duas partes aceitem livremente.</li>
        </ul>
        <p>
          Esses acordos podem ser feitos por conversa direta, pelo chat da locação ou pessoalmente,
          e podem ser registrados nas observações do documento de devolução. As partes podem, se
          quiserem, pedir a ajuda do síndico ou da administração do condomínio como mediadores, sem
          que isso envolva a USAI. Se não houver acordo, cada parte pode buscar seus direitos pelos
          meios que a lei oferece (notificação, mediação, Juizado Especial Cível ou Justiça comum),
          por sua conta e contra a outra parte.
        </p>
        <p>
          Combinar entre si como reparar ou indenizar um item danificado não é tratado como
          tentativa de fugir da taxa da plataforma (item 7).
        </p>

        <h3 className="font-marca text-base font-extrabold">
          5.5 A USAI não media, não decide e não garante
        </h3>
        <ul className={LISTA}>
          <li>
            A USAI não arbitra disputas, não decide quem tem razão, não obriga ninguém a pagar e não
            devolve nem retém valores por causa de dano, perda ou furto do item.
          </li>
          <li>
            A USAI não oferece seguro, caução nem garantia do valor do item. O que se paga pela
            plataforma é o aluguel. Se as partes quiserem uma garantia, um seguro ou uma caução,
            combinam por fora, por conta própria.
          </li>
          <li>
            Os registros do sistema (pedido, pagamento, documento numerado de retirada e devolução,
            aceite com data e hora e histórico) existem para que as partes tenham um comprovante do
            que combinaram. Elas podem usá-los como quiserem em eventual conversa ou disputa entre
            si.
          </li>
        </ul>

        <h3 className="font-marca text-base font-extrabold">
          5.6 Termo de responsabilidade de cada locação
        </h3>
        <p>
          Na retirada e na devolução, as duas partes aceitam, com a própria senha, um termo de
          responsabilidade. Ele complementa estes Termos e vale para aquela locação, repetindo que a
          responsabilidade pelo item é de quem empresta e de quem aluga. Em qualquer caso, a USAI
          continua fora da relação entre as duas partes.
        </p>

        <h3 className="font-marca text-base font-extrabold">
          5.7 Serviços oferecidos por moradores
        </h3>
        <p>
          Os moradores também podem divulgar no catálogo serviços que prestam (por exemplo
          eletricista, maquiagem, unha, aulas), com o valor por hora ou por serviço. A USAI apenas
          mostra o anúncio e permite a conversa entre as duas pessoas.
        </p>
        <ul className={LISTA}>
          <li>
            O serviço, o preço, a data, o local e o pagamento são combinados{' '}
            <strong>direto entre quem presta e quem contrata</strong>, fora da plataforma. A USAI
            não cobra nenhuma taxa, não recebe nem repassa dinheiro de serviço e não faz
            agendamento.
          </li>
          <li>
            Quem presta responde pela qualidade, pela segurança e pelo resultado do serviço, por
            qualquer dano que ele cause a pessoas ou bens, e por ter a habilitação, o registro ou a
            autorização que a lei exigir para aquela atividade. Também é responsável pelos tributos
            sobre o que receber.
          </li>
          <li>
            A USAI não verifica a qualificação, a experiência nem os antecedentes de quem anuncia,
            não indica nem recomenda ninguém e não garante que o serviço será prestado, nem sua
            qualidade.
          </li>
          <li>
            Entre quem presta e quem contrata não há vínculo de trabalho com a USAI. Qualquer
            problema (atraso, mau serviço, dano, pagamento) é resolvido entre as duas pessoas, de
            comum acordo, como no item 5.4.
          </li>
          <li>
            Serviços ilegais, que exijam habilitação que a pessoa não tem, ou que ponham alguém em
            risco não podem ser anunciados (item 8).
          </li>
        </ul>
      </Secao>

      <Secao id="como-funcionam-locacoes" titulo="6. Como funcionam as locações">
        <ul className={LISTA}>
          <li>O locatário pede o item informando o período e, se quiser, a finalidade de uso.</li>
          <li>
            Serviços não passam por pedido nem por pagamento na plataforma: quem se interessar fala
            com quem presta pelo chat (item 5.7).
          </li>
          <li>O proprietário aprova ou recusa. Não é obrigado a aprovar nenhum pedido.</li>
          <li>
            Aprovado o pedido, o locatário paga por PIX. O período só fica reservado quando o
            pagamento é confirmado.
          </li>
          <li>
            Na retirada e na devolução, quem recebe confere o estado e os acessórios e aceita o
            termo com a senha. Cada operação vira um documento numerado.
          </li>
          <li>
            Cada pessoa é responsável por combinar com a outra o local, o horário e o jeito de
            entregar e devolver o item. A USAI não faz transporte nem entrega.
          </li>
          <li>
            O valor mínimo da diária é de R$ 5,00, porque é o menor valor que a cobrança por PIX
            aceita.
          </li>
        </ul>
      </Secao>

      <Secao id="pagamentos" titulo="7. Pagamentos, taxa, planos e saques">
        <ul className={LISTA}>
          <li>
            Os pagamentos de locação e do plano do condomínio são feitos por PIX e processados por
            uma instituição de pagamento parceira (Asaas). O pagamento de serviços não passa pela
            USAI. A USAI não guarda dados de cartão. O pagamento é considerado feito quando a
            instituição o confirma.
          </li>
          <li>
            <strong>Taxa do PIX e comissão do condomínio:</strong> o Asaas cobra uma taxa por cada
            PIX recebido, e o proprietário do item recebe o valor pago menos essa taxa. A USAI não
            fica com uma porcentagem do aluguel. O condomínio pode combinar com a USAI uma comissão,
            em porcentagem do aluguel, descontada do valor do proprietário e paga ao síndico; quando
            existe, ela aparece separada no extrato e nos recibos de cada operação.
          </li>
          <li>
            <strong>Plano do condomínio:</strong> o síndico escolhe o plano pela quantidade de
            moradores e o período de cobrança (mensal, trimestral, semestral ou anual, com
            desconto), sempre por PIX. O acesso é liberado depois da confirmação do pagamento. O
            plano não renova sozinho: para continuar, o síndico gera o PIX da renovação.
          </li>
          <li>
            Se a mensalidade vencer há mais de 5 dias, o acesso dos moradores é suspenso até o
            pagamento. O síndico continua entrando para poder pagar.
          </li>
          <li>
            <strong>Saques:</strong> o proprietário e o síndico podem pedir o saque do saldo para a
            chave PIX que informarem. A equipe da USAI analisa e transfere. É de quem pede conferir
            se a chave está correta. Um saque só é possível sobre valores já recebidos.
          </li>
          <li>
            <strong>Reembolsos:</strong> pedidos de reembolso são analisados pelo suporte caso a
            caso, respeitando o direito de arrependimento e os demais direitos previstos em lei
            quando a contratação for feita por consumidor.
          </li>
          <li>
            <strong>Tributos:</strong> cada usuário é responsável pelos tributos que incidirem sobre
            o que ganha com os aluguéis. A USAI não retém nem recolhe tributo em nome dos usuários.
          </li>
          <li>
            Os valores mostrados durante a fase de demonstração do projeto podem ser fictícios, e
            isso será avisado na tela quando for o caso.
          </li>
        </ul>
      </Secao>

      <Secao id="conduta" titulo="8. O que pode e o que não pode">
        <p>Você concorda em usar a USAI de boa-fé e, em especial, em não:</p>
        <ul className={LISTA}>
          <li>
            anunciar item ilegal, roubado, falsificado, de procedência duvidosa, ou que não seja seu
            nem tenha permissão para emprestar;
          </li>
          <li>
            anunciar armas, munições, drogas, medicamentos, produtos controlados, animais, material
            explosivo ou inflamável, ou qualquer item perigoso ou proibido por lei ou pelas regras
            do condomínio;
          </li>
          <li>
            fraudar, enganar ou prejudicar outra pessoa, ou publicar informação falsa sobre si ou
            sobre o item;
          </li>
          <li>ofender, ameaçar, discriminar, assediar ou expor outra pessoa;</li>
          <li>
            acessar dados de outra pessoa ou de outro condomínio, testar a segurança do sistema sem
            autorização, sobrecarregar a plataforma ou copiar o conteúdo dela de forma automática;
          </li>
          <li>
            tentar burlar a plataforma para fugir de taxas ou de planos, por exemplo combinando e
            recebendo o pagamento do aluguel por fora para evitar as taxas da plataforma (acordos
            sobre reparo ou indenização de um item danificado não entram aqui, veja o item 5.4);
          </li>
          <li>usar a plataforma para qualquer finalidade ilícita.</li>
        </ul>
      </Secao>

      <Secao id="conteudo" titulo="9. O que você publica">
        <ul className={LISTA}>
          <li>
            Textos, fotos, descrições, posts, comentários e mensagens são de responsabilidade de
            quem os publica. Só publique o que você pode publicar e não inclua fotos de outras
            pessoas sem autorização.
          </li>
          <li>
            Você nos autoriza, de forma gratuita e limitada, a exibir o seu conteúdo para os
            usuários do seu condomínio dentro da plataforma, o que é necessário para o serviço
            funcionar.
          </li>
          <li>
            Podemos (e o síndico pode, no que for do condomínio) remover conteúdo que viole estes
            Termos ou a lei, sem aviso prévio.
          </li>
        </ul>
      </Secao>

      <Secao id="sindico" titulo="10. O papel do síndico">
        <p>
          O síndico administra o condomínio na plataforma: contrata o plano, convida e remove
          moradores e acompanha as locações ativas. Para isso, vê o nome, o e-mail e o apartamento
          dos moradores. O síndico não representa a USAI nem fala por ela, e é responsável por usar
          esses dados apenas para a administração do condomínio. A USAI não responde por decisões do
          síndico nem por atos dele fora da plataforma.
        </p>
      </Secao>

      <Secao id="mural-e-conversas" titulo="11. Mural e conversas">
        <ul className={LISTA}>
          <li>
            O Mural e as conversas servem para avisos, pedidos de ajuda e combinados entre vizinhos.
          </li>
          <li>
            As conversas privadas abertas pelo Mural duram até 7 dias e depois são apagadas. O chat
            de uma locação fica guardado junto com o histórico dela.
          </li>
          <li>
            A USAI não lê as conversas no dia a dia, mas pode acessá-las se for necessário para
            apurar abuso, por segurança ou por ordem legal.
          </li>
          <li>
            O que é combinado no chat ou no Mural é um acordo entre vizinhos e não envolve a USAI.
          </li>
        </ul>
      </Secao>

      <Secao id="disponibilidade" titulo="12. Disponibilidade e mudanças no serviço">
        <p>
          Fazemos o possível para manter a USAI no ar e funcionando, mas ela é oferecida no estado
          em que se encontra, sem garantia de funcionamento ininterrupto ou livre de erros. Pode
          haver paradas para manutenção, falhas de internet ou de serviços de terceiros (como a
          instituição de pagamento ou o provedor de e-mail). Por ser um projeto acadêmico,
          funcionalidades podem mudar ou o serviço pode ser encerrado, e nesse caso avisaremos com
          antecedência razoável e daremos a oportunidade de baixar os seus dados.
        </p>
      </Secao>

      <Secao id="limitacao" titulo="13. Limites da responsabilidade da USAI">
        <ul className={LISTA}>
          <li>
            Nos limites da lei, a USAI não responde por danos indiretos, lucros cessantes, perda de
            oportunidade ou danos morais decorrentes de atos de usuários, da relação entre quem
            empresta e quem aluga, de informação falsa publicada por um usuário, de
            indisponibilidade da plataforma ou de falhas de terceiros.
          </li>
          <li>
            Se, mesmo assim, a USAI vier a ter alguma responsabilidade reconhecida, ela se limita ao
            valor que o usuário efetivamente pagou à USAI nos 12 meses anteriores ao fato.
          </li>
          <li>
            Você concorda em responder pelos prejuízos que causar a outras pessoas ou à USAI por
            descumprir estes Termos, e em manter a USAI livre de ações de terceiros que decorrerem
            de um ato seu.
          </li>
          <li>
            Nada nestes Termos exclui ou limita responsabilidade que a lei não permite excluir ou
            limitar, nem direitos garantidos ao consumidor pelo Código de Defesa do Consumidor.
          </li>
        </ul>
      </Secao>

      <Secao id="encerramento" titulo="14. Suspensão, encerramento e exclusão da conta">
        <ul className={LISTA}>
          <li>
            Podemos suspender ou encerrar uma conta que descumpra estes Termos, que seja usada para
            fraude ou que ponha outras pessoas em risco, com ou sem aviso, conforme a gravidade.
          </li>
          <li>
            Você pode excluir a sua conta quando quiser, em Perfil, Seus dados e privacidade. A
            exclusão só é barrada se houver locação em andamento, saque em aberto, saldo a sacar ou
            assinatura de condomínio sob a sua responsabilidade.
          </li>
          <li>
            Mesmo depois da exclusão, os registros que a lei manda guardar (financeiros e documentos
            de locação) continuam, sem identificar você. O que isso significa está na Política de
            Privacidade.
          </li>
          <li>
            Encerrar a conta não apaga obrigações já assumidas, como devolver um item que está com
            você ou pagar o que for devido ao outro usuário.
          </li>
        </ul>
      </Secao>

      <Secao id="propriedade-intelectual" titulo="15. Propriedade intelectual">
        <p>
          A marca USAI, o desenho da interface, os textos e o código da plataforma pertencem ao seu
          autor. Você pode usar a plataforma para o fim para o qual ela existe, mas não pode copiar,
          vender ou explorar a marca ou o sistema sem autorização por escrito.
        </p>
      </Secao>

      <Secao id="dados-pessoais" titulo="16. Dados pessoais">
        <p>
          O tratamento dos seus dados pessoais está descrito na{' '}
          <Link to="/privacidade" className={LINK}>
            Política de Privacidade
          </Link>
          , que faz parte destes Termos. Nela estão os seus direitos, como baixar uma cópia dos
          dados e excluir a conta.
        </p>
      </Secao>

      <Secao id="mudancas" titulo="17. Mudanças nestes Termos">
        <p>
          Podemos atualizar estes Termos. A versão e a data ficam no alto da página. Quando a
          mudança for relevante, avisaremos pela plataforma ou por e-mail e pediremos um novo
          aceite. Continuar usando a plataforma depois de uma mudança comunicada significa que você
          concorda com ela.
        </p>
      </Secao>

      <Secao id="lei-e-foro" titulo="18. Lei aplicável e foro">
        <p>
          Estes Termos seguem as leis do Brasil. Para resolver qualquer questão sobre eles, fica
          eleito o foro do domicílio do usuário, como garante o Código de Defesa do Consumidor, sem
          prejuízo de qualquer solução amigável, de mediação ou de uso dos meios extrajudiciais.
        </p>
      </Secao>

      <Secao id="contato" titulo="19. Contato">
        <p>
          Dúvidas, pedidos e reclamações:{' '}
          <a href={linkEmailSuporte} className={LINK}>
            {SUPORTE_EMAIL}
          </a>
          .
        </p>
      </Secao>
    </PaginaLegal>
  );
}

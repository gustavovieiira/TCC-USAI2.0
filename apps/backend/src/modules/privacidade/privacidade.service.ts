import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/common/errors';
import { removerArquivosDeUpload } from '@/common/uploads';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.service';
import { SaquesService } from '@/modules/saques/saques.service';

const NOME_REMOVIDO = 'Usuário removido';
const CONTEUDO_REMOVIDO = '[conteúdo removido a pedido do titular]';
const STATUS_LOCACAO_EM_ABERTO = ['PENDENTE', 'APROVADA', 'PAGA', 'EM_ANDAMENTO'] as const;
const STATUS_SAQUE_EM_ABERTO = ['PENDENTE', 'APROVADO'] as const;

export interface ExportacaoDeDados {
  geradoEm: string;
  observacao: string;
  titular: Record<string, unknown>;
  itens: unknown[];
  locacoesComoLocatario: unknown[];
  locacoesDosMeusItens: unknown[];
  posts: unknown[];
  comentarios: unknown[];
  mensagens: unknown[];
  saques: unknown[];
  lancamentos: unknown[];
  notificacoes: unknown[];
  aceitesDeTermo: unknown[];
}

/**
 * Direitos do titular previstos na LGPD (art. 18): receber uma cópia dos próprios dados e pedir a eliminação.
 * A eliminação é uma ANONIMIZAÇÃO: some tudo o que identifica a pessoa, mas os registros financeiros e os
 * documentos de retirada e devolução continuam (sem identificar ninguém), porque a lei manda guardá-los
 * (art. 16, I: cumprimento de obrigação legal ou regulatória) e eles protegem a outra parte da transação.
 */
export class PrivacidadeService {
  private readonly saques: SaquesService;

  constructor(private readonly prisma: PrismaClient) {
    this.saques = new SaquesService(prisma);
  }

  /** Tudo o que a plataforma guarda sobre a pessoa, em um arquivo que ela pode baixar. */
  async exportarDados(userId: string): Promise<ExportacaoDeDados> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { condominio: { select: { nome: true } } },
    });
    if (!usuario) throw new NotFoundError('Conta não encontrada');

    const [
      itens,
      locacoesComoLocatario,
      locacoesDosMeusItens,
      posts,
      comentarios,
      mensagens,
      saques,
      lancamentos,
      notificacoes,
      aceitesDeTermo,
    ] = await Promise.all([
      this.prisma.item.findMany({ where: { ownerId: userId }, include: { imagens: true } }),
      this.prisma.locacao.findMany({
        where: { locatarioId: userId },
        include: { item: { select: { titulo: true } } },
      }),
      this.prisma.locacao.findMany({
        where: { item: { ownerId: userId } },
        include: { item: { select: { titulo: true } } },
      }),
      this.prisma.post.findMany({ where: { autorId: userId } }),
      this.prisma.comentarioPost.findMany({ where: { autorId: userId } }),
      this.prisma.mensagemPrivada.findMany({ where: { remetenteId: userId } }),
      this.prisma.solicitacaoSaque.findMany({ where: { userId } }),
      this.prisma.lancamento.findMany({ where: { userId } }),
      this.prisma.notificacao.findMany({ where: { userId } }),
      this.prisma.aceiteTermo.findMany({ where: { userId } }),
    ]);

    return {
      geradoEm: new Date().toISOString(),
      observacao:
        'Cópia dos seus dados pessoais na USAI (LGPD, art. 18). Dados de outras pessoas aparecem só como identificadores.',
      titular: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        apartamento: usuario.apartamento,
        chavePix: usuario.chavePix,
        papel: usuario.papel,
        condominio: usuario.condominio?.nome ?? null,
        ativo: usuario.ativo,
        criadoEm: usuario.createdAt,
        aceitouTermosEm: usuario.aceitouTermosEm,
        versaoTermos: usuario.versaoTermos,
      },
      itens,
      locacoesComoLocatario,
      locacoesDosMeusItens,
      posts,
      comentarios,
      mensagens,
      saques,
      lancamentos,
      notificacoes,
      aceitesDeTermo,
    };
  }

  /**
   * Anonimiza a conta depois de conferir a senha. Barra enquanto houver algo em aberto com outras pessoas
   * (locação em andamento, saque a decidir ou a pagar, saldo a sacar, assinatura do condomínio).
   */
  async excluirConta(userId: string, senha: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!usuario || !usuario.ativo) throw new NotFoundError('Conta não encontrada');

    if (usuario.papel === 'ADMIN') {
      throw new ForbiddenError(
        'A conta de administrador da plataforma não pode ser excluída por aqui.',
      );
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) throw new UnauthorizedError('Senha incorreta');

    await this.garantirSemPendencias(userId, usuario.papel);

    const senhaAleatoria = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

    // As fotos que a pessoa enviou (posts do Mural e anúncios) também saem do disco junto com a conta.
    const [postsComFotos, fotosDosItens] = await Promise.all([
      this.prisma.post.findMany({ where: { autorId: userId }, select: { imagens: true } }),
      this.prisma.itemImagem.findMany({
        where: { item: { ownerId: userId } },
        select: { url: true },
      }),
    ]);
    const enderecosDasFotos = [
      ...postsComFotos.flatMap((p) =>
        Array.isArray(p.imagens) ? p.imagens.filter((i): i is string => typeof i === 'string') : [],
      ),
      ...fotosDosItens.map((f) => f.url),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          nome: NOME_REMOVIDO,
          email: `removido-${userId}@excluido.usai.invalid`,
          senhaHash: senhaAleatoria,
          cpf: null,
          chavePix: null,
          apartamento: null,
          ativo: false,
          tokenVersion: { increment: 1 },
        },
      });

      // Pedidos de login e de redefinição de senha pendentes e avisos guardados.
      await tx.tokenAcesso.deleteMany({ where: { userId } });
      await tx.notificacao.deleteMany({ where: { userId } });

      // Anúncios saem do ar; o histórico das locações que já aconteceram continua.
      await tx.item.updateMany({ where: { ownerId: userId }, data: { ativo: false } });
      await tx.itemImagem.deleteMany({ where: { item: { ownerId: userId } } });

      // Mural: some o que a pessoa escreveu (apagar o post leva os comentários dele junto).
      await tx.comentarioPost.deleteMany({ where: { autorId: userId } });
      await tx.post.deleteMany({ where: { autorId: userId } });

      // Conversas: as do Mural são efêmeras e vão embora; nas das locações, só as mensagens da pessoa.
      await tx.conversaPrivada.deleteMany({
        where: {
          locacaoId: null,
          OR: [{ participanteAId: userId }, { participanteBId: userId }],
        },
      });
      await tx.mensagemPrivada.updateMany({
        where: { remetenteId: userId },
        data: { conteudo: CONTEUDO_REMOVIDO },
      });

      // Pedidos de saque ficam (registro financeiro), sem a chave PIX.
      await tx.solicitacaoSaque.updateMany({
        where: { userId },
        data: { chavePixUsada: '[removida]' },
      });
    });

    await removerArquivosDeUpload(enderecosDasFotos);
  }

  private async garantirSemPendencias(userId: string, papel: string): Promise<void> {
    if (papel === 'SINDICO') {
      const assinatura = await this.prisma.assinatura.findFirst({
        where: { responsavelId: userId },
      });
      if (assinatura) {
        throw new AppError(
          'Você é o responsável pela assinatura do condomínio. Fale com o suporte da USAI para encerrar ou transferir a assinatura antes de excluir a conta.',
          409,
          'ASSINATURA_ATIVA',
        );
      }
    }

    const locacoesEmAberto = await this.prisma.locacao.count({
      where: {
        status: { in: [...STATUS_LOCACAO_EM_ABERTO] },
        OR: [{ locatarioId: userId }, { item: { ownerId: userId } }],
      },
    });
    if (locacoesEmAberto > 0) {
      throw new AppError(
        'Você tem locações em andamento (como locatário ou como dono do item). Conclua ou cancele antes de excluir a conta.',
        409,
        'LOCACOES_EM_ABERTO',
      );
    }

    const saquesEmAberto = await this.prisma.solicitacaoSaque.count({
      where: { userId, status: { in: [...STATUS_SAQUE_EM_ABERTO] } },
    });
    if (saquesEmAberto > 0) {
      throw new AppError(
        'Você tem um pedido de saque em análise ou aguardando o PIX. Espere a conclusão antes de excluir a conta.',
        409,
        'SAQUE_EM_ABERTO',
      );
    }

    const saldo = await this.saques.calcularSaldo(userId);
    if (saldo > 0) {
      throw new AppError(
        'Você ainda tem saldo a sacar. Peça o saque antes de excluir a conta, senão o valor ficaria sem destino.',
        409,
        'SALDO_A_SACAR',
      );
    }
  }
}

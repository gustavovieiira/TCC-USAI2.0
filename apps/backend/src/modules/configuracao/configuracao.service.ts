import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { AtualizarTextosInput, ConfiguracaoDTO } from './configuracao.types';

const CHAVE_LOGO = 'logo_url';
const CHAVE_NOME = 'nome_institucional';
const CHAVE_RODAPE = 'rodape_institucional';

export const NOME_INSTITUCIONAL_PADRAO = 'USAI — Compartilhamento entre vizinhos';
export const RODAPE_INSTITUCIONAL_PADRAO =
  'Documento gerado eletronicamente pela plataforma USAI. A autenticidade pode ser conferida pelo número do documento e pela impressão digital de integridade.';

/**
 * Identidade da plataforma (logo oficial, nome e rodapé institucionais) editável pelo Admin e
 * usada no cabeçalho, na tela inicial e nos documentos gerados. Sem nada configurado, valem os
 * padrões acima e a marca embutida da USAI — o sistema nunca fica sem identidade.
 */
export class ConfiguracaoService {
  /** `pastaDaLogo`: onde os arquivos de logo moram, pra poder apagar o antigo ao trocar. */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pastaDaLogo?: string,
  ) {}

  async obter(): Promise<ConfiguracaoDTO> {
    const registros = await this.prisma.configuracao.findMany({
      where: { chave: { in: [CHAVE_LOGO, CHAVE_NOME, CHAVE_RODAPE] } },
    });
    const valores = new Map(registros.map((r) => [r.chave, r.valor]));

    return {
      logoUrl: valores.get(CHAVE_LOGO) ?? null,
      nomeInstitucional: valores.get(CHAVE_NOME) ?? NOME_INSTITUCIONAL_PADRAO,
      rodapeInstitucional: valores.get(CHAVE_RODAPE) ?? RODAPE_INSTITUCIONAL_PADRAO,
    };
  }

  async definirLogo(url: string, adminId: string): Promise<ConfiguracaoDTO> {
    const anterior = await this.prisma.configuracao.findUnique({ where: { chave: CHAVE_LOGO } });

    await this.prisma.configuracao.upsert({
      where: { chave: CHAVE_LOGO },
      update: { valor: url, atualizadoPorId: adminId },
      create: { chave: CHAVE_LOGO, valor: url, atualizadoPorId: adminId },
    });
    await this.registrarAuditoria(adminId, 'ATUALIZAR_LOGO', { url });
    this.apagarArquivoAntigo(anterior?.valor, url);

    return this.obter();
  }

  /** Volta pra marca padrão da USAI. */
  async removerLogo(adminId: string): Promise<ConfiguracaoDTO> {
    const anterior = await this.prisma.configuracao.findUnique({ where: { chave: CHAVE_LOGO } });

    if (anterior) {
      await this.prisma.configuracao.delete({ where: { chave: CHAVE_LOGO } });
      await this.registrarAuditoria(adminId, 'REMOVER_LOGO', { url: anterior.valor });
      this.apagarArquivoAntigo(anterior.valor);
    }

    return this.obter();
  }

  async atualizarTextos(input: AtualizarTextosInput, adminId: string): Promise<ConfiguracaoDTO> {
    for (const [chave, valor] of [
      [CHAVE_NOME, input.nomeInstitucional],
      [CHAVE_RODAPE, input.rodapeInstitucional],
    ] as const) {
      await this.prisma.configuracao.upsert({
        where: { chave },
        update: { valor, atualizadoPorId: adminId },
        create: { chave, valor, atualizadoPorId: adminId },
      });
    }
    await this.registrarAuditoria(adminId, 'ATUALIZAR_TEXTOS_INSTITUCIONAIS', { ...input });

    return this.obter();
  }

  /** Só apaga arquivo que está na pasta da logo (nunca um caminho qualquer vindo do banco). */
  private apagarArquivoAntigo(urlAntiga: string | undefined, urlNova?: string): void {
    if (!urlAntiga || urlAntiga === urlNova || !this.pastaDaLogo) return;

    const nomeDoArquivo = path.basename(new URL(urlAntiga, 'http://localhost').pathname);
    const caminho = path.join(this.pastaDaLogo, nomeDoArquivo);
    if (path.dirname(caminho) !== path.resolve(this.pastaDaLogo)) return;

    fs.promises.unlink(caminho).catch(() => undefined);
  }

  private async registrarAuditoria(
    adminId: string,
    acao: string,
    metadata: Record<string, string>,
  ) {
    await this.prisma.logAuditoria.create({
      data: { adminId, acao, alvoTipo: 'Configuracao', alvoId: 'identidade', metadata },
    });
  }
}

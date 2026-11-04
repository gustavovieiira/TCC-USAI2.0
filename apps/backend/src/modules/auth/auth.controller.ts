import { Request, Response } from 'express';
import { logger } from '@/common/logger';
import { prisma } from '@/common/prisma';
import { AuthService } from './auth.service';
import {
  atualizarPerfilSchema,
  cadastroMoradorSchema,
  definirSenhaSchema,
  esqueciSenhaSchema,
  loginSchema,
  redefinirSenhaSchema,
  refreshTokenSchema,
} from './auth.schemas';

const authService = new AuthService(prisma);

export const authController = {
  async cadastrarMorador(req: Request, res: Response) {
    const input = cadastroMoradorSchema.parse(req.body);
    const result = await authService.cadastrarMorador(input);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  },

  async definirSenha(req: Request, res: Response) {
    const { token, senha } = definirSenhaSchema.parse(req.body);
    const result = await authService.definirSenha(token, senha);
    res.status(200).json(result);
  },

  /**
   * Responde na hora e sempre igual (a conta existindo ou não), e envia o e-mail em segundo plano: assim nem
   * a mensagem nem o tempo de resposta revelam quais e-mails estão cadastrados.
   */
  async esqueciSenha(req: Request, res: Response) {
    const { email } = esqueciSenhaSchema.parse(req.body);
    authService.solicitarRedefinicaoSenha(email).catch((error: unknown) => {
      logger.error('Falha ao enviar o e-mail de redefinição de senha', {
        erro: error instanceof Error ? error.message : String(error),
      });
    });
    res.status(202).json({
      message: 'Se este e-mail tiver uma conta, enviamos um link para criar uma nova senha.',
    });
  },

  async redefinirSenha(req: Request, res: Response) {
    const { token, senha } = redefinirSenhaSchema.parse(req.body);
    await authService.redefinirSenha(token, senha);
    res.status(200).json({ message: 'Senha alterada. Entre com o seu e-mail e a senha nova.' });
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json(tokens);
  },

  async atualizarPerfil(req: Request, res: Response) {
    const input = atualizarPerfilSchema.parse(req.body);
    const user = await authService.atualizarPerfil(req.auth!.userId, input);
    res.status(200).json(user);
  },
};

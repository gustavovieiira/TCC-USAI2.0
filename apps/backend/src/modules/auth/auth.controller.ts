import { Request, Response } from 'express';
import { prisma } from '@/common/prisma';
import { AuthService } from './auth.service';
import { cadastroMoradorSchema, loginSchema, refreshTokenSchema } from './auth.schemas';

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

  async refresh(req: Request, res: Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json(tokens);
  },
};

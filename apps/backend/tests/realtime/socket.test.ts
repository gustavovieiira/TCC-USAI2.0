import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer } from '@/realtime/socket';
import { ConversasService } from '@/modules/conversas/conversas.service';
import { MensagemPrivadaDTO } from '@/modules/conversas/conversas.types';
import { MensagensService } from '@/modules/mensagens/mensagens.service';
import { MensagemDTO } from '@/modules/mensagens/mensagens.types';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function signToken(userId: string): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

function buildMensagensServiceMock(): jest.Mocked<
  Pick<MensagensService, 'verificarParticipante' | 'enviar' | 'listarPorLocacao'>
> {
  return {
    verificarParticipante: jest.fn().mockResolvedValue(undefined),
    enviar: jest.fn(),
    listarPorLocacao: jest.fn(),
  };
}

function buildConversasServiceMock(): jest.Mocked<
  Pick<ConversasService, 'verificarParticipante' | 'enviarMensagem'>
> {
  return {
    verificarParticipante: jest.fn().mockResolvedValue(undefined),
    enviarMensagem: jest.fn(),
  };
}

describe('WebSocket de mensagens em tempo real (M4)', () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let port: number;
  let mensagensService: ReturnType<typeof buildMensagensServiceMock>;
  let conversasService: ReturnType<typeof buildConversasServiceMock>;
  const clients: ClientSocket[] = [];

  beforeEach((done) => {
    mensagensService = buildMensagensServiceMock();
    conversasService = buildConversasServiceMock();
    httpServer = http.createServer();
    io = createSocketServer(httpServer, {
      mensagensService: mensagensService as unknown as MensagensService,
      conversasService: conversasService as unknown as ConversasService,
    });
    httpServer.listen(0, () => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterEach((done) => {
    clients.forEach((client) => client.disconnect());
    clients.length = 0;
    io.close();
    httpServer.close(() => done());
  });

  function connect(userId: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: signToken(userId) },
        transports: ['websocket'],
        forceNew: true,
      });
      clients.push(client);
      client.on('connect', () => resolve(client));
      client.on('connect_error', reject);
    });
  }

  it('rejeita conexão sem token', (done) => {
    const client = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(client);

    client.on('connect_error', (error: Error) => {
      expect(error.message).toBe('Token de acesso ausente');
      done();
    });
  });

  it('entra na sala da locação quando participante', async () => {
    const client = await connect('user-1');

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('locacao:entrar', 'locacao-1', resolve);
    });

    expect(ok).toBe(true);
    expect(mensagensService.verificarParticipante).toHaveBeenCalledWith('locacao-1', 'user-1');
  });

  it('nega entrada quando o usuário não participa da locação', async () => {
    mensagensService.verificarParticipante.mockRejectedValue(new Error('sem acesso'));
    const client = await connect('user-2');

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('locacao:entrar', 'locacao-1', resolve);
    });

    expect(ok).toBe(false);
  });

  it('envia mensagem e todos os participantes da sala recebem em tempo real', async () => {
    const remetente = await connect('user-locatario');
    const outroParticipante = await connect('user-dono');

    const mensagemPersistida: MensagemDTO = {
      id: 'mensagem-1',
      locacaoId: 'locacao-1',
      remetenteId: 'user-locatario',
      conteudo: 'Chega às 18h?',
      createdAt: new Date('2026-09-15T12:00:00.000Z'),
    };
    mensagensService.enviar.mockResolvedValue(mensagemPersistida);

    await Promise.all([
      new Promise((resolve) => remetente.emit('locacao:entrar', 'locacao-1', resolve)),
      new Promise((resolve) => outroParticipante.emit('locacao:entrar', 'locacao-1', resolve)),
    ]);

    const recebida = new Promise((resolve) => {
      outroParticipante.on('mensagem:nova', resolve);
    });

    const ack = await new Promise((resolve) => {
      remetente.emit(
        'mensagem:enviar',
        { locacaoId: 'locacao-1', conteudo: 'Chega às 18h?' },
        resolve,
      );
    });

    expect(mensagensService.enviar).toHaveBeenCalledWith('locacao-1', 'user-locatario', {
      conteudo: 'Chega às 18h?',
    });
    expect(ack).toMatchObject({
      ok: true,
      mensagem: { id: 'mensagem-1', conteudo: 'Chega às 18h?' },
    });
    await expect(recebida).resolves.toMatchObject({ id: 'mensagem-1', conteudo: 'Chega às 18h?' });
  });

  it('retorna erro no ack quando o envio falha (ex.: quem não participa da locação)', async () => {
    const client = await connect('user-estranho');
    mensagensService.enviar.mockRejectedValue(new Error('Você não participa desta locação'));

    const ack = await new Promise((resolve) => {
      client.emit('mensagem:enviar', { locacaoId: 'locacao-1', conteudo: 'oi' }, resolve);
    });

    expect(ack).toEqual({ ok: false, erro: 'Você não participa desta locação' });
  });

  it('entra na sala da conversa privada quando participante', async () => {
    const client = await connect('user-ana');

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('conversa:entrar', 'conversa-1', resolve);
    });

    expect(ok).toBe(true);
    expect(conversasService.verificarParticipante).toHaveBeenCalledWith(
      'conversa-1',
      'cond-1',
      'user-ana',
    );
  });

  it('nega entrada na conversa privada quando o usuário não participa', async () => {
    conversasService.verificarParticipante.mockRejectedValue(new Error('sem acesso'));
    const client = await connect('user-estranho');

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('conversa:entrar', 'conversa-1', resolve);
    });

    expect(ok).toBe(false);
  });

  it('envia mensagem privada e ambos participantes da sala recebem em tempo real', async () => {
    const remetente = await connect('user-ana');
    const outroParticipante = await connect('user-bruno');

    const mensagemPersistida: MensagemPrivadaDTO = {
      id: 'mensagem-1',
      conversaId: 'conversa-1',
      remetenteId: 'user-ana',
      conteudo: 'Ainda precisa da furadeira?',
      createdAt: new Date('2026-09-16T12:00:00.000Z'),
    };
    conversasService.enviarMensagem.mockResolvedValue(mensagemPersistida);

    await Promise.all([
      new Promise((resolve) => remetente.emit('conversa:entrar', 'conversa-1', resolve)),
      new Promise((resolve) => outroParticipante.emit('conversa:entrar', 'conversa-1', resolve)),
    ]);

    const recebida = new Promise((resolve) => {
      outroParticipante.on('conversa:mensagem:nova', resolve);
    });

    const ack = await new Promise((resolve) => {
      remetente.emit(
        'conversa:mensagem:enviar',
        { conversaId: 'conversa-1', conteudo: 'Ainda precisa da furadeira?' },
        resolve,
      );
    });

    expect(conversasService.enviarMensagem).toHaveBeenCalledWith(
      'conversa-1',
      'cond-1',
      'user-ana',
      { conteudo: 'Ainda precisa da furadeira?' },
    );
    expect(ack).toMatchObject({
      ok: true,
      mensagem: { id: 'mensagem-1', conteudo: 'Ainda precisa da furadeira?' },
    });
    await expect(recebida).resolves.toMatchObject({
      id: 'mensagem-1',
      conteudo: 'Ainda precisa da furadeira?',
    });
  });

  it('retorna erro no ack quando o envio da mensagem privada falha', async () => {
    const client = await connect('user-estranho');
    conversasService.enviarMensagem.mockRejectedValue(
      new Error('Você não participa desta conversa'),
    );

    const ack = await new Promise((resolve) => {
      client.emit(
        'conversa:mensagem:enviar',
        { conversaId: 'conversa-1', conteudo: 'oi' },
        resolve,
      );
    });

    expect(ack).toEqual({ ok: false, erro: 'Você não participa desta conversa' });
  });
});

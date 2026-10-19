import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createSocketServer } from '@/realtime/socket';
import { ConversasService } from '@/modules/conversas/conversas.service';
import { MensagemPrivadaDTO } from '@/modules/conversas/conversas.types';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function signToken(userId: string): string {
  return jwt.sign({ userId, papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

function buildConversasServiceMock(): jest.Mocked<
  Pick<ConversasService, 'verificarParticipante' | 'enviarMensagem' | 'buscarOutroParticipanteId'>
> {
  return {
    verificarParticipante: jest.fn().mockResolvedValue(undefined),
    enviarMensagem: jest.fn(),
    buscarOutroParticipanteId: jest.fn().mockResolvedValue(null),
  };
}

describe('WebSocket do chat em tempo real (conversas do Mural e das locações)', () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let port: number;
  let conversasService: ReturnType<typeof buildConversasServiceMock>;
  const clients: ClientSocket[] = [];

  beforeEach((done) => {
    conversasService = buildConversasServiceMock();
    httpServer = http.createServer();
    io = createSocketServer(httpServer, {
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

  it('avisa o destinatário mesmo sem ele ter entrado na sala (conversa recém-criada)', async () => {
    const remetente = await connect('user-ana');
    const destinatario = await connect('user-bruno');

    const mensagemPersistida: MensagemPrivadaDTO = {
      id: 'mensagem-2',
      conversaId: 'conversa-nova',
      remetenteId: 'user-ana',
      conteudo: 'Oi, vi seu anúncio da furadeira',
      createdAt: new Date('2026-09-18T12:00:00.000Z'),
    };
    conversasService.enviarMensagem.mockResolvedValue(mensagemPersistida);
    conversasService.buscarOutroParticipanteId.mockResolvedValue('user-bruno');

    // Só o remetente entra na sala da conversa — o destinatário nunca chamou 'conversa:entrar'.
    await new Promise((resolve) => remetente.emit('conversa:entrar', 'conversa-nova', resolve));

    const recebida = new Promise((resolve) => {
      destinatario.on('conversa:mensagem:nova', resolve);
    });

    const ack = await new Promise((resolve) => {
      remetente.emit(
        'conversa:mensagem:enviar',
        { conversaId: 'conversa-nova', conteudo: 'Oi, vi seu anúncio da furadeira' },
        resolve,
      );
    });

    expect(conversasService.buscarOutroParticipanteId).toHaveBeenCalledWith(
      'conversa-nova',
      'user-ana',
    );
    expect(ack).toMatchObject({ ok: true });
    await expect(recebida).resolves.toMatchObject({
      id: 'mensagem-2',
      conteudo: 'Oi, vi seu anúncio da furadeira',
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

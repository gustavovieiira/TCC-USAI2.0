import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SaqueStatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  atualizarCondominio,
  criarCondominio,
  criarSindico,
  listarCondominios,
  resumoFinanceiro,
} from '@/features/admin/admin.api';
import { CondominioAdminDTO, ResumoFinanceiroDTO } from '@/features/admin/admin.types';
import { aprovarSaque, listarTodosSaques, rejeitarSaque } from '@/features/saques/saques.api';
import { SaqueDTO } from '@/features/saques/saques.types';

type Aba = 'financeiro' | 'condominios' | 'sindicos';

export function AdminPage() {
  const [aba, setAba] = useState<Aba>('financeiro');
  const [resumo, setResumo] = useState<ResumoFinanceiroDTO | null>(null);
  const [saquesPendentes, setSaquesPendentes] = useState<SaqueDTO[] | null>(null);
  const [condominios, setCondominios] = useState<CondominioAdminDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    Promise.all([resumoFinanceiro(), listarTodosSaques('PENDENTE'), listarCondominios()])
      .then(([res, saques, conds]) => {
        setResumo(res);
        setSaquesPendentes(saques);
        setCondominios(conds);
      })
      .catch((err) => setErro(extractErrorMessage(err)));
  }

  useEffect(carregar, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Painel do Admin USAI</h1>
        <p className="text-sm text-ink-soft">Condomínios, síndicos e financeiro da plataforma.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border border-paper-line bg-paper-surface p-1">
        {(
          [
            ['financeiro', 'Financeiro'],
            ['condominios', 'Condomínios'],
            ['sindicos', 'Síndicos'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setAba(valor)}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${
              aba === valor ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}

      {aba === 'financeiro' && (
        <AbaFinanceiro
          resumo={resumo}
          saques={saquesPendentes}
          erro={erro}
          onMudou={(atualizado) => {
            setSaquesPendentes((atual) => atual?.filter((s) => s.id !== atualizado.id) ?? atual);
            // Best-effort: a aprovação/rejeição já aconteceu: se o refresh dos cards falhar, os
            // números só ficam desatualizados até a próxima visita — não é um erro pro usuário ver.
            resumoFinanceiro()
              .then(setResumo)
              .catch(() => undefined);
          }}
          onErro={setErro}
        />
      )}

      {aba === 'condominios' && (
        <AbaCondominios
          condominios={condominios}
          erro={erro}
          onCriado={(novo) => setCondominios((atual) => (atual ? [...atual, novo] : [novo]))}
          onAtualizado={(atualizado) =>
            setCondominios(
              (atual) => atual?.map((c) => (c.id === atualizado.id ? atualizado : c)) ?? atual,
            )
          }
          onErro={setErro}
        />
      )}

      {aba === 'sindicos' && <AbaSindicos condominios={condominios} onErro={setErro} />}
    </div>
  );
}

interface AbaFinanceiroProps {
  resumo: ResumoFinanceiroDTO | null;
  saques: SaqueDTO[] | null;
  erro: string | null;
  onMudou: (saque: SaqueDTO) => void;
  onErro: (erro: string) => void;
}

function AbaFinanceiro({ resumo, saques, erro, onMudou, onErro }: AbaFinanceiroProps) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  async function handleAprovar(id: string) {
    setProcessandoId(id);
    try {
      const atualizado = await aprovarSaque(id);
      onMudou(atualizado);
    } catch (err) {
      onErro(extractErrorMessage(err));
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRejeitar(event: FormEvent, id: string) {
    event.preventDefault();
    setProcessandoId(id);
    try {
      const atualizado = await rejeitarSaque(id, motivo);
      onMudou(atualizado);
      setRejeitandoId(null);
      setMotivo('');
    } catch (err) {
      onErro(extractErrorMessage(err));
    } finally {
      setProcessandoId(null);
    }
  }

  if (!resumo && !erro) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!resumo) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="font-meta text-xs text-ink-faint">Condomínios ativos</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{resumo.condominiosAtivos}</p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Saques pendentes</p>
          <p className="mt-1 font-display text-xl font-bold text-mostarda-500">
            {resumo.saques.pendente.quantidade}
          </p>
          <p className="font-mono font-meta text-xs text-ink-faint">
            {formatCurrency(resumo.saques.pendente.valorTotal)}
          </p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Saques aprovados</p>
          <p className="mt-1 font-display text-xl font-bold text-jade-500">
            {resumo.saques.aprovado.quantidade}
          </p>
          <p className="font-mono font-meta text-xs text-ink-faint">
            {formatCurrency(resumo.saques.aprovado.valorTotal)}
          </p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Saques rejeitados</p>
          <p className="mt-1 font-display text-xl font-bold text-carmim-500">
            {resumo.saques.rejeitado.quantidade}
          </p>
          <p className="font-mono font-meta text-xs text-ink-faint">
            {formatCurrency(resumo.saques.rejeitado.valorTotal)}
          </p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display font-semibold text-ink">Saques pendentes de avaliação</h2>

        {saques && saques.length === 0 && <EmptyState title="Nenhum saque pendente" />}

        {saques && saques.length > 0 && (
          <div className="flex flex-col gap-3">
            {saques.map((saque) => (
              <Card key={saque.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-ink">
                    {formatCurrency(saque.valor)}
                  </span>
                  <SaqueStatusBadge status={saque.status} />
                </div>
                <p className="text-sm text-ink-soft">
                  Chave PIX: {saque.chavePixUsada} · {formatDateTime(saque.createdAt)}
                </p>

                {rejeitandoId === saque.id ? (
                  <form
                    onSubmit={(e) => handleRejeitar(e, saque.id)}
                    className="flex flex-col gap-2"
                  >
                    <TextField
                      label="Motivo da rejeição"
                      name="motivo"
                      required
                      minLength={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="danger"
                        fullWidth={false}
                        isLoading={processandoId === saque.id}
                      >
                        Confirmar rejeição
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        fullWidth={false}
                        onClick={() => setRejeitandoId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      fullWidth={false}
                      isLoading={processandoId === saque.id}
                      onClick={() => handleAprovar(saque.id)}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth={false}
                      disabled={processandoId === saque.id}
                      onClick={() => setRejeitandoId(saque.id)}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AbaCondominiosProps {
  condominios: CondominioAdminDTO[] | null;
  erro: string | null;
  onCriado: (condominio: CondominioAdminDTO) => void;
  onAtualizado: (condominio: CondominioAdminDTO) => void;
  onErro: (erro: string) => void;
}

function AbaCondominios({ condominios, onCriado, onAtualizado, onErro }: AbaCondominiosProps) {
  const [nome, setNome] = useState('');
  const [linkSlug, setLinkSlug] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroForm(null);
    setIsLoading(true);

    try {
      const novo = await criarCondominio({ nome, linkSlug, pin });
      onCriado(novo);
      setNome('');
      setLinkSlug('');
      setPin('');
    } catch (err) {
      setErroForm(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAlternarAtivo(condominio: CondominioAdminDTO) {
    setAlternandoId(condominio.id);
    try {
      const atualizado = await atualizarCondominio(condominio.id, { ativo: !condominio.ativo });
      onAtualizado(atualizado);
    } catch (err) {
      onErro(extractErrorMessage(err));
    } finally {
      setAlternandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-4 font-display font-semibold text-ink">Cadastrar condomínio</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Nome"
            name="nome"
            required
            minLength={3}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <TextField
            label="Link de acesso"
            name="linkSlug"
            required
            placeholder="residencial-jardim-europa"
            pattern="[a-z0-9-]+"
            value={linkSlug}
            onChange={(e) => setLinkSlug(e.target.value)}
          />
          <TextField
            label="PIN"
            name="pin"
            inputMode="numeric"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {erroForm && (
            <p role="alert" className="text-sm text-carmim-700">
              {erroForm}
            </p>
          )}
          <Button type="submit" isLoading={isLoading}>
            Cadastrar
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-display font-semibold text-ink">Condomínios cadastrados</h2>

        {!condominios && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {condominios && condominios.length === 0 && (
          <EmptyState title="Nenhum condomínio cadastrado ainda" />
        )}

        {condominios && condominios.length > 0 && (
          <div className="flex flex-col gap-2">
            {condominios.map((condominio) => (
              <Card key={condominio.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-ink">{condominio.nome}</p>
                  <p className="text-sm text-ink-soft">/{condominio.linkSlug}</p>
                </div>
                <Button
                  variant={condominio.ativo ? 'danger' : 'secondary'}
                  fullWidth={false}
                  isLoading={alternandoId === condominio.id}
                  onClick={() => handleAlternarAtivo(condominio)}
                >
                  {condominio.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AbaSindicosProps {
  condominios: CondominioAdminDTO[] | null;
  onErro: (erro: string) => void;
}

function AbaSindicos({ condominios }: AbaSindicosProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [condominioId, setCondominioId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setIsLoading(true);

    try {
      const sindico = await criarSindico({ nome, email, senha, condominioId });
      setSucesso(`Síndico ${sindico.nome} criado com sucesso.`);
      setNome('');
      setEmail('');
      setSenha('');
      setCondominioId('');
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-4 font-display font-semibold text-ink">Criar conta de síndico</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Nome"
          name="nome"
          required
          minLength={3}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          name="senha"
          type="password"
          required
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Select
          label="Condomínio"
          name="condominioId"
          required
          value={condominioId}
          onChange={(e) => setCondominioId(e.target.value)}
        >
          <option value="" disabled>
            Selecione um condomínio
          </option>
          {condominios?.map((condominio) => (
            <option key={condominio.id} value={condominio.id}>
              {condominio.nome}
            </option>
          ))}
        </Select>
        {erro && (
          <p role="alert" className="text-sm text-carmim-700">
            {erro}
          </p>
        )}
        {sucesso && <p className="text-sm text-jade-500">{sucesso}</p>}
        <Button type="submit" isLoading={isLoading}>
          Criar síndico
        </Button>
      </form>
    </Card>
  );
}

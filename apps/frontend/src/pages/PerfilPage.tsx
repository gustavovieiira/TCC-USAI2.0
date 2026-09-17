import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { PapelTag } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { resumoFinanceiro, listarCondominios } from '@/features/admin/admin.api';
import { listarItens } from '@/features/itens/itens.api';
import { listarComoLocatario, listarComoProprietario } from '@/features/locacoes/locacoes.api';
import { buscarSaldo } from '@/features/saques/saques.api';
import {
  buscarCondominio,
  listarLocacoesAtivas,
  listarMoradores,
} from '@/features/sindico/sindico.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { clearSession, getStoredUser } from '@/lib/authStorage';
import { formatCurrency } from '@/lib/format';

const LOCACAO_STATUS_ATIVOS = ['PENDENTE', 'APROVADA', 'PAGA', 'EM_ANDAMENTO'];

interface DadosMorador {
  tipo: 'MORADOR';
  saldo: number;
  itensPublicados: number;
  locacoesAtivas: number;
  pedidosParaAprovar: number;
}

interface DadosSindico {
  tipo: 'SINDICO';
  condominioNome: string;
  moradores: number;
  locacoesAtivas: number;
}

interface DadosAdmin {
  tipo: 'ADMIN';
  condominiosAtivos: number;
  saquesPendentes: number;
  saquesPendentesValor: number;
}

type Dados = DadosMorador | DadosSindico | DadosAdmin;

function StatCard({
  label,
  value,
  accent = 'text-ink',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${accent}`}>{value}</p>
    </Card>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="notch flex min-h-[44px] items-center justify-center border border-paper-line
        bg-paper-surface px-4 text-sm font-semibold text-ink shadow-paper transition
        hover:bg-paper"
    >
      {label}
    </Link>
  );
}

export function PerfilPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function carregar() {
      try {
        if (user!.papel === 'MORADOR') {
          const [saldo, itens, comoLocatario, recebidas] = await Promise.all([
            buscarSaldo(),
            listarItens(),
            listarComoLocatario(),
            listarComoProprietario(),
          ]);
          setDados({
            tipo: 'MORADOR',
            saldo,
            itensPublicados: itens.filter((item) => item.ownerId === user!.id).length,
            locacoesAtivas: comoLocatario.filter((l) => LOCACAO_STATUS_ATIVOS.includes(l.status))
              .length,
            pedidosParaAprovar: recebidas.filter((l) => l.status === 'PENDENTE').length,
          });
        } else if (user!.papel === 'SINDICO') {
          const [condominio, moradores, locacoesAtivas] = await Promise.all([
            buscarCondominio(),
            listarMoradores(),
            listarLocacoesAtivas(),
          ]);
          setDados({
            tipo: 'SINDICO',
            condominioNome: condominio.nome,
            moradores: moradores.length,
            locacoesAtivas: locacoesAtivas.length,
          });
        } else {
          const [resumo, condominios] = await Promise.all([
            resumoFinanceiro(),
            listarCondominios(),
          ]);
          setDados({
            tipo: 'ADMIN',
            condominiosAtivos: condominios.filter((c) => c.ativo).length,
            saquesPendentes: resumo.saques.pendente.quantidade,
            saquesPendentesValor: resumo.saques.pendente.valorTotal,
          });
        }
      } catch (err) {
        setErro(extractErrorMessage(err));
      }
    }

    carregar();
  }, []);

  if (!user) return null;

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card className="flex items-center gap-4">
        <Avatar nome={user.nome} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-bold text-ink">{user.nome}</h1>
            <PapelTag papel={user.papel} />
          </div>
          <p className="mt-1 truncate text-sm text-ink-soft">{user.email}</p>
          {user.apartamento && (
            <p className="text-sm text-ink-soft">Apartamento {user.apartamento}</p>
          )}
        </div>
      </Card>

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}
      {!dados && !erro && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {dados?.tipo === 'MORADOR' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Saldo disponível"
            value={formatCurrency(dados.saldo)}
            accent="text-jade-500"
          />
          <StatCard label="Itens publicados" value={String(dados.itensPublicados)} />
          <StatCard label="Locações ativas" value={String(dados.locacoesAtivas)} />
          <StatCard
            label="Pedidos p/ aprovar"
            value={String(dados.pedidosParaAprovar)}
            accent={dados.pedidosParaAprovar > 0 ? 'text-mostarda-500' : 'text-ink'}
          />
        </div>
      )}

      {dados?.tipo === 'SINDICO' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Condomínio" value={dados.condominioNome} />
          <StatCard label="Moradores" value={String(dados.moradores)} />
          <StatCard label="Locações ativas" value={String(dados.locacoesAtivas)} />
        </div>
      )}

      {dados?.tipo === 'ADMIN' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Condomínios ativos" value={String(dados.condominiosAtivos)} />
          <StatCard
            label="Saques pendentes"
            value={String(dados.saquesPendentes)}
            accent={dados.saquesPendentes > 0 ? 'text-mostarda-500' : 'text-ink'}
          />
          <StatCard
            label="Valor em saques pendentes"
            value={formatCurrency(dados.saquesPendentesValor)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-ink">Atalhos</h2>
        <div className="grid grid-cols-2 gap-3">
          {user.papel === 'MORADOR' && (
            <>
              <QuickLink to="/catalogo" label="Catálogo" />
              <QuickLink to="/itens/novo" label="Publicar item" />
              <QuickLink to="/locacoes" label="Minhas locações" />
              <QuickLink to="/saques" label="Saques" />
            </>
          )}
          {user.papel === 'SINDICO' && (
            <>
              <QuickLink to="/sindico" label="Painel do síndico" />
              <QuickLink to="/mural" label="Mural" />
            </>
          )}
          {user.papel === 'ADMIN' && <QuickLink to="/admin" label="Painel Admin USAI" />}
        </div>
      </div>

      <Button variant="danger" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
}

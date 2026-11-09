import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { baixarMeusDados, excluirMinhaConta } from './privacidade.api';

interface SeusDadosProps {
  /** Data em que a pessoa aceitou os Termos e a Política, gravada no cadastro. */
  aceitouTermosEm?: string | null;
  /** Chamado depois que a conta foi excluída, para encerrar a sessão neste aparelho. */
  aoExcluir: () => void;
}

/** Direitos do titular (LGPD): baixar uma cópia dos dados e excluir (anonimizar) a conta. */
export function SeusDados({ aceitouTermosEm, aoExcluir }: SeusDadosProps) {
  const [baixando, setBaixando] = useState(false);
  const [erroDownload, setErroDownload] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [senha, setSenha] = useState('');
  const [palavra, setPalavra] = useState('');
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function baixar() {
    setErroDownload(null);
    setBaixando(true);
    try {
      const arquivo = await baixarMeusDados();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meus-dados-usai.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErroDownload(extractErrorMessage(err));
    } finally {
      setBaixando(false);
    }
  }

  function abrirConfirmacao() {
    setSenha('');
    setPalavra('');
    setErroExclusao(null);
    setConfirmando(true);
  }

  async function excluir(evento: FormEvent) {
    evento.preventDefault();
    setErroExclusao(null);
    setExcluindo(true);
    try {
      await excluirMinhaConta(senha);
      aoExcluir();
    } catch (err) {
      setErroExclusao(extractErrorMessage(err));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      {confirmando && (
        <Modal titulo="Excluir minha conta" onFechar={() => setConfirmando(false)}>
          <h2 className="pr-8 font-marca text-xl font-extrabold leading-tight text-fachada-tinta">
            Excluir minha conta
          </h2>
          <p className="mt-2 text-sm text-fachada-tinta-suave">
            Isso não pode ser desfeito. Seu nome, e-mail, CPF, chave PIX e apartamento deixam de
            existir, seus anúncios saem do ar e o que você escreveu no Mural é apagado. Os registros
            financeiros e os documentos de locação que a lei manda guardar continuam, sem
            identificar você.
          </p>
          <form onSubmit={excluir} className="mt-4 flex flex-col gap-3" noValidate>
            <TextField
              label="Sua senha"
              name="senhaExclusao"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <TextField
              label="Digite EXCLUIR para confirmar"
              name="confirmacaoExclusao"
              autoComplete="off"
              value={palavra}
              onChange={(e) => setPalavra(e.target.value)}
            />
            {erroExclusao && (
              <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
                {erroExclusao}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                variant="danger"
                fullWidth={false}
                disabled={excluindo || !senha || palavra.trim().toUpperCase() !== 'EXCLUIR'}
              >
                {excluindo ? 'Excluindo…' : 'Excluir para sempre'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-display font-semibold text-ink">Seus dados e privacidade</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Você pode receber uma cópia de tudo o que a USAI guarda sobre você ou excluir a sua
            conta. Veja a{' '}
            <Link
              to="/privacidade"
              className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
            >
              Política de Privacidade
            </Link>{' '}
            e os{' '}
            <Link
              to="/termos"
              className="font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
            >
              Termos de Uso
            </Link>
            .
          </p>
        </div>
        {aceitouTermosEm && (
          <p className="text-sm text-ink-soft">
            Aceite registrado: você leu e aceitou os Termos de Uso e a Política de Privacidade em{' '}
            <strong className="text-ink">
              {new Date(aceitouTermosEm).toLocaleDateString('pt-BR')}
            </strong>
            .
          </p>
        )}
        {erroDownload && (
          <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
            {erroDownload}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            disabled={baixando}
            onClick={baixar}
          >
            {baixando ? 'Preparando o arquivo…' : 'Baixar meus dados'}
          </Button>
          <Button type="button" variant="danger" fullWidth={false} onClick={abrirConfirmacao}>
            Excluir minha conta
          </Button>
        </div>
      </Card>
    </>
  );
}

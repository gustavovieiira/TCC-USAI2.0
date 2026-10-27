import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { buscarConfiguracao } from './configuracao.api';
import { ConfiguracaoDTO } from './configuracao.types';

/** Antes de carregar (ou se a API falhar), vale a identidade padrão: o app nunca fica sem marca. */
export const CONFIGURACAO_PADRAO: ConfiguracaoDTO = {
  logoUrl: null,
  nomeInstitucional: 'USAI — Compartilhamento entre vizinhos',
  rodapeInstitucional:
    'Documento gerado eletronicamente pela plataforma USAI. A autenticidade pode ser conferida pelo número do documento e pela impressão digital de integridade.',
};

interface ConfiguracaoEstado {
  configuracao: ConfiguracaoDTO;
  /** O painel do Admin chama depois de trocar a logo/textos, pra o app inteiro refletir na hora. */
  atualizar: (nova: ConfiguracaoDTO) => void;
}

const ConfiguracaoContext = createContext<ConfiguracaoEstado>({
  configuracao: CONFIGURACAO_PADRAO,
  atualizar: () => undefined,
});

export function ConfiguracaoProvider({ children }: PropsWithChildren) {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoDTO>(CONFIGURACAO_PADRAO);

  useEffect(() => {
    let ativo = true;
    buscarConfiguracao()
      .then((dados) => ativo && setConfiguracao(dados))
      .catch(() => undefined);

    return () => {
      ativo = false;
    };
  }, []);

  const atualizar = useCallback((nova: ConfiguracaoDTO) => setConfiguracao(nova), []);

  return (
    <ConfiguracaoContext.Provider value={{ configuracao, atualizar }}>
      {children}
    </ConfiguracaoContext.Provider>
  );
}

export function useConfiguracao(): ConfiguracaoEstado {
  return useContext(ConfiguracaoContext);
}

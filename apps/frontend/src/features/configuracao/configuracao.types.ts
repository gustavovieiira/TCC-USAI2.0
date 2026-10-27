export interface ConfiguracaoDTO {
  /** Logo oficial enviada pelo Admin; nula = usa a marca padrão da USAI. */
  logoUrl: string | null;
  nomeInstitucional: string;
  rodapeInstitucional: string;
}

export interface AtualizarTextosInput {
  nomeInstitucional: string;
  rodapeInstitucional: string;
}

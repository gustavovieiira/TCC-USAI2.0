import '@testing-library/jest-dom/vitest';

// jsdom não implementa scrollIntoView — usado pelo scroll automático do chat (MensagensLocacaoPage).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom também não implementa URL.createObjectURL/revokeObjectURL — usado na pré-visualização de
// foto do formulário de publicar item (PublicarItemPage).
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}

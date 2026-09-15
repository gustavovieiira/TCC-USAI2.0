import '@testing-library/jest-dom/vitest';

// jsdom não implementa scrollIntoView — usado pelo scroll automático do chat (MensagensLocacaoPage).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

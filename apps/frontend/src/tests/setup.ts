import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Registra os matchers do jest-dom direto (o atalho '@testing-library/jest-dom/vitest' não acha o vitest
// do workspace quando os dois ficam em pastas de node_modules diferentes).
expect.extend(matchers);

// jsdom não implementa scrollIntoView, usado pelo scroll automático do chat (ConversaPage).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom também não implementa URL.createObjectURL/revokeObjectURL, usado na pré-visualização de
// foto do formulário de publicar item (PublicarItemPage).
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}

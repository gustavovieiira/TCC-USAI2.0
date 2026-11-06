/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

/**
 * No Vitest 5 o `Assertion` ganhou um segundo parâmetro de tipo, e a declaração que vem junto com o
 * `@testing-library/jest-dom` ainda usa só um, então os matchers (`toBeInTheDocument`, `toHaveAttribute`...)
 * deixavam de existir para o TypeScript. Esta declaração repete a do pacote com os parâmetros certos.
 */
declare module 'vitest' {
  interface Assertion<R = any, T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}

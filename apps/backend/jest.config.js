/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    '!src/modules/**/*.routes.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      // Meta final do playbook (Web Apps): 75% no backend. Sobe gradualmente a cada módulo entregue.
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
};

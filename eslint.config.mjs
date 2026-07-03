import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// eslint 9 flat config：沿用 eslint-config-next 16 提供的 flat preset
// （對應舊 .eslintrc.json 的 extends: ["next/core-web-vitals"]）
export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  ...nextCoreWebVitals,
  {
    // 技術債（Next16 升級暫緩）：react-hooks v7 新增規則，升級當下有 38 處既有代碼命中。
    // 先降為 warn 維持與升級前 lint 閘門同等強度，後續逐步修完再改回 error。
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]);

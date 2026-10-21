import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// ESLint 9 flat config：沿用 eslint-config-next 16 提供的 flat preset
// （對應舊 .eslintrc.json 的 extends: ["next/core-web-vitals"]）。
export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 維持升級前的 lint 範圍：舊 script 帶 --ext .js,.jsx,.ts,.tsx，從不檢查 .mjs/.cjs
    // （scripts/*.mjs 是 Node 測試腳本，不是 Next 程式碼）。
    '**/*.mjs',
    '**/*.cjs',
  ]),
  ...nextCoreWebVitals,
  {
    // 技術債（Next 16 升級暫緩）：eslint-plugin-react-hooks v7 新增的規則，升級當下既有代碼共命中 41 處
    //（set-state-in-effect 22、immutability 15、static-components 2、purity 2）。
    // 先降為 warn，維持與升級前相同的 lint 閘門強度（0 error）；後續逐步修完再改回 error。
    // 這輪升級刻意不為了消 warning 而改任何商業邏輯。
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]);

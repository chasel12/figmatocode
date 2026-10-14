import type { UIPage } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';
import { scssFromPage } from '../compiler/css-model';
import { generateTaroTsx } from './taro';
import { generateHtml } from './html';
import { FONT_STACK } from '../font';

export interface GeneratedFile {
  path: string;
  content: string;
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'page';
}

/** 生成完整 Taro 项目文件集 */
export function generateTaroProject(page: UIPage, compiled: CompiledPage): GeneratedFile[] {
  const tsx = generateTaroTsx(page, compiled);
  const scss = scssFromPage(compiled);
  const pageName = slugify(page.name);

  return [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: `ui-compiler-${pageName}`,
          version: '1.0.0',
          private: true,
          scripts: {
            'dev:weapp': 'taro build --type weapp --watch',
            'dev:h5': 'taro build --type h5 --watch',
            'build:h5': 'taro build --type h5',
          },
          dependencies: {
            '@tarojs/components': '^3.6.25',
            '@tarojs/plugin-platform-h5': '^3.6.25',
            '@tarojs/runtime': '^3.6.25',
            '@tarojs/taro': '^3.6.25',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            '@babel/runtime': '^7.23.0',
            '@tarojs/cli': '^3.6.25',
            '@tarojs/webpack-runner': '^3.6.25',
            typescript: '^5.3.0',
            sass: '^1.69.0',
          },
        },
        null,
        2,
      ),
    },
    { path: 'src/app.config.ts', content: `export default defineAppConfig({\n  pages: [\n    'pages/index/index',\n  ],\n})\n` },
    { path: 'src/app.ts', content: `import { PropsWithChildren } from 'react'\nimport './app.scss'\n\nfunction App({ children }: PropsWithChildren) {\n  return children\n}\n\nexport default App\n` },
    { path: 'src/app.scss', content: `page {\n  background: #ffffff;\n  /* Inter 需接入方本地托管（PRD FR-48 public/fonts 口径），缺省回退系统栈 */\n  font-family: ${FONT_STACK};\n}\n` },
    { path: 'src/pages/index/index.config.ts', content: `export default definePageConfig({\n  navigationBarTitleText: ${JSON.stringify(page.name)},\n})\n` },
    { path: 'src/pages/index/index.tsx', content: tsx },
    { path: 'src/pages/index/index.scss', content: scss },
    {
      path: 'project.json',
      content: JSON.stringify(
        {
          uiCompiler: {
            generator: 'ui-compiler@0.1.0',
            page: page.name,
            viewport: page.viewport,
            nodeCount: compiled.nodes.length,
          },
        },
        null,
        2,
      ),
    },
  ];
}

/** 生成独立 HTML 预览（无需 Taro 构建即可运行 / 截图） */
export function generatePreviewFile(page: UIPage, compiled: CompiledPage): GeneratedFile {
  return {
    path: 'index.html',
    content: generateHtml(page, compiled, { title: page.name }),
  };
}

export { slugify };

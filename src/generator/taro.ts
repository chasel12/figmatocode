import type { UINode, UIPage } from '../schema/types';
import { isContainer } from '../schema/types';
import type { CompiledPage } from '../compiler/css-model';

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

function imageSrc(node: UINode): string {
  if (node.type !== 'IMAGE') return '';
  return node.src || '';
}

/**
 * UI AST → Taro TSX。
 * Frame/Rectangle → View，Text → Text，Image → Image，Button → Button。
 */
export function generateTaroTsx(page: UIPage, compiled: CompiledPage): string {
  const classNames = new Map(compiled.nodes.map((n) => [n.id, n.className]));

  const renderNode = (node: UINode, depth: number): string => {
    const indent = '  '.repeat(depth);
    const cls = classNames.get(node.id) ?? node.id;

    if (node.type === 'TEXT') {
      return `${indent}<Text className="${cls}">${escapeText(node.text)}</Text>`;
    }
    if (node.type === 'BUTTON') {
      return `${indent}<Button className="${cls}" onClick={() => {}}>${escapeText(node.text)}</Button>`;
    }
    if (node.type === 'IMAGE') {
      const src = imageSrc(node);
      return `${indent}<Image className="${cls}"${src ? ` src={require('${src}')}` : ''} mode="aspectFill" />`;
    }

    if (!isContainer(node) || node.type === 'RECTANGLE') {
      return `${indent}<View className="${cls}" />`;
    }

    if (!node.children.length) return `${indent}<View className="${cls}" />`;

    const children = node.children.map((c) => renderNode(c, depth + 1)).join('\n');
    return `${indent}<View className="${cls}">\n${children}\n${indent}</View>`;
  };

  const body = renderNode(page.root, 2);

  return `import { View, Text, Image, Button } from '@tarojs/components'
import './index.scss'

export default function Index() {
  return (
${body}
  )
}
`;
}

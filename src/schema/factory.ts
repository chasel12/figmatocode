import type {
  ButtonNode,
  ContainerNode,
  ImageNode,
  LayoutSchema,
  NodeKind,
  ShapeNode,
  StyleSchema,
  TextNode,
  UINode,
  UIPage,
  VectorNode,
} from './types';
import { isContainer } from './types';

let idSeq = 0;

export function resetIdSeq(value = 0): void {
  idSeq = value;
}

export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function defaultLayout(kind: NodeKind): LayoutSchema {
  if (kind === 'PAGE') {
    return {
      mode: 'VERTICAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 375,
      height: 812,
      padding: [0, 0, 0, 0],
      gap: 0,
      align: 'START',
      justify: 'START',
    };
  }
  if (kind === 'RECTANGLE') {
    return {
      mode: 'VERTICAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 120,
      height: 80,
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'OVAL' || kind === 'POLYGON' || kind === 'STAR') {
    return { ...defaultLayoutRect() };
  }
  if (kind === 'SECTION') {
    // FR-14：Section 包裹容器——子项自由摆放（ABSOLUTE），200×200 起
    return {
      mode: 'ABSOLUTE',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 200,
      height: 200,
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'SLICE') {
    // FR-14：Slice 圈定导出区域——绝对定位不占 flow，出码跳过
    return {
      mode: 'ABSOLUTE',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 100,
      height: 100,
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'LINE') {
    return {
      mode: 'VERTICAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 100,
      height: 0,
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'IMAGE') {
    return {
      mode: 'VERTICAL',
      widthMode: 'FIXED',
      heightMode: 'FIXED',
      width: 120,
      height: 120,
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'TEXT') {
    return {
      mode: 'VERTICAL',
      widthMode: 'HUG',
      heightMode: 'HUG',
      padding: [0, 0, 0, 0],
      gap: 0,
    };
  }
  if (kind === 'BUTTON') {
    return {
      mode: 'HORIZONTAL',
      widthMode: 'HUG',
      heightMode: 'HUG',
      padding: [10, 20, 10, 20],
      gap: 0,
      align: 'CENTER',
      justify: 'CENTER',
    };
  }
  return {
    mode: 'VERTICAL',
    widthMode: 'HUG',
    heightMode: 'HUG',
    padding: [0, 0, 0, 0],
    gap: 8,
    align: 'START',
    justify: 'START',
  };
}

export function defaultStyle(kind: NodeKind): StyleSchema {
  if (kind === 'TEXT') {
    return { color: '#111111', fontSize: 16, fontWeight: 400, lineHeight: 22, textAlign: 'left' };
  }
  if (kind === 'BUTTON') {
    return {
      background: '#1677FF',
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 22,
      borderRadius: 8,
      textAlign: 'center',
    };
  }
  if (kind === 'IMAGE') {
    return { borderRadius: 0 };
  }
  if (kind === 'LINE') {
    return { border: { width: 1, color: '#000000', style: 'solid' } };
  }
  if (kind === 'POLYGON') {
    return { pointCount: 3 };
  }
  if (kind === 'STAR') {
    return { pointCount: 5, innerRadius: 0.38 };
  }
  if (kind === 'SECTION') {
    // FR-14：中性半透明底（深浅主题皆可辨识，Figma 浅灰底近似——LOG 报备）
    return { background: 'rgba(128,128,128,0.12)', borderRadius: 8 };
  }
  return {};
}

function defaultLayoutRect(): LayoutSchema {
  return {
    mode: 'VERTICAL',
    widthMode: 'FIXED',
    heightMode: 'FIXED',
    width: 120,
    height: 80,
    padding: [0, 0, 0, 0],
    gap: 0,
  };
}

const kindName: Record<NodeKind, string> = {
  PAGE: '页面',
  FRAME: 'Frame',
  TEXT: 'Text',
  IMAGE: 'Image',
  RECTANGLE: 'Rectangle',
  BUTTON: 'Button',
  OVAL: 'Oval',
  LINE: 'Line',
  POLYGON: 'Polygon',
  STAR: 'Star',
  SECTION: 'Section',
  SLICE: 'Slice',
  VECTOR: 'Vector',
};

export function createNode(kind: NodeKind, overrides: Partial<{ id: string; name: string }> = {}): UINode {
  const layout = defaultLayout(kind);
  const style = defaultStyle(kind);
  const id = overrides.id ?? nextId(kind.toLowerCase());
  const name = overrides.name ?? `${kindName[kind]} ${id.split('-').pop()}`;

  if (kind === 'TEXT') {
    const node: TextNode = { id, name, type: 'TEXT', text: '文本内容', layout, style };
    return node;
  }
  if (kind === 'BUTTON') {
    const node: ButtonNode = { id, name, type: 'BUTTON', text: '按钮', layout, style };
    return node;
  }
  if (kind === 'IMAGE') {
    const node: ImageNode = { id, name, type: 'IMAGE', src: '', layout, style };
    return node;
  }
  if (kind === 'OVAL' || kind === 'LINE' || kind === 'POLYGON' || kind === 'STAR' || kind === 'SLICE') {
    const node: ShapeNode = { id, name, type: kind, layout, style };
    return node;
  }
  if (kind === 'VECTOR') {
    // FR-21：默认空 path（M0 0）占位，钢笔工具写入真实 d；渲染/出码按空 path 跳过
    const node: VectorNode = { id, name, type: 'VECTOR', layout, style, vector: { d: 'M 0 0' } };
    return node;
  }
  const node: ContainerNode = {
    id,
    name,
    type: kind as 'PAGE' | 'FRAME' | 'RECTANGLE' | 'SECTION',
    layout,
    style,
    children: [],
  };
  return node;
}

export function createPage(name = '未命名页面', width = 375, height = 812): UIPage {
  const root = createNode('PAGE', { id: 'page', name }) as ContainerNode;
  root.layout.width = width;
  root.layout.height = height;
  return { id: 'page', name, viewport: { width, height }, root };
}

export function walk(node: UINode, visit: (node: UINode, parent: ContainerNode | null) => void, parent: ContainerNode | null = null): void {
  visit(node, parent);
  if (isContainer(node)) {
    for (const child of node.children) walk(child, visit, node);
  }
}

export function findById(root: UINode, id: string): { node: UINode; parent: ContainerNode | null } | null {
  let found: { node: UINode; parent: ContainerNode | null } | null = null;
  walk(root, (node, parent) => {
    if (node.id === id && !found) found = { node, parent };
  });
  return found;
}

export function cloneNode<T extends UINode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}

export function clonePage(page: UIPage): UIPage {
  return JSON.parse(JSON.stringify(page)) as UIPage;
}

export function collectIds(page: UIPage): string[] {
  const ids: string[] = [];
  walk(page.root, (node) => ids.push(node.id));
  return ids;
}

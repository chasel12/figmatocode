/** FR-9 快捷键布局表：数据结构驱动（对照 Figma 快捷键偏好做重映射的单一事实源，禁止散落硬编码） */
export interface ShortcutEntry {
  group: string;
  keys: string;
  desc: string;
}

/** 工具字母（与 Toolbar TOOLS 一一对应，测试断言同步） */
export const TOOL_KEYS: Record<string, string> = {
  select: 'V',
  hand: 'H',
  frame: 'F',
  rect: 'R',
  ellipse: 'O',
  line: 'L',
  text: 'T',
  pen: 'P',
  image: 'Shift+K',
};

export const SHORTCUT_TABLE: ShortcutEntry[] = [
  { group: '工具', keys: 'V', desc: '移动 / 选择' },
  { group: '工具', keys: 'H', desc: '抓手平移（按住空格亦可）' },
  { group: '工具', keys: 'F', desc: '框架容器' },
  { group: '工具', keys: 'R', desc: '矩形' },
  { group: '工具', keys: 'O', desc: '椭圆' },
  { group: '工具', keys: 'L', desc: '直线' },
  { group: '工具', keys: 'T', desc: '文本' },
  { group: '工具', keys: 'P', desc: '钢笔' },
  { group: '工具', keys: 'Shift+K', desc: '置入图片' },

  { group: '文件', keys: 'Ctrl+N', desc: '新建项目' },
  { group: '文件', keys: 'Ctrl+O', desc: '打开 JSON' },
  { group: '文件', keys: 'Ctrl+S', desc: '保存 JSON' },
  { group: '文件', keys: 'Ctrl+E', desc: '导出代码 / ZIP' },

  { group: '编辑', keys: 'Ctrl+C / Ctrl+X', desc: '复制 / 剪切' },
  { group: '编辑', keys: 'Ctrl+V', desc: '粘贴' },
  { group: '编辑', keys: 'Ctrl+D', desc: '创建副本' },
  { group: '编辑', keys: 'Ctrl+Z / Ctrl+Shift+Z', desc: '撤销 / 重做' },
  { group: '编辑', keys: 'Ctrl+A', desc: '全选' },
  { group: '编辑', keys: 'Ctrl+G', desc: '组合所选' },
  { group: '编辑', keys: 'Delete', desc: '删除所选' },
  { group: '编辑', keys: 'Esc', desc: '取消选择 / 提交文本' },

  { group: '移动', keys: '方向键', desc: '移动 1px' },
  { group: '移动', keys: 'Shift+方向键', desc: '移动 10px' },
  { group: '移动', keys: 'Tab / Shift+Tab', desc: '选择同级下一个 / 上一个' },

  { group: '视图', keys: 'Ctrl+= / Ctrl+-', desc: '放大 / 缩小' },
  { group: '视图', keys: 'Shift+1', desc: '适合画布' },
  { group: '视图', keys: 'Shift+0', desc: '实际大小' },
  { group: '视图', keys: 'Ctrl+Shift+?', desc: '打开 / 关闭本面板' },
];

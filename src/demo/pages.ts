import type { FillLayer, UIPage } from '../schema/types';
import {
  C,
  body,
  button,
  card,
  fillBtn,
  frame,
  hstack,
  image,
  makePage,
  navbar,
  rect,
  resetDemoSeq,
  txt,
  vstack,
  type Spec,
} from './dsl';

/* ---------- 01 登录页 ---------- */
function loginPage(): UIPage {
  return makePage(
    '01 登录',
    [
      vstack(
        'Hero',
        [
          rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 72 }, { background: C.primary, borderRadius: 18 }, 'Logo'),
          txt('欢迎回来', { fontSize: 26, fontWeight: 700, color: C.text }, { widthMode: 'HUG', heightMode: 'HUG' }),
          txt('请登录以继续', { fontSize: 14, color: C.dim }),
        ],
        { padding: [64, 24, 24, 24], gap: 12, widthMode: 'FILL', align: 'CENTER' },
      ),
      body([
        vstack(
          '表单',
          [
            vstack('账号输入', [
              txt('手机 / 邮箱', { fontSize: 12, color: C.faint }),
              rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 46, padding: [0, 0, 0, 0] }, { background: '#F2F3F5', borderRadius: 10 }, '输入框'),
            ], { gap: 6 }),
            vstack('密码输入', [
              txt('密码', { fontSize: 12, color: C.faint }),
              rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 46, padding: [0, 0, 0, 0] }, { background: '#F2F3F5', borderRadius: 10 }, '输入框'),
            ], { gap: 6 }),
            hstack('选项', [
              txt('☑ 记住我', { fontSize: 12, color: C.dim }),
              txt('忘记密码？', { fontSize: 12, color: C.primary }, { widthMode: 'FILL', heightMode: 'HUG' }),
            ], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
            fillBtn('登录'),
            hstack('注册入口', [
              txt('还没有账号？', { fontSize: 13, color: C.dim }),
              txt('立即注册', { fontSize: 13, color: C.primary, fontWeight: 600 }),
            ], { justify: 'CENTER', widthMode: 'FILL', gap: 4 }),
          ],
          { gap: 16 },
        ),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 02 注册页 ---------- */
function registerPage(): UIPage {
  const field = (label: string): Spec =>
    vstack(label, [txt(label, { fontSize: 12, color: C.faint }), rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 44 }, { background: '#F2F3F5', borderRadius: 10 })], { gap: 6 });

  return makePage(
    '02 注册',
    [
      navbar('注册'),
      body([
        txt('创建账号', { fontSize: 22, fontWeight: 700, color: C.text }),
        vstack('字段', [field('昵称'), field('手机号'), field('验证码'), field('设置密码')], { gap: 14 }),
        txt('注册即代表同意《用户协议》与《隐私政策》', { fontSize: 11, color: C.faint }),
        fillBtn('注册'),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 03 商品列表 ---------- */
function productCard(name: string, price: string): Spec {
  return card(
    name,
    [
      image({ widthMode: 'FILL', heightMode: 'FIXED', height: 110, padding: [0, 0, 0, 0] }, { background: '#E8EAED', borderRadius: 8 }, '商品图'),
      txt(name, { fontSize: 14, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
      hstack('价格行', [
        txt(price, { fontSize: 16, fontWeight: 700, color: C.price }),
        txt('销量 999', { fontSize: 11, color: C.faint }, { widthMode: 'FILL', heightMode: 'HUG' }),
      ], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
    ],
    { gap: 8, padding: [10, 10, 10, 10] },
  );
}

function productListPage(): UIPage {
  const row = (a: Spec, b: Spec): Spec =>
    hstack('商品行', [frame('A', [a], { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 }), frame('B', [b], { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8 })], { gap: 12, widthMode: 'FILL', align: 'START' });

  return makePage(
    '03 商品列表',
    [
      navbar('商品列表'),
      body([
        hstack('搜索栏', [rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 38 }, { background: '#F2F3F5', borderRadius: 19 }, '搜索框')], { widthMode: 'FILL' }),
        row(productCard('轻质跑鞋 男女通用', '¥ 299'), productCard('复古棒球帽', '¥ 69')),
        row(productCard('帆布单肩包', '¥ 129'), productCard('不锈钢保温杯', '¥ 89')),
        row(productCard('无线蓝牙耳机', '¥ 399'), productCard('纯棉基础T恤', '¥ 59')),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 04 商品详情 ---------- */
function productDetailPage(): UIPage {
  return makePage(
    '04 商品详情',
    [
      image({ widthMode: 'FILL', heightMode: 'FIXED', height: 300, padding: [0, 0, 0, 0] }, { background: '#E8EAED' }, '主图'),
      body([
        hstack('价格行', [
          txt('¥ 299', { fontSize: 28, fontWeight: 700, color: C.price }),
          txt('原价 ¥ 399', { fontSize: 13, color: C.faint }),
          txt('已售 2.3 万', { fontSize: 12, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL', heightMode: 'HUG' }),
        ], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
        txt('轻质跑鞋 男女通用 缓震透气运动鞋', { fontSize: 17, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
        hstack('标签', [
          txt('7天无理由', { fontSize: 11, color: C.primary, fontWeight: 500 }, { widthMode: 'HUG', heightMode: 'HUG' }),
          txt('正品保障', { fontSize: 11, color: C.primary, fontWeight: 500 }, { widthMode: 'HUG', heightMode: 'HUG' }),
          txt('极速退款', { fontSize: 11, color: C.primary, fontWeight: 500 }, { widthMode: 'HUG', heightMode: 'HUG' }),
        ], { gap: 8 }),
        txt('商品描述：采用轻量材质，中底回弹缓震，鞋面透气网纱，适合日常通勤与轻度运动。', { fontSize: 13, color: C.dim, lineHeight: 20 }, { widthMode: 'FILL', heightMode: 'HUG' }),
        card('规格', [txt('颜色分类：经典白 / 曜石黑', { fontSize: 13, color: C.text }), txt('尺码：36 - 44', { fontSize: 13, color: C.text })], { gap: 8 }),
      ]),
      frame(
        '底部操作栏',
        [
          hstack('图标组', [
            txt('♡', { fontSize: 20, color: C.dim }, { widthMode: 'HUG' }),
            txt('收藏', { fontSize: 10, color: C.dim }),
            txt('🛒', { fontSize: 20, color: C.dim }, { widthMode: 'HUG' }),
            txt('购物车', { fontSize: 10, color: C.dim }),
          ], { gap: 6, widthMode: 'HUG' }),
          button('加入购物车', { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FILL', padding: [0, 12, 0, 12], align: 'CENTER', justify: 'CENTER' }, { background: '#FFA940', color: '#FFFFFF', fontSize: 15, fontWeight: 600, borderRadius: [22, 0, 0, 22], textAlign: 'center' }),
          button('立即购买', { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FILL', padding: [0, 12, 0, 12], align: 'CENTER', justify: 'CENTER' }, { background: C.price, color: '#FFFFFF', fontSize: 15, fontWeight: 600, borderRadius: [0, 22, 22, 0], textAlign: 'center' }),
        ],
        {
          mode: 'HORIZONTAL',
          widthMode: 'FILL',
          heightMode: 'FIXED',
          height: 64,
          padding: [8, 12, 8, 12],
          gap: 10,
          align: 'CENTER',
        },
        { background: C.card, boxShadow: '0 -4 16 rgba(0,0,0,0.08)' },
      ),
    ],
    { rootLayout: { mode: 'VERTICAL', justify: 'START' }, rootStyle: { background: C.bg } },
  );
}

/* ---------- 05 订单列表 ---------- */
function orderRow(status: string, statusColor: string, title: string, amount: string): Spec {
  return card(
    '订单卡片',
    [
      hstack('头部', [txt(title, { fontSize: 14, fontWeight: 600, color: C.text }), txt(status, { fontSize: 13, color: statusColor, fontWeight: 600, textAlign: 'right' }, { widthMode: 'FILL', heightMode: 'HUG' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
      txt('共 3 件商品 · 2026-10-01', { fontSize: 12, color: C.faint }),
      hstack('底部', [txt(amount, { fontSize: 16, fontWeight: 700, color: C.text }), button('再来一单', { mode: 'HORIZONTAL', widthMode: 'HUG', heightMode: 'HUG', padding: [6, 14, 6, 14], align: 'CENTER', justify: 'CENTER' }, { background: '#FFF1F0', color: C.price, fontSize: 12, borderRadius: 14, textAlign: 'center' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL', align: 'CENTER' }),
    ],
    { gap: 8 },
  );
}

function orderListPage(): UIPage {
  return makePage(
    '05 订单列表',
    [
      navbar('我的订单'),
      hstack('筛选', [txt('全部', { fontSize: 14, fontWeight: 600, color: C.primary }), txt('待付款', { fontSize: 14, color: C.dim }), txt('待发货', { fontSize: 14, color: C.dim }), txt('待收货', { fontSize: 14, color: C.dim })], { gap: 20, padding: [12, 16, 12, 16], widthMode: 'FILL', justify: 'SPACE_BETWEEN' }, { background: C.card }),
      body([
        orderRow('待发货', C.primary, '订单号 20261001001', '合计 ¥ 467'),
        orderRow('已完成', C.success, '订单号 20260928002', '合计 ¥ 128'),
        orderRow('待付款', C.price, '订单号 20260927003', '合计 ¥ 899'),
        orderRow('已完成', C.success, '订单号 20260925004', '合计 ¥ 59'),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 06 订单详情 ---------- */
function kvRow(k: string, v: string, strong = false): Spec {
  return hstack(
    k,
    [
      txt(k, { fontSize: 13, color: C.dim }, { widthMode: 'HUG', heightMode: 'HUG' }),
      txt(v, { fontSize: 13, color: C.text, fontWeight: strong ? 600 : 400, textAlign: 'right' }, { widthMode: 'FILL', heightMode: 'HUG' }),
    ],
    { justify: 'SPACE_BETWEEN', widthMode: 'FILL', gap: 12 },
  );
}

function orderDetailPage(): UIPage {
  return makePage(
    '06 订单详情',
    [
      navbar('订单详情'),
      body([
        hstack('状态', [txt('待发货', { fontSize: 22, fontWeight: 700, color: C.primary }), txt('买家已付款', { fontSize: 12, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL', heightMode: 'HUG' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
        card('地址', [
          txt('张三 · 138****8888', { fontSize: 14, fontWeight: 600, color: C.text }),
          txt('浙江省杭州市余杭区文一西路 969 号', { fontSize: 12, color: C.dim, lineHeight: 18 }, { widthMode: 'FILL', heightMode: 'HUG' }),
        ]),
        card('商品', [
          hstack('商品项', [
            rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 64, height: 64 }, { background: '#E8EAED', borderRadius: 8 }),
            vstack('信息', [txt('轻质跑鞋 男女通用', { fontSize: 14, color: C.text }, { widthMode: 'FILL' }), txt('经典白 · 42', { fontSize: 12, color: C.faint }), txt('¥ 299 × 1', { fontSize: 14, fontWeight: 600, color: C.text, textAlign: 'right' }, { widthMode: 'FILL' })], { gap: 6, widthMode: 'FILL' }),
          ], { gap: 12, widthMode: 'FILL', align: 'START' }),
        ]),
        card('金额', [kvRow('商品金额', '¥ 299'), kvRow('运费', '¥ 0'), kvRow('优惠', '-¥ 30'), kvRow('实付', '¥ 269', true)], { gap: 10 }),
        hstack('操作', [button('申请退款', { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 40, align: 'CENTER', justify: 'CENTER' }, { background: '#FFFFFF', color: C.dim, fontSize: 14, borderRadius: 8, border: { width: 1, color: C.line, style: 'solid' }, textAlign: 'center' }), button('查看物流', { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 40, align: 'CENTER', justify: 'CENTER' }, { background: C.primary, color: '#FFFFFF', fontSize: 14, borderRadius: 8, textAlign: 'center' })], { gap: 12, widthMode: 'FILL' }),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 07 个人中心 ---------- */
function menuRow(icon: string, label: string): Spec {
  return hstack(
    label,
    [
      txt(icon, { fontSize: 16, color: C.primary }, { widthMode: 'HUG', heightMode: 'HUG' }),
      txt(label, { fontSize: 14, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
      txt('›', { fontSize: 16, color: C.faint }, { widthMode: 'HUG', heightMode: 'HUG' }),
    ],
    { gap: 12, widthMode: 'FILL', padding: [13, 0, 13, 0] },
  );
}

function profilePage(): UIPage {
  return makePage(
    '07 个人中心',
    [
      frame(
        '头部',
        [
          hstack('用户信息', [
            rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 56 }, { background: '#FFD8BF', borderRadius: 28 }, '头像'),
            vstack('信息', [txt('旅行的青蛙', { fontSize: 18, fontWeight: 700, color: '#FFFFFF' }), txt('ID: 88234412 · Lv.6', { fontSize: 12, color: 'rgba(255,255,255,0.85)' })], { gap: 4, widthMode: 'FILL' }),
            txt('›', { fontSize: 18, color: '#FFFFFF' }, { widthMode: 'HUG' }),
          ], { gap: 14, widthMode: 'FILL', align: 'CENTER' }),
          hstack('统计', [
            vstack('收藏', [txt('128', { fontSize: 16, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }), txt('收藏', { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' })], { gap: 2, widthMode: 'FILL' }),
            vstack('关注', [txt('64', { fontSize: 16, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }), txt('关注', { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' })], { gap: 2, widthMode: 'FILL' }),
            vstack('足迹', [txt('349', { fontSize: 16, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }), txt('足迹', { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' })], { gap: 2, widthMode: 'FILL' }),
          ], { widthMode: 'FILL', gap: 0 }),
        ],
        { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 20, padding: [48, 16, 24, 16] },
        { fills: [{ type: 'GRADIENT_LINEAR', angle: 45, stops: [{ position: 0, color: C.primary }, { position: 1, color: '#7c5cff' }] }] as FillLayer[] },
      ),
      body([
        card('菜单', [menuRow('📦', '我的订单'), menuRow('📍', '收货地址'), menuRow('🎫', '优惠券'), menuRow('💳', '支付方式')], { padding: [4, 14, 4, 14], gap: 0 }),
        card('其他', [menuRow('💬', '帮助与反馈'), menuRow('ℹ️', '关于')], { padding: [4, 14, 4, 14], gap: 0 }),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 08 设置页 ---------- */
function switchRow(label: string, on: boolean): Spec {
  return hstack(
    label,
    [
      txt(label, { fontSize: 14, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
      rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 24 }, { background: on ? C.primary : '#D9D9D9', borderRadius: 12 }, '开关'),
    ],
    { widthMode: 'FILL', gap: 12, padding: [12, 0, 12, 0], align: 'CENTER' },
  );
}

function settingsPage(): UIPage {
  return makePage(
    '08 设置',
    [
      navbar('设置'),
      body([
        card('账号', [
          hstack('昵称', [txt('昵称', { fontSize: 14, color: C.text }), txt('旅行的青蛙', { fontSize: 14, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL', padding: [12, 0, 12, 0] }),
          hstack('手机号', [txt('手机号', { fontSize: 14, color: C.text }), txt('138****8888', { fontSize: 14, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL', padding: [12, 0, 12, 0] }),
        ], { padding: [4, 14, 4, 14] }),
        card('通知', [switchRow('推送通知', true), switchRow('短信通知', false), switchRow('声音', true)], { padding: [4, 14, 4, 14] }),
        card('其他', [switchRow('深色模式', false), switchRow('自动更新', true)], { padding: [4, 14, 4, 14] }),
        button('退出登录', { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 46, align: 'CENTER', justify: 'CENTER' }, { background: '#FFFFFF', color: C.price, fontSize: 15, fontWeight: 600, borderRadius: 10, textAlign: 'center' }),
      ], { gap: 16 }),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 09 Dashboard ---------- */
function statCard(label: string, value: string, delta: string, color: string): Spec {
  return frame(
    label,
    [
      txt(label, { fontSize: 12, color: C.faint }),
      txt(value, { fontSize: 22, fontWeight: 700, color: C.text }),
      txt(delta, { fontSize: 11, color }),
    ],
    { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 6, padding: [14, 12, 14, 12] },
    { background: C.card, borderRadius: 12 },
  );
}

function dashboardPage(): UIPage {
  const bars = [40, 72, 55, 90, 64, 110, 84];
  return makePage(
    '09 Dashboard',
    [
      frame(
        '顶栏',
        [txt('数据看板', { fontSize: 18, fontWeight: 700, color: '#FFFFFF' }), txt('10月1日', { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'right' }, { widthMode: 'FILL' })],
        { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 96, padding: [40, 16, 16, 16], justify: 'SPACE_BETWEEN', align: 'END' },
        { background: C.dark },
      ),
      body([
        hstack('统计', [statCard('访问量', '12,480', '+12.4%', C.success), statCard('订单数', '326', '+3.2%', C.success), statCard('转化率', '4.8%', '-0.6%', C.price)], { gap: 10, widthMode: 'FILL', align: 'START' }),
        card('趋势', [
          txt('近 7 日访问', { fontSize: 14, fontWeight: 600, color: C.text }),
          hstack(
            '柱状图',
            bars.map((h, i) => rect({ widthMode: 'FILL', heightMode: 'FIXED', height: h }, { background: i === bars.length - 1 ? C.primary : '#B7D4FF', borderRadius: [4, 4, 0, 0] }, `bar-${i}`)),
            { gap: 8, widthMode: 'FILL', heightMode: 'FIXED', height: 130, align: 'END', padding: [0, 0, 0, 0] },
          ),
          hstack('周', ['一', '二', '三', '四', '五', '六', '日'].map((d) => txt(d, { fontSize: 10, color: C.faint, textAlign: 'center' }, { widthMode: 'FILL' })), { widthMode: 'FILL', gap: 8 }),
        ]),
        card('快捷入口', [hstack('图标', ['报表', '会员', '库存', '营销'].map((t) => vstack(t, [rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 44 }, { background: '#E6F4FF', borderRadius: 12 }), txt(t, { fontSize: 11, color: C.dim, textAlign: 'center' }, { widthMode: 'FILL' })], { gap: 6, widthMode: 'FILL', align: 'CENTER' })), { widthMode: 'FILL', gap: 8 })]),
      ], { gap: 14 }),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 10 表单页 ---------- */
function formPage(): UIPage {
  const area = (label: string, height: number, placeholder: string): Spec =>
    vstack(label, [txt(label, { fontSize: 13, fontWeight: 600, color: C.text }), rect({ widthMode: 'FILL', heightMode: 'FIXED', height, padding: [10, 10, 10, 10] }, { background: '#F7F8FA', borderRadius: 8, border: { width: 1, color: C.line, style: 'solid' } }, placeholder)], { gap: 6, widthMode: 'FILL' });

  return makePage(
    '10 表单页',
    [
      navbar('意见反馈'),
      body([
        vstack('字段', [
          area('问题类型', 44, '请选择问题类型'),
          area('问题描述', 120, '请详细描述你遇到的问题'),
          area('期望结果', 80, '你希望如何解决？'),
        ], { gap: 16, widthMode: 'FILL' }),
        hstack('截图', [
          rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 76, height: 76 }, { background: '#F2F3F5', borderRadius: 8, border: { width: 1, color: C.line, style: 'dashed' } }),
          rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 76, height: 76 }, { background: '#F2F3F5', borderRadius: 8, border: { width: 1, color: C.line, style: 'dashed' } }),
        ], { gap: 10, widthMode: 'FILL' }),
        hstack('联系方式', [txt('联系方式', { fontSize: 13, fontWeight: 600, color: C.text }), txt('138****8888', { fontSize: 13, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
        fillBtn('提交反馈'),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 11 Card 列表 ---------- */
function articleCard(tag: string, title: string, excerpt: string): Spec {
  return card(
    title,
    [
      hstack(
        '标签行',
        [
          txt(tag, { fontSize: 10, color: '#FFFFFF', textAlign: 'center' }, { widthMode: 'HUG', heightMode: 'HUG', padding: [3, 8, 3, 8] }),
          txt('2 小时前', { fontSize: 11, color: C.faint, textAlign: 'right' }, { widthMode: 'FILL' }),
        ],
        { widthMode: 'FILL', gap: 8, align: 'CENTER' },
        { background: 'transparent', borderRadius: 0 },
      ),
      txt(title, { fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 21 }, { widthMode: 'FILL' }),
      txt(excerpt, { fontSize: 12, color: C.dim, lineHeight: 18 }, { widthMode: 'FILL' }),
      hstack('作者行', [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 20, height: 20 }, { background: '#D6E4FF', borderRadius: 10 }),
        txt('作者名', { fontSize: 11, color: C.faint }),
        txt('👍 128', { fontSize: 11, color: C.faint, textAlign: 'right' }, { widthMode: 'FILL' }),
      ], { gap: 6, widthMode: 'FILL', align: 'CENTER' }),
    ],
    { gap: 8 },
  );
}

function articleListPage(): UIPage {
  return makePage(
    '11 Card 列表',
    [
      navbar('资讯'),
      hstack('分类', ['推荐', '热门', '科技', '设计'].map((t, i) => txt(t, { fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? C.primary : C.dim }, { widthMode: 'HUG', heightMode: 'HUG', padding: [6, 12, 6, 12] })), { gap: 4, padding: [10, 16, 10, 16], widthMode: 'FILL' }, { background: C.card }),
      body([
        articleCard('科技', '结构化 UI 编译的工程实践', '如何把设计数据编译成高还原前端代码，本文给出完整链路与踩坑记录。'),
        articleCard('设计', 'Auto Layout 与 Flex 的映射表', '把设计工具的布局语义无损映射到 CSS，是还原度的关键所在。'),
        articleCard('科技', 'Pixel Diff 驱动的自动修复', '用像素级对比定位布局误差，再回写编译器参数。'),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 12 Tab 页面 ---------- */
function tabPage(): UIPage {
  const tab = (icon: string, label: string, active: boolean): Spec =>
    vstack(label, [txt(icon, { fontSize: 18, color: active ? C.primary : C.faint, textAlign: 'center' }, { widthMode: 'FILL' }), txt(label, { fontSize: 10, color: active ? C.primary : C.faint, textAlign: 'center' }, { widthMode: 'FILL' })], { gap: 2, widthMode: 'FILL', align: 'CENTER' });

  return makePage(
    '12 Tab 页面',
    [
      navbar('发现'),
      body([
        hstack('分段控件', ['关注', '推荐', '热榜'].map((t, i) => frame(t, [txt(t, { fontSize: 13, fontWeight: i === 1 ? 600 : 400, color: i === 1 ? '#FFFFFF' : C.dim, textAlign: 'center' })], { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 34, align: 'CENTER', justify: 'CENTER' }, { background: i === 1 ? C.primary : '#F2F3F5', borderRadius: 17 })), { gap: 8, widthMode: 'FILL' }),
        card('内容1', [txt('为你推荐', { fontSize: 15, fontWeight: 600, color: C.text }), txt('这里是推荐内容的正文，展示多行文本的排版效果。', { fontSize: 13, color: C.dim, lineHeight: 20 }, { widthMode: 'FILL' })]),
        card('内容2', [txt('热门讨论', { fontSize: 15, fontWeight: 600, color: C.text }), txt('这里是热门讨论的正文内容，同样支持自动换行。', { fontSize: 13, color: C.dim, lineHeight: 20 }, { widthMode: 'FILL' })]),
      ]),
      hstack('底部标签栏', [tab('⌂', '首页', true), tab('◎', '发现', false), tab('＋', '发布', false), tab('☺', '我的', false)], { padding: [8, 8, 24, 8], widthMode: 'FILL', gap: 0, justify: 'SPACE_BETWEEN' }, { background: C.card, boxShadow: '0 -2 12 rgba(0,0,0,0.06)' }),
    ],
    { rootLayout: { justify: 'SPACE_BETWEEN' }, rootStyle: { background: C.bg } },
  );
}

/* ---------- 13 Navbar + 绝对定位 ---------- */
function absolutePage(): UIPage {
  return makePage(
    '13 绝对定位页',
    [
      frame(
        '海报',
        [
          rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 420, x: 0, y: 0 }, { fills: [{ type: 'GRADIENT_LINEAR', angle: 70, stops: [{ position: 0, color: C.primary }, { position: 1, color: '#7c5cff' }] }] as FillLayer[] }, '背景'),
          frame(
            '文案',
            [
              txt('SPRING SALE', { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }),
              txt('春季大促', { fontSize: 34, fontWeight: 700, color: '#FFFFFF' }),
              txt('全场 5 折起', { fontSize: 16, color: 'rgba(255,255,255,0.95)' }),
            ],
            { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG', gap: 8, x: 24, y: 140 },
          ),
          rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 84, height: 84, x: 267, y: 60 }, { background: '#FFD666', borderRadius: 42 }, '装饰圆'),
          txt('限时\n折扣', { fontSize: 14, fontWeight: 700, color: '#7A4E00', textAlign: 'center', lineHeight: 18 }, { widthMode: 'FIXED', heightMode: 'HUG', x: 279, y: 82 }),
          button('立即抢购', { mode: 'HORIZONTAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 327, height: 50, x: 24, y: 340, align: 'CENTER', justify: 'CENTER' }, { background: '#FFFFFF', color: C.primary, fontSize: 16, fontWeight: 700, borderRadius: 25, textAlign: 'center' }),
        ],
        { mode: 'ABSOLUTE', widthMode: 'FILL', heightMode: 'FIXED', height: 420, padding: [0, 0, 0, 0] },
      ),
      body([
        txt('活动说明', { fontSize: 16, fontWeight: 700, color: C.text }),
        txt('1. 活动时间：10 月 1 日 - 10 月 7 日；2. 每位用户限领 3 张优惠券；3. 优惠券不可叠加使用；4. 最终解释权归平台所有。', { fontSize: 13, color: C.dim, lineHeight: 21 }, { widthMode: 'FILL' }),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 14 长文本页 ---------- */
function longTextPage(): UIPage {
  return makePage(
    '14 长文本页面',
    [
      navbar('文章'),
      body([
        txt('把设计稿编译成可维护的前端代码', { fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 30 }, { widthMode: 'FILL' }),
        hstack('元信息', [txt('UI Compiler 团队', { fontSize: 12, color: C.dim }), txt('2026-10-01', { fontSize: 12, color: C.faint, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 160 }, { background: '#E8EAED', borderRadius: 10 }, '头图'),
        txt(
          '传统截图转代码方案依赖视觉猜测，生成的布局往往在间距与响应式上不稳定。结构化 UI 编译把设计数据先解析为统一的 UI AST，再交给确定性的 Layout Compiler 处理位置、尺寸与伸缩关系，最后由 Code Generator 输出目标框架代码。这条链路里的每一步都可测试、可回归，Pixel Diff 则提供像素级的验收标准。',
          { fontSize: 14, color: C.text, lineHeight: 24 },
          { widthMode: 'FILL' },
        ),
        txt(
          '更重要的是，编译器输出的 CSS 是响应式的：设计稿中的固定宽度如果恰好等于父级内容宽度，会自动转换为 100%，页面在 375 / 414 / 768 等视口下都能保持合理布局。',
          { fontSize: 14, color: C.text, lineHeight: 24 },
          { widthMode: 'FILL' },
        ),
        fillBtn('阅读原文'),
      ], { gap: 14 }),
    ],
    { rootStyle: { background: '#FFFFFF' } },
  );
}

/* ---------- 15 图片密集 ---------- */
function imageGridPage(): UIPage {
  const cell = (): Spec => image({ widthMode: 'FILL', heightMode: 'FIXED', height: 96, padding: [0, 0, 0, 0] }, { background: '#E8EAED', borderRadius: 8 });
  return makePage(
    '15 图片密集页面',
    [
      navbar('相册'),
      body([
        hstack('行1', [cell(), cell(), cell()], { gap: 8, widthMode: 'FILL' }),
        hstack('行2', [cell(), cell(), cell()], { gap: 8, widthMode: 'FILL' }),
        hstack('行3', [cell(), cell(), cell()], { gap: 8, widthMode: 'FILL' }),
        hstack('行4', [cell(), cell(), cell()], { gap: 8, widthMode: 'FILL' }),
        hstack('统计', [txt('共 12 张', { fontSize: 12, color: C.faint }), txt('已选 0', { fontSize: 12, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
        fillBtn('上传照片', { background: C.primary }),
      ], { gap: 10 }),
    ],
    { rootStyle: { background: C.bg } },
  );
}

/* ---------- 16 多层嵌套 ---------- */
function nestedPage(): UIPage {
  return makePage(
    '16 多层嵌套页面',
    [
      navbar('嵌套布局'),
      body([
        card(
          'L1',
          [
            txt('L1 容器（padding 16 / gap 12）', { fontSize: 13, fontWeight: 600, color: C.text }),
            frame(
              'L2',
              [
                txt('L2 容器（横向 / gap 10）', { fontSize: 12, fontWeight: 600, color: C.primary }),
                frame('L3a', [txt('L3-A', { fontSize: 12, color: '#FFFFFF', textAlign: 'center' })], { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 60, padding: [10, 8, 10, 8], align: 'CENTER', justify: 'CENTER' }, { background: C.primary, borderRadius: 8 }),
                frame('L3b', [txt('L3-B', { fontSize: 12, color: '#FFFFFF', textAlign: 'center' })], { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FIXED', height: 60, padding: [10, 8, 10, 8], align: 'CENTER', justify: 'CENTER' }, { background: '#7c5cff', borderRadius: 8 }),
              ],
              { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, padding: [12, 12, 12, 12], align: 'CENTER' },
              { background: '#F0F5FF', borderRadius: 10 },
            ),
            frame(
              'L2b',
              [
                txt('L2 纵向子容器（stretch 对齐）', { fontSize: 12, color: C.dim }),
                hstack('L3c', [txt('左', { fontSize: 12, color: C.text }), txt('右', { fontSize: 12, color: C.text, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL', padding: [8, 10, 8, 10] }, { background: '#FFF7E6', borderRadius: 6 }),
              ],
              { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8, padding: [12, 12, 12, 12], align: 'STRETCH' },
              { background: '#FFFBE6', borderRadius: 10 },
            ),
          ],
          { gap: 12 },
        ),
        hstack('底部', [txt('嵌套结束', { fontSize: 12, color: C.faint }), txt('fixed/fill/hug 混合', { fontSize: 12, color: C.dim, textAlign: 'right' }, { widthMode: 'FILL' })], { justify: 'SPACE_BETWEEN', widthMode: 'FILL' }),
      ]),
    ],
    { rootStyle: { background: C.bg } },
  );
}

export function allDemoPages(): UIPage[] {
  resetDemoSeq();
  return [
    loginPage(),
    registerPage(),
    productListPage(),
    productDetailPage(),
    orderListPage(),
    orderDetailPage(),
    profilePage(),
    settingsPage(),
    dashboardPage(),
    formPage(),
    articleListPage(),
    tabPage(),
    absolutePage(),
    longTextPage(),
    imageGridPage(),
    nestedPage(),
  ];
}

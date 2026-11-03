<script>
export default {
  onLaunch() {
    // 静态 UI 工程：不拉数据、不初始化状态
  },
}
</script>

<style>
page, body { margin: 0; padding: 0; }
page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}
.ui-image-placeholder {
  --ph-tint: linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 100%);
  background-color: #ececf1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a8a8b4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='16' rx='2'/><circle cx='8.5' cy='9.5' r='1.5'/><path d='M21 15l-5-5L5 20'/></svg>"), linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 55%), var(--ph-tint);
  background-repeat: no-repeat, no-repeat, no-repeat;
  background-position: center, center, center;
  background-size: 24px 24px, cover, cover;
}
.ui-image-ph-hero-142 { --ph-tint: linear-gradient(152deg, hsl(142 52% 86%) 0%, hsl(174 48% 68%) 100%); }
.ui-image-ph-hero-353 { --ph-tint: linear-gradient(152deg, hsl(353 52% 86%) 0%, hsl(25 48% 68%) 100%); }
.ui-image-ph-hero-276 { --ph-tint: linear-gradient(152deg, hsl(276 52% 86%) 0%, hsl(308 48% 68%) 100%); }
.ui-image-ph-hero-93 { --ph-tint: linear-gradient(152deg, hsl(93 52% 86%) 0%, hsl(125 48% 68%) 100%); }
.ui-image-ph-hero-274 { --ph-tint: linear-gradient(152deg, hsl(274 52% 86%) 0%, hsl(306 48% 68%) 100%); }
.ui-image-ph-hero-146 { --ph-tint: linear-gradient(152deg, hsl(146 52% 86%) 0%, hsl(178 48% 68%) 100%); }

</style>

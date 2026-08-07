// Giscus 评论配置：将站点发布到公开 GitHub 仓库并启用 Discussions 后，填入真实值。
// 生成配置：https://giscus.app/
// 步骤：1) 在 GitHub 创建公开仓库并开启 Discussions；
//       2) 安装 giscus app 到该仓库；
//       3) 用 https://giscus.app/ 按站点域名生成 repo / repoId / category / categoryId；
//       4) 填入下方常量。
// 配置留空（占位）时，评论区域显示提示文案，不渲染评论 iframe。
export const GISCUS_CONFIG = {
  repo: '', // 如 'your-name/your-repo'
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  mapping: 'pathname',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'bottom',
  lang: 'zh-CN',
  theme: 'dark', // 站点为暗色主题
}

export const giscusConfigured = Boolean(
  GISCUS_CONFIG.repo && GISCUS_CONFIG.repoId && GISCUS_CONFIG.categoryId
)

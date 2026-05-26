import type { Commit, OpenRepo, Branch } from '../types/git'
import { useRepoStore } from '../stores/repo'

function shortHash(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

interface RawCommit {
  hash: string
  parents: string[]
  author: string
  time: string
  committer_time?: string
  msg: string
  refs?: { name: string; type: 'local' | 'remote' | 'tag'; isHead?: boolean }[]
}

const COMMITS_RAW: RawCommit[] = [
  // ===== 拓扑序：新→旧（git log --topo-order），子提交在父提交前 =====

  // --- HEAD ---
  { hash: 'h001', parents: ['h002', 'm099'], author: 'Alice', time: '2026-05-15 10:00:00 +0800', msg: "Merge branch 'master' into main", refs: [{ name: 'main', type: 'local', isHead: true }, { name: 'origin/main', type: 'remote' }] },

  // --- main: h002 → h009 ---
  { hash: 'h002', parents: ['h003'], author: 'Bob', time: '2026-05-14 15:30:00 +0800', msg: '重构微服务架构为事件驱动模式' },
  { hash: 'h003', parents: ['h004'], author: 'Alice', time: '2026-05-13 09:20:00 +0800', msg: '实现全局状态管理重构' },
  { hash: 'h004', parents: ['h005'], author: 'Charlie', time: '2026-05-12 14:45:00 +0800', msg: '新增实时数据同步模块' },
  { hash: 'h005', parents: ['h006', 'sc010'], author: 'Bob', time: '2026-05-11 11:10:00 +0800', msg: "Merge branch 'feature/shopping-cart' into main" },
  { hash: 'h006', parents: ['h007'], author: 'Alice', time: '2026-05-10 16:00:00 +0800', msg: '优化数据库查询性能' },
  { hash: 'h007', parents: ['h008'], author: 'Charlie', time: '2026-05-09 10:30:00 +0800', msg: '实现API版本控制机制' },
  { hash: 'h008', parents: ['h009'], author: 'Bob', time: '2026-05-08 14:20:00 +0800', msg: '添加单元测试覆盖率报告' },
  { hash: 'h009', parents: ['h010', 'hp002'], author: 'Alice', time: '2026-05-07 09:00:00 +0800', msg: "Merge branch 'hotfix/css-regression' into main", refs: [{ name: 'tag: v2.0.0', type: 'tag' }] },

  // --- hotfix/css-regression (从h010分出，在h009合入) ---
  { hash: 'hp002', parents: ['hp001'], author: 'Nick', time: '2026-05-06 14:15:00 +0800', msg: 'fix(css): 修复Chrome新版本样式错乱', refs: [{ name: 'hotfix/css-regression', type: 'local' }, { name: 'origin/hotfix/css-regression', type: 'remote' }] },
  { hash: 'hp001', parents: ['h010'], author: 'Olivia', time: '2026-05-05 09:50:00 +0800', msg: 'fix(css): 从main拉取hotfix分支' },

  // --- feature/shopping-cart v2.0 (从sc008分出，在h005合入) ---
  { hash: 'sc010', parents: ['sc009'], author: 'Jack', time: '2026-05-10 14:30:00 +0800', msg: 'feat(cart): 智能推荐算法' },
  { hash: 'sc009', parents: ['sc008'], author: 'Karen', time: '2026-05-09 09:45:00 +0800', msg: 'feat(cart): 跨设备购物车同步' },

  // --- master: m099 → m081 (在h001之前展示，因为m099是h001的第二父母) ---
  { hash: 'm099', parents: ['m098', 'h021'], author: 'Dave', time: '2026-05-15 09:30:00 +0800', msg: "Merge branch 'main' into master", refs: [{ name: 'master', type: 'local' }, { name: 'origin/master', type: 'remote' }] },
  { hash: 'm098', parents: ['m097'], author: 'Dave', time: '2026-05-14 14:00:00 +0800', msg: 'master: 兼容旧版IE浏览器' },
  { hash: 'm097', parents: ['m096'], author: 'Eve', time: '2026-05-13 09:15:00 +0800', msg: 'master: 修复Safari兼容性问题' },
  { hash: 'm096', parents: ['m095', 'h018'], author: 'Dave', time: '2026-05-07 14:30:00 +0800', msg: "Merge branch 'main' into master" },
  { hash: 'm095', parents: ['m094'], author: 'Eve', time: '2026-05-06 10:20:00 +0800', msg: 'master: 回退不稳定的依赖版本' },
  { hash: 'm094', parents: ['m093'], author: 'Dave', time: '2026-05-05 15:45:00 +0800', msg: 'master: 添加polyfill支持' },
  { hash: 'm093', parents: ['m092', 'h011'], author: 'Eve', time: '2026-04-28 14:10:00 +0800', msg: "Merge branch 'main' into master" },
  { hash: 'm092', parents: ['m091'], author: 'Dave', time: '2026-04-27 09:35:00 +0800', msg: 'master: 修复Firefox渲染异常' },
  { hash: 'm091', parents: ['m090'], author: 'Eve', time: '2026-04-26 15:20:00 +0800', msg: 'master: 添加降级方案文档' },
  { hash: 'm090', parents: ['m089', 'h040'], author: 'Dave', time: '2026-04-06 14:50:00 +0800', msg: "Merge branch 'main' into master", refs: [{ name: 'tag: v1.0.0-stable', type: 'tag' }] },
  { hash: 'm089', parents: ['m088'], author: 'Eve', time: '2026-04-05 10:25:00 +0800', msg: 'master: v1.0稳定版预发布检查' },
  { hash: 'm088', parents: ['m087'], author: 'Dave', time: '2026-04-04 15:40:00 +0800', msg: 'master: 运行全量回归测试' },
  { hash: 'm087', parents: ['m086'], author: 'Eve', time: '2026-04-03 09:50:00 +0800', msg: 'master: 更新变更日志' },
  { hash: 'm086', parents: ['m085', 'hs002'], author: 'Dave', time: '2026-04-10 14:20:00 +0800', msg: "Merge branch 'hotfix/security-patch' into master" },
  { hash: 'm085', parents: ['m084'], author: 'Eve', time: '2026-04-09 10:10:00 +0800', msg: 'master: 安全审计通过' },
  { hash: 'm084', parents: ['m083'], author: 'Dave', time: '2026-04-08 15:30:00 +0800', msg: 'master: 更新安全策略文档' },
  { hash: 'm083', parents: ['m082'], author: 'Eve', time: '2026-04-07 09:20:00 +0800', msg: 'master: 紧急补丁准备就绪' },
  { hash: 'm082', parents: ['m081', 'h061'], author: 'Dave', time: '2026-03-16 14:00:00 +0800', msg: "Merge branch 'main' into master" },
  { hash: 'm081', parents: [], author: 'Eve', time: '2026-03-15 10:30:00 +0800', msg: 'master: 创建长期维护分支' },

  // --- main: h010 → h018 (m096/m093合并的区间) ---
  { hash: 'h010', parents: ['h011'], author: 'Charlie', time: '2026-05-06 15:40:00 +0800', msg: '实现用户权限细粒度控制' },
  { hash: 'h011', parents: ['h012'], author: 'Bob', time: '2026-05-05 11:25:00 +0800', msg: '新增国际化支持框架' },
  { hash: 'h012', parents: ['h013'], author: 'Alice', time: '2026-05-04 16:50:00 +0800', msg: '实现日志聚合与分析系统' },
  { hash: 'h013', parents: ['h014'], author: 'Charlie', time: '2026-05-03 10:15:00 +0800', msg: '优化前端打包体积减少40%' },
  { hash: 'h014', parents: ['h015'], author: 'Bob', time: '2026-05-02 14:35:00 +0800', msg: '实现配置中心热更新' },
  { hash: 'h015', parents: ['h016'], author: 'Alice', time: '2026-05-01 09:45:00 +0800', msg: '添加性能监控Dashboard' },
  { hash: 'h016', parents: ['h017'], author: 'Charlie', time: '2026-04-30 15:20:00 +0800', msg: '实现灰度发布功能' },
  { hash: 'h017', parents: ['h018'], author: 'Bob', time: '2026-04-29 11:00:00 +0800', msg: '新增消息队列集成' },
  { hash: 'h018', parents: ['h019'], author: 'Alice', time: '2026-04-28 16:10:00 +0800', msg: '实现缓存一致性保障' },

  // --- main: h019 → h030 (m099第二父母h021的上游) ---
  { hash: 'h019', parents: ['h020'], author: 'Charlie', time: '2026-04-27 10:50:00 +0800', msg: '添加自动化部署流水线' },
  { hash: 'h020', parents: ['h021'], author: 'Bob', time: '2026-04-26 14:00:00 +0800', msg: '实现服务网格基础架构' },
  { hash: 'h021', parents: ['h022'], author: 'Alice', time: '2026-04-25 09:30:00 +0800', msg: 'v2.0 核心功能开发完成' },
  { hash: 'h022', parents: ['h023', 'pm008'], author: 'Bob', time: '2026-04-24 15:15:00 +0800', msg: "Merge branch 'feature/payment' into main", refs: [{ name: 'tag: v1.1.0', type: 'tag' }] },
  { hash: 'h023', parents: ['h024'], author: 'Alice', time: '2026-04-23 10:40:00 +0800', msg: '实现搜索功能优化' },
  { hash: 'h024', parents: ['h025'], author: 'Charlie', time: '2026-04-22 14:55:00 +0800', msg: '添加批量操作功能' },
  { hash: 'h025', parents: ['h026'], author: 'Bob', time: '2026-04-21 11:20:00 +0800', msg: '优化移动端适配' },
  { hash: 'h026', parents: ['h027'], author: 'Alice', time: '2026-04-20 16:30:00 +0800', msg: '实现通知系统' },
  { hash: 'h027', parents: ['h028'], author: 'Charlie', time: '2026-04-19 10:10:00 +0800', msg: '添加数据导出功能' },
  { hash: 'h028', parents: ['h029'], author: 'Bob', time: '2026-04-18 14:45:00 +0800', msg: '实现文件上传组件' },
  { hash: 'h029', parents: ['h030'], author: 'Alice', time: '2026-04-17 09:55:00 +0800', msg: 'v1.1 基础功能完成' },
  { hash: 'h030', parents: ['h031', 'ua010'], author: 'Charlie', time: '2026-04-16 15:25:00 +0800', msg: "Merge branch 'feature/user-auth' into main" },

  // --- main: h031 → h036 ---
  { hash: 'h031', parents: ['h032'], author: 'Bob', time: '2026-04-15 11:35:00 +0800', msg: '修复列表页分页bug' },
  { hash: 'h032', parents: ['h033'], author: 'Alice', time: '2026-04-14 16:40:00 +0800', msg: '优化表单验证逻辑' },
  { hash: 'h033', parents: ['h034'], author: 'Charlie', time: '2026-04-13 10:20:00 +0800', msg: '添加暗色主题支持' },
  { hash: 'h034', parents: ['h035'], author: 'Bob', time: '2026-04-12 14:15:00 +0800', msg: '实现响应式布局调整' },
  { hash: 'h035', parents: ['h036'], author: 'Alice', time: '2026-04-11 09:45:00 +0800', msg: 'v1.1 UI改进完成' },
  { hash: 'h036', parents: ['h037', 'hs003'], author: 'Charlie', time: '2026-04-10 15:50:00 +0800', msg: "Merge branch 'hotfix/security-patch' into main", refs: [{ name: 'tag: v1.0.1', type: 'tag' }] },

  // --- hotfix/security-patch (从h040分出，在h036/m086合入) ---
  { hash: 'hs003', parents: ['hs002'], author: 'Leo', time: '2026-04-09 14:30:00 +0800', msg: 'fix(security): 升级依赖修复XSS漏洞', refs: [{ name: 'hotfix/security-patch', type: 'local' }, { name: 'origin/hotfix/security-patch', type: 'remote' }] },
  { hash: 'hs002', parents: ['hs001'], author: 'Mia', time: '2026-04-08 10:00:00 +0800', msg: 'fix(security): SQL注入防护加强' },
  { hash: 'hs001', parents: ['h040'], author: 'Leo', time: '2026-04-07 15:20:00 +0800', msg: 'fix(security): 从v1.0.0拉取hotfix分支' },

  // --- main: h037 → h040 (v1.0正式版) ---
  { hash: 'h037', parents: ['h038'], author: 'Bob', time: '2026-04-09 11:10:00 +0800', msg: '修复生产环境内存泄漏' },
  { hash: 'h038', parents: ['h039'], author: 'Alice', time: '2026-04-08 16:25:00 +0800', msg: '优化首页加载速度' },
  { hash: 'h039', parents: ['h040'], author: 'Charlie', time: '2026-04-07 10:30:00 +0800', msg: 'v1.0 发布后首次迭代' },
  { hash: 'h040', parents: ['h041', 'sc008'], author: 'Bob', time: '2026-04-06 14:20:00 +0800', msg: "Merge branch 'feature/shopping-cart' into main", refs: [{ name: 'tag: v1.0.0', type: 'tag' }] },
  { hash: 'h041', parents: ['h042', 'pm006'], author: 'Alice', time: '2026-04-05 09:50:00 +0800', msg: "Merge branch 'feature/payment' into main" },
  { hash: 'h042', parents: ['h043', 'ua008'], author: 'Charlie', time: '2026-04-04 15:35:00 +0800', msg: "Merge branch 'feature/user-auth' into main" },
  { hash: 'h043', parents: ['h044'], author: 'Bob', time: '2026-04-03 11:20:00 +0800', msg: '完成v1.0 RC测试修复' },
  { hash: 'h044', parents: ['h045'], author: 'Alice', time: '2026-04-02 16:40:00 +0800', msg: '集成测试通过' },
  { hash: 'h045', parents: ['h046'], author: 'Charlie', time: '2026-04-01 10:15:00 +0800', msg: 'v1.0 Release Candidate准备' },
  { hash: 'h046', parents: ['h047'], author: 'Bob', time: '2026-03-31 14:50:00 +0800', msg: '修复关键路径性能问题' },
  { hash: 'h047', parents: ['h048'], author: 'Alice', time: '2026-03-30 09:25:00 +0800', msg: '完善错误处理机制' },
  { hash: 'h048', parents: ['h049'], author: 'Charlie', time: '2026-03-29 15:10:00 +0800', msg: '添加健康检查端点' },
  { hash: 'h049', parents: ['h050'], author: 'Bob', time: '2026-03-28 11:40:00 +0800', msg: '实现配置文件热加载' },
  { hash: 'h050', parents: ['h051'], author: 'Alice', time: '2026-03-27 16:05:00 +0800', msg: '优化数据库连接池' },
  { hash: 'h051', parents: ['h052'], author: 'Charlie', time: '2026-03-26 10:30:00 +0800', msg: 'v1.0 Beta功能完善' },
  { hash: 'h052', parents: ['h053'], author: 'Bob', time: '2026-03-25 14:20:00 +0800', msg: '实现用户反馈收集' },
  { hash: 'h053', parents: ['h054'], author: 'Alice', time: '2026-03-24 09:45:00 +0800', msg: '添加使用引导教程' },
  { hash: 'h054', parents: ['h055'], author: 'Charlie', time: '2026-03-23 15:55:00 +0800', msg: 'v1.0 Beta发布' },

  // --- feature/shopping-cart v1.0 (从h057分出，在h040合入) ---
  { hash: 'sc008', parents: ['sc007'], author: 'Jack', time: '2026-04-05 15:10:00 +0800', msg: 'feat(cart): 购物车功能完成', refs: [{ name: 'feature/shopping-cart', type: 'local' }, { name: 'origin/feature/shopping-cart', type: 'remote' }] },
  { hash: 'sc007', parents: ['sc006'], author: 'Karen', time: '2026-04-04 10:25:00 +0800', msg: 'feat(cart): 库存校验逻辑' },
  { hash: 'sc006', parents: ['sc005'], author: 'Jack', time: '2026-04-03 14:45:00 +0800', msg: 'feat(cart): 优惠券计算引擎' },
  { hash: 'sc005', parents: ['sc004'], author: 'Karen', time: '2026-04-02 09:50:00 +0800', msg: 'feat(cart): 商品数量增减' },
  { hash: 'sc004', parents: ['sc003'], author: 'Jack', time: '2026-04-01 15:30:00 +0800', msg: 'feat(cart): 购物车本地持久化' },
  { hash: 'sc003', parents: ['sc002'], author: 'Karen', time: '2026-03-31 10:15:00 +0800', msg: 'feat(cart): 购物车列表展示' },
  { hash: 'sc002', parents: ['sc001'], author: 'Jack', time: '2026-03-30 14:20:00 +0800', msg: 'feat(cart): 数据模型定义' },
  { hash: 'sc001', parents: ['h057'], author: 'Karen', time: '2026-03-29 09:40:00 +0800', msg: 'feat(cart): 创建shopping-cart分支' },

  // --- feature/user-auth v1.1 (从ua008分出，在h030合入) ---
  { hash: 'ua010', parents: ['ua009'], author: 'Frank', time: '2026-04-15 14:50:00 +0800', msg: 'feat(auth): 添加MFA双因素认证' },
  { hash: 'ua009', parents: ['ua008'], author: 'Grace', time: '2026-04-14 10:15:00 +0800', msg: 'feat(auth): 实现SSO单点登录' },

  // --- feature/user-auth v1.0 (从h055分出，在h042合入) ---
  { hash: 'ua008', parents: ['ua007'], author: 'Frank', time: '2026-04-03 15:00:00 +0800', msg: 'feat(auth): 完成OAuth2.0集成', refs: [{ name: 'feature/user-auth', type: 'local' }, { name: 'origin/feature/user-auth', type: 'remote' }] },
  { hash: 'ua007', parents: ['ua006'], author: 'Grace', time: '2026-04-02 10:30:00 +0800', msg: 'feat(auth): 实现JWT token刷新' },
  { hash: 'ua006', parents: ['ua005'], author: 'Frank', time: '2026-04-01 14:20:00 +0800', msg: 'feat(auth): 添加角色权限中间件' },
  { hash: 'ua005', parents: ['ua004'], author: 'Grace', time: '2026-03-31 09:45:00 +0800', msg: 'feat(auth): 实现密码加密存储' },
  { hash: 'ua004', parents: ['ua003'], author: 'Frank', time: '2026-03-30 15:10:00 +0800', msg: 'feat(auth): 用户注册表单验证' },
  { hash: 'ua003', parents: ['ua002'], author: 'Grace', time: '2026-03-29 10:25:00 +0800', msg: 'feat(auth): 登录页面UI实现' },
  { hash: 'ua002', parents: ['ua001'], author: 'Frank', time: '2026-03-28 14:40:00 +0800', msg: 'feat(auth): 设计认证数据模型' },
  { hash: 'ua001', parents: ['h055'], author: 'Grace', time: '2026-03-27 09:30:00 +0800', msg: 'feat(auth): 创建user-auth分支' },

  // --- main: h055 → h057 (feature分支的出发点上游) ---
  { hash: 'h055', parents: ['h056'], author: 'Bob', time: '2026-03-22 11:15:00 +0800', msg: '实现基础CRUD接口' },

  // --- feature/payment v1.1 (从pm006分出，在h022合入) ---
  { hash: 'pm008', parents: ['pm007'], author: 'Henry', time: '2026-04-23 14:00:00 +0800', msg: 'feat(payment): 添加退款功能' },
  { hash: 'pm007', parents: ['pm006'], author: 'Ivy', time: '2026-04-22 09:35:00 +0800', msg: 'feat(payment): 对账单导出功能' },

  // --- feature/payment v1.0 (从h056分出，在h041合入) ---
  { hash: 'pm006', parents: ['pm005'], author: 'Henry', time: '2026-04-04 14:30:00 +0800', msg: 'feat(payment): 支付流程完整实现', refs: [{ name: 'feature/payment', type: 'local' }, { name: 'origin/feature/payment', type: 'remote' }] },
  { hash: 'pm005', parents: ['pm004'], author: 'Ivy', time: '2026-04-03 09:50:00 +0800', msg: 'feat(payment): 集成支付宝SDK' },
  { hash: 'pm004', parents: ['pm003'], author: 'Henry', time: '2026-04-02 15:20:00 +0800', msg: 'feat(payment): 微信支付回调处理' },
  { hash: 'pm003', parents: ['pm002'], author: 'Ivy', time: '2026-04-01 10:40:00 +0800', msg: 'feat(payment): 订单状态机设计' },
  { hash: 'pm002', parents: ['pm001'], author: 'Henry', time: '2026-03-31 14:15:00 +0800', msg: 'feat(payment): 支付页面UI组件' },
  { hash: 'pm001', parents: ['h056'], author: 'Ivy', time: '2026-03-30 09:25:00 +0800', msg: 'feat(payment): 创建payment分支' },

  // --- main: h056 → h061 (根提交) ---
  { hash: 'h056', parents: ['h057'], author: 'Alice', time: '2026-03-21 16:30:00 +0800', msg: '搭建项目骨架与目录结构' },
  { hash: 'h057', parents: ['h058'], author: 'Charlie', time: '2026-03-20 10:40:00 +0800', msg: '初始化Vue3+Vite项目' },
  { hash: 'h058', parents: ['h059'], author: 'Bob', time: '2026-03-19 14:15:00 +0800', msg: '配置ESLint和Prettier' },
  { hash: 'h059', parents: ['h060'], author: 'Alice', time: '2026-03-18 09:50:00 +0800', msg: '设置Git工作流规范' },
  { hash: 'h060', parents: ['h061'], author: 'Charlie', time: '2026-03-17 15:25:00 +0800', msg: '创建README文档' },
  { hash: 'h061', parents: [], author: 'Bob', time: '2026-03-16 10:00:00 +0800', msg: 'Initial commit: 项目初始化' },
]

const idMap = new Map<string, string>()
COMMITS_RAW.forEach(c => {
  idMap.set(c.hash, shortHash())
})

export function generateMockCommits(): Commit[] {
  return COMMITS_RAW.map(c => ({
    id: idMap.get(c.hash) ?? c.hash,
    message: c.msg,
    author: c.author,
    author_email: `${c.author.toLowerCase()}@example.com`,
    time: Math.floor(new Date(c.time).getTime() / 1000),
    committer_time: Math.floor(new Date(c.committer_time ?? c.time).getTime() / 1000),
    parent_ids: c.parents.map(p => idMap.get(p) ?? p),
    refs: (c.refs ?? []).map(r => ({
      name: r.name,
      ref_type: r.type,
      is_head: r.isHead ?? false,
    })),
  }))
}

export function generateMockBranches(): Branch[] {
  const findId = (hash: string) => idMap.get(hash) ?? hash
  return [
    { name: 'main', is_remote: false, is_head: true, target_commit_id: findId('h001'), upstream: 'origin/main' },
    { name: 'master', is_remote: false, is_head: false, target_commit_id: findId('m099'), upstream: 'origin/master' },
    { name: 'feature/user-auth', is_remote: false, is_head: false, target_commit_id: findId('ua010'), upstream: 'origin/feature/user-auth' },
    { name: 'feature/payment', is_remote: false, is_head: false, target_commit_id: findId('pm008'), upstream: 'origin/feature/payment' },
    { name: 'feature/shopping-cart', is_remote: false, is_head: false, target_commit_id: findId('sc010'), upstream: 'origin/feature/shopping-cart' },
    { name: 'hotfix/security-patch', is_remote: false, is_head: false, target_commit_id: findId('hs003'), upstream: 'origin/hotfix/security-patch' },
    { name: 'hotfix/css-regression', is_remote: false, is_head: false, target_commit_id: findId('hp002'), upstream: 'origin/hotfix/css-regression' },
    { name: 'origin/main', is_remote: true, is_head: false, target_commit_id: findId('h001'), upstream: null },
    { name: 'origin/master', is_remote: true, is_head: false, target_commit_id: findId('m099'), upstream: null },
    { name: 'origin/feature/user-auth', is_remote: true, is_head: false, target_commit_id: findId('ua010'), upstream: null },
    { name: 'origin/feature/payment', is_remote: true, is_head: false, target_commit_id: findId('pm008'), upstream: null },
    { name: 'origin/feature/shopping-cart', is_remote: true, is_head: false, target_commit_id: findId('sc010'), upstream: null },
    { name: 'origin/hotfix/security-patch', is_remote: true, is_head: false, target_commit_id: findId('hs003'), upstream: null },
    { name: 'origin/hotfix/css-regression', is_remote: true, is_head: false, target_commit_id: findId('hp002'), upstream: null },
  ]
}

export function createMockRepo(): OpenRepo {
  return {
    state: {
      path: 'D:/projects/demo/git-app',
      head_branch: 'main',
      head_commit_id: generateMockCommits()[0].id,
      is_bare: false,
      is_empty: false,
    },
    commits: generateMockCommits(),
    branches: generateMockBranches(),
    selectedCommit: null,
    hasMore: false,
    loading: false,
  }
}

export function injectMockData(repoPath = 'D:/projects/demo/git-app') {
  const repo = useRepoStore()
  repo.openRepos.set(repoPath, createMockRepo())
  ;(repo as any).activeRepoPath = repoPath
}

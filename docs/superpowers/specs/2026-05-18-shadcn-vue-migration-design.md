# shadcn-vue 迁移设计文档

## 概述

将 Git 客户端从 Naive UI 组件库迁移至 shadcn-vue，使用 Tailwind CSS 作为样式方案，主题通过 tweakcn.com 生成。

## 目标

- 完全替换所有 Naive UI 组件
- 引入 Tailwind CSS + shadcn-vue
- 主题通过 tweakcn.com 生成 CSS 变量和字体配置
- 保持现有功能不变

## 当前 Naive UI 组件清单

| 组件 | 用途 | shadcn-vue 替代 |
|-----|------|----------------|
| `NSplit` | 三栏布局分割 | `Resizable` (第三方) 或自定义 |
| `NModal` | 弹窗对话框 | `Dialog` |
| `NForm/NFormItem` | 表单 | 原生 + `Label` |
| `NInput` | 输入框 | `Input` |
| `NButton` | 按钮 | `Button` |
| `NSelect` | 下拉选择 | `Select` |
| `NCheckbox` | 复选框 | `Checkbox` |
| `NTag` | 标签 | `Badge` |
| `NDropdown` | 下拉菜单 | `DropdownMenu` |
| `NScrollbar` | 滚动条 | 原生 CSS |
| `NEmpty` | 空状态 | 自定义组件 |
| `NSpin` | 加载状态 | 自定义组件 |
| `useMessage` | 消息提示 | `Sonner` 或自定义 |
| `useDialog` | 对话框 | `AlertDialog` |
| `NSpace` | 间距布局 | Tailwind gap |
| `NIcon` | 图标 | 直接使用 `@vicons/ionicons5` |
| `NThing` | 列表项 | 自定义组件 |
| `NList/NListItem` | 列表 | 自定义组件 |

## 组件替换映射

### 布局组件
- `NSplit` → `vue-resizable-panels` 或自定义 Resizable 组件
- `NSpace` → Tailwind `flex gap-*`

### 表单组件
- `NForm/NFormItem` → 原生 form + `Label`
- `NInput` → `Input`
- `NSelect` → `Select`
- `NCheckbox` → `Checkbox`

### 反馈组件
- `NModal` → `Dialog`
- `NSpin` → 自定义 Loading 组件
- `NEmpty` → 自定义 Empty 组件
- `useMessage` → `Sonner` toast 组件
- `useDialog` → `AlertDialog`

### 数据展示
- `NTag` → `Badge`
- `NDropdown` → `DropdownMenu`
- `NList/NListItem/NThing` → 自定义列表组件

### 其他
- `NScrollbar` → 原生 CSS 滚动条
- `NIcon` → 直接使用图标库

## 主题方案

通过 https://tweakcn.com/ 生成：
- CSS 变量（颜色、圆角、阴影等）
- 字体配置
- 生成的 CSS 将替换 `variables.css` 中的部分变量

## 迁移顺序

### 阶段 1：基础设施
1. 安装 Tailwind CSS
2. 初始化 shadcn-vue
3. 配置 tweakcn.com 主题
4. 创建基础组件封装

### 阶段 2：核心布局
1. 替换 `NSplit` → Resizable
2. 替换 `NSpace` → Tailwind
3. 更新 `AppLayout.vue`

### 阶段 3：表单组件
1. 替换 `NInput` → `Input`
2. 替换 `NButton` → `Button`
3. 替换 `NSelect` → `Select`
4. 替换 `NCheckbox` → `Checkbox`
5. 替换 `NForm` → 原生 + `Label`

### 阶段 4：对话框和反馈
1. 替换 `NModal` → `Dialog`
2. 替换 `useMessage` → `Sonner`
3. 替换 `useDialog` → `AlertDialog`

### 阶段 5：数据展示
1. 替换 `NTag` → `Badge`
2. 替换 `NDropdown` → `DropdownMenu`
3. 替换 `NList` → 自定义组件

### 阶段 6：清理
1. 移除 Naive UI 依赖
2. 删除 `naive.ts` 插件
3. 清理未使用的导入

## 文件变更清单

### 新增
- `git-client/tailwind.config.js`
- `git-client/postcss.config.js`
- `git-client/components.json`
- `git-client/src/lib/utils.ts`
- `git-client/src/components/ui/*`

### 修改
- `git-client/package.json` - 添加/移除依赖
- `git-client/src/main.ts` - 移除 naive-ui 导入
- `git-client/vite.config.ts` - 配置路径别名
- `git-client/src/assets/styles/variables.css` - 整合 tweakcn 主题
- 所有 `.vue` 组件文件

### 删除
- `git-client/src/plugins/naive.ts`

## 依赖变更

### 移除
- `naive-ui`

### 添加
- `tailwindcss`
- `postcss`
- `autoprefixer`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `radix-vue` (shadcn-vue 依赖)
- `lucide-vue-next` (图标)

## 风险与注意事项

1. **NSplit 替换** - 需要找到合适的 resizable panel 库或自定义实现
2. **useMessage/useDialog** - 需要重构调用方式，从组合式函数改为组件式
3. **主题过渡** - 确保 tweakcn 生成的主题与现有 CSS 变量兼容
4. **测试覆盖** - 每个组件替换后需要验证功能

## 成功标准

- [ ] 所有 Naive UI 组件被替换
- [ ] 应用外观与功能保持一致
- [ ] 构建无错误
- [ ] 类型检查通过

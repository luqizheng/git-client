# Task 5: TimeGroupHeader 时间分组

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 替换 TimeGroupHeader 占位组件为完整实现，显示分组标签和 commit 数量

**Architecture:** TimeGroupHeader 接收 TimeGroup prop，显示 label + count

**Tech Stack:** Vue 3, TypeScript

**Depends:** Task 3（CommitRow）

---

**Files:**
- Modify: `src/components/commit/components/TimeGroupHeader.vue`

- [ ] **Step 1: 实现完整的 TimeGroupHeader.vue**

替换占位版本：

```vue
<template>
  <div class="time-group-header" :style="{ transform: `translateY(${offset ?? 0}px)` }">
    <span class="group-label">{{ group.label }}</span>
    <span class="group-count">{{ group.count }} commits</span>
  </div>
</template>

<script setup lang="ts">
import type { TimeGroup } from '../composables/useVirtualScroll'
defineProps<{
  group: TimeGroup
  offset?: number
}>()
</script>

<style scoped>
.time-group-header {
  height: 28px;
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  background: var(--group-header-bg, rgba(255, 255, 255, 0.03));
  border-top: 1px solid var(--border-color, #3c3c3c);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.group-count {
  font-size: 11px;
  color: var(--text-tertiary, #6a6a6a);
}
</style>
```

- [ ] **Step 2: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/components/TimeGroupHeader.vue
git commit -m "feat: implement TimeGroupHeader with group label and commit count"
```

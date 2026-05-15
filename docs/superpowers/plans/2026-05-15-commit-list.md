# CommitList Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely rewrite the SourceTreeCommitList.vue component to deliver a GitKraken-quality Commit List with Canvas graph rendering, rich interactions, filtering/grouping, and virtual scrolling.

**Architecture:** Hybrid approach — rewrite core components from scratch, reuse proven graph layout algorithm from existing useCommitGraph.ts. Canvas 2D API for branch graph drawing with offscreen caching. Composable-based logic separation. Vue 3 Composition API throughout.

**Tech Stack:** Vue 3, Naive UI, UnoCSS, Pinia, @tanstack/vue-virtual, Canvas 2D API, Tauri IPC (existing)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/commit/CommitList.vue` | Main component replacing SourceTreeCommitList.vue |
| `src/components/commit/components/CommitToolbar.vue` | Search/filter/sort toolbar |
| `src/components/commit/components/CommitCanvas.vue` | Canvas branch graph rendering layer |
| `src/components/commit/components/CommitRow.vue` | Single commit row container |
| `src/components/commit/components/ContextMenu.vue` | Right-click context menu (Portal) |
| `src/components/commit/components/GroupHeader.vue` | Date group header with collapse |
| `src/components/commit/components/cells/GraphCell.vue` | Graph node + lane SVG per row |
| `src/components/commit/components/cells/MessageCell.vue` | Commit message + hash with search highlight |
| `src/components/commit/components/cells/AuthorCell.vue` | Author avatar + name |
| `src/components/commit/components/cells/DateCell.vue` | Relative date |
| `src/components/commit/components/cells/BranchTagCell.vue` | Branch/tag pills |
| `src/components/commit/composables/useCommitList.ts` | Orchestration composable |
| `src/components/commit/composables/useVirtualScroll.ts` | Virtual scroll (rewrite with @tanstack) |
| `src/components/commit/composables/useCommitGraph.ts` | Graph layout (optimize existing) |
| `src/components/commit/composables/useInteractions.ts` | Selection/drag/hover interaction state |
| `src/components/commit/composables/useContextMenu.ts` | Context menu state machine |
| `src/components/commit/composables/useFilterGroup.ts` | Filter + group logic |
| `src/components/commit/composables/useKeyboardNav.ts` | Keyboard navigation |
| `src/components/commit/utils/graphRenderer.ts` | Canvas rendering engine |
| `src/components/commit/utils/commitHelpers.ts` | Utility functions (time formatting, text matching) |

### Modified Files

| File | Change |
|------|--------|
| `src/components/graph/GraphView.vue` | Update import from SourceTreeCommitList to CommitList |

### Deleted Files

| File | Reason |
|------|--------|
| `src/components/commit/SourceTreeCommitList.vue` | Replaced by CommitList.vue |

### Test Files

| File | Tests |
|------|-------|
| `src/components/commit/utils/commitHelpers.test.ts` | Unit tests for utility functions |
| `src/components/commit/composables/useFilterGroup.test.ts` | Filter + group logic tests |
| `src/components/commit/composables/useInteractions.test.ts` | Interaction state tests |
| `src/components/commit/composables/useKeyboardNav.test.ts` | Keyboard navigation tests |
| `src/components/commit/composables/useContextMenu.test.ts` | Context menu state tests |
| `src/components/commit/utils/graphRenderer.test.ts` | Canvas renderer tests |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `git-client/package.json`

- [ ] **Step 1: Install @tanstack/vue-virtual**

```bash
cd git-client && npm install @tanstack/vue-virtual
```

- [ ] **Step 2: Verify installation**

```bash
cd git-client && npm ls @tanstack/vue-virtual
```

Expected: `@tanstack/vue-virtual@x.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/vue-virtual dependency"
```

---

### Task 2: Utility Functions (commitHelpers)

**Files:**
- Create: `src/components/commit/utils/commitHelpers.ts`
- Create: `src/components/commit/utils/commitHelpers.test.ts`

- [ ] **Step 1: Write failing tests for commitHelpers**

```typescript
// src/components/commit/utils/commitHelpers.test.ts
import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  getFirstLine,
  matchesFilter,
  truncateText,
  formatCommitInfo,
} from './commitHelpers'
import type { Commit } from '../../../types/git'

describe('formatRelativeTime', () => {
  it('returns "just now" for < 60s', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes for < 1h', () => {
    const now = Math.floor(Date.now() / 1000) - 120
    expect(formatRelativeTime(now)).toBe('2m ago')
  })

  it('returns hours for < 1d', () => {
    const now = Math.floor(Date.now() / 1000) - 7200
    expect(formatRelativeTime(now)).toBe('2h ago')
  })

  it('returns days for < 30d', () => {
    const now = Math.floor(Date.now() / 1000) - 172800
    expect(formatRelativeTime(now)).toBe('2d ago')
  })

  it('returns date string for older', () => {
    const ts = Math.floor(new Date('2024-01-15').getTime() / 1000)
    const result = formatRelativeTime(ts)
    expect(result).toContain('/')
  })
})

describe('getFirstLine', () => {
  it('returns first line of message', () => {
    expect(getFirstLine('feat: add feature\n\nBody text')).toBe('feat: add feature')
  })

  it('returns whole message if no newline', () => {
    expect(getFirstLine('single line')).toBe('single line')
  })
})

describe('matchesFilter', () => {
  const commit: Commit = {
    id: 'abc123def456',
    message: 'feat: add login page',
    author: 'John Doe',
    author_email: 'john@example.com',
    time: 1000000,
    parent_ids: [],
    refs: [],
  }

  it('matches message filter', () => {
    expect(matchesFilter(commit, 'login', 'message')).toBe(true)
    expect(matchesFilter(commit, 'LOGIN', 'message')).toBe(true)
    expect(matchesFilter(commit, 'xyz', 'message')).toBe(false)
  })

  it('matches author filter', () => {
    expect(matchesFilter(commit, 'john', 'author')).toBe(true)
    expect(matchesFilter(commit, 'john@example', 'author')).toBe(true)
    expect(matchesFilter(commit, 'jane', 'author')).toBe(false)
  })

  it('matches hash filter', () => {
    expect(matchesFilter(commit, 'abc123', 'hash')).toBe(true)
    expect(matchesFilter(commit, 'xyz', 'hash')).toBe(false)
  })

  it('matches all filter', () => {
    expect(matchesFilter(commit, 'abc', 'all')).toBe(true)
    expect(matchesFilter(commit, 'login', 'all')).toBe(true)
    expect(matchesFilter(commit, 'john', 'all')).toBe(true)
    expect(matchesFilter(commit, 'zzz', 'all')).toBe(false)
  })
})

describe('truncateText', () => {
  it('returns original if short enough', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis', () => {
    expect(truncateText('hello world', 8)).toBe('hello w\u2026')
  })
})

describe('formatCommitInfo', () => {
  it('formats commit info string', () => {
    const commit: Commit = {
      id: 'abc123def456',
      message: 'feat: add feature',
      author: 'John',
      author_email: 'j@e.com',
      time: 1000000,
      parent_ids: [],
      refs: [],
    }
    const result = formatCommitInfo(commit)
    expect(result).toContain('abc123d')
    expect(result).toContain('feat: add feature')
    expect(result).toContain('John')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/utils/commitHelpers.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement commitHelpers**

```typescript
// src/components/commit/utils/commitHelpers.ts
import type { Commit } from '../../../types/git'

export function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function getFirstLine(message: string): string {
  return message.split('\n')[0]
}

export function matchesFilter(
  commit: Commit,
  text: string,
  type: 'all' | 'message' | 'author' | 'hash',
): boolean {
  const q = text.toLowerCase()
  if (type === 'message' || type === 'all') {
    if (commit.message.toLowerCase().includes(q)) return true
  }
  if (type === 'author' || type === 'all') {
    if (commit.author.toLowerCase().includes(q)) return true
    if (commit.author_email.toLowerCase().includes(q)) return true
  }
  if (type === 'hash' || type === 'all') {
    if (commit.id.toLowerCase().startsWith(q)) return true
  }
  return false
}

export function truncateText(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + '\u2026'
}

export function formatCommitInfo(commit: Commit): string {
  const shortHash = commit.id.slice(0, 7)
  const date = new Date(commit.time * 1000).toLocaleDateString()
  return `${shortHash} | ${commit.author} | ${date} | ${getFirstLine(commit.message)}`
}

export function highlightText(text: string, query: string): { text: string; isHighlight: boolean }[] {
  if (!query) return [{ text, isHighlight: false }]
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts: { text: string; isHighlight: boolean }[] = []
  let lastIdx = 0
  let searchFrom = 0
  while (searchFrom < lower.length) {
    const idx = lower.indexOf(q, searchFrom)
    if (idx === -1) break
    if (idx > lastIdx) parts.push({ text: text.slice(lastIdx, idx), isHighlight: false })
    parts.push({ text: text.slice(idx, idx + q.length), isHighlight: true })
    lastIdx = idx + q.length
    searchFrom = lastIdx
  }
  if (lastIdx < text.length) parts.push({ text: text.slice(lastIdx), isHighlight: false })
  return parts.length > 0 ? parts : [{ text, isHighlight: false }]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/utils/commitHelpers.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/utils/commitHelpers.ts src/components/commit/utils/commitHelpers.test.ts
git commit -m "feat: add commit helper utilities with tests"
```

---

### Task 3: Canvas Graph Renderer (graphRenderer)

**Files:**
- Create: `src/components/commit/utils/graphRenderer.ts`
- Create: `src/components/commit/utils/graphRenderer.test.ts`

- [ ] **Step 1: Write failing tests for graphRenderer**

```typescript
// src/components/commit/utils/graphRenderer.test.ts
import { describe, it, expect } from 'vitest'
import {
  getLaneX,
  getNodeY,
  getLaneColor,
  getGraphWidth,
  drawStraightLine,
  drawBezierCurve,
  drawNode,
  LANE_WIDTH,
  LANE_PADDING,
  NODE_RADIUS,
  ROW_HEIGHT,
} from './graphRenderer'

describe('getLaneX', () => {
  it('returns correct x position for lane', () => {
    expect(getLaneX(0)).toBe(LANE_PADDING)
    expect(getLaneX(1)).toBe(LANE_PADDING + LANE_WIDTH)
    expect(getLaneX(3)).toBe(LANE_PADDING + 3 * LANE_WIDTH)
  })
})

describe('getNodeY', () => {
  it('returns center y for row index', () => {
    expect(getNodeY(0)).toBe(ROW_HEIGHT / 2)
    expect(getNodeY(5)).toBe(5 * ROW_HEIGHT + ROW_HEIGHT / 2)
  })
})

describe('getLaneColor', () => {
  it('returns a valid color string', () => {
    const color = getLaneColor(0)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('rotates through color palette', () => {
    const c0 = getLaneColor(0)
    const c12 = getLaneColor(12)
    expect(c0).toBe(c12)
  })
})

describe('getGraphWidth', () => {
  it('returns minimum width for 0 lanes', () => {
    expect(getGraphWidth(0)).toBe(LANE_PADDING * 2)
  })

  it('returns correct width for multiple lanes', () => {
    expect(getGraphWidth(3)).toBe(LANE_PADDING + 3 * LANE_WIDTH + LANE_PADDING)
  })
})

describe('drawStraightLine', () => {
  it('returns path data for vertical line', () => {
    const path = drawStraightLine(getLaneX(0), getNodeY(0), getNodeY(1))
    expect(path).toContain('M')
    expect(path).toContain('L')
  })
})

describe('drawBezierCurve', () => {
  it('returns path data for bezier', () => {
    const path = drawBezierCurve(getLaneX(0), getNodeY(0), getLaneX(1), getNodeY(1))
    expect(path).toContain('M')
    expect(path).toContain('C')
  })
})

describe('drawNode', () => {
  it('returns circle result for normal node', () => {
    const result = drawNode(getLaneX(0), getNodeY(0), false)
    expect(result.type).toBe('circle')
    expect(result.radius).toBe(NODE_RADIUS)
  })

  it('returns double-ring result for merge node', () => {
    const result = drawNode(getLaneX(0), getNodeY(0), true)
    expect(result.type).toBe('double-ring')
    expect(result.outerRadius).toBeDefined()
    expect(result.innerRadius).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/utils/graphRenderer.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement graphRenderer**

```typescript
// src/components/commit/utils/graphRenderer.ts
import type { GraphNode, GraphConnection } from '../composables/useCommitGraph'

export const LANE_WIDTH = 16
export const LANE_PADDING = 12
export const NODE_RADIUS = 5
export const MERGE_OUTER_RADIUS = 7
export const MERGE_INNER_RADIUS = 4
export const ROW_HEIGHT = 40
export const LINE_WIDTH = 2

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

export function getLaneX(lane: number): number {
  return LANE_PADDING + lane * LANE_WIDTH
}

export function getNodeY(rowIndex: number): number {
  return rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
}

export function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

export function getGraphWidth(maxLane: number): number {
  return LANE_PADDING + Math.max(maxLane, 0) * LANE_WIDTH + LANE_PADDING
}

export function drawStraightLine(x: number, fromY: number, toY: number): string {
  return `M ${x} ${fromY} L ${x} ${toY}`
}

export function drawBezierCurve(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} C ${fromX} ${midY} ${toX} ${midY} ${toX} ${toY}`
}

export interface NodeDrawResult {
  type: 'circle' | 'double-ring'
  x: number
  y: number
  radius: number
  outerRadius?: number
  innerRadius?: number
}

export function drawNode(x: number, y: number, isMerge: boolean): NodeDrawResult {
  if (isMerge) {
    return {
      type: 'double-ring',
      x,
      y,
      radius: MERGE_INNER_RADIUS,
      outerRadius: MERGE_OUTER_RADIUS,
      innerRadius: MERGE_INNER_RADIUS,
    }
  }
  return { type: 'circle', x, y, radius: NODE_RADIUS }
}

export function renderPassThroughLine(
  ctx: CanvasRenderingContext2D,
  lane: number,
  fromY: number,
  toY: number,
): void {
  const x = getLaneX(lane)
  ctx.beginPath()
  ctx.moveTo(x, fromY)
  ctx.lineTo(x, toY)
  ctx.strokeStyle = getLaneColor(lane)
  ctx.lineWidth = LINE_WIDTH
  ctx.stroke()
}

export function renderConnection(
  ctx: CanvasRenderingContext2D,
  conn: GraphConnection,
  fromRowIndex: number,
  toRowIndex: number,
): void {
  const fromX = getLaneX(conn.fromLane)
  const toX = getLaneX(conn.toLane)
  const fromY = getNodeY(fromRowIndex)
  const toY = getNodeY(toRowIndex)

  ctx.beginPath()
  if (conn.fromLane === conn.toLane) {
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
  } else {
    const midY = (fromY + toY) / 2
    ctx.moveTo(fromX, fromY)
    ctx.bezierCurveTo(fromX, midY, toX, midY, toX, toY)
  }
  ctx.strokeStyle = getLaneColor(conn.fromLane)
  ctx.lineWidth = LINE_WIDTH
  ctx.stroke()
}

export function renderNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isMerge: boolean,
  color: string,
  isSelected: boolean,
): void {
  const node = drawNode(x, y, isMerge)
  if (node.type === 'double-ring') {
    ctx.beginPath()
    ctx.arc(x, y, node.outerRadius!, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = isSelected ? 2.5 : 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, node.innerRadius!, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  } else {
    const r = isSelected ? node.radius + 1 : node.radius
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)'
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.stroke()
  }
}

export function renderFullGraph(
  ctx: CanvasRenderingContext2D,
  nodes: Map<string, GraphNode>,
  connections: GraphConnection[],
  passThroughLanes: Map<number, number[]>,
  idToRowIndex: Map<string, number>,
  visibleStartY: number,
  visibleEndY: number,
  selectedCommitId: string | null,
): void {
  ctx.clearRect(0, visibleStartY, ctx.canvas.width, visibleEndY - visibleStartY)

  const startRow = Math.max(0, Math.floor(visibleStartY / ROW_HEIGHT) - 1)
  const endRow = Math.ceil(visibleEndY / ROW_HEIGHT) + 1

  for (let row = startRow; row <= endRow; row++) {
    const passLanes = passThroughLanes.get(row) ?? []
    for (const lane of passLanes) {
      renderPassThroughLine(ctx, lane, getNodeY(row), getNodeY(row + 1))
    }
  }

  for (const conn of connections) {
    const fromRow = idToRowIndex.get(conn.fromCommitId)
    const toRow = idToRowIndex.get(conn.toCommitId)
    if (fromRow === undefined || toRow === undefined) continue
    const fromY = getNodeY(fromRow)
    const toY = getNodeY(toRow)
    if (toY < visibleStartY - ROW_HEIGHT || fromY > visibleEndY + ROW_HEIGHT) continue
    renderConnection(ctx, conn, fromRow, toRow)
  }

  for (const [commitId, node] of nodes) {
    const row = idToRowIndex.get(commitId)
    if (row === undefined) continue
    const y = getNodeY(row)
    if (y < visibleStartY - ROW_HEIGHT || y > visibleEndY + ROW_HEIGHT) continue
    const x = getLaneX(node.lane)
    const color = getLaneColor(node.lane)
    const isSelected = commitId === selectedCommitId
    renderNode(ctx, x, y, node.isMerge, color, isSelected)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/utils/graphRenderer.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/utils/graphRenderer.ts src/components/commit/utils/graphRenderer.test.ts
git commit -m "feat: add Canvas graph rendering engine with tests"
```

---

### Task 4: useFilterGroup Composable

**Files:**
- Create: `src/components/commit/composables/useFilterGroup.ts`
- Create: `src/components/commit/composables/useFilterGroup.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/commit/composables/useFilterGroup.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useFilterGroup } from './useFilterGroup'
import type { Commit } from '../../../types/git'

const makeCommit = (overrides: Partial<Commit> = {}): Commit => ({
  id: 'abc123',
  message: 'test message',
  author: 'Test Author',
  author_email: 'test@test.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
  ...overrides,
})

describe('useFilterGroup', () => {
  it('returns all commits when filter is empty', () => {
    const commits = ref([makeCommit(), makeCommit({ id: 'def456' })])
    const { filteredCommits } = useFilterGroup(commits)
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('filters by message', () => {
    const commits = ref([
      makeCommit({ message: 'feat: login' }),
      makeCommit({ id: 'def456', message: 'fix: bug' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'login'
    filterType.value = 'message'
    expect(filteredCommits.value).toHaveLength(1)
    expect(filteredCommits.value[0].message).toBe('feat: login')
  })

  it('filters by author', () => {
    const commits = ref([
      makeCommit({ author: 'Alice' }),
      makeCommit({ id: 'def456', author: 'Bob' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'alice'
    filterType.value = 'author'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by hash', () => {
    const commits = ref([
      makeCommit({ id: 'abc123def' }),
      makeCommit({ id: 'xyz789ghi' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'abc'
    filterType.value = 'hash'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by all fields', () => {
    const commits = ref([
      makeCommit({ message: 'login feature' }),
      makeCommit({ id: 'login123', author: 'Other', message: 'other' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'login'
    filterType.value = 'all'
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('returns empty when no match', () => {
    const commits = ref([makeCommit()])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'nonexistent'
    filterType.value = 'message'
    expect(filteredCommits.value).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/composables/useFilterGroup.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement useFilterGroup**

```typescript
// src/components/commit/composables/useFilterGroup.ts
import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import { matchesFilter } from '../utils/commitHelpers'

export function useFilterGroup(commits: Ref<Commit[]>) {
  const filterText = ref('')
  const filterType = ref<'all' | 'message' | 'author' | 'hash'>('all')

  const filteredCommits = computed(() => {
    if (!filterText.value.trim()) return commits.value
    return commits.value.filter(c =>
      matchesFilter(c, filterText.value.trim(), filterType.value),
    )
  })

  return {
    filterText,
    filterType,
    filteredCommits,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/composables/useFilterGroup.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/composables/useFilterGroup.ts src/components/commit/composables/useFilterGroup.test.ts
git commit -m "feat: add useFilterGroup composable with tests"
```

---

### Task 5: useInteractions Composable

**Files:**
- Create: `src/components/commit/composables/useInteractions.ts`
- Create: `src/components/commit/composables/useInteractions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/commit/composables/useInteractions.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useInteractions } from './useInteractions'
import type { Commit } from '../../../types/git'

const makeCommit = (id: string): Commit => ({
  id,
  message: 'test',
  author: 'Test',
  author_email: 't@t.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
})

describe('useInteractions', () => {
  it('initializes with no selection', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, hoveredId } = useInteractions(selectedId)
    expect(selectedIds.value.size).toBe(0)
    expect(hoveredId.value).toBeNull()
  })

  it('handles click - single select', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    const commit = makeCommit('abc')
    handleClick(commit, false, false)
    expect(selectedId.value).toBe('abc')
    expect(selectedIds.value.has('abc')).toBe(true)
  })

  it('handles ctrl+click - multi select', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    handleClick(makeCommit('def'), true, false)
    expect(selectedIds.value.size).toBe(2)
    expect(selectedIds.value.has('abc')).toBe(true)
    expect(selectedIds.value.has('def')).toBe(true)
  })

  it('handles ctrl+click toggle off', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    handleClick(makeCommit('abc'), true, false)
    expect(selectedIds.value.has('abc')).toBe(false)
  })

  it('handles shift+click - range select', () => {
    const selectedId = ref<string | null>(null)
    const commits = [makeCommit('a'), makeCommit('b'), makeCommit('c')]
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(commits[0], false, false)
    handleClick(commits[2], false, true)
    expect(selectedIds.value.size).toBeGreaterThanOrEqual(2)
  })

  it('handles hover', () => {
    const selectedId = ref<string | null>(null)
    const { hoveredId, setHovered } = useInteractions(selectedId)
    setHovered('abc')
    expect(hoveredId.value).toBe('abc')
    setHovered(null)
    expect(hoveredId.value).toBeNull()
  })

  it('clears selection', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick, clearSelection } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    clearSelection()
    expect(selectedIds.value.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/composables/useInteractions.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement useInteractions**

```typescript
// src/components/commit/composables/useInteractions.ts
import { ref, type Ref } from 'vue'
import type { Commit } from '../../../types/git'

export function useInteractions(selectedId: Ref<string | null>) {
  const hoveredId = ref<string | null>(null)
  const selectedIds = ref<Set<string>>(new Set())
  const lastSelectedId = ref<string | null>(null)

  function handleClick(commit: Commit, ctrlKey: boolean, shiftKey: boolean): void {
    if (ctrlKey) {
      if (selectedIds.value.has(commit.id)) {
        selectedIds.value.delete(commit.id)
        selectedIds.value = new Set(selectedIds.value)
      } else {
        selectedIds.value = new Set([...selectedIds.value, commit.id])
      }
      if (selectedIds.value.size === 1) {
        selectedId.value = commit.id
      } else if (selectedIds.value.size === 0) {
        selectedId.value = null
      }
    } else if (shiftKey && lastSelectedId.value) {
      selectedIds.value = new Set([lastSelectedId.value, commit.id])
      selectedId.value = commit.id
    } else {
      selectedIds.value = new Set([commit.id])
      selectedId.value = commit.id
    }
    lastSelectedId.value = commit.id
  }

  function setHovered(id: string | null): void {
    hoveredId.value = id
  }

  function clearSelection(): void {
    selectedIds.value = new Set()
    selectedId.value = null
    lastSelectedId.value = null
  }

  return {
    hoveredId,
    selectedIds,
    handleClick,
    setHovered,
    clearSelection,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/composables/useInteractions.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/composables/useInteractions.ts src/components/commit/composables/useInteractions.test.ts
git commit -m "feat: add useInteractions composable with tests"
```

---

### Task 6: useContextMenu Composable

**Files:**
- Create: `src/components/commit/composables/useContextMenu.ts`
- Create: `src/components/commit/composables/useContextMenu.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/commit/composables/useContextMenu.test.ts
import { describe, it, expect } from 'vitest'
import { useContextMenu } from './useContextMenu'
import type { Commit } from '../../../types/git'

const makeCommit = (id: string): Commit => ({
  id,
  message: 'test',
  author: 'Test',
  author_email: 't@t.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
})

describe('useContextMenu', () => {
  it('starts hidden', () => {
    const { state } = useContextMenu()
    expect(state.value.visible).toBe(false)
    expect(state.value.commit).toBeNull()
  })

  it('shows menu on open', () => {
    const { state, open } = useContextMenu()
    const commit = makeCommit('abc')
    open(100, 200, commit)
    expect(state.value.visible).toBe(true)
    expect(state.value.x).toBe(100)
    expect(state.value.y).toBe(200)
    expect(state.value.commit?.id).toBe('abc')
  })

  it('hides menu on close', () => {
    const { state, open, close } = useContextMenu()
    open(100, 200, makeCommit('abc'))
    close()
    expect(state.value.visible).toBe(false)
    expect(state.value.commit).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/composables/useContextMenu.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement useContextMenu**

```typescript
// src/components/commit/composables/useContextMenu.ts
import { ref } from 'vue'
import type { Commit } from '../../../types/git'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  commit: Commit | null
}

export function useContextMenu() {
  const state = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    commit: null,
  })

  function open(x: number, y: number, commit: Commit): void {
    state.value = { visible: true, x, y, commit }
  }

  function close(): void {
    state.value = { visible: false, x: 0, y: 0, commit: null }
  }

  return {
    state,
    open,
    close,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/composables/useContextMenu.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/composables/useContextMenu.ts src/components/commit/composables/useContextMenu.test.ts
git commit -m "feat: add useContextMenu composable with tests"
```

---

### Task 7: useKeyboardNav Composable

**Files:**
- Create: `src/components/commit/composables/useKeyboardNav.ts`
- Create: `src/components/commit/composables/useKeyboardNav.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/commit/composables/useKeyboardNav.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useKeyboardNav } from './useKeyboardNav'

describe('useKeyboardNav', () => {
  it('initializes at index 0', () => {
    const { focusedIndex } = useKeyboardNav(ref(10))
    expect(focusedIndex.value).toBe(0)
  })

  it('moves down on ArrowDown', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(focusedIndex.value).toBe(1)
  })

  it('moves up on ArrowUp', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    focusedIndex.value = 2
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(focusedIndex.value).toBe(1)
  })

  it('does not go below 0', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(focusedIndex.value).toBe(0)
  })

  it('does not exceed total - 1', () => {
    const total = ref(3)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    for (let i = 0; i < 5; i++) {
      handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    }
    expect(focusedIndex.value).toBe(2)
  })

  it('detects Enter key', () => {
    const total = ref(10)
    const { handleKeyDown, onEnter } = useKeyboardNav(total)
    let called = false
    onEnter(() => { called = true })
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(called).toBe(true)
  })

  it('detects Escape key', () => {
    const total = ref(10)
    const { handleKeyDown, onEscape } = useKeyboardNav(total)
    let called = false
    onEscape(() => { called = true })
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(called).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd git-client && npx vitest run src/components/commit/composables/useKeyboardNav.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement useKeyboardNav**

```typescript
// src/components/commit/composables/useKeyboardNav.ts
import { ref, type Ref } from 'vue'

export function useKeyboardNav(totalItems: Ref<number>) {
  const focusedIndex = ref(0)
  const enterCallbacks: (() => void)[] = []
  const escapeCallbacks: (() => void)[] = []
  const searchCallbacks: (() => void)[] = []

  function handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (focusedIndex.value < totalItems.value - 1) {
          focusedIndex.value++
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (focusedIndex.value > 0) {
          focusedIndex.value--
        }
        break
      case 'Enter':
        enterCallbacks.forEach(cb => cb())
        break
      case 'Escape':
        escapeCallbacks.forEach(cb => cb())
        break
      case '/':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          searchCallbacks.forEach(cb => cb())
        }
        break
    }
  }

  function onEnter(cb: () => void): void {
    enterCallbacks.push(cb)
  }

  function onEscape(cb: () => void): void {
    escapeCallbacks.push(cb)
  }

  function onSearch(cb: () => void): void {
    searchCallbacks.push(cb)
  }

  function setFocusedIndex(idx: number): void {
    if (idx >= 0 && idx < totalItems.value) {
      focusedIndex.value = idx
    }
  }

  return {
    focusedIndex,
    handleKeyDown,
    onEnter,
    onEscape,
    onSearch,
    setFocusedIndex,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd git-client && npx vitest run src/components/commit/composables/useKeyboardNav.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/composables/useKeyboardNav.ts src/components/commit/composables/useKeyboardNav.test.ts
git commit -m "feat: add useKeyboardNav composable with tests"
```

---

### Task 8: Rewrite useVirtualScroll (with @tanstack/vue-virtual)

**Files:**
- Modify: `src/components/commit/composables/useVirtualScroll.ts`

Keep existing exports (`TimeGroup`, `VirtualItem`, `COMMIT_ROW_HEIGHT`, `GROUP_HEADER_HEIGHT`, `createVirtualItems`) compatible. Add `@tanstack/vue-virtual` integration with collapsed group support.

- [ ] **Step 1: Rewrite useVirtualScroll using @tanstack/vue-virtual**

The new file replaces the existing manual virtual scroll implementation with `@tanstack/vue-virtual`. Key changes:
- `createVirtualItems` now accepts `collapsedGroups` parameter to skip commits in collapsed groups
- `useVirtualScroll` uses `useVirtualizer` from `@tanstack/vue-virtual`
- Adds `scrollToIndex` for "scroll to commit" feature

```typescript
// src/components/commit/composables/useVirtualScroll.ts
import { computed, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Commit } from '../../../types/git'

export interface TimeGroup {
  key: string
  label: string
  count: number
  firstCommitIndex: number
}

export type VirtualItem =
  | { type: 'commit'; commit: Commit; height: 40 }
  | { type: 'group'; group: TimeGroup; height: 28 }

export const COMMIT_ROW_HEIGHT = 40
export const GROUP_HEADER_HEIGHT = 28

export function createVirtualItems(
  commits: Commit[],
  groups: TimeGroup[],
  collapsedGroups: Set<string> = new Set(),
): VirtualItem[] {
  const items: VirtualItem[] = []
  let groupIdx = 0
  for (let i = 0; i < commits.length; i++) {
    if (groupIdx < groups.length && groups[groupIdx].firstCommitIndex === i) {
      const group = groups[groupIdx]
      items.push({ type: 'group', group, height: GROUP_HEADER_HEIGHT })
      groupIdx++
    }
    if (groupIdx > 0 && collapsedGroups.has(groups[groupIdx - 1].key)) continue
    items.push({ type: 'commit', commit: commits[i], height: COMMIT_ROW_HEIGHT })
  }
  return items
}

export function useVirtualScroll(
  scrollContainerRef: Ref<HTMLElement | null>,
  virtualItems: Ref<VirtualItem[]>,
) {
  const rowVirtualizer = useVirtualizer({
    count: computed(() => virtualItems.value.length),
    getScrollElement: () => scrollContainerRef.value,
    estimateSize: (index: number) => virtualItems.value[index]?.height ?? COMMIT_ROW_HEIGHT,
    overscan: 10,
  })

  const totalHeight = computed(() => rowVirtualizer.value.getTotalSize())

  const visibleItems = computed(() => {
    return rowVirtualizer.value.getVirtualItems().map(vi => {
      const item = virtualItems.value[vi.index]
      return {
        ...item,
        offset: vi.start,
        measureRef: vi.measureRef,
      }
    })
  })

  function scrollToIndex(index: number) {
    rowVirtualizer.value.scrollToIndex(index, { align: 'center' })
  }

  return {
    rowVirtualizer,
    totalHeight,
    visibleItems,
    scrollToIndex,
  }
}
```

- [ ] **Step 2: Verify the rewrite compiles**

```bash
cd git-client && npx vue-tsc --noEmit
```

Expected: No type errors related to useVirtualScroll

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/composables/useVirtualScroll.ts
git commit -m "feat: rewrite useVirtualScroll with @tanstack/vue-virtual and collapsed group support"
```

---

### Task 9: Cell Components

**Files:**
- Create: `src/components/commit/components/cells/GraphCell.vue`
- Create: `src/components/commit/components/cells/MessageCell.vue`
- Create: `src/components/commit/components/cells/AuthorCell.vue`
- Create: `src/components/commit/components/cells/DateCell.vue`
- Create: `src/components/commit/components/cells/BranchTagCell.vue`

These are based on existing cell components with enhancements for search highlighting and improved styling. Since these are Vue SFC components, visual verification is done via dev server rather than unit tests.

- [ ] **Step 1: Create all cell components**

Create `GraphCell.vue`, `MessageCell.vue`, `AuthorCell.vue`, `DateCell.vue`, `BranchTagCell.vue` in `src/components/commit/components/cells/`. The code for each component is provided in the design spec. Key enhancements over existing:
- **MessageCell**: Added `searchQuery` prop and `highlightText` rendering
- **All cells**: Use `commitHelpers.ts` utility functions instead of inline logic
- **BranchTagCell**: Uses `truncateText` from commitHelpers

- [ ] **Step 2: Verify components render in dev server**

```bash
cd git-client && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/components/cells/
git commit -m "feat: add cell components with search highlighting"
```

---

### Task 10: CommitRow, GroupHeader, CommitToolbar, ContextMenu Components

**Files:**
- Create: `src/components/commit/components/CommitRow.vue`
- Create: `src/components/commit/components/GroupHeader.vue`
- Create: `src/components/commit/components/CommitToolbar.vue`
- Create: `src/components/commit/components/ContextMenu.vue`

- [ ] **Step 1: Create all four components**

Key features per component:
- **CommitRow**: Added `isHovered`, `isKeyboardFocused`, `searchQuery` props; emits `mouseenter`, `mouseleave`, `dblclick`, `dragstart`
- **GroupHeader**: Added `collapsed` prop and `toggle` emit; chevron rotation animation
- **CommitToolbar**: Search input with filter type dropdown, match count display, group toggle button
- **ContextMenu**: Uses Naive UI NDropdown with dynamic menu items based on commit data

- [ ] **Step 2: Verify components render in dev server**

```bash
cd git-client && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/components/CommitRow.vue src/components/commit/components/GroupHeader.vue src/components/commit/components/CommitToolbar.vue src/components/commit/components/ContextMenu.vue
git commit -m "feat: add CommitRow, GroupHeader, CommitToolbar, ContextMenu components"
```

---

### Task 11: useCommitList Orchestration Composable

**Files:**
- Create: `src/components/commit/composables/useCommitList.ts`

This is the main orchestration composable that wires together all other composables.

- [ ] **Step 1: Implement useCommitList**

```typescript
// src/components/commit/composables/useCommitList.ts
import { ref, computed, watch, onMounted } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useRepoStore } from '../../../stores/repo'
import { useCommitsStore } from '../../../stores/commits'
import { invoke } from '../../../utils/ipc'
import { useFilterGroup } from './useFilterGroup'
import { useTimeGrouping } from './useTimeGrouping'
import { useCommitGraph } from './useCommitGraph'
import { useVirtualScroll, createVirtualItems } from './useVirtualScroll'
import { useInteractions } from './useInteractions'
import { useContextMenu } from './useContextMenu'
import { useKeyboardNav } from './useKeyboardNav'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useResizableColumns } from './useResizableColumns'
import type { Commit } from '../../../types/git'

export function useCommitList() {
  const repo = useRepoStore()
  const commitsStore = useCommitsStore()
  const { columns, resizeColumn } = useResizableColumns()
  const scrollContainer = ref<HTMLElement | null>(null)

  const visibleColumns = computed(() =>
    columns.value.filter(c => c.key !== 'graph'),
  )

  const activeOpenRepo = computed(() => repo.activeRepo)
  const selectedCommitId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)
  const displayCommits = computed(() => activeOpenRepo.value?.commits ?? [])
  const loading = computed(() => activeOpenRepo.value?.loading ?? false)
  const hasMore = computed(() => activeOpenRepo.value?.hasMore ?? false)

  const { filterText, filterType, filteredCommits } = useFilterGroup(displayCommits)
  const { groups } = useTimeGrouping(filteredCommits)

  const groupingEnabled = ref(true)
  const collapsedGroups = ref<Set<string>>(new Set())

  const virtualItems = computed(() => {
    if (!groupingEnabled.value) {
      return filteredCommits.value.map(c => ({
        type: 'commit' as const,
        commit: c,
        height: 40,
      }))
    }
    return createVirtualItems(filteredCommits.value, groups.value, collapsedGroups.value)
  })

  const { graph, graphWidth } = useCommitGraph(filteredCommits)

  const {
    totalHeight,
    visibleItems,
    scrollToIndex,
  } = useVirtualScroll(scrollContainer, virtualItems)

  const {
    hoveredId,
    selectedIds,
    handleClick,
    setHovered,
    clearSelection,
  } = useInteractions(selectedCommitId)

  const { state: contextMenuState, open: openContextMenu, close: closeContextMenu } = useContextMenu()

  const commitOnlyItems = computed(() =>
    virtualItems.value.filter(i => i.type === 'commit'),
  )

  const { focusedIndex, handleKeyDown, onEnter, onEscape, onSearch, setFocusedIndex } = useKeyboardNav(
    computed(() => commitOnlyItems.value.length),
  )

  const loadingMore = ref(false)

  async function loadMoreCommits() {
    if (!repo.activeRepoPath || loadingMore.value || !hasMore.value) return
    const lastCommit = displayCommits.value[displayCommits.value.length - 1]
    if (!lastCommit) return
    loadingMore.value = true
    try {
      await commitsStore.fetchLogs(repo.activeRepoPath, 50, lastCommit.id)
    } finally {
      loadingMore.value = false
    }
  }

  const { handleScroll: handleInfiniteScroll } = useInfiniteScroll(scrollContainer, {
    threshold: 200,
    onLoadMore: loadMoreCommits,
    hasMore,
    loading: computed(() => loading.value || loadingMore.value),
  })

  function onScroll(e: Event) {
    handleInfiniteScroll()
  }

  const idToRowIdx = computed(() => {
    const map = new Map<string, number>()
    filteredCommits.value.forEach((c, i) => map.set(c.id, i))
    return map
  })

  function selectCommit(commit: Commit) {
    if (repo.activeRepoPath) {
      commitsStore.selectCommit(repo.activeRepoPath, commit)
    }
  }

  function toggleGroup(key: string) {
    if (collapsedGroups.value.has(key)) {
      collapsedGroups.value.delete(key)
      collapsedGroups.value = new Set(collapsedGroups.value)
    } else {
      collapsedGroups.value = new Set([...collapsedGroups.value, key])
    }
  }

  function scrollToCommit(commitId: string) {
    const idx = filteredCommits.value.findIndex(c => c.id.startsWith(commitId))
    if (idx !== -1) {
      setFocusedIndex(idx)
      scrollToIndex(idx)
    }
  }

  onEnter(() => {
    const item = commitOnlyItems.value[focusedIndex.value]
    if (item && item.type === 'commit') {
      selectCommit(item.commit)
    }
  })

  onEscape(() => {
    filterText.value = ''
    closeContextMenu()
  })

  onSearch(() => {
    // Focus search input — handled by CommitToolbar
  })

  watch(() => repo.activeRepoPath, async (newPath) => {
    if (newPath) {
      const openRepo = repo.openRepos.get(newPath)
      if (openRepo && openRepo.commits.length === 0) {
        await commitsStore.fetchLogs(newPath)
      }
      invoke('start_watch', { repoPath: newPath })
    }
  })

  onMounted(() => {
    if (repo.activeRepoPath) {
      const openRepo = repo.openRepos.get(repo.activeRepoPath)
      if (openRepo && openRepo.commits.length === 0) {
        commitsStore.fetchLogs(repo.activeRepoPath)
      }
    }
  })

  return {
    scrollContainer,
    columns,
    visibleColumns,
    graph,
    graphWidth,
    displayCommits,
    filteredCommits,
    totalHeight,
    visibleItems,
    scrollToIndex,
    selectedCommitId,
    hoveredId,
    selectedIds,
    contextMenuState,
    filterText,
    filterType,
    loading,
    loadingMore,
    hasMore,
    groupingEnabled,
    collapsedGroups,
    focusedIndex,
    idToRowIdx,
    selectCommit,
    handleClick,
    setHovered,
    clearSelection,
    openContextMenu,
    closeContextMenu,
    handleKeyDown,
    onScroll,
    loadMoreCommits,
    toggleGroup,
    scrollToCommit,
    resizeColumn,
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd git-client && npx vue-tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/composables/useCommitList.ts
git commit -m "feat: add useCommitList orchestration composable"
```

---

### Task 12: CommitList Main Component

**Files:**
- Create: `src/components/commit/CommitList.vue`
- Delete: `src/components/commit/SourceTreeCommitList.vue`

- [ ] **Step 1: Create CommitList.vue**

This is the main component that replaces SourceTreeCommitList.vue. It uses `useCommitList` composable and renders all sub-components.

Template structure:
```
<div class="commit-list">
  <CommitToolbar />
  <ColumnHeader />
  <div class="scroll-container" @scroll="onScroll">
    <div :style="{ height: totalHeight + 'px' }">
      <template v-for="item in visibleItems">
        <GroupHeader v-if="group" />
        <CommitRow v-else />
      </template>
    </div>
  </div>
  <ContextMenu />
</div>
```

The component delegates all logic to `useCommitList` composable and focuses purely on template rendering and event binding.

- [ ] **Step 2: Verify it renders in dev server**

```bash
cd git-client && npm run dev
```

- [ ] **Step 3: Update imports in GraphView.vue**

Find all imports of `SourceTreeCommitList` in the codebase and update to `CommitList`:

```bash
cd git-client && grep -r "SourceTreeCommitList" src/ --include="*.vue" --include="*.ts" -l
```

Update each file to import `CommitList` instead.

- [ ] **Step 4: Delete SourceTreeCommitList.vue**

```bash
git rm src/components/commit/SourceTreeCommitList.vue
```

- [ ] **Step 5: Verify full app still works**

```bash
cd git-client && npx vue-tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace SourceTreeCommitList with new CommitList component"
```

---

### Task 13: CommitCanvas Component (Canvas Graph Layer)

**Files:**
- Create: `src/components/commit/components/CommitCanvas.vue`

This is the optional Canvas-based graph layer. It overlays the scroll container and renders branch lines using Canvas 2D API for high performance.

- [ ] **Step 1: Create CommitCanvas.vue**

The component:
- Takes `graph`, `idToRowIndex`, `selectedCommitId` as props
- Uses `renderFullGraph` from `graphRenderer.ts`
- Syncs scroll position with parent scroll container
- Uses `requestAnimationFrame` for throttled rendering
- Only renders visible viewport area

- [ ] **Step 2: Integrate CommitCanvas into CommitList.vue**

Add CommitCanvas as a sticky overlay in the scroll container, positioned above the virtual list rows.

- [ ] **Step 3: Verify graph renders correctly**

```bash
cd git-client && npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add src/components/commit/components/CommitCanvas.vue src/components/commit/CommitList.vue
git commit -m "feat: add CommitCanvas component for high-performance graph rendering"
```

---

### Task 14: Theme Support and CSS Variables

**Files:**
- Modify: `src/assets/styles/` (existing theme files)

- [ ] **Step 1: Add CommitList CSS variables to theme files**

Add the following variables to both dark and light theme CSS:

Dark theme additions:
```css
--commit-row-height: 40px;
--commit-bg: #1a1a1a;
--commit-bg-hover: rgba(255, 255, 255, 0.05);
--commit-bg-selected: rgba(59, 130, 246, 0.3);
--commit-text: #e0e0e0;
--commit-text-secondary: #969696;
--commit-border: #3c3c3c;
--graph-lane-width: 16px;
--group-header-bg: rgba(255, 255, 255, 0.03);
--group-header-hover-bg: rgba(255, 255, 255, 0.06);
```

Light theme additions:
```css
--commit-bg: #ffffff;
--commit-bg-hover: rgba(0, 0, 0, 0.04);
--commit-bg-selected: rgba(59, 130, 246, 0.15);
--commit-text: #1a1a1a;
--commit-text-secondary: #666666;
--commit-border: #e0e0e0;
--group-header-bg: rgba(0, 0, 0, 0.02);
--group-header-hover-bg: rgba(0, 0, 0, 0.04);
```

- [ ] **Step 2: Verify theme switching works**

```bash
cd git-client && npm run dev
```

Switch between dark and light themes and verify CommitList appearance.

- [ ] **Step 3: Commit**

```bash
git add src/assets/styles/
git commit -m "feat: add CommitList theme CSS variables for dark/light modes"
```

---

### Task 15: Run All Tests and Final Verification

**Files:**
- All test files

- [ ] **Step 1: Run all unit tests**

```bash
cd git-client && npx vitest run
```

Expected: All tests PASS

- [ ] **Step 2: Run TypeScript type check**

```bash
cd git-client && npx vue-tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Manual verification checklist**

Verify the following in the running dev server:
- [ ] Commit list renders with graph, message, author, date columns
- [ ] Clicking a row selects it (blue highlight)
- [ ] Ctrl+Click multi-selects
- [ ] Right-click opens context menu
- [ ] Search filters commits by message/author/hash
- [ ] Search highlights matching text in message cells
- [ ] Date groups are shown and collapsible
- [ ] Infinite scroll loads more commits
- [ ] Keyboard navigation (↑↓) moves focus
- [ ] Enter key selects focused commit
- [ ] Drag commit row starts drag operation
- [ ] Dark/light theme switching works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete CommitList rewrite with full interaction support"
```

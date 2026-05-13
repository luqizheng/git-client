# Commit Graph Multi-Branch Visualization Design

**Date:** 2026-05-13
**Status:** Approved
**Related Components:** CommitList.vue, GraphColumn.vue (new), graphLayout.ts

## 1. Overview

### 1.1 Goal

Enhance the existing `CommitList.vue` component to display a multi-branch commit graph with:
- Visual branch roadmap showing merge paths
- Color-coded lines representing different branch origins
- Interactive nodes supporting click selection, hover tooltips, and clickable branch tags
- Reference implementation: Git Graph (VS Code extension), GitKraken

### 1.2 Scope

**In Scope:**
- SVG-based graph rendering integrated into CommitList (left column)
- Lane-based layout algorithm for DAG visualization
- Support for normal commits (circle) and merge commits (square)
- Bézier curves for cross-lane connections
- Virtual scrolling for performance optimization (5000+ commits)
- Branch tag filtering functionality

**Out of Scope (Future Iterations):**
- Drag-to-zoom/pan interactions
- Animated transitions between states
- Complex graph layout optimizations (lane reuse, crossing minimization)
- Export graph as image

---

## 2. Architecture

### 2.1 Component Structure

```
CommitList.vue (Modified)
├── GraphColumn.vue (NEW - Left: SVG Graph, 120px width)
│   ├── CommitNode (SVG circle/rect per commit)
│   └── ConnectionLine (SVG line/path between commits)
└── CommitInfoColumn (Right: Existing list content)
    ├── Hash + Message
    ├── Author + Relative Time
    └── Branch Tags (clickable)
```

### 2.2 Layout Design

**Horizontal Flex Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Search Bar (Full Width)                                   │
├──────────────┬───────────────────────────────────────────┤
│ [GraphColumn] │ [Commit Info Column]                      │
│  120px fixed  │  flex-1 (auto)                            │
│              │                                           │
│  ○──●──●     │  abc1234  feat: add login    [main]      │
│  │  ╲ ╱ ●    │  def5678  fix: auth bug                  │
│  ●──●──●─╲ ● │  ghi9012  merge: feature/x   [feature/x] │
│              │                                           │
├──────────────┴───────────────────────────────────────────┤
│ Load More Trigger                                         │
└──────────────────────────────────────────────────────────┘
```

**Key Constraints:**
- GraphColumn: Fixed width **120px** (configurable via prop)
- Row height: **40px** per commit (synchronized between left/right)
- SVG uses absolute positioning with `transform: translateY()`
- Max visible lanes: **12** (matches color palette size)

---

## 3. SVG Graphics Specification

### 3.1 Node Types

#### Normal Commit Node
```svg
<circle 
  cx="{laneX}" 
  cy="{rowCenterY}" 
  r="4"
  fill="{laneColor}"
  stroke="#ffffff"
  stroke-width="1.5"
  class="commit-node cursor-pointer transition-all duration-200"
/>
```
- Shape: Circle, radius 4px
- Selected state: Radius 6px + drop-shadow filter
- Hover state: Radius 5px + darker border

#### Merge Commit Node (2+ parents)
```svg
<rect 
  x="{laneX - 4}" 
  y="{rowCenterY - 4}" 
  width="8" 
  height="8" 
  rx="1"
  fill="{laneColor}"
  stroke="#ffffff"
  stroke-width="1.5"
  class="merge-node cursor-pointer"
/>
```
- Shape: Rounded square, 8×8px
- Selected state: 10×10px + drop-shadow
- Visual distinction from normal commits

### 3.2 Connection Lines

#### Vertical Line (Same Lane)
```svg
<line 
  x1="{fromX}" y1="{fromY}" 
  x2="{toX}" y2="{toY}" 
  stroke="{color}"
  stroke-width="2"
  stroke-linecap="round"
/>
```

#### Diagonal/Cross-Lane Line (Bézier Curve)
```svg
<path 
  d="M {fromX} {fromY} Q {controlX} {controlY} {toX} {toY}"
  stroke="{color}"
  stroke-width="2"
  fill="none"
  stroke-linecap="round"
/>
```
- Control point: Midpoint between start and end
- Curvature dynamically adjusts based on horizontal distance
- Smooth visual flow for merge/branch operations

### 3.3 Rendering Order (Z-Index)

1. **Background Layer**: All connection lines (rendered first)
2. **Foreground Layer**: All commit nodes (rendered last, overlap lines at intersections)

### 3.4 Color System

**Palette (12 colors, reusable):**
```typescript
const COLORS = [
  '#4fc3f7', // Cyan - main/master lane
  '#81c784', // Green - develop lane
  '#fff176', // Yellow - feature/* lanes
  '#ff8a65', // Orange - hotfix/* lanes
  '#ba68c8', // Purple - release/* lanes
  '#f06292', // Pink - custom branches
  '#4db6ac', // Teal
  '#aed581', // Light green
  '#90a4ae', // Blue grey
  '#ffb74d', // Amber
  '#e57373', // Red
  '#64b5f6', // Light blue
]
```

**Color Assignment Rules:**
- **Lane 0**: Typically assigned to primary branch (main/master)
- **Lane 1-N**: Assigned in order of first commit appearance
- **Merge node color**: Uses target branch's color (the branch being merged INTO)
- **Branch tag color**: Matches corresponding lane color (visual association)
- **Color cycling**: If lanes > 12, cycle through palette (modulo)

### 3.5 Branch Tags

**Position:** Right side of first commit node in each branch
```svg
<g transform="translate({laneX + 10}, {rowY - 6})">
  <rect 
    width="{tagWidth}" 
    height="16" 
    rx="3"
    fill="{laneColor}20"    <!-- 20% opacity background -->
    stroke="{laneColor}"
    stroke-width="1"
  />
  <text 
    x="4" 
    y="12" 
    fill="{laneColor}"
    font-size="11"
    font-family="monospace"
  >{branchName}</text>
</g>
```

**Behavior:**
- Click → Filter commits by this branch (calls `filterByBranch()`)
- Hover → Show full branch name tooltip if truncated
- Max tag width: **70px**, overflow ellipsis

---

## 4. Data Flow

### 4.1 Data Pipeline

```
[Rust Backend]          [Frontend Vue]
┌──────────────┐        ┌─────────────────────────────────────┐
│ get_log()     │ IPC    │ commits.fetchLogs(repoPath, limit) │
│ Returns:      │------>│   ↓                                  │
│ Commit[]      │        │ repo.openRepos[path].commits         │
│ (with         │        │   ↓                                  │
│  parent_ids)  │        │ computeGraphLayout(commits)          │
│               │        │   ↓                                  │
└──────────────┘        │ Reactive computed: GraphLayout       │
                         │   ↓                                  │
                         │ <GraphColumn :layout="graphLayout" />│
                         └─────────────────────────────────────┘
```

### 4.2 Existing API Compatibility

**No backend changes required.**
- Current `get_log` command returns `Commit[]` with `parent_ids: string[]`
- `parent_ids` contains all parent commit hashes (1 for normal, 2+ for merges)
- Sufficient to build complete DAG structure on frontend

### 4.3 Store Enhancements (commits.ts)

**New Computed Property:**
```typescript
const graphLayout = computed(() => {
  const currentCommits = activeOpenRepo.value?.commits ?? []
  return computeGraphLayout(currentCommits)
})
```

**New Action:**
```typescript
function filterByBranch(repoPath: string, branchName: string) {
  const openRepo = repo.openRepos.get(repoPath)
  if (!openRepo) return
  
  // Backup original data before filtering
  if (!openRepo._originalCommits) {
    openRepo._originalCommits = [...openRepo.commits]
  }
  
  // Filter in-memory (no backend call needed)
  openRepo.commits = openRepo._originalCommits.filter(commit =>
    commit.refs.some(ref => ref.includes(branchName))
  )
}

function clearBranchFilter(repoPath: string) {
  const openRepo = repo.openRepos.get(repoPath)
  if (openRepo?._originalCommits) {
    openRepo.commits = [...openRepo._originalCommits]
    openRepo._originalCommits = null
  }
}
```

---

## 5. Interaction Design

### 5.1 Click Node → Select Commit

**Trigger:** Click on `<circle>` or `<rect>` element

**Flow:**
1. Emit `select` event with `Commit` object
2. Parent (`CommitList.vue`) calls `commits.selectCommit(repoPath, commit)`
3. Updates `selectedId` reactive state
4. **Visual Feedback:**
   - Graph node: Enlarged (r=6/r=10) + drop-shadow glow
   - List row: Background highlight (`bg-blue-900/40`, existing behavior)
   - Both sides stay synchronized via shared `selectedId`

### 5.2 Hover → Tooltip

**Implementation:** Naive UI `NTooltip` component wrapping each node

**Tooltip Content:**
```vue
<NTooltip trigger="hover" :delay="300" placement="right">
  <template #trigger>
    <circle ... />
  </template>
  
  <div class="text-xs space-y-1 p-2 min-w-[200px]">
    <div><span class="font-semibold">Hash:</span> {{ commit.id }}</div>
    <div><span class="font-semibold">Author:</span> {{ commit.author }}</div>
    <div><span class="font-semibold">Email:</span> {{ commit.author_email }}</div>
    <div><span class="font-semibold">Time:</span> {{ formatFullTime(commit.time) }}</div>
    
    <!-- Merge-specific info -->
    <div v-if="commit.parent_ids.length >= 2">
      <span class="font-semibold">Merge Type:</span> 
      {{ commit.parent_ids.length }}-way merge
    </div>
    
    <!-- Associated refs -->
    <div v-if="commit.refs.length">
      <span class="font-semibold">Branches/Tags:</span>
      <ul class="list-disc list-inside ml-2">
        <li v-for="ref in commit.refs" :key="ref">{{ ref }}</li>
      </ul>
    </div>
  </div>
</NTooltip>
```

**Display Rules:**
- Full SHA-1 hash (40 characters)
- Author name + email
- Absolute timestamp (ISO format), not relative time
- For merge commits: number of parents (2-way, 3-way octopus, etc.)
- All associated branch/tag names

### 5.3 Branch Tag Click → Filter

**Trigger:** Click on branch tag `<g>` element

**Flow:**
1. Emit `branch-click` event with branch name string
2. Call `commits.filterByBranch(repoPath, branchName)`
3. CommitList re-renders with filtered subset
4. Graph recalculates layout (fewer lanes likely)
5. Show "Clear Filter" button in search bar area

**UX Details:**
- In-memory filtering (instant, no loading state)
- Original commit list preserved in `_originalCommits` backup
- Clear filter restores full view immediately
- Visual indicator when filter is active (e.g., badge showing "Showing: feature/x")

---

## 6. Performance Optimization

### 6.1 Virtual Scrolling Strategy

**Problem:** Rendering 1000+ SVG elements causes jank

**Solution:** Only render visible viewport + buffer zone

```
Viewport Calculation:
┌────────────────────────────────┐
│  Scroll Container               │
│  ├─ Visible Area (30 rows)      │ ← User sees this
│  ├─ Top Buffer (+10 rows)       │ ← Pre-rendered above
│  └─ Bottom Buffer (+10 rows)    │ ← Pre-rendered below
│                                 │
│  Total Rendered: ~50 items      │ ← Constant DOM count
│  Hidden: 950+ items             │ ← Not in DOM tree
└────────────────────────────────┘
```

**Implementation:**
```typescript
// Reactive viewport tracking
const visibleRange = ref({ start: 0, end: 30 })
const ROW_HEIGHT = 40
const BUFFER_ROWS = 10

function updateViewport(scrollTop: number) {
  const startRow = Math.floor(scrollTop / ROW_HEIGHT)
  visibleRange.start = Math.max(0, startRow - BUFFER_ROWS)
  visibleRange.end = Math.min(
    totalCommits.value,
    startRow + 30 + BUFFER_ROWS * 2
  )
}

// Filtered computed properties
const visibleNodes = computed(() =>
  layout.value.nodes.slice(visibleRange.start, visibleRange.end)
)

const visibleLines = computed(() =>
  layout.value.lines.filter(line =>
    isInVisibleRange(line.fromY, line.toY)
  )
)
```

**Performance Gains:**
- DOM nodes: O(n) → O(1) (~50 constant)
- Memory: Reduced by ~90%
- Scroll FPS: Consistent 60fps even with 5000+ commits
- Initial render time: Sub-100ms for large repos

### 6.2 Incremental Layout Calculation

**Optimization:** Avoid full recalculation on scroll

```typescript
// Cache layout results
const layoutCache = new Map<string, GraphLayout>()

function getLayout(commits: Commit[]): GraphLayout {
  const cacheKey = commits.map(c => c.id).join(',')
  
  if (layoutCache.has(cacheKey)) {
    return layoutCache.get(cacheKey)!
  }
  
  const layout = computeGraphLayout(commits)
  layoutCache.set(cacheKey, layout)
  
  // Limit cache size (LRU eviction if needed)
  if (layoutCache.size > 100) {
    const firstKey = layoutCache.keys().next().value
    layoutCache.delete(firstKey)
  }
  
  return layout
}
```

**When to invalidate cache:**
- New commits loaded (pagination)
- Branch filter applied/cleared
- Repository switched

### 6.3 SVG Rendering Optimizations

1. **Use `<g>` grouping:** Group lines and nodes separately for batch updates
2. **CSS will-change:** Apply to scrolling container for GPU compositing
3. **Debounced scroll handler:** Throttle viewport calculations to 16ms (60fps)
4. **Lazy tooltip creation:** Only mount NTooltip when hovered (not for all nodes)

---

## 7. Edge Cases & Error Handling

| Scenario | Handling Strategy |
|----------|------------------|
| **Empty repository** | Display empty state: "No commits yet" icon + text |
| **Single linear history** | Single lane, vertical straight lines only |
| **Excessive parallel branches (>12)** | Cycle colors modulo 12; show "..." badge if lanes overflow |
| **Octopus merge (3+ parents)** | Square node + multiple converging Bézier curves |
| **Initial loading state** | Skeleton loader or spinner in graph area |
| **Search/filter applied** | Auto-recalculate graph layout with filtered subset |
| **Window resize** | SVG viewBox auto-adapt width; debounce relayout |
| **Missing parent_ids** | Treat as root commit (no incoming lines) |
| **Corrupted commit data** | Fallback to text-only list view; log error |

---

## 8. Future Improvements (Post-MVP)

### 8.1 Graph Layout Algorithm Enhancements

1. **Lane Reuse:**
   - Current: Infinite lane growth
   - Improved: Recycle ended lanes for new branches
   - Target: Cap maxLane at ≤12 for optimal color usage

2. **Crossing Minimization:**
   - Current: Simple topological ordering
   - Improved: Sugiyama-style layer assignment to minimize line crossings
   - Benefit: Cleaner visual output for complex histories

3. **Incremental Layout:**
   - Current: Full recalculation on every change
   - Improved: Only reposition affected subtree
   - Benefit: Faster updates during real-time git operations

### 8.2 Advanced Interactions

- **Drag-to-pan:** Click and drag to pan graph horizontally (if lanes > visible)
- **Mouse wheel zoom:** Zoom in/out on graph detail level
- **Highlight path:** Click branch tag to highlight entire branch lineage
- **Diff preview:** Hover over connection line to see diff summary between two commits

### 8.3 Export & Sharing

- Export graph as PNG/SVG image
- Generate shareable permalink for specific commit view
- Print-friendly layout option

---

## 9. Implementation Checklist (Pre-Plan)

### Phase 1: Core Integration
- [ ] Create `GraphColumn.vue` component skeleton
- [ ] Integrate into `CommitList.vue` (flex layout)
- [ ] Wire up `computeGraphLayout()` with real commit data
- [ ] Render basic circles and vertical lines

### Phase 2: Visual Polish
- [ ] Implement merge commit square nodes
- [ ] Add Bézier curve diagonal connections
- [ ] Apply 12-color palette system
- [ ] Add branch tags with click handlers

### Phase 3: Interactions
- [ ] Click node → select commit (sync with right panel)
- [ ] Hover → NTooltip with full commit info
- [ ] Branch tag click → filter + clear filter UI
- [ ] Selected state visual feedback (glow + enlarge)

### Phase 4: Performance
- [ ] Implement virtual scrolling (viewport tracking)
- [ ] Optimize SVG rendering (grouping, lazy tooltips)
- [ ] Add layout calculation caching
- [ ] Test with 1000+ commit repositories

### Phase 5: Edge Cases & QA
- [ ] Handle empty/single-branch repositories
- [ ] Test octopus merges (3+ parents)
- [ ] Verify window resize behavior
- [ ] Test branch filter apply/clear cycles
- [ ] Cross-browser compatibility check (if applicable in Tauri)

---

## 10. Success Criteria

1. **Visual Accuracy:** Correctly renders linear, branch, and merge patterns matching Git history
2. **Performance:** Smooth 60fps scrolling with 2000+ commits loaded
3. **Interaction:** All three interactions (click/hover/filter) work without lag
4. **Accessibility:** Keyboard navigable (Tab through nodes, Enter to select)
5. **Theme Support:** Respects dark/light theme (colors adapt via CSS variables)
6. **Code Quality:** Follows existing Vue 3 + TypeScript patterns; no lint errors

---

## Appendix A: Technical References

- **Existing code:** [graphLayout.ts](../../../git-client/src/utils/graphLayout.ts) - Lane-based layout algorithm
- **Existing component:** [CommitList.vue](../../../git-client/src/components/commit/CommitList.vue) - Current list implementation
- **Type definitions:** [git.d.ts](../../../git-client/src/types/git.d.ts) - Commit interface with parent_ids
- **Store logic:** [commits.ts](../../../git-client/src/stores/commits.ts) - fetchLogs/selectCommit actions
- **Backend command:** [commit.rs](../../../git-client/src-tauri/src/commands/commit.rs) - get_log Tauri command

## Appendix B: Similar Implementations for Reference

1. **Git Graph (VS Code Extension):** https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph
   - Primary reference for interaction model and visual design
2. **GitKraken:** https://www.gitkraken.com/
   - Reference for merge node visualization and color scheme
3. **SourceTree (Atlassian):** https://www.sourcetreeapp.com/
   - Reference for branch tag positioning and filtering UX

export interface GraphCommit {
  id: string
  parents: string[]
  refs: Array<{ name: string; ref_type: string }>
  message: string
  author: string
  time: number
}

export interface GraphNode {
  x: number
  y: number
  commitId: string
  branchColor: string
  isMerge: boolean
}

export interface GraphLane {
  branchName: string
  color: string
  columnIndex: number
}

export interface GraphPath {
  d: string
  color: string
  fromRow: number
  toRow: number
}

export interface GraphRow {
  node: GraphNode
  paths: GraphPath[]
  commit: GraphCommit
  laneIndex: number
}

export interface GraphData {
  rows: GraphRow[]
  lanes: GraphLane[]
  totalWidth: number
  totalHeight: number
}

const GRAPH_WIDTH = 80
const ROW_HEIGHT = 40
const LANE_GAP = 18
const LANE_PADDING = 14
const BRANCH_COLORS = [
  'var(--branch-color-1)',
  'var(--branch-color-2)',
  'var(--branch-color-3)',
  'var(--branch-color-4)',
  'var(--branch-color-5)',
  'var(--branch-color-6)',
  'var(--branch-color-7)',
  'var(--branch-color-8)',
]

function getLaneX(lane: number): number {
  return LANE_PADDING + lane * LANE_GAP
}

function getNodeY(rowIndex: number): number {
  return rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
}

function getBranchColor(lane: number): string {
  return BRANCH_COLORS[lane % BRANCH_COLORS.length]
}

function bezierPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} C ${fromX} ${midY} ${toX} ${midY} ${toX} ${toY}`
}

export function computeGraphData(commits: GraphCommit[]): GraphData {
  if (commits.length === 0) {
    return { rows: [], lanes: [], totalWidth: GRAPH_WIDTH, totalHeight: 0 }
  }

  const rows: GraphRow[] = []
  const lanes: GraphLane[] = []
  const commitLaneMap = new Map<string, number>()
  const activeLanes: (string | null)[] = []
  let nextColorIdx = 0

  const colorMap = new Map<string, string>()

  function assignColor(branchName: string): string {
    if (colorMap.has(branchName)) return colorMap.get(branchName)!
    const color = BRANCH_COLORS[nextColorIdx % BRANCH_COLORS.length]
    colorMap.set(branchName, color)
    nextColorIdx++
    return color
  }

  function findOrAllocateLane(commitId: string, branchName: string): number {
    for (let i = 0; i < activeLanes.length; i++) {
      if (activeLanes[i] === commitId) {
        return i
      }
    }
    const emptyIdx = activeLanes.indexOf(null)
    if (emptyIdx !== -1) {
      activeLanes[emptyIdx] = commitId
      return emptyIdx
    }
    activeLanes.push(commitId)
    const laneIdx = activeLanes.length - 1
    const color = assignColor(branchName)
    lanes.push({ branchName, color, columnIndex: laneIdx })
    return laneIdx
  }

  function releaseLane(laneIdx: number) {
    if (laneIdx < activeLanes.length) {
      activeLanes[laneIdx] = null
    }
  }

  function allocateNewLane(branchName: string): number {
    const emptyIdx = activeLanes.indexOf(null)
    if (emptyIdx !== -1) {
      activeLanes[emptyIdx] = branchName
      return emptyIdx
    }
    activeLanes.push(branchName)
    const laneIdx = activeLanes.length - 1
    const color = assignColor(branchName)
    lanes.push({ branchName, color, columnIndex: laneIdx })
    return laneIdx
  }

  const parentRowIndex = new Map<string, number>()
  for (let i = 0; i < commits.length; i++) {
    parentRowIndex.set(commits[i].id, i)
  }

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    const isMerge = commit.parents.length > 1

    let lane: number

    if (commitLaneMap.has(commit.id)) {
      lane = commitLaneMap.get(commit.id)!
    } else {
      const branchName = getBranchName(commit)
      lane = findOrAllocateLane(commit.id, branchName)
    }

    commitLaneMap.set(commit.id, lane)

    const nodeX = getLaneX(lane)
    const nodeY = getNodeY(i)
    const branchColor = getBranchColor(lane)
    const paths: GraphPath[] = []

    for (const parentId of commit.parents) {
      if (commitLaneMap.has(parentId)) {
        const parentLane = commitLaneMap.get(parentId)!
        const parentRowIdx = parentRowIndex.get(parentId)
        const parentY = parentRowIdx !== undefined ? getNodeY(parentRowIdx) : getNodeY(i + 1)
        if (parentLane === lane) {
          paths.push({
            d: `M ${nodeX} ${nodeY} L ${nodeX} ${parentY}`,
            color: branchColor,
            fromRow: i,
            toRow: parentRowIdx ?? i + 1,
          })
        } else {
          const parentX = getLaneX(parentLane)
          paths.push({
            d: bezierPath(nodeX, nodeY, parentX, parentY),
            color: getBranchColor(parentLane),
            fromRow: i,
            toRow: parentRowIdx ?? i + 1,
          })
        }
      } else {
        const parentBranchName = inferBranchName(parentId, commit)
        let parentLane: number

        if (isMerge && commit.parents.indexOf(parentId) > 0) {
          parentLane = allocateNewLane(parentBranchName)
          commitLaneMap.set(parentId, parentLane)
        } else {
          if (i + 1 < commits.length && commits[i + 1].id === parentId) {
            parentLane = lane
          } else {
            parentLane = allocateNewLane(parentBranchName)
          }
          commitLaneMap.set(parentId, parentLane)
        }

        const parentRowIdx = parentRowIndex.get(parentId)
        const parentY = parentRowIdx !== undefined ? getNodeY(parentRowIdx) : getNodeY(i + 1)
        const parentX = getLaneX(parentLane)

        if (parentLane === lane) {
          paths.push({
            d: `M ${nodeX} ${nodeY} L ${nodeX} ${parentY}`,
            color: branchColor,
            fromRow: i,
            toRow: parentRowIdx ?? i + 1,
          })
        } else {
          paths.push({
            d: bezierPath(nodeX, nodeY, parentX, parentY),
            color: getBranchColor(parentLane),
            fromRow: i,
            toRow: parentRowIdx ?? i + 1,
          })
        }
      }
    }

    const usedByLater = commits.slice(i + 1).some(c => c.parents.includes(commit.id))
    if (!usedByLater) {
      releaseLane(lane)
    }

    rows.push({
      node: {
        x: nodeX,
        y: nodeY,
        commitId: commit.id,
        branchColor,
        isMerge,
      },
      paths,
      commit,
      laneIndex: lane,
    })
  }

  const maxLane = Math.max(...rows.map(r => r.laneIndex), 0)
  const totalWidth = Math.max(GRAPH_WIDTH, LANE_PADDING + (maxLane + 1) * LANE_GAP + LANE_PADDING)
  const totalHeight = commits.length * ROW_HEIGHT

  return { rows, lanes, totalWidth, totalHeight }
}

function getBranchName(commit: GraphCommit): string {
  const head = commit.refs.find(r => r.ref_type === 'local')
  if (head) return head.name
  const remote = commit.refs.find(r => r.ref_type === 'remote')
  if (remote) return remote.name
  const tag = commit.refs.find(r => r.ref_type === 'tag')
  if (tag) return tag.name
  return commit.id.slice(0, 7)
}

function inferBranchName(parentId: string, childCommit: GraphCommit): string {
  const headRef = childCommit.refs.find(r => r.ref_type === 'local')
  if (headRef) return headRef.name
  return parentId.slice(0, 7)
}

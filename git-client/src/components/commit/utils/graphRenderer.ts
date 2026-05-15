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
  if (conn.type === 'merge') {
    const mergeRow = Math.min(fromRowIndex, toRowIndex)
    const parentRow = Math.max(fromRowIndex, toRowIndex)
    const mergeX = getLaneX(conn.toLane)
    const parentX = getLaneX(conn.fromLane)
    const mergeY = getNodeY(mergeRow)
    const parentY = getNodeY(parentRow)

    if (fromRowIndex < toRowIndex) {
      ctx.moveTo(parentX, parentY)
      const midY = (parentY + mergeY) / 2
      ctx.bezierCurveTo(parentX, midY, mergeX, midY, mergeX, mergeY)
    } else {
      ctx.moveTo(fromX, fromY)
      const midY = (fromY + toY) / 2
      ctx.bezierCurveTo(fromX, midY, toX, midY, toX, toY)
    }
  } else if (conn.fromLane === conn.toLane) {
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

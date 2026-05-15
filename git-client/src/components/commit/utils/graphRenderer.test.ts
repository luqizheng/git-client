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

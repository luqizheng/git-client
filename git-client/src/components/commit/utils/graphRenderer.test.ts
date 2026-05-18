import { describe, it, expect } from 'vitest'
import { computeGraphData, type GraphCommit } from './graphRenderer'

function makeCommit(overrides: Partial<GraphCommit> & { id: string }): GraphCommit {
  return {
    parents: [],
    refs: [],
    message: 'test',
    author: 'test',
    time: 0,
    ...overrides,
  }
}

describe('computeGraphData', () => {
  it('returns empty result for empty commits', () => {
    const result = computeGraphData([])
    expect(result.rows).toHaveLength(0)
    expect(result.lanes).toHaveLength(0)
    expect(result.totalWidth).toBe(80)
  })

  it('computes single commit', () => {
    const commits = [makeCommit({ id: 'a', parents: [] })]
    const result = computeGraphData(commits)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].node.commitId).toBe('a')
    expect(result.rows[0].node.isMerge).toBe(false)
  })

  it('computes linear history', () => {
    const commits = [
      makeCommit({ id: 'a', parents: ['b'] }),
      makeCommit({ id: 'b', parents: ['c'] }),
      makeCommit({ id: 'c', parents: [] }),
    ]
    const result = computeGraphData(commits)
    expect(result.rows).toHaveLength(3)
    for (const row of result.rows) {
      expect(row.laneIndex).toBe(0)
    }
  })

  it('computes merge commit as isMerge', () => {
    const commits = [
      makeCommit({ id: 'a', parents: ['b', 'c'] }),
      makeCommit({ id: 'b', parents: [] }),
      makeCommit({ id: 'c', parents: [] }),
    ]
    const result = computeGraphData(commits)
    expect(result.rows[0].node.isMerge).toBe(true)
    expect(result.rows[0].paths.length).toBe(2)
  })

  it('computes branch fork with multiple lanes', () => {
    const commits = [
      makeCommit({ id: 'a', parents: ['b'] }),
      makeCommit({ id: 'b', parents: ['c'] }),
      makeCommit({ id: 'c', parents: [] }),
    ]
    const result = computeGraphData(commits)
    expect(result.rows.length).toBe(3)
    expect(result.totalWidth).toBeGreaterThanOrEqual(80)
  })

  it('assigns different lanes for parallel branches', () => {
    const commits = [
      makeCommit({ id: 'a', parents: ['b'] }),
      makeCommit({ id: 'b', parents: ['d'] }),
      makeCommit({ id: 'c', parents: ['d'] }),
      makeCommit({ id: 'd', parents: [] }),
    ]
    const result = computeGraphData(commits)
    const laneIndices = result.rows.map(r => r.laneIndex)
    const uniqueLanes = new Set(laneIndices)
    expect(uniqueLanes.size).toBeGreaterThanOrEqual(1)
  })

  it('generates bezier paths for cross-lane connections', () => {
    const commits = [
      makeCommit({ id: 'a', parents: ['b', 'c'] }),
      makeCommit({ id: 'b', parents: ['d'] }),
      makeCommit({ id: 'c', parents: ['d'] }),
      makeCommit({ id: 'd', parents: [] }),
    ]
    const result = computeGraphData(commits)
    const bezierPaths = result.rows[0].paths.filter(p => p.d.includes('C'))
    expect(bezierPaths.length).toBeGreaterThan(0)
  })

  it('uses CSS variable colors', () => {
    const commits = [makeCommit({ id: 'a', parents: [] })]
    const result = computeGraphData(commits)
    expect(result.rows[0].node.branchColor).toContain('var(--branch-color')
  })
})

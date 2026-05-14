import { createGitgraph, TemplateName, Orientation, Mode, templateExtend } from '@gitgraph/js'
import type { CommitOptions } from '@gitgraph/js'
import type { Commit } from '../types/git'

export interface GitGraphRenderResult {
  commitYMap: Map<string, number>
}

const ROW_HEIGHT = 40

function createDarkTemplate() {
  return templateExtend(TemplateName.Metro, {
    colors: ['#4fc3f7', '#81c784', '#fff176', '#ff8a65', '#ba68c8', '#f06292', '#4db6ac', '#aed581'],
    branch: {
      lineWidth: 2,
      spacing: 20,
      label: {
        display: true,
        bgColor: '#2d2d2d',
        borderRadius: 4,
        font: '10px Arial',
      },
    },
    commit: {
      spacing: ROW_HEIGHT,
      dot: { size: 6, strokeWidth: 2 },
      message: {
        display: false,
      },
    },
  })
}

function makeCommitOptions(commit: Commit): CommitOptions {
  return {
    hash: commit.id,
    subject: commit.message.split('\n')[0],
    author: `${commit.author}${commit.author_email ? ` <${commit.author_email}>` : ''}`,
    tag: commit.refs.length > 0 ? commit.refs.map(r => r.name).join(', ') : undefined,
  }
}

function detectDefaultBranch(commits: Commit[]): string {
  if (commits.length === 0) return 'main'
  for (const c of commits) {
    if (!c.refs) continue
    for (const ref of c.refs) {
      if (ref.ref_type === 'local' && (ref.name === 'main' || ref.name === 'master')) {
        return ref.name
      }
    }
  }
  return 'main'
}

let rafId: number | null = null

function scheduleExtract(
  container: HTMLElement,
  commits: Commit[],
  commitYMap: Map<string, number>,
  commitIndexMap: Map<string, number>,
  attempts = 0
) {
  const MAX_ATTEMPTS = 5
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    extractYPositions(container, commits, commitYMap, commitIndexMap)
    if (commitYMap.size < commits.length && attempts < MAX_ATTEMPTS) {
      scheduleExtract(container, commits, commitYMap, commitIndexMap, attempts + 1)
    }
  })
}

export function renderCommitsToGitgraph(
  container: HTMLElement,
  commits: Commit[]
): GitGraphRenderResult | null {
  if (commits.length === 0) return null

  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  const commitIndexMap = new Map<string, number>()
  commits.forEach((c, i) => commitIndexMap.set(c.id, i))

  const gitgraph = createGitgraph(container, {
    template: createDarkTemplate(),
    orientation: Orientation.VerticalReverse,
    mode: Mode.Compact,
  })

  const commitYMap = new Map<string, number>()
  const branchMap = new Map<string, ReturnType<typeof gitgraph.branch>>()
  const commitToBranch = new Map<string, string>()

  const defaultBranchName = detectDefaultBranch(commits)

  if (commits.length > 0) {
    const master = gitgraph.branch({ name: defaultBranchName })
    branchMap.set(defaultBranchName, master)
    commitToBranch.set(commits[0].id, defaultBranchName)
    master.commit(makeCommitOptions(commits[0]))
  }

  for (let i = 1; i < commits.length; i++) {
    const commit = commits[i]
    const parents = commit.parent_ids

    let targetBranch: ReturnType<typeof gitgraph.branch> | undefined

    if (parents.length > 0) {
      const firstParentId = parents[0]
      const existingBranchName = commitToBranch.get(firstParentId)
      if (existingBranchName) {
        targetBranch = branchMap.get(existingBranchName)
      }
    }

    if (!targetBranch) {
      const bName = `branch-${i}`
      targetBranch = gitgraph.branch({ name: bName })
      branchMap.set(bName, targetBranch)
    }

    const isMerge = parents.length > 1

    if (isMerge) {
      for (let p = 1; p < parents.length; p++) {
        const parentId = parents[p]
        const sourceBranchName = commitToBranch.get(parentId)

        let sourceBranch: ReturnType<typeof gitgraph.branch> | undefined
        if (sourceBranchName) {
          sourceBranch = branchMap.get(sourceBranchName)
        }

        if (!sourceBranch) {
          const mergeBName = `merge-src-${commit.id.slice(0, 7)}-${p}`
          sourceBranch = gitgraph.branch({ name: mergeBName })
          branchMap.set(mergeBName, sourceBranch)
          sourceBranch.commit({
            hash: parentId,
            subject: '(merged)',
            author: `${commit.author}${commit.author_email ? ` <${commit.author_email}>` : ''}`,
          } as CommitOptions)
          commitToBranch.set(parentId, mergeBName)
        }

        try {
          targetBranch.merge(sourceBranch)
        } catch {
          // already merged or invalid state
        }
      }
    }

    targetBranch.commit(makeCommitOptions(commit))
    const currentBranchName = [...branchMap.entries()].find(([, b]) => b === targetBranch)?.[0]
    if (currentBranchName) {
      commitToBranch.set(commit.id, currentBranchName)
    }
  }

  scheduleExtract(container, commits, commitYMap, commitIndexMap)

  return { commitYMap }
}

function extractYPositions(
  container: HTMLElement,
  commits: Commit[],
  commitYMap: Map<string, number>,
  commitIndexMap: Map<string, number>
) {
  const svgs = container.querySelectorAll<SVGSVGElement>('svg')
  svgs.forEach(svg => {
    const allGroups = svg.querySelectorAll<SVGGElement>('g')
    let found = 0
    const SAMPLE_LIMIT = Math.min(allGroups.length, 500)

    for (let gi = 0; gi < SAMPLE_LIMIT; gi++) {
      const g = allGroups[gi]
      const hashAttr = g.getAttribute('data-hash') || g.getAttribute('id') || ''
      let matched = false

      if (hashAttr) {
        const shortHash = hashAttr.length <= 10 ? hashAttr : hashAttr.slice(0, 10)
        const ci = commitIndexMap.get(shortHash)
        if (ci !== undefined) {
          const c = commits[ci]
          if (c) {
            const bbox = g.getBBox()
            commitYMap.set(c.id, bbox.y)
            matched = true
            found++
          }
        }
      }

      if (!matched) {
        const titleEl = g.querySelector<SVGTitleElement>('title')
        if (titleEl?.textContent) {
          const text = titleEl.textContent
          for (let ci = 0; ci < Math.min(commits.length, 20); ci++) {
            if (text.includes(commits[ci].id.slice(0, 7))) {
              const bbox = g.getBBox()
              commitYMap.set(commits[ci].id, bbox.y)
              matched = true
              found++
              break
            }
          }
        }
      }
    }

    if (found < commits.length) {
      const rowHeight = inferRowHeight(svg, allGroups)
      commits.forEach(c => {
        if (!commitYMap.has(c.id)) {
          const ci = commitIndexMap.get(c.id)
          if (ci !== undefined) {
            commitYMap.set(c.id, ci * rowHeight)
          }
        }
      })
    }
  })
}

function inferRowHeight(_svg: SVGSVGElement, groups: NodeListOf<SVGGElement>): number {
  if (groups.length < 2) return ROW_HEIGHT
  const yPositions: number[] = []
  const LIMIT = Math.min(groups.length, 50)
  for (let i = 0; i < LIMIT; i++) {
    const y = groups[i].getBBox().y
    if (y > 0) yPositions.push(y)
  }
  yPositions.sort((a, b) => a - b)
  if (yPositions.length < 2) return ROW_HEIGHT
  let minDiff = Infinity
  for (let i = 1; i < Math.min(yPositions.length, 10); i++) {
    minDiff = Math.min(minDiff, yPositions[i] - yPositions[i - 1])
  }
  return minDiff > 10 ? Math.round(minDiff) : ROW_HEIGHT
}

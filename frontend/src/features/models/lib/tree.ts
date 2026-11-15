import { id } from '@/locales/id'
import {
  type FeatureKey,
  type TreeLeaf,
  type TreeNode,
  type TreeSplit,
} from '../data/models'
import { formatThreshold } from './format'

const featureName = (feature: FeatureKey) => id.models.features[feature].rule

function branches(node: TreeSplit) {
  const threshold = formatThreshold(node.threshold)
  const name = featureName(node.feature)
  return [
    { text: `> ${threshold}`, name, child: node.right },
    { text: `≤ ${threshold}`, name, child: node.left },
  ]
}

interface RuleLine {
  depth: number
  /** "Mean_R > 103". Empty when the tree is a single leaf. */
  condition: string
  /** Set when the line ends in a class; null when more conditions follow. */
  leaf: TreeLeaf | null
}

/** The tree as indented if-then lines, the "greater than" branch first. */
export function buildRuleLines(root: TreeNode): RuleLine[] {
  if (root.kind === 'leaf') return [{ depth: 0, condition: '', leaf: root }]

  const lines: RuleLine[] = []
  const walk = (node: TreeSplit, depth: number) => {
    for (const branch of branches(node)) {
      const condition = `${branch.name} ${branch.text}`
      if (branch.child.kind === 'leaf') {
        lines.push({ depth, condition, leaf: branch.child })
      } else {
        lines.push({ depth, condition, leaf: null })
        walk(branch.child, depth + 1)
      }
    }
  }
  walk(root, 0)
  return lines
}

export const NODE_WIDTH = 112
export const NODE_HEIGHT = 44
const GAP_X = 16
const GAP_Y = 56
const PADDING = 12

interface DiagramNode {
  key: string
  /** Centre of the box. */
  x: number
  y: number
  node: TreeNode
}

export interface DiagramEdge {
  key: string
  /** Bottom centre of the parent. */
  fromX: number
  fromY: number
  /** Top centre of the child. */
  toX: number
  toY: number
  text: string
}

interface TreeLayout {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  width: number
  height: number
}

/**
 * Leaves sit side by side, every parent is centred above its children and each
 * level is one row down. Left branches (≤) are drawn on the left.
 */
export function layoutTree(root: TreeNode): TreeLayout {
  const nodes: DiagramNode[] = []
  const edges: DiagramEdge[] = []
  let nextLeaf = 0
  let maxDepth = 0

  const place = (node: TreeNode, depth: number, key: string): DiagramNode => {
    maxDepth = Math.max(maxDepth, depth)
    const y = PADDING + depth * (NODE_HEIGHT + GAP_Y) + NODE_HEIGHT / 2

    if (node.kind === 'leaf') {
      const x = PADDING + NODE_WIDTH / 2 + nextLeaf * (NODE_WIDTH + GAP_X)
      nextLeaf += 1
      const placed = { key, x, y, node }
      nodes.push(placed)
      return placed
    }

    const left = place(node.left, depth + 1, `${key}l`)
    const right = place(node.right, depth + 1, `${key}r`)
    const placed = { key, x: (left.x + right.x) / 2, y, node }
    nodes.push(placed)

    const threshold = formatThreshold(node.threshold)
    for (const [child, text] of [
      [left, `≤ ${threshold}`],
      [right, `> ${threshold}`],
    ] as const) {
      edges.push({
        key: `${key}>${child.key}`,
        fromX: placed.x,
        fromY: y + NODE_HEIGHT / 2,
        toX: child.x,
        toY: child.y - NODE_HEIGHT / 2,
        text,
      })
    }
    return placed
  }

  place(root, 0, 'n')

  return {
    nodes,
    edges,
    width: PADDING * 2 + nextLeaf * NODE_WIDTH + (nextLeaf - 1) * GAP_X,
    height: PADDING * 2 + (maxDepth + 1) * NODE_HEIGHT + maxDepth * GAP_Y,
  }
}

/** Name of the feature a split node tests, as written in the rules. */
export function splitName(node: TreeSplit): string {
  return featureName(node.feature)
}

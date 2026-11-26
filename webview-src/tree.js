// Helpers for the view tree built by disorder/view.js.

function child(node, key) {
  if (!node) return undefined
  switch (node.t) {
    case 'struct': return node.fields.find(f => f.key === key)
    case 'map': return node.entries.find(e => e.key === key)
    case 'array': return { get node() { return node.items[key] }, set node(v) { node.items[key] = v } }
  }
  return undefined
}

/** Replaces the node at `path` (a list of field names, map keys and array indexes). */
export function replaceAt(grid, path, node) {
  if (path.length === 0) {
    grid.root = node
    return
  }
  let current = grid.root
  for (const key of path.slice(0, -1)) {
    current = child(current, key)?.node
  }
  const slot = child(current, path[path.length - 1])
  if (slot) slot.node = node
}

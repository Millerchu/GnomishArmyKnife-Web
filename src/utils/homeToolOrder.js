export function sortHomeTools(tools = [], customOrder = []) {
  const normalizedTools = [...tools]
  if (!customOrder.length) {
    return normalizedTools.sort((prev, next) => prev.order - next.order)
  }

  const orderMap = new Map(customOrder.map((item, index) => [item, index]))
  return normalizedTools.sort((prev, next) => {
    const prevOrder = orderMap.has(prev.key) ? orderMap.get(prev.key) : Number.MAX_SAFE_INTEGER
    const nextOrder = orderMap.has(next.key) ? orderMap.get(next.key) : Number.MAX_SAFE_INTEGER
    return prevOrder - nextOrder || prev.order - next.order
  })
}

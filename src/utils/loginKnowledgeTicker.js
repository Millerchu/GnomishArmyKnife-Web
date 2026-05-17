function trimText(value) {
  return `${value || ''}`.trim()
}

function cutText(value, maxLength) {
  const text = trimText(value)
  if (!text) {
    return ''
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function buildKnowledgeTickerItems(entries = []) {
  return entries
    .map((entry) => {
      const title = trimText(entry?.title)
      const summary = trimText(entry?.summary)
      if (!title || !summary) {
        return null
      }
      return {
        id: entry.id,
        title: cutText(title, 18),
        summary: cutText(summary, 42),
        slogan: `${cutText(title, 18)} · ${cutText(summary, 42)}`
      }
    })
    .filter(Boolean)
}

export function getNextTickerIndex(currentIndex, totalCount) {
  if (!Number.isInteger(totalCount) || totalCount <= 0) {
    return -1
  }
  if (!Number.isInteger(currentIndex) || currentIndex < 0) {
    return 0
  }
  return (currentIndex + 1) % totalCount
}

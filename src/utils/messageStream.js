// 流分块可能落在 UTF-8 字符或事件行中间，解码和事件边界必须分别缓冲。
export function createSseParser(onEvent) {
  let buffer = ''
  return (chunk) => {
    buffer += chunk
    let boundary
    while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
      const block = buffer.slice(0, boundary.index)
      buffer = buffer.slice(boundary.index + boundary[0].length)
      let event = 'message'
      const lines = []
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) lines.push(line.slice(5).replace(/^ /, ''))
      }
      if (lines.length) onEvent({event, payload: JSON.parse(lines.join('\n'))})
    }
  }
}

// 局域网 HTTP 页面可能没有 randomUUID，但 getRandomValues 仍可生成安全的发送标识。
export function createMessageSendKey(random = globalThis.crypto) {
  if (random.randomUUID) return random.randomUUID()
  return Array.from(random.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}

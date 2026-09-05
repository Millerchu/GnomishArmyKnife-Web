import test from 'node:test'
import assert from 'node:assert/strict'
import {createSseParser, createMessageSendKey} from '../messageStream.js'
test('SSE handles split CRLF frames, comments and multiple messages', () => {
  const events = [], parse = createSseParser(event => events.push(event))
  parse(': comment\r\nevent: message-created\r\nda')
  parse('ta: {"title":"权限变更"}\r\n\r')
  assert.equal(events.length, 0)
  parse('\nevent: read-changed\ndata: {}\n\n')
  assert.deepEqual(events, [{event: 'message-created', payload: {title: '权限变更'}}, {event: 'read-changed', payload: {}}])
})
test('SSE handles multiline payload without dropping the following frame', () => {
  const events = [], parse = createSseParser(event => events.push(event))
  parse('data: {\ndata: "messageId":"1"}\n\nevent: heartbeat\ndata: {}\n\n')
  assert.equal(events[0].payload.messageId, '1')
  assert.equal(events[1].event, 'heartbeat')
})

test('send key supports LAN HTTP without randomUUID', () => {
  assert.equal(createMessageSendKey({getRandomValues: bytes => bytes.fill(15)}), '0f'.repeat(16))
  assert.equal(createMessageSendKey({randomUUID: () => 'stable-uuid'}), 'stable-uuid')
})

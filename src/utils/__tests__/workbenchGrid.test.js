import test from 'node:test'
import assert from 'node:assert/strict'
import {applyWorkbenchPayload, cardsOverlap, cloneLayout, composeWorkbenchPayload, defaultGridCards, DOCK_COLLAPSED_KEY, DOCK_ORDER_KEY, GRID_SIZES, gridAnnouncement, packGridCards, readingGridCards, readWorkbenchGrid, settleGridCards, snapGridSize, sortGridCard, updateGridCard, WORKBENCH_GRID_KEY} from '../workbenchGrid.js'
import {WORKBENCH_LAYOUT_KEY} from '../workbenchLayout.js'

function storage(entries = []) {
  const values = new Map(entries)
  return {values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)}
}
function validGrid(cards) {
  for (const card of cards) {
    assert.deepEqual({w: card.w, h: card.h}, GRID_SIZES[card.size])
    assert.ok(card.x >= 0 && card.x + card.w <= 12 && card.y >= 0 && card.y + card.h <= 48)
    assert.ok(Number.isInteger(card.x) && Number.isInteger(card.y))
    assert.ok(!cards.some(other => other !== card && cardsOverlap(card, other)))
  }
}

test('缩放吸附至最近 S/M/L，距离相同采用较小档', () => {
  for (const [w, h, expected] of [[4, 2, 'S'], [6, 3, 'M'], [8, 4, 'L'], [7.8, 2.9, 'L'], [5, 2.5, 'S'], [7, 3.5, 'M'], [1, 1, 'S'], [99, 99, 'L']]) assert.equal(snapGridSize(w, h), expected)
})
test('默认待办 L 与五张 S 铺满六行，任意授权子集可从左上排列', () => {
  const defaults = defaultGridCards()
  assert.deepEqual(defaults.map(({id, size, x, y, w, h}) => [id, size, x, y, w, h]), [
    ['todo', 'L', 0, 0, 8, 4], ['workLog', 'S', 0, 4, 4, 2],
    ['bills', 'S', 8, 0, 4, 2], ['health', 'S', 8, 2, 4, 2],
    ['fuel', 'S', 4, 4, 4, 2], ['knowledge', 'S', 8, 4, 4, 2]
  ])
  for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) {
    assert.equal(defaults.filter(card => x >= card.x && x < card.x + card.w && y >= card.y && y < card.y + card.h).length, 1)
  }
  validGrid(defaults)
  for (let mask = 1; mask < 64; mask++) {
    const packed = packGridCards(defaults.filter((_, index) => mask & (1 << index)))
    assert.equal(packed[0].x, 0); assert.equal(packed[0].y, 0)
    validGrid(packed)
  }
})
test('读取旧云端两张 L 的无碰撞布局时保留定制尺寸和坐标', () => {
  const cards = defaultGridCards().map(card => ({...card,
    ...(card.id === 'workLog' ? {size: 'L', w: 8, h: 4} : {}),
    ...(card.id === 'fuel' ? {x: 8} : {}),
    ...(card.id === 'knowledge' ? {y: 6} : {})
  }))
  validGrid(cards)
  assert.deepEqual(applyWorkbenchPayload({cards}).cards, cards)
})
test('M6+M6、S4×3 按行填满，操作后非碰撞卡也优先回填顶部空位', () => {
  const make = (id, size, x = 0, y = 0) => ({id, size, x, y, hidden: false, ...GRID_SIZES[size]})
  const common = packGridCards([make('todo', 'M'), make('workLog', 'M'), make('bills', 'S'), make('health', 'S'), make('fuel', 'S')])
  assert.deepEqual(common.map(({x, y}) => [x, y]), [[0, 0], [6, 0], [0, 3], [4, 3], [8, 3]])
  const cards = [make('todo', 'M'), make('workLog', 'S', 8, 0), make('bills', 'S', 8, 2), make('health', 'S', 0, 8)]
  const copy = cloneLayout(cards)
  const moved = updateGridCard(cards, 'todo', {size: 'M'})
  assert.deepEqual(moved.map(({x, y}) => [x, y]), [[0, 0], [6, 0], [6, 2], [0, 3]])
  validGrid(moved)
  assert.deepEqual(cards, copy)
  // 读取没有碰撞的已有云端文档仍保留其坐标，不能在读取时自动重排。
  assert.deepEqual(settleGridCards(cards), cards)
})
test('阅读投影补右侧 1–2 列且整个高度均为空的窄缝，不改源坐标或 payload', () => {
  const cards = packGridCards(defaultGridCards().map(card => ({...card, size: card.id === 'todo' ? 'M' : 'S', ...GRID_SIZES[card.id === 'todo' ? 'M' : 'S']})))
  const original = cloneLayout(cards)
  const projected = readingGridCards(cards)
  assert.equal(projected.find(card => card.id === 'workLog').w, 6)
  for (const a of projected) assert.ok(!projected.some(b => a !== b && cardsOverlap(a, b)))
  assert.deepEqual(cards, original)
  assert.deepEqual(composeWorkbenchPayload({cards}, false, []).cards, original)
  const edge = {id: 'todo', x: 4, y: 0, w: 6, h: 3, size: 'M'}
  assert.deepEqual(readingGridCards([edge])[0], {...edge, x: 0})
  assert.equal(readingGridCards([{...edge, x: 5}])[0].w, 6)
  assert.equal(readingGridCards([{...edge, x: 0}])[0].w, 6)
  // 邻卡仅覆盖投影下半部也不能延伸；不同高度区间的卡片不阻止补缝。
  const neighbor = {id: 'bills', x: 10, y: 2, w: 2, h: 2}
  assert.equal(readingGridCards([edge, neighbor])[0].w, 6)
  assert.equal(readingGridCards([edge, {...neighbor, y: 3}])[0].w, 6) // 向上紧凑后的邻卡仍阻止扩展。
  assert.equal(readingGridCards([{...edge, x: 6}])[0].w, 6)
})
test('移动一格且夹紧边界，目标卡优先，其他卡自动避让；输入不变', () => {
  const cards = defaultGridCards()
  const copy = cloneLayout(cards)
  let moved = updateGridCard(cards, 'workLog', {x: 1, y: 5})
  assert.equal(moved[1].x, 1); assert.equal(moved[1].y, 5)
  moved = updateGridCard(cards, 'todo', {x: 10, y: 100})
  assert.equal(moved[0].x, 4); assert.equal(moved[0].y, 44)
  moved = updateGridCard(cards, 'knowledge', {x: -1, y: -1})
  assert.equal(moved[5].x, 0); assert.equal(moved[5].y, 0)
  validGrid(moved); assert.deepEqual(cards, copy)
})
test('档位按钮更新尺寸并修正边界与碰撞，六张 L 也能放下', () => {
  let cards = defaultGridCards()
  for (const size of ['S', 'M', 'L']) {
    cards = updateGridCard(cards, 'health', {size})
    assert.deepEqual({w: cards[3].w, h: cards[3].h}, GRID_SIZES[size]); validGrid(cards)
  }
  validGrid(settleGridCards(cards.map(card => ({...card, size: 'L', x: 11, y: 47}))))
})
test('移动排序按行列跳过未授权及隐藏卡，同档交换坐标且其余卡不变', () => {
  const cards = defaultGridCards().map(card => ({...card, y: card.y + 10}))
  const copy = cloneLayout(cards)
  const next = sortGridCard(cards, 'bills', 1, ['todo', 'bills', 'health'])
  assert.deepEqual(next.map(card => card.id), cards.map(card => card.id))
  assert.deepEqual(next.find(card => card.id === 'bills'), {...cards[2], x: cards[3].x, y: cards[3].y})
  assert.deepEqual(next.find(card => card.id === 'health'), {...cards[3], x: cards[2].x, y: cards[2].y})
  for (const card of next.filter(card => !['bills', 'health'].includes(card.id))) assert.deepEqual(card, cards.find(item => item.id === card.id))
  assert.deepEqual(cards, copy); validGrid(next)
  assert.deepEqual(sortGridCard(cards, 'todo', -1), cards)
  assert.deepEqual(sortGridCard(cards, 'unknown', 1), cards)
  const hidden = cards.map(card => ({...card, hidden: card.id === 'health'}))
  assert.deepEqual(sortGridCard(hidden, 'health', -1), hidden)
  assert.deepEqual(sortGridCard(hidden, 'knowledge', 1), hidden)
})
test('移动排序不同档位双向换位只安置大卡，另外四卡桌面坐标保持不变', () => {
  const cards = defaultGridCards().map(card => ({...card, y: card.y + 10}))
  for (const [id, offset] of [['todo', 1], ['bills', -1]]) {
    const next = sortGridCard(cards, id, offset)
    assert.deepEqual(next.find(card => card.id === 'bills'), {...cards[2], x: cards[0].x, y: cards[0].y})
    for (const card of next.filter(card => !['todo', 'bills'].includes(card.id))) assert.deepEqual(card, cards.find(item => item.id === card.id))
    validGrid(next)
  }
})
test('一期 hidden 迁移和默认隐藏 health 时，可见卡先排位且阅读首行无空洞', () => {
  for (const legacy of [{order: ['health', 'todo', 'workLog', 'bills'], hidden: ['health']}, {hidden: ['health']}]) {
    const cards = defaultGridCards(legacy)
    const copy = cloneLayout(cards)
    const projected = readingGridCards(cards)
    assert.ok(!projected.some(card => card.hidden))
    for (let x = 0; x < 12; x++) assert.equal(projected.filter(card => card.y === 0 && x >= card.x && x < card.x + card.w).length, 1)
    assert.deepEqual(cards, copy)
  }
})
test('阅读投影从旧坐标排除 hidden 后向上紧凑，不修改存储布局', () => {
  const cards = defaultGridCards().map(card => ({...card, hidden: card.id === 'health'}))
  const copy = cloneLayout(cards)
  const projected = readingGridCards(cards)
  assert.deepEqual(projected.find(card => card.id === 'workLog'), {...cards[1], x: 8, y: 2})
  assert.ok(!projected.some(card => card.id === 'health'))
  assert.deepEqual(cards, copy)
})
test('迁移用户隔离的一期三项，order 转坐标，隐藏保留，新卡补全可见', () => {
  const legacy = {version: 1, order: ['health', 'bills', 'todo', 'workLog'], hidden: ['bills']}
  const store = storage([[`${WORKBENCH_LAYOUT_KEY}:9223372036854775807`, JSON.stringify(legacy)], [`${DOCK_COLLAPSED_KEY}:9223372036854775807`, 'true'], [`${DOCK_ORDER_KEY}:9223372036854775807`, '["work-log","todo-list"]']])
  const before = [...store.values]
  const migrated = readWorkbenchGrid(store, '9223372036854775807')
  assert.equal(migrated.schemaVersion, 1)
  assert.deepEqual(migrated.cards.map(card => card.id), [...legacy.order, 'fuel', 'knowledge'])
  assert.deepEqual(migrated.cards.filter(card => card.hidden).map(card => card.id), ['bills'])
  assert.equal(migrated.cards.at(-1).hidden, false)
  assert.deepEqual(migrated.dock, {collapsed: true, order: ['work-log', 'todo-list']})
  validGrid(migrated.cards); assert.deepEqual([...store.values], before)
})
test('无后缀旧键一次性回退并保留原键；用户键存在时不回退，无 id 用无后缀', () => {
  const store = storage([[WORKBENCH_LAYOUT_KEY, '{"order":["health"],"hidden":["todo"]}'], [DOCK_COLLAPSED_KEY, 'true'], [DOCK_ORDER_KEY, '["health-record"]']])
  const first = readWorkbenchGrid(store, 'a')
  for (const key of [WORKBENCH_LAYOUT_KEY, DOCK_COLLAPSED_KEY, DOCK_ORDER_KEY]) assert.equal(store.values.get(`${key}:a`), store.values.get(key))
  store.values.set(WORKBENCH_LAYOUT_KEY, '{"hidden":["health"]}')
  assert.equal(readWorkbenchGrid(store, 'a').cards.find(card => card.id === 'todo').hidden, true)
  assert.equal(readWorkbenchGrid(store, 'b').cards.find(card => card.id === 'health').hidden, true)
  assert.deepEqual(readWorkbenchGrid(store).cards.filter(card => card.hidden).map(card => card.id), ['health'])
  assert.equal(first.cards[0].id, 'health')
})
test('新缓存优先于旧布局，坞独立即时值优先于缓存 dock，输入不被修改', () => {
  const payload = {cards: defaultGridCards({hidden: ['fuel']}), dock: {collapsed: true, order: ['old-app']}}
  const cache = {schemaVersion: 1, ...payload}
  const store = storage([[`${WORKBENCH_GRID_KEY}:a`, JSON.stringify(cache)], [`${WORKBENCH_LAYOUT_KEY}:a`, '{"hidden":["todo"]}'], [`${DOCK_COLLAPSED_KEY}:a`, 'false'], [`${DOCK_ORDER_KEY}:a`, '["new-app"]']])
  const read = readWorkbenchGrid(store, 'a')
  assert.deepEqual(read.cards.filter(card => card.hidden).map(card => card.id), ['fuel'])
  assert.deepEqual(read.dock, {collapsed: false, order: ['new-app']})
  assert.deepEqual(JSON.parse(store.values.get(`${WORKBENCH_GRID_KEY}:a`)), cache)
})
test('损坏或未来缓存回退一期布局；损坏三项、受限存储仍有合法默认布局', () => {
  for (const raw of ['{bad', 'null', '[]', 'true', '{"schemaVersion":2}']) {
    const store = storage([[WORKBENCH_GRID_KEY, raw], [WORKBENCH_LAYOUT_KEY, '{"hidden":["todo"]}']])
    assert.equal(readWorkbenchGrid(store).cards[0].hidden, true)
  }
  const store = storage([[WORKBENCH_LAYOUT_KEY, '{bad'], [DOCK_ORDER_KEY, '{}'], [DOCK_COLLAPSED_KEY, 'bad']])
  assert.deepEqual(readWorkbenchGrid(store), applyWorkbenchPayload(null))
  assert.deepEqual(readWorkbenchGrid({getItem() {throw new Error('denied')}}), applyWorkbenchPayload(null))
})
test('payload 合成纯函数支持一期和新缓存；只输出白名单字段，不带版本或身份', () => {
  const legacy = {order: ['health'], hidden: ['todo'], userId: 'other'}
  const copy = cloneLayout(legacy)
  const combined = composeWorkbenchPayload(legacy, true, [' work-log ', '', 'work-log', 'old-app'])
  assert.deepEqual(Object.keys(combined), ['cards', 'dock'])
  assert.deepEqual(combined.dock, {collapsed: true, order: ['work-log', 'old-app']})
  assert.equal(combined.cards[0].id, 'health')
  assert.deepEqual(legacy, copy)
  const applied = applyWorkbenchPayload(combined)
  assert.deepEqual(composeWorkbenchPayload(applied, applied.dock.collapsed, applied.dock.order), combined)
  assert.notEqual(applied.cards, combined.cards)
})
test('payload 宽松应用丢弃非法卡、未知卡、重复卡，采用第一张合法卡并按档位覆盖 w/h', () => {
  const card = {id: 'health', hidden: true, size: 'S', x: 8, y: 0, w: 8, h: 4, userId: 'other'}
  const invalid = [{...card, id: 'unknown'}, {...card, x: 9}, {...card, y: 47}, {...card, w: '4'}, {...card, x: 0.5}, {...card, hidden: 'true'}, {...card, size: '__proto__'}, {...card, size: ['S']}]
  const payload = {cards: [...invalid, card, {...card, hidden: false}], dock: {collapsed: 'true', order: [null, ' old ', 'old', '', 'a'.repeat(65), '\u0000', '\uD800', '\uDC00', '😀']}}
  const copy = cloneLayout(payload)
  const result = applyWorkbenchPayload(payload)
  assert.deepEqual(result.cards[0], {id: 'health', hidden: true, size: 'S', x: 8, y: 2, w: 4, h: 2})
  assert.equal(result.cards.length, 6)
  assert.deepEqual(result.dock, {collapsed: false, order: ['old', '😀']})
  assert.deepEqual(payload, copy); validGrid(result.cards)
})
test('payload 非对象、非法 dock/cards 和未知 schema 使用默认，dock 两字段独立保留', () => {
  for (const value of [null, [], 1, 'bad', {}, {cards: {}, dock: []}]) assert.deepEqual(applyWorkbenchPayload(value), applyWorkbenchPayload(null))
  assert.deepEqual(applyWorkbenchPayload({dock: {collapsed: true, order: {}}}).dock, {collapsed: true, order: []})
  assert.deepEqual(applyWorkbenchPayload({dock: {collapsed: 'bad', order: ['x']}}).dock, {collapsed: false, order: ['x']})
  assert.deepEqual(applyWorkbenchPayload({dock: {collapsed: true}}, 2), applyWorkbenchPayload(null))
  assert.equal(applyWorkbenchPayload({dock: {order: Array.from({length: 110}, (_, i) => String(i))}}).dock.order.length, 100)
})
test('aria-live 使用一基行列与中文档位', () => {
  assert.equal(gridAnnouncement({x: 0, y: 1, size: 'M'}, '工作日志'), '工作日志已移到第 2 行第 1 列，尺寸中')
})

test('规范化 payload 超出 16KiB 时只从坞顺序尾部截断，保留卡片布局和折叠值', () => {
  const order = Array.from({length: 100}, (_, index) => `${index}${'中'.repeat(60)}`)
  const cards = defaultGridCards().map(card => ({...card, y: card.y + 10}))
  const input = {cards, dock: {collapsed: true, order}}
  const copy = cloneLayout(input)
  const result = applyWorkbenchPayload(input)
  assert.deepEqual(result.cards, cards)
  assert.equal(result.dock.collapsed, true)
  assert.ok(result.dock.order.length > 0 && result.dock.order.length < order.length)
  assert.deepEqual(result.dock.order, order.slice(0, result.dock.order.length))
  const payload = {cards: result.cards, dock: result.dock}
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length <= 16384)
  payload.dock.order.push(order[result.dock.order.length])
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length > 16384)
  assert.deepEqual(input, copy)
})

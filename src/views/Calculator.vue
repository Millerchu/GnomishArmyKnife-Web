<template>
  <div class="calculator-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">科学计算器</h1>
        <p class="page-subtitle">支持常用科学函数、历史记录和移动端触屏布局，后续可接后端统一保存历史。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">{{ usingLocalHistory ? '本地历史缓存' : '已接真实接口' }}</span>
        <span class="hero-tag">历史 {{ historyRecords.length }} 条</span>
      </div>
    </div>

    <div class="calculator-layout">
      <section class="panel display-panel">
        <div class="display-head">
          <div class="mode-wrap">
            <button class="mode-btn" @click="toggleAngleMode">{{ angleMode }}</button>
            <span class="keyboard-tip">支持键盘输入</span>
          </div>
          <span v-if="usingLocalHistory" class="cache-tip">当前使用本地历史缓存</span>
        </div>

        <div class="display-box">
          <p class="expression-text">{{ formattedExpression || '0' }}</p>
          <p class="preview-text">{{ previewText }}</p>
        </div>

        <div class="display-actions">
          <button class="ghost-btn" :disabled="!expression" @click="copyExpression">复制表达式</button>
          <button class="ghost-btn" :disabled="!historyRecords.length" @click="clearHistory">清空历史</button>
        </div>

        <div class="keypad">
          <button
            v-for="button in calculatorButtons"
            :key="button.key"
            type="button"
            class="key-btn"
            :class="button.className"
            @click="handleButton(button)"
          >
            <span class="key-label">{{ button.label }}</span>
            <span v-if="button.subLabel" class="key-sub-label">{{ button.subLabel }}</span>
          </button>
        </div>
      </section>

      <aside class="panel history-panel">
        <div class="history-head">
          <h2 class="history-title">计算历史</h2>
          <span>{{ historyRecords.length }} 条</span>
        </div>

        <div v-if="!historyRecords.length" class="empty-history">暂无历史记录</div>
        <div v-else class="history-list">
          <article v-for="item in historyRecords" :key="item.id" class="history-item">
            <button type="button" class="history-main" @click="applyHistory(item)">
              <p class="history-expression">{{ item.displayExpression }}</p>
              <p class="history-result">= {{ item.result }}</p>
              <p class="history-time">{{ item.createdAt }}</p>
            </button>
            <button type="button" class="history-delete" @click="removeHistory(item)">删除</button>
          </article>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {
  clearCalculatorHistories,
  deleteCalculatorHistory,
  listCalculatorHistories,
  saveCalculatorHistory
} from '@/api/calculator'

const LOCAL_HISTORY_KEY = 'calculator_history'
const MAX_HISTORY_COUNT = 20

const CALCULATOR_BUTTON_ROWS = [
  [
    {key: 'mode', label: 'DEG/RAD', type: 'toggleMode', className: 'control'},
    {key: 'left-paren', label: '(', type: 'insert', value: '(', insertType: 'open', className: 'control'},
    {key: 'right-paren', label: ')', type: 'insert', value: ')', insertType: 'close', className: 'control'},
    {key: 'backspace', label: '⌫', type: 'backspace', className: 'control'},
    {key: 'clear', label: 'C', type: 'clearAll', className: 'danger'}
  ],
  [
    {key: 'sin', label: 'sin', type: 'function', value: 'sin', className: 'secondary'},
    {key: 'cos', label: 'cos', type: 'function', value: 'cos', className: 'secondary'},
    {key: 'tan', label: 'tan', type: 'function', value: 'tan', className: 'secondary'},
    {key: 'ln', label: 'ln', type: 'function', value: 'ln', className: 'secondary'},
    {key: 'log', label: 'log', type: 'function', value: 'log', className: 'secondary'}
  ],
  [
    {key: 'square', label: 'x²', type: 'wrapCurrent', value: 'square', className: 'secondary'},
    {key: 'sqrt', label: '√', type: 'function', value: 'sqrt', className: 'secondary'},
    {key: 'factorial', label: 'x!', type: 'postfix', value: '!', className: 'secondary'},
    {key: 'reciprocal', label: '1/x', type: 'wrapCurrent', value: 'reciprocal', className: 'secondary'},
    {key: 'power', label: '^', type: 'operator', value: '^', className: 'operator'}
  ],
  [
    {key: 'seven', label: '7', type: 'digit', value: '7'},
    {key: 'eight', label: '8', type: 'digit', value: '8'},
    {key: 'nine', label: '9', type: 'digit', value: '9'},
    {key: 'divide', label: '÷', type: 'operator', value: '/', className: 'operator'},
    {key: 'percent', label: '%', type: 'postfix', value: '%', className: 'secondary'}
  ],
  [
    {key: 'four', label: '4', type: 'digit', value: '4'},
    {key: 'five', label: '5', type: 'digit', value: '5'},
    {key: 'six', label: '6', type: 'digit', value: '6'},
    {key: 'multiply', label: '×', type: 'operator', value: '*', className: 'operator'},
    {key: 'pi', label: 'π', type: 'constant', value: 'π', className: 'secondary'}
  ],
  [
    {key: 'one', label: '1', type: 'digit', value: '1'},
    {key: 'two', label: '2', type: 'digit', value: '2'},
    {key: 'three', label: '3', type: 'digit', value: '3'},
    {key: 'minus', label: '-', type: 'operator', value: '-', className: 'operator'},
    {key: 'e', label: 'e', type: 'constant', value: 'e', className: 'secondary'}
  ],
  [
    {key: 'toggle-sign', label: '+/-', type: 'toggleSign', className: 'secondary'},
    {key: 'zero', label: '0', type: 'digit', value: '0'},
    {key: 'dot', label: '.', type: 'dot'},
    {key: 'plus', label: '+', type: 'operator', value: '+', className: 'operator'},
    {key: 'equals', label: '=', type: 'evaluate', className: 'accent'}
  ],
  [
    {key: 'ans', label: 'Ans', type: 'constant', value: 'Ans', className: 'secondary'},
    {key: 'asin', label: 'asin', type: 'function', value: 'asin', className: 'secondary'},
    {key: 'acos', label: 'acos', type: 'function', value: 'acos', className: 'secondary'},
    {key: 'atan', label: 'atan', type: 'function', value: 'atan', className: 'secondary'},
    {key: 'clear-entry', label: 'CE', type: 'clearEntry', className: 'control'}
  ]
]

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function tokenizeExpression(expression) {
  const tokens = []
  let index = 0

  while (index < expression.length) {
    const char = expression[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (/\d/.test(char) || char === '.') {
      let cursor = index + 1
      let dotCount = char === '.' ? 1 : 0
      while (cursor < expression.length) {
        const next = expression[cursor]
        if (next === '.') {
          dotCount += 1
          if (dotCount > 1) {
            break
          }
          cursor += 1
          continue
        }
        if (!/\d/.test(next)) {
          break
        }
        cursor += 1
      }
      tokens.push({type: 'number', value: expression.slice(index, cursor)})
      index = cursor
      continue
    }

    if (/[A-Za-z]/.test(char)) {
      let cursor = index + 1
      while (cursor < expression.length && /[A-Za-z]/.test(expression[cursor])) {
        cursor += 1
      }
      tokens.push({type: 'identifier', value: expression.slice(index, cursor)})
      index = cursor
      continue
    }

    if (char === 'π') {
      tokens.push({type: 'identifier', value: char})
      index += 1
      continue
    }

    if ('+-*/^()%!'.includes(char)) {
      tokens.push({type: 'symbol', value: char})
      index += 1
      continue
    }

    throw new Error('包含不支持的字符')
  }

  return tokens
}

function factorial(value) {
  if (!Number.isFinite(value) || value < 0 || Math.floor(value) !== value) {
    throw new Error('阶乘只支持非负整数')
  }
  if (value > 170) {
    throw new Error('数值过大')
  }
  let result = 1
  for (let index = 2; index <= value; index += 1) {
    result *= index
  }
  return result
}

function toRadians(value, angleMode) {
  return angleMode === 'DEG' ? (value * Math.PI) / 180 : value
}

function fromRadians(value, angleMode) {
  return angleMode === 'DEG' ? (value * 180) / Math.PI : value
}

function resolveConstant(name, answer) {
  if (name === 'π' || name.toLowerCase() === 'pi') {
    return Math.PI
  }
  if (name === 'e') {
    return Math.E
  }
  if (name.toLowerCase() === 'ans') {
    return answer
  }
  return null
}

function applyFunction(name, value, angleMode) {
  const normalized = name.toLowerCase()
  if (normalized === 'sin') {
    return Math.sin(toRadians(value, angleMode))
  }
  if (normalized === 'cos') {
    return Math.cos(toRadians(value, angleMode))
  }
  if (normalized === 'tan') {
    return Math.tan(toRadians(value, angleMode))
  }
  if (normalized === 'asin') {
    return fromRadians(Math.asin(value), angleMode)
  }
  if (normalized === 'acos') {
    return fromRadians(Math.acos(value), angleMode)
  }
  if (normalized === 'atan') {
    return fromRadians(Math.atan(value), angleMode)
  }
  if (normalized === 'ln') {
    return Math.log(value)
  }
  if (normalized === 'log') {
    return Math.log10(value)
  }
  if (normalized === 'sqrt') {
    return Math.sqrt(value)
  }
  if (normalized === 'abs') {
    return Math.abs(value)
  }
  throw new Error('不支持的函数')
}

function createParser(tokens, options) {
  let index = 0

  function peek() {
    return tokens[index] || null
  }

  function consumeSymbol(symbol) {
    const token = peek()
    if (token?.type === 'symbol' && token.value === symbol) {
      index += 1
      return true
    }
    return false
  }

  function expectSymbol(symbol) {
    if (!consumeSymbol(symbol)) {
      throw new Error(`缺少 ${symbol}`)
    }
  }

  function parseExpression() {
    let value = parseTerm()

    while (true) {
      if (consumeSymbol('+')) {
        value += parseTerm()
        continue
      }
      if (consumeSymbol('-')) {
        value -= parseTerm()
        continue
      }
      break
    }

    return value
  }

  function parseTerm() {
    let value = parsePower()

    while (true) {
      if (consumeSymbol('*')) {
        value *= parsePower()
        continue
      }
      if (consumeSymbol('/')) {
        const nextValue = parsePower()
        if (nextValue === 0) {
          throw new Error('除数不能为 0')
        }
        value /= nextValue
        continue
      }
      break
    }

    return value
  }

  function parsePower() {
    let value = parseUnary()
    if (consumeSymbol('^')) {
      value = Math.pow(value, parsePower())
    }
    return value
  }

  function parseUnary() {
    if (consumeSymbol('+')) {
      return parseUnary()
    }
    if (consumeSymbol('-')) {
      return -parseUnary()
    }
    return parsePostfix()
  }

  function parsePostfix() {
    let value = parsePrimary()

    while (true) {
      if (consumeSymbol('!')) {
        value = factorial(value)
        continue
      }
      if (consumeSymbol('%')) {
        value /= 100
        continue
      }
      break
    }

    return value
  }

  function parsePrimary() {
    const token = peek()
    if (!token) {
      throw new Error('表达式不完整')
    }

    if (token.type === 'symbol' && token.value === '(') {
      index += 1
      const value = parseExpression()
      expectSymbol(')')
      return value
    }

    if (token.type === 'number') {
      index += 1
      return Number(token.value)
    }

    if (token.type === 'identifier') {
      index += 1
      const constantValue = resolveConstant(token.value, options.answer)
      if (constantValue !== null) {
        return constantValue
      }

      expectSymbol('(')
      const functionValue = parseExpression()
      expectSymbol(')')
      return applyFunction(token.value, functionValue, options.angleMode)
    }

    throw new Error('表达式不完整')
  }

  return {
    parse() {
      const value = parseExpression()
      if (index < tokens.length) {
        throw new Error('表达式格式有误')
      }
      if (!Number.isFinite(value)) {
        throw new Error('结果不可计算')
      }
      return value
    }
  }
}

function normalizeExpression(expression) {
  const trimmed = expression.replace(/\s+/g, '')
  if (!trimmed) {
    throw new Error('请输入表达式')
  }

  let balance = 0
  Array.from(trimmed).forEach((char) => {
    if (char === '(') {
      balance += 1
    }
    if (char === ')') {
      balance -= 1
    }
    if (balance < 0) {
      throw new Error('括号不匹配')
    }
  })

  if (balance > 0) {
    return `${trimmed}${')'.repeat(balance)}`
  }

  return trimmed
}

function evaluateExpression(expression, answer, angleMode) {
  const normalized = normalizeExpression(expression)
  const tokens = tokenizeExpression(normalized)
  const parser = createParser(tokens, {answer, angleMode})
  return parser.parse()
}

function formatResult(value) {
  if (!Number.isFinite(value)) {
    return 'Error'
  }
  const absolute = Math.abs(value)
  if ((absolute !== 0 && absolute < 0.000001) || absolute >= 1000000000000) {
    return value.toExponential(8).replace(/\.?0+e/, 'e')
  }
  return Number(value.toPrecision(12)).toString()
}

function formatExpression(expression) {
  return expression
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
}

function parseStoredExpression(expression) {
  return `${expression || ''}`
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function persistLocalHistory(list) {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY_COUNT)))
}

function formatTimeText(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeHistoryItem(item) {
  const source = item || {}
  const rawExpression = source.rawExpression
    || source.expressionRaw
    || source.formulaRaw
    || source.formula
    || parseStoredExpression(source.expression || '')
  return {
    id: source.id ?? source.historyId ?? `${Date.now()}-${Math.random()}`,
    rawExpression,
    displayExpression: formatExpression(rawExpression),
    result: `${source.result ?? source.output ?? ''}`,
    createdAt: source.createdAt || source.createTime || formatTimeText()
  }
}

function lastChar(value) {
  return value.slice(-1)
}

function endsWithValue(expression) {
  const trimmed = expression.trim()
  if (!trimmed) {
    return false
  }
  return /[\dπe)%!]$/.test(trimmed) || trimmed.endsWith('Ans')
}

function endsWithOperator(expression) {
  return /[+\-*/^(]$/.test(expression)
}

function shouldInsertMultiplyBeforeDigit(expression) {
  const trimmed = expression.trim()
  if (!trimmed) {
    return false
  }
  return /[\)πe%!]$/.test(trimmed) || trimmed.endsWith('Ans')
}

function getCurrentNumberSegment(expression) {
  const match = expression.match(/(\d+\.?\d*|\.\d*)$/)
  return match ? match[0] : ''
}

export default {
  name: 'Calculator',
  setup() {
    const router = useRouter()

    const expression = ref('')
    const angleMode = ref('DEG')
    const lastAnswer = ref(0)
    const previewText = ref('准备计算')
    const historyRecords = ref([])
    const usingLocalHistory = ref(false)
    const shouldResetOnNextValueInput = ref(false)

    const calculatorButtons = CALCULATOR_BUTTON_ROWS.flat()

    const formattedExpression = computed(() => formatExpression(expression.value))

    const updatePreview = () => {
      if (!expression.value) {
        previewText.value = '准备计算'
        return
      }

      try {
        const result = evaluateExpression(expression.value, lastAnswer.value, angleMode.value)
        previewText.value = `= ${formatResult(result)}`
      } catch (error) {
        previewText.value = error?.message || '表达式格式有误'
      }
    }

    const syncLocalHistory = (recordList) => {
      historyRecords.value = recordList.slice(0, MAX_HISTORY_COUNT)
      persistLocalHistory(historyRecords.value)
    }

    const loadHistory = async () => {
      try {
        const res = await listCalculatorHistories({pageSize: MAX_HISTORY_COUNT})
        const payload = unwrapData(res)
        const rawList = Array.isArray(payload)
          ? payload
          : (payload?.list || payload?.records || payload?.rows || [])
        historyRecords.value = rawList.map((item) => normalizeHistoryItem(item))
        usingLocalHistory.value = false
      } catch (error) {
        historyRecords.value = loadLocalHistory().map((item) => normalizeHistoryItem(item))
        usingLocalHistory.value = true
      }

      if (historyRecords.value.length) {
        const latestValue = Number(historyRecords.value[0].result)
        if (!Number.isNaN(latestValue)) {
          lastAnswer.value = latestValue
        }
      }
    }

    const saveHistoryRecord = async (record) => {
      const localRecord = normalizeHistoryItem({
        ...record,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: formatTimeText()
      })
      const nextRecords = [
        localRecord,
        ...historyRecords.value.filter((item) => item.rawExpression !== localRecord.rawExpression || item.result !== localRecord.result)
      ]
      syncLocalHistory(nextRecords)

      try {
        await saveCalculatorHistory(record)
        usingLocalHistory.value = false
      } catch (error) {
        usingLocalHistory.value = true
      }
    }

    const deleteLocalHistoryById = (id) => {
      const nextRecords = historyRecords.value.filter((item) => item.id !== id)
      syncLocalHistory(nextRecords)
    }

    const appendFragment = (fragment, fragmentType = 'value') => {
      const resetForNewInput = shouldResetOnNextValueInput.value
        && ['digit', 'constant', 'function', 'open'].includes(fragmentType)
      const current = resetForNewInput ? '' : expression.value
      const shouldInsertMultiply = fragmentType === 'digit'
        ? shouldInsertMultiplyBeforeDigit(current)
        : (
          ['constant', 'function', 'open'].includes(fragmentType)
          && endsWithValue(current)
        )

      expression.value = `${current}${shouldInsertMultiply ? '*' : ''}${fragment}`
      shouldResetOnNextValueInput.value = false
    }

    const insertOperator = (operator) => {
      const current = expression.value
      if (!current && operator !== '-') {
        return
      }
      if (current && /[+\-*/^]$/.test(current)) {
        expression.value = `${current.slice(0, -1)}${operator}`
        shouldResetOnNextValueInput.value = false
        return
      }
      expression.value = `${current}${operator}`
      shouldResetOnNextValueInput.value = false
    }

    const insertDot = () => {
      if (shouldResetOnNextValueInput.value) {
        expression.value = '0.'
        shouldResetOnNextValueInput.value = false
        return
      }
      const segment = getCurrentNumberSegment(expression.value)
      if (segment.includes('.')) {
        return
      }
      if (!segment) {
        appendFragment(endsWithValue(expression.value) ? '0.' : '0.', 'digit')
        return
      }
      expression.value = `${expression.value}.`
    }

    const clearEntry = () => {
      if (!expression.value) {
        return
      }
      const updated = expression.value.replace(/(Ans|[A-Za-z]+|\d+\.?\d*|\.\d*|[πe])$/, '')
      expression.value = updated || ''
      shouldResetOnNextValueInput.value = false
    }

    const backspace = () => {
      if (!expression.value) {
        return
      }
      expression.value = expression.value.slice(0, -1)
      shouldResetOnNextValueInput.value = false
    }

    const toggleSign = () => {
      if (!expression.value) {
        expression.value = '-'
        return
      }
      expression.value = expression.value.startsWith('-')
        ? expression.value.slice(1)
        : `-${expression.value}`
      shouldResetOnNextValueInput.value = false
    }

    const wrapCurrentExpression = (mode) => {
      const current = expression.value || `${formatResult(lastAnswer.value)}`
      if (mode === 'square') {
        expression.value = `(${current})^2`
        shouldResetOnNextValueInput.value = false
        return
      }
      if (mode === 'reciprocal') {
        expression.value = `1/(${current})`
        shouldResetOnNextValueInput.value = false
      }
    }

    const evaluateCurrentExpression = async () => {
      if (!expression.value) {
        return
      }

      try {
        const result = evaluateExpression(expression.value, lastAnswer.value, angleMode.value)
        const resultText = formatResult(result)
        const normalizedExpression = normalizeExpression(expression.value)
        await saveHistoryRecord({
          expression: normalizedExpression,
          rawExpression: normalizedExpression,
          result: resultText
        })
        lastAnswer.value = result
        expression.value = resultText
        previewText.value = `= ${resultText}`
        shouldResetOnNextValueInput.value = true
      } catch (error) {
        previewText.value = error?.message || '表达式格式有误'
      }
    }

    const handleButton = async (button) => {
      if (button.type === 'toggleMode') {
        angleMode.value = angleMode.value === 'DEG' ? 'RAD' : 'DEG'
        return
      }
      if (button.type === 'insert') {
        appendFragment(button.value, button.insertType)
        return
      }
      if (button.type === 'function') {
        appendFragment(`${button.value}(`, 'function')
        return
      }
      if (button.type === 'digit') {
        appendFragment(button.value, 'digit')
        return
      }
      if (button.type === 'constant') {
        appendFragment(button.value, 'constant')
        return
      }
      if (button.type === 'operator') {
        insertOperator(button.value)
        return
      }
      if (button.type === 'postfix') {
        if (endsWithValue(expression.value) || lastChar(expression.value) === ')') {
          expression.value = `${expression.value}${button.value}`
          shouldResetOnNextValueInput.value = false
        }
        return
      }
      if (button.type === 'wrapCurrent') {
        wrapCurrentExpression(button.value)
        return
      }
      if (button.type === 'toggleSign') {
        toggleSign()
        return
      }
      if (button.type === 'dot') {
        insertDot()
        return
      }
      if (button.type === 'backspace') {
        backspace()
        return
      }
      if (button.type === 'clearEntry') {
        clearEntry()
        return
      }
      if (button.type === 'clearAll') {
        expression.value = ''
        previewText.value = '准备计算'
        shouldResetOnNextValueInput.value = false
        return
      }
      if (button.type === 'evaluate') {
        await evaluateCurrentExpression()
      }
    }

    const applyHistory = (item) => {
      expression.value = item.rawExpression
      const numericResult = Number(item.result)
      if (!Number.isNaN(numericResult)) {
        lastAnswer.value = numericResult
      }
      shouldResetOnNextValueInput.value = false
    }

    const removeHistory = async (item) => {
      deleteLocalHistoryById(item.id)
      try {
        await deleteCalculatorHistory(item.id)
        usingLocalHistory.value = false
      } catch (error) {
        usingLocalHistory.value = true
      }
    }

    const clearHistory = async () => {
      syncLocalHistory([])
      try {
        await clearCalculatorHistories()
        usingLocalHistory.value = false
      } catch (error) {
        usingLocalHistory.value = true
      }
    }

    const copyExpression = async () => {
      if (!expression.value) {
        return
      }
      try {
        await navigator.clipboard.writeText(formattedExpression.value)
        previewText.value = '表达式已复制'
      } catch (error) {
        previewText.value = '复制失败，请手动复制'
      }
    }

    const toggleAngleMode = () => {
      angleMode.value = angleMode.value === 'DEG' ? 'RAD' : 'DEG'
    }

    const goBackHome = () => {
      router.push('/home')
    }

    const handleKeyboard = async (event) => {
      const {key} = event
      if (/^\d$/.test(key)) {
        event.preventDefault()
        appendFragment(key, 'digit')
        return
      }

      if (['+', '-', '*', '/', '^', '(', ')', '%'].includes(key)) {
        event.preventDefault()
        if (key === '(') {
          appendFragment(key, 'open')
          return
        }
        if (key === ')') {
          appendFragment(key, 'close')
          return
        }
        if (key === '%') {
          if (endsWithValue(expression.value) || lastChar(expression.value) === ')') {
            expression.value = `${expression.value}%`
          }
          return
        }
        insertOperator(key)
        return
      }

      if (key === '.') {
        event.preventDefault()
        insertDot()
        return
      }

      if (key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }

      if (key === 'Delete' || key === 'Escape') {
        event.preventDefault()
        expression.value = ''
        previewText.value = '准备计算'
        return
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault()
        await evaluateCurrentExpression()
      }
    }

    watch([expression, angleMode], updatePreview, {immediate: true})

    onMounted(async () => {
      window.addEventListener('keydown', handleKeyboard)
      await loadHistory()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeyboard)
    })

    return {
      expression,
      angleMode,
      previewText,
      historyRecords,
      usingLocalHistory,
      calculatorButtons,
      formattedExpression,
      toggleAngleMode,
      handleButton,
      applyHistory,
      removeHistory,
      clearHistory,
      copyExpression,
      goBackHome
    }
  }
}
</script>

<style scoped>
.calculator-page {
  min-height: 100vh;
  padding: 18px 22px;
  color: #fff;
  overflow: auto;
}

.page-nav {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: rgba(16, 40, 64, 0.76);
  border-color: rgba(255, 255, 255, 0.28);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.page-title {
  margin: 0;
  font-size: 26px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.calculator-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 14px;
}

.panel {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background:
    linear-gradient(135deg, rgba(8, 26, 44, 0.76), rgba(16, 44, 69, 0.6));
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(14px);
}

.display-panel,
.history-panel {
  padding: 16px;
}

.display-head,
.display-actions,
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn,
.ghost-btn,
.history-delete,
.key-btn {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.mode-btn,
.ghost-btn {
  min-height: 36px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.16);
}

.keyboard-tip,
.cache-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.74);
}

.cache-tip {
  padding: 4px 8px;
  border-radius: 999px;
  color: #ffecb3;
  background: rgba(255, 184, 0, 0.18);
}

.display-box {
  margin-top: 14px;
  min-height: 126px;
  padding: 18px 16px;
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(91, 201, 255, 0.18), transparent 35%),
    rgba(4, 15, 27, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.expression-text {
  margin: 0;
  min-height: 54px;
  font-size: 26px;
  line-height: 1.4;
  text-align: right;
  word-break: break-all;
}

.preview-text {
  margin: 14px 0 0;
  min-height: 22px;
  font-size: 14px;
  text-align: right;
  color: rgba(162, 228, 255, 0.9);
}

.display-actions {
  margin-top: 12px;
}

.keypad {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.key-btn {
  min-height: 60px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.1);
  transition: transform 0.18s ease, background 0.18s ease;
}

.key-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.16);
}

.key-btn.operator {
  background: rgba(54, 132, 255, 0.48);
}

.key-btn.secondary {
  background: rgba(34, 197, 94, 0.22);
}

.key-btn.control {
  background: rgba(255, 255, 255, 0.18);
}

.key-btn.accent {
  background: linear-gradient(135deg, rgba(33, 189, 138, 0.96), rgba(55, 131, 255, 0.96));
}

.key-btn.danger {
  background: rgba(239, 68, 68, 0.62);
}

.key-label {
  font-size: 16px;
  font-weight: 600;
}

.key-sub-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
}

.history-head {
  margin-bottom: 12px;
}

.history-title {
  margin: 0;
  font-size: 18px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: stretch;
}

.history-main {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
}

.history-main:hover {
  background: rgba(255, 255, 255, 0.12);
}

.history-expression,
.history-result,
.history-time {
  margin: 0;
}

.history-expression {
  font-size: 13px;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.8);
}

.history-result {
  margin-top: 6px;
  font-size: 18px;
  font-weight: 600;
}

.history-time {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.history-delete {
  min-width: 58px;
  padding: 0 10px;
  background: rgba(239, 68, 68, 0.62);
}

.empty-history {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
}

@media (max-width: 1080px) {
  .calculator-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .calculator-page {
    padding: 12px;
  }

  .hero-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .display-actions .ghost-btn {
    flex: 1 1 calc(50% - 4px);
  }

  .keypad {
    gap: 8px;
  }

  .key-btn {
    min-height: 56px;
  }
}

@media (max-width: 520px) {
  .display-panel,
  .history-panel {
    padding: 12px;
  }

  .display-box {
    min-height: 112px;
    padding: 14px 12px;
  }

  .expression-text {
    min-height: 46px;
    font-size: 22px;
  }

  .keypad {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .key-btn {
    min-height: 54px;
    padding: 8px 6px;
  }

  .history-item {
    grid-template-columns: 1fr;
  }

  .history-delete {
    min-height: 34px;
  }
}

@media (max-width: 400px) {
  .keypad {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .display-actions .ghost-btn {
    flex-basis: 100%;
  }
}
</style>

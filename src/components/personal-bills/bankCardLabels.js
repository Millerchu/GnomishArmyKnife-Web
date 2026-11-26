export const bankCardTypes = [
  { type: 'DEBIT', label: '储蓄卡' },
  { type: 'CREDIT', label: '信用卡' }
]

export function cardSnapshot(card) {
  return card.lastFour ? `${card.cardName}（尾号${card.lastFour}）` : card.cardName
}

export function cardLabel(card) {
  return `${cardSnapshot(card)} · ${card.institution}`
}

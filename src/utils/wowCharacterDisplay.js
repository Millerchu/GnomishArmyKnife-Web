export const MAX_WOW_CHARACTER_LEVEL = 90

export function shouldShowEndgameSections(level) {
  return Number(level) >= MAX_WOW_CHARACTER_LEVEL
}

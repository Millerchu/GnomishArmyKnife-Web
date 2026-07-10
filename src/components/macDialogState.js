export const DIALOG_VIEW_ACTION = Object.freeze({
  MINIMIZE: 'minimize',
  RESTORE: 'restore',
  TOGGLE_MAXIMIZE: 'toggle-maximize',
  RESET: 'reset'
})

export function createDialogViewState() {
  return {
    minimized: false,
    maximized: false
  }
}

export function reduceDialogViewState(state, action, closeDisabled = false) {
  switch (action) {
    case DIALOG_VIEW_ACTION.RESET:
      return createDialogViewState()
    case DIALOG_VIEW_ACTION.MINIMIZE:
      return closeDisabled
        ? {...state}
        : {minimized: true, maximized: false}
    case DIALOG_VIEW_ACTION.RESTORE:
      return {...state, minimized: false}
    case DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE:
      return {
        minimized: false,
        maximized: !state.maximized
      }
    default:
      return {...state}
  }
}

export function canRequestDialogClose({modelValue, closeDisabled}) {
  return Boolean(modelValue && !closeDisabled)
}

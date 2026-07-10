import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DIALOG_VIEW_ACTION,
  canRequestDialogClose,
  createDialogViewState,
  reduceDialogViewState
} from '../macDialogState.js'

test('DIALOG_VIEW_ACTION exposes the dialog action contract', () => {
  assert.equal(DIALOG_VIEW_ACTION.MINIMIZE, 'minimize')
  assert.equal(DIALOG_VIEW_ACTION.RESTORE, 'restore')
  assert.equal(DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE, 'toggle-maximize')
  assert.equal(DIALOG_VIEW_ACTION.RESET, 'reset')
})

test('createDialogViewState creates a fresh standard dialog view state', () => {
  const firstState = createDialogViewState()
  const secondState = createDialogViewState()

  assert.deepEqual(firstState, {
    minimized: false,
    maximized: false
  })
  assert.deepEqual(secondState, firstState)
  assert.notStrictEqual(secondState, firstState)
})

test('MINIMIZE minimizes the dialog and RESTORE restores it', () => {
  const minimizedState = reduceDialogViewState(
    createDialogViewState(),
    DIALOG_VIEW_ACTION.MINIMIZE
  )

  assert.deepEqual(minimizedState, {
    minimized: true,
    maximized: false
  })
  assert.deepEqual(
    reduceDialogViewState(minimizedState, DIALOG_VIEW_ACTION.RESTORE),
    {minimized: false, maximized: false}
  )
})

test('TOGGLE_MAXIMIZE switches maximize state and clears minimized state', () => {
  const maximizedState = reduceDialogViewState(
    {minimized: true, maximized: false},
    DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE
  )

  assert.deepEqual(maximizedState, {
    minimized: false,
    maximized: true
  })
  assert.deepEqual(
    reduceDialogViewState(maximizedState, DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE),
    {minimized: false, maximized: false}
  )
})

test('closeDisabled blocks minimize and close requests but allows maximize toggling', () => {
  const initialState = createDialogViewState()
  const minimizedState = reduceDialogViewState(
    initialState,
    DIALOG_VIEW_ACTION.MINIMIZE,
    true
  )

  assert.deepEqual(minimizedState, initialState)
  assert.notEqual(minimizedState, initialState)
  assert.equal(canRequestDialogClose({modelValue: true, closeDisabled: true}), false)
  assert.deepEqual(
    reduceDialogViewState(initialState, DIALOG_VIEW_ACTION.TOGGLE_MAXIMIZE, true),
    {minimized: false, maximized: true}
  )
})

test('canRequestDialogClose only allows an open unlocked dialog to close', () => {
  assert.equal(canRequestDialogClose({modelValue: true, closeDisabled: false}), true)
  assert.equal(canRequestDialogClose({modelValue: false, closeDisabled: false}), false)
})

test('RESET clears minimized and maximized state', () => {
  assert.deepEqual(
    reduceDialogViewState(
      {minimized: true, maximized: true},
      DIALOG_VIEW_ACTION.RESET
    ),
    {minimized: false, maximized: false}
  )
})

test('unknown action returns an unchanged state copy', () => {
  const currentState = {minimized: true, maximized: false}
  const nextState = reduceDialogViewState(currentState, 'unknown-action')

  assert.deepEqual(nextState, currentState)
  assert.notStrictEqual(nextState, currentState)
})

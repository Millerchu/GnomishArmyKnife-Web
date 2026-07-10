import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DIALOG_VIEW_ACTION,
  canRequestDialogClose,
  createDialogViewState,
  reduceDialogViewState
} from '../macDialogState.js'

test('createDialogViewState creates the standard dialog view state', () => {
  assert.deepEqual(createDialogViewState(), {
    minimized: false,
    maximized: false
  })
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

# MacDialog Drag Interaction Design

## Goal

Make the shared `MacDialog` desktop dialog movable without adding duplicate close controls. The work-log create and edit dialogs are the acceptance example because they already use `MacDialog`.

## Chosen Direction

The title bar is the desktop drag handle. Its empty region and title block can start a drag; the macOS window controls remain interactive and do not start one. The right-side close button is removed. Form footers keep only their primary submit action, so the existing left red window control, mask click, and Escape key are the cancellation paths.

Other considered directions:

- A small grip icon would make the affordance explicit, but wastes header space and feels less native to the macOS window treatment.
- Per-page drag implementations would avoid changing the shared component, but would create inconsistent behavior as additional dialogs migrate.

## Component Behavior

- `MacDialog` stores a per-open drag offset and applies it to the panel only on desktop.
- Pointer input begins only from the header and never from `MacWindowControls` or other interactive header descendants.
- Moving the pointer updates the panel position without changing the configured dialog width or viewport-safe bounds.
- Opening, closing, minimizing, restoring, and maximizing reset the stored offset. A maximized dialog cannot be dragged.
- Small viewports retain the current bottom-sheet layout and do not enable dragging.
- Existing close semantics are preserved: red control, enabled mask click, and Escape request close through the existing guarded `requestClose` path.

## Consumer Changes

`WorkLog.vue` removes its footer cancel button but retains the primary submit button and its saving-disabled state. Because the close behavior remains in `MacDialog`, no work-log API or form-state behavior changes.

The shared component removes the redundant `.mac-dialog-close` markup and styles. Other consumers that use `MacDialog` receive the same non-redundant header automatically. Their footer content is left unchanged in this slice; only the work-log form is used to validate removal of a cancel action.

## Testing

- Extend the `MacDialog` component test to verify the redundant right close control is absent.
- Verify a desktop header pointer drag updates panel positioning and that controls do not initiate a drag.
- Verify maximized and mobile states do not apply a drag offset.
- Update the work-log dialog component test to assert a single primary footer action and preserve create/edit submission coverage.
- Run the focused component suite and `npm run build`.

## Scope Boundary

This change does not add resize handles, persistent dialog coordinates, keyboard movement, or bulk removal of cancel buttons from unrelated dialogs.

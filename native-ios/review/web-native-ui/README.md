# Corrected native UI review — local only

Branch review/web-native-ui-20261011; based on Build12 58b4685d6d380dd49ebaf80642ec9ca8ca918e13. First review commit1700cd2, followed by Iris corrections. Owner visual approval pending. No push, Cloud build/spend, binary upload, deploy or store submission.

Real iPhone16e / iOS18.6 screenshots, 1170x2532 originals. Before remains unchanged Build12 source with capture tests only. Main after pairs use the same sample fixture. Additional editing/AND/comment captures show explicit local-only changes. Self-contained HTML includes all screenshots plus focused 9.21-second Open → Details video. Prior video version was navigation-only and is superseded.

Iris fixes: monospace structured text and typed light colors; compact heading with validation; content-height idle fields with active edit expansion; contextual + AND after each parent and its existing continuations; removed decorative Preview dots; sample save status “Saved on this device”. Existing canvas, compact DS/sample controls and dark blocks retained. Contextual insertion test covers Unicode/preamble, continuation grouping, unrelated suffix, EOF and invalid parent rejection.

Validation: evidence/web-native-iris-final.xcresult: 47 unit passed, 12/13 UI passed; one old save-label assertion failed. Assertion updated, then evidence/web-native-iris-dark-and-rerun.xcresult targeted demo workflow and visual tests passed. Thus 47 unit and all13 unique UI tests passed across runs, plus additional dark visual capture. Existing role permissions, 409 conflict recovery, offline draft restoration, keyboard/collaboration and maximum Dynamic Type landscape remain covered. Full first-run failure is preserved in the evidence log.

Live Web comparison remains incomplete: two existing Chrome tabs were signed out; prior user login request remains pending without another auth prompt. Only public login/root theme was inspected. No claimed completed live Web/current/new comparison, no new cloud test project or production data changes.

Separate safety work remains at prep/store-safety-20261011 commit53d774c, with28 fixture tests; it is not merged into this UI branch.

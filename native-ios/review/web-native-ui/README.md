# Native Web-aligned UI review — local only

Branch review/web-native-ui-20261011, based on exact Build12 58b4685d6d380dd49ebaf80642ec9ca8ca918e13. User approval of new visuals pending. No push/Cloud/deploy/store action. Existing hat/tokens preserved.

Screenshots: true iPhone16e / iOS18.6 simulator, 1170x2532 originals. Before app source = Build12 plus capture test only; after same sample/role/source, captures after complete regression. Light and dark screenshot appearance visually inspected. 10-second native-interaction.mp4 is cropped in time from a local simulator recording (not a mocked animation).

Local result bundles outside repo: evidence/web-native-before.xcresult, web-native-verified.xcresult, web-native-dark.xcresult. Before 1 visual test passed; final 46 unit+11UI passed, zero failures; extra dark visual test passed. git diff --check passed.

Changes: slim sample bar + details; one underline stage tab group; shared status outside panes; continuous adaptive-height native text fields in light mode, dark typed rails; raw/add controls in Intent options; neutral Preview action; compact output + DS + info toolbar, grid/window canvas fills remaining space; Georgia Projects heading/New action, inline search, quiet workspace selector, content-sized cards with existing corner glow and accurate sample-local footer. Existing model/auth/API code untouched.

Constraints still pending: live Web workbench screenshots (both existing Chrome tabs signed out; async user login request outstanding); no true same-fixture three-way online comparison until a safe read-only matching fixture is available. Only live login/root theme values were audited in browser. Share/Comments redesign deferred until direction approval; contextual AND placement remains in options rather than beside parent. Toolbar uses ViewThatFits for large text; existing conflict/permissions/keyboard/offline tests retained and selectors updated for new native controls.

Safety work was separately saved clean at prep/store-safety-20261011 commit53d774c, 28 fixture tests passed. See review-prep/APPROVED-POLICY-PREPARATION.md in that worktree for retained shared projects/anonymization/offline moderation and remaining operational decisions. It is not in this UI branch.

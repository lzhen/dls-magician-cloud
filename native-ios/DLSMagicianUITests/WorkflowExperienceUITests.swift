import XCTest

final class WorkflowExperienceUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false; XCUIDevice.shared.orientation = .portrait }
    override func tearDown() { XCUIDevice.shared.orientation = .portrait; super.tearDown() }
    private func launch(_ args: [String] = []) -> XCUIApplication {
        let app = XCUIApplication(); app.launchArguments = ["--uitest-editor"] + args; app.launch()
        XCTAssertTrue(app.otherElements["editor.tabs"].waitForExistence(timeout: 12))
        return app
    }
    private func capture(_ app: XCUIApplication, _ name: String) {
        let item = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); item.name = name; item.lifetime = .keepAlways; add(item)
    }
    private func open(_ name: String, _ app: XCUIApplication) {
        app.buttons["editor.collaboration"].tap(); XCTAssertTrue(app.buttons[name].waitForExistence(timeout: 5)); app.buttons[name].tap()
        XCTAssertTrue(app.buttons["collaboration.done"].waitForExistence(timeout: 8))
    }
    func testIntentPreviewInteractionFlowJSONAndLocalDesignSystem() {
        let app = launch()
        XCTAssertTrue(app.textFields["intent.0"].exists)
        capture(app, "Native structured intent")
        app.otherElements["editor.tabs"].buttons["Preview"].tap()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 10))
        let open = app.webViews.buttons["Open"]
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        XCTAssertTrue(app.webViews.staticTexts["Hello preview"].waitForExistence(timeout: 5))
        capture(app, "Native interactive preview — dialog opened")
        app.buttons["preview.system"].tap(); app.buttons["Ant Design"].tap()
        XCTAssertTrue(app.webViews.buttons["Open"].waitForExistence(timeout: 5))
        app.otherElements["preview.output"].buttons["Flow"].tap()
        XCTAssertTrue(app.scrollViews["preview.flow"].exists)
        capture(app, "Native flow output")
        app.otherElements["preview.output"].buttons["JSON"].tap()
        app.buttons["preview.copyJSON"].tap()
        XCTAssertTrue(app.buttons["JSON copied"].exists)
        app.otherElements["editor.tabs"].buttons["Intent"].tap()
        XCTAssertTrue((app.textFields["intent.0"].value as? String ?? "").contains("Open"))
        app.terminate()
        let legacy = launch(["--legacy"])
        legacy.otherElements["editor.tabs"].buttons["Preview"].tap()
        XCTAssertTrue(legacy.webViews.staticTexts["Create omnichannel campaign"].waitForExistence(timeout: 10))
        capture(legacy, "Native legacy workflow interface")
        let action = legacy.webViews.buttons["Create a campaign"]
        for _ in 0..<5 { if action.isHittable { break }; legacy.webViews.firstMatch.swipeUp() }
        XCTAssertTrue(action.isHittable)
        action.tap()
        XCTAssertTrue(legacy.webViews.buttons["Interface action completed"].waitForExistence(timeout: 5))
    }
    func testKeyboardCancelShareAddMemberCommentsResolveReopenAndNextSave() {
        let app = launch()
        let given = app.textFields["intent.0"]
        given.tap(); given.typeText(" ")
        XCTAssertTrue(app.buttons["editor.keyboardDone"].waitForExistence(timeout: 4))
        capture(app, "Native keyboard and safe area")
        app.buttons["editor.keyboardDone"].tap()
        app.buttons["editor.save"].tap()
        XCTAssertTrue(app.staticTexts["Saved source"].waitForExistence(timeout: 8))
        open("Share", app)
        XCTAssertTrue(app.buttons["share.copy"].exists)
        app.textFields["share.email"].tap(); app.textFields["share.email"].typeText("collaborator@example.invalid")
        app.buttons["Hide keyboard"].tap()
        app.buttons["collaboration.done"].tap()
        XCTAssertTrue(app.buttons["Keep editing"].waitForExistence(timeout: 5))
        app.buttons["Keep editing"].tap()
        XCTAssertEqual(app.textFields["share.email"].value as? String, "collaborator@example.invalid")
        app.buttons["share.add"].tap()
        XCTAssertTrue(app.staticTexts["Membership added. No invitation email was sent by this action."].waitForExistence(timeout: 8))
        capture(app, "Native share — isolated membership fixture")
        app.buttons["collaboration.done"].tap()
        open("Comments", app)
        app.textViews["comments.body"].tap(); XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5)); app.textViews["comments.body"].typeText("Review note")
        XCTAssertEqual(app.textViews["comments.body"].value as? String, "Review note")
        app.buttons["Hide keyboard"].tap()
        app.buttons["collaboration.done"].tap()
        XCTAssertTrue(app.buttons["Keep editing"].waitForExistence(timeout: 5))
        capture(app, "Native unsent comment preserved on close")
        app.buttons["Keep editing"].tap()
        XCTAssertEqual(app.textViews["comments.body"].value as? String, "Review note")
        app.buttons["comments.add"].tap()
        XCTAssertTrue(app.staticTexts["Review note"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["Resolve"].tap()
        XCTAssertTrue(app.buttons["Reopen"].waitForExistence(timeout: 8))
        app.buttons["Reopen"].tap()
        XCTAssertTrue(app.buttons["Resolve"].waitForExistence(timeout: 8))
        capture(app, "Native flat comments — resolve and reopen")
        app.buttons["collaboration.done"].tap()
        app.textFields["intent.0"].tap(); app.textFields["intent.0"].typeText(" ")
        app.buttons["editor.keyboardDone"].tap(); app.buttons["editor.save"].tap()
        XCTAssertTrue(app.staticTexts["Saved source"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["editor.recover"].exists)
    }
    func testViewerCannotEditInviteOrCommentAndSheetCancellationReturnsToProject() {
        let app = launch(["--viewer"])
        XCTAssertFalse(app.buttons["editor.save"].exists)
        XCTAssertFalse(app.textFields["intent.0"].isEnabled)
        open("Share", app); XCTAssertFalse(app.buttons["share.add"].exists)
        capture(app, "Native Viewer share permissions")
        app.buttons["collaboration.done"].tap()
        open("Comments", app); XCTAssertFalse(app.buttons["comments.add"].exists)
        XCTAssertTrue(app.staticTexts["Viewer access: comments are read-only."].exists)
        app.buttons["collaboration.done"].tap()
        XCTAssertTrue(app.textFields["intent.0"].exists)
    }
    func test409RetainsDraftAndBlocksCollaborationUntilManualReview() {
        let app = launch(["--conflict"])
        let field = app.textFields["intent.0"]; field.tap(); field.typeText(" local")
        app.buttons["editor.keyboardDone"].tap(); app.buttons["editor.save"].tap()
        XCTAssertTrue(app.buttons["editor.recover"].waitForExistence(timeout: 8))
        app.buttons["editor.collaboration"].tap(); app.buttons["Share"].tap()
        XCTAssertFalse(app.buttons["collaboration.done"].exists)
        app.buttons["editor.recover"].tap()
        XCTAssertTrue(app.buttons["recovery.reviewed"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Copy my draft"].exists)
        capture(app, "Native conflict — manual recovery and preserved draft")
        app.buttons["Cancel"].tap()
        XCTAssertTrue((field.value as? String ?? "").contains("local"))
    }
    func testLargeTextLandscapeSafeAreasAndCommenterPermissions() {
        let app = launch(["--commenter", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(app.buttons["editor.collaboration"].isHittable)
        capture(app, "Native accessibility text size portrait")
        app.otherElements["editor.tabs"].buttons["Preview"].tap()
        let output = app.otherElements["preview.output"]
        XCTAssertTrue(output.buttons["Flow"].waitForExistence(timeout: 5))
        output.buttons["Flow"].tap()
        XCUIDevice.shared.orientation = .landscapeLeft
        let rotated = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.frame.width > app.frame.height }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [rotated], timeout: 5), .completed)
        XCTAssertTrue(app.scrollViews["preview.flow"].waitForExistence(timeout: 5))
        app.scrollViews["preview.scroll"].swipeUp()
        capture(app, "Native accessibility text size landscape flow")
        XCUIDevice.shared.orientation = .portrait
        let portrait = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            app.frame.height > app.frame.width && app.buttons["editor.collaboration"].frame.maxX <= app.frame.width
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [portrait], timeout: 5), .completed)
        capture(app, "Native accessibility return to portrait")
        open("Share", app)
        XCTAssertTrue(app.buttons["share.copy"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["collaboration.done"].isHittable)
        capture(app, "Native accessibility Share portrait")
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.frame.width > app.frame.height }, object: nil)], timeout: 5), .completed)
        capture(app, "Native accessibility Share landscape")
        app.buttons["collaboration.done"].tap()
        XCUIDevice.shared.orientation = .portrait
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.frame.height > app.frame.width }, object: nil)], timeout: 5), .completed)
        open("Comments", app)
        XCTAssertTrue(app.textViews["comments.body"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["collaboration.done"].isHittable)
        capture(app, "Native accessibility Comments portrait")
        app.buttons["collaboration.done"].tap()
        XCTAssertTrue(app.otherElements["editor.tabs"].buttons["Preview"].isSelected)
    }
    func testMaximumTextCommentPositionStacksAndKeepsLongSelectionReadable() {
        let app = launch(["--commenter", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        open("Comments", app)
        let label = app.staticTexts["comments.positionLabel"]
        let position = app.buttons["comments.position"]
        XCTAssertTrue(position.waitForExistence(timeout: 5))
        XCTAssertEqual(position.label, "Position label")
        XCTAssertEqual(position.value as? String, "General")
        XCTAssertGreaterThanOrEqual(position.frame.minY, label.frame.maxY)
        XCTAssertGreaterThanOrEqual(position.frame.height, 44)
        XCTAssertGreaterThanOrEqual(position.frame.minX, 0)
        XCTAssertLessThanOrEqual(position.frame.maxX, app.frame.width)
        XCTAssertTrue(position.isHittable)
        capture(app, "Comments maximum text — General stacked")
        position.tap()
        XCTAssertTrue(app.buttons["Generated JSON"].waitForExistence(timeout: 5))
        app.buttons["Generated JSON"].tap()
        XCTAssertEqual(position.value as? String, "Generated JSON")
        XCTAssertTrue(position.isHittable)
        XCTAssertGreaterThanOrEqual(position.frame.height, 44)
        capture(app, "Comments maximum text — long selection wrapped")
        app.buttons["collaboration.done"].tap()
        XCTAssertTrue(app.otherElements["editor.tabs"].exists)
    }
    func testOfflineSaveRetainsDraftAcrossRelaunch() {
        let app = launch(["--offline"])
        let field = app.textFields["intent.0"]; field.tap(); field.typeText(" offline")
        app.buttons["editor.keyboardDone"].tap(); app.buttons["editor.save"].tap()
        XCTAssertTrue(app.staticTexts["editor.error"].waitForExistence(timeout: 8))
        app.terminate(); app.launchArguments.append("--restore-draft"); app.launch()
        XCTAssertTrue(app.staticTexts["editor.restored"].waitForExistence(timeout: 10))
        XCTAssertTrue((app.textFields["intent.0"].value as? String ?? "").contains("offline"))
        capture(app, "Native offline draft restored")
    }
}

final class ReviewDemoUITests: XCTestCase {
    func testIrisCorrectionsEditingAndCollaboration() {
        continueAfterFailure = false
        let app = XCUIApplication(); app.launchArguments = ["--uitest-login"]; app.launch()
        XCTAssertTrue(app.buttons["demo.open"].waitForExistence(timeout: 10)); app.buttons["demo.open"].tap()
        XCTAssertTrue(app.staticTexts["Sample interaction"].waitForExistence(timeout: 10)); app.staticTexts["Sample interaction"].tap()
        XCTAssertTrue(app.textFields["intent.0"].waitForExistence(timeout: 10))
        func shot(_ name: String) { let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        app.textFields["intent.0"].tap(); app.textFields["intent.0"].typeText(" ")
        shot("corrected-active-edit")
        app.buttons["editor.keyboardDone"].tap()
        app.buttons["intent.and.0"].tap()
        let continuation = app.textFields["intent.1"]
        XCTAssertTrue(continuation.waitForExistence(timeout: 5)); continuation.tap(); continuation.typeText("a second condition")
        XCTAssertTrue((app.textFields["intent.2"].value as? String ?? "").contains("clicks"))
        shot("corrected-contextual-and-edit")
        app.buttons["editor.keyboardDone"].tap(); shot("corrected-contextual-and-reading")
        app.buttons["editor.save"].tap()
        XCTAssertTrue(app.staticTexts["Saved on this device"].waitForExistence(timeout: 8))
        app.buttons["editor.collaboration"].tap(); app.buttons["Share"].tap()
        XCTAssertTrue(app.buttons["share.copy"].waitForExistence(timeout: 8)); shot("corrected-sample-share")
        app.buttons["collaboration.done"].tap()
        app.buttons["editor.collaboration"].tap(); app.buttons["Comments"].tap()
        XCTAssertTrue(app.textViews["comments.body"].waitForExistence(timeout: 8)); app.textViews["comments.body"].tap(); for character in "Sample review note" { app.textViews["comments.body"].typeText(String(character)) }
        XCTAssertEqual(app.textViews["comments.body"].value as? String, "Sample review note")
        app.buttons["Hide keyboard"].tap(); app.buttons["comments.add"].tap()
        XCTAssertTrue(app.staticTexts["Sample review note"].waitForExistence(timeout: 8)); shot("corrected-sample-comments")
    }
    func testFocusedPreviewInteractionRecording() {
        continueAfterFailure = false
        let app = XCUIApplication(); app.launchArguments = ["--uitest-login"]; app.launch()
        XCTAssertTrue(app.buttons["demo.open"].waitForExistence(timeout: 10)); app.buttons["demo.open"].tap()
        XCTAssertTrue(app.staticTexts["Sample interaction"].waitForExistence(timeout: 10)); app.staticTexts["Sample interaction"].tap()
        XCTAssertTrue(app.otherElements["editor.tabs"].waitForExistence(timeout: 10)); app.otherElements["editor.tabs"].buttons["Preview"].tap()
        XCTAssertTrue(app.webViews.buttons["Open"].waitForExistence(timeout: 10))
        print("FOCUSED_PREVIEW_READY")
        // Short dwell makes the actual tap/result readable in the requested recording.
        Thread.sleep(forTimeInterval: 3)
        app.webViews.buttons["Open"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Hello preview"].waitForExistence(timeout: 5))
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); a.name = "corrected-open-details"; a.lifetime = .keepAlways; add(a)
        Thread.sleep(forTimeInterval: 5)
        print("FOCUSED_PREVIEW_COMPLETE")
    }
    func testVisualReview() {
        continueAfterFailure = false
        let app = XCUIApplication(); app.launchArguments = ["--uitest-login"]; app.launch()
        XCTAssertTrue(app.buttons["demo.open"].waitForExistence(timeout: 10)); app.buttons["demo.open"].tap()
        XCTAssertTrue(app.staticTexts["Sample interaction"].waitForExistence(timeout: 10))
        func shot(_ name: String) { let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
        shot("review-projects-light")
        app.staticTexts["Sample interaction"].tap()
        XCTAssertTrue(app.textFields["intent.0"].waitForExistence(timeout: 10)); shot("review-intent-light")
        app.otherElements["editor.tabs"].buttons["Preview"].tap()
        XCTAssertTrue(app.webViews.buttons["Open"].waitForExistence(timeout: 10)); shot("review-preview-light")
        app.webViews.buttons["Open"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Hello preview"].waitForExistence(timeout: 5)); shot("review-preview-interaction")
    }
    func testDemoCreatesWorkflowAndAddsOnlySampleTeammate() {
        continueAfterFailure = false
        let app = XCUIApplication(); app.launchArguments = ["--uitest-login"]; app.launch()
        XCTAssertTrue(app.buttons["demo.open"].waitForExistence(timeout: 10))
        for _ in 0..<3 { if app.buttons["demo.open"].isHittable { break }; app.swipeUp() }
        app.buttons["demo.open"].tap()
        // Static toolbar branding must not swallow the adjacent account action.
        XCTAssertTrue(app.buttons["Account"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["Account"].isHittable)
        app.buttons["Account"].tap()
        XCTAssertTrue(app.navigationBars["Account"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        XCTAssertTrue(app.buttons["workflow.create"].waitForExistence(timeout: 8)); app.buttons["workflow.create"].tap()
        app.textFields["workflow.name"].tap(); app.textFields["workflow.name"].typeText("Review sample")
        app.buttons["workflow.submit"].tap()
        XCTAssertTrue(app.buttons["editor.collaboration"].waitForExistence(timeout: 8))
        app.buttons["editor.collaboration"].tap(); app.buttons["Share"].tap()
        XCTAssertTrue(app.textFields["share.email"].waitForExistence(timeout: 8))
        app.textFields["share.email"].tap(); app.textFields["share.email"].typeText("teammate@example.invalid")
        app.buttons["Hide keyboard"].tap(); app.buttons["share.add"].tap()
        XCTAssertTrue(app.staticTexts["Sample teammate added on this device. No invitation was sent."].waitForExistence(timeout: 8))
        let proof = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); proof.name = "Sample collaboration with no cloud invitation"; proof.lifetime = .keepAlways; add(proof)
    }
    func testVisibleDemoCanEditPreviewCollaborateExitAndReset() {
        continueAfterFailure = false
        let app = XCUIApplication(); app.launchArguments = ["--uitest-login"]; app.launch()
        XCTAssertTrue(app.buttons["auth.apple"].waitForExistence(timeout: 10))
        for _ in 0..<3 { if app.buttons["demo.open"].isHittable { break }; app.swipeUp() }
        app.buttons["demo.open"].tap()
        XCTAssertTrue(app.buttons["workflow.create"].waitForExistence(timeout: 10))
        app.staticTexts["Sample interaction"].tap()
        XCTAssertTrue(app.textFields["intent.0"].waitForExistence(timeout: 8))
        app.textFields["intent.0"].tap(); app.textFields["intent.0"].typeText(" ")
        app.buttons["editor.keyboardDone"].tap(); app.buttons["editor.save"].tap()
        XCTAssertTrue(app.staticTexts["Saved on this device"].waitForExistence(timeout: 8))
        app.otherElements["editor.tabs"].buttons["Preview"].tap()
        XCTAssertTrue(app.webViews.buttons["Open"].waitForExistence(timeout: 10))
        app.webViews.buttons["Open"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Hello preview"].waitForExistence(timeout: 5))
        app.buttons["editor.collaboration"].tap(); app.buttons["Comments"].tap()
        XCTAssertTrue(app.textViews["comments.body"].waitForExistence(timeout: 5))
        app.textViews["comments.body"].tap(); app.textViews["comments.body"].typeText("Sample local comment")
        app.buttons["Hide keyboard"].tap(); app.buttons["comments.add"].tap()
        XCTAssertTrue(app.staticTexts["Sample local comment"].waitForExistence(timeout: 8))
        app.buttons["collaboration.done"].tap()
        let proof = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); proof.name = "Visible sample workspace"; proof.lifetime = .keepAlways; add(proof)
        app.buttons["demo.exit"].tap(); app.buttons["demo.confirmExit"].tap()
        XCTAssertTrue(app.buttons["demo.open"].waitForExistence(timeout: 8))
        app.buttons["demo.open"].tap()
        XCTAssertTrue(app.staticTexts["Sample interaction"].waitForExistence(timeout: 8)); app.staticTexts["Sample interaction"].tap()
        XCTAssertTrue(app.buttons["editor.collaboration"].waitForExistence(timeout: 8))
        app.buttons["editor.collaboration"].tap(); app.buttons["Comments"].tap()
        XCTAssertTrue(app.textViews["comments.body"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Sample local comment"].exists)
    }
}

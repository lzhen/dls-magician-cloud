import XCTest

final class LoginSmokeTests: XCTestCase {
    func testRealLaunchAndEmailExpansion() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        // Fresh CI simulator has no session. This uses the real public /api/config;
        // an unavailable backend fails honestly instead of injecting fake auth state.
        let microsoft = app.buttons["auth.microsoft"]
        XCTAssertTrue(microsoft.waitForExistence(timeout: 40), "Real launch must reach the signed-out screen.")
        XCTAssertTrue(app.buttons["auth.google"].exists)
        XCTAssertGreaterThanOrEqual(microsoft.frame.height, 44)
        capture(app, name: "Native login after real launch")
        let email = app.buttons["auth.email"]
        app.swipeUp()
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        email.tap()
        XCTAssertTrue(app.textFields["auth.emailAddress"].waitForExistence(timeout: 5))
        capture(app, name: "Native email form with no credentials entered")
        // Do not submit email, open OAuth, or mutate a real account.
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

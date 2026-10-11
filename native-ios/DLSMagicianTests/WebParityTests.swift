import XCTest
@testable import DLSMagician

final class WebParityTests: XCTestCase {
    private func cases() throws -> [[String: Any]] {
        let value = try JSONSerialization.jsonObject(with: Data(WebParityFixtures.json.utf8)) as! [String: Any]
        return value["cases"] as! [[String: Any]]
    }
    func testNativeParserMatchesIndependentProductionWebGoldenCorpus() throws {
        for item in try cases() {
            let source = item["source"] as! String, name = item["name"] as! String
            let document = IntentDocument(source: source)
            let actual = try JSONSerialization.jsonObject(with: JSONEncoder().encode(document.generated(name: name))) as! NSDictionary
            XCTAssertEqual(actual, item["expected"] as! NSDictionary, name)
            XCTAssertEqual(document.source, source, "Opening or parsing must preserve exact source bytes: \(name)")
        }
    }
    func testLegacyInterfaceMatchesProductionFallbackAcrossSystems() throws {
        for item in try cases() {
            let source = item["source"] as! String, name = item["name"] as! String
            for system in PrototypeSystem.allCases {
                let snapshot = try PrototypeSnapshot.build(source: source, name: name, system: system)
                let output = try JSONSerialization.jsonObject(with: Data(snapshot.json.utf8)) as! [String: Any]
                if output["previewEngine"] as? String == "components-v1" { continue }
                XCTAssertEqual(snapshot.interfaceHTML, (item["legacy"] as! [String: String])[system.rawValue], "\(name) / \(system)")
                XCTAssertFalse(snapshot.interfaceHTML.contains("Add a supported component"))
                XCTAssertEqual((output["designSystem"] as? [String: Any])?["selectionScope"] as? String, "this-device")
            }
        }
    }
    func testIndentedStructuredEditPreservesOtherRawBytes() {
        let source = "preamble\r\n  gIvEn \t\r\n  context 🪄\r\n\tWHEN\r\ntrigger\r\n  THEN\r\noutcome"
        let doc = IntentDocument(source: source)
        XCTAssertEqual(doc.blocks.map(\.kind), ["GIVEN", "WHEN", "THEN"])
        let edited = doc.replacing(1, with: "new trigger")
        XCTAssertTrue(edited.hasPrefix("preamble\r\n  gIvEn \t\r\n  context 🪄\r\n\tWHEN\r\n"))
        XCTAssertTrue(edited.hasSuffix("  THEN\r\noutcome"))
    }
}

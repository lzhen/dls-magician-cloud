import SwiftUI
import WebKit
import JavaScriptCore
import CryptoKit

struct PrototypeSnapshot {
    let source: String
    let system: PrototypeSystem
    let revision: String
    let json: String
    let html: String
    let steps: [GeneratedWorkflow.Step]

    static func build(source: String, name: String, system: PrototypeSystem) throws -> Self {
        let revision = SHA256.hash(data: Data((source + "\u{0}" + system.rawValue).utf8)).map { String(format: "%02x", $0) }.joined()
        let generated = IntentDocument(source: source).generated(name: name)
        let data = try JSONEncoder().encode(generated)
        guard let context = JSContext() else { throw AppFailure.invalidResponse }
        var scriptFailure = false
        context.exceptionHandler = { _, _ in scriptFailure = true }
        func asset(_ name: String, _ ext: String) throws -> String {
            guard let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "PreviewAssets") else { throw AppFailure.configuration }
            return try String(contentsOf: url, encoding: .utf8)
        }
        let interactions = try asset("interaction-engine", "js")
        let renderer = try asset("component-preview", "js")
        context.evaluateScript(interactions)
        context.evaluateScript(renderer)
        context.setObject(String(decoding: data, as: UTF8.self), forKeyedSubscript: "inputJSON" as NSString)
        context.setObject(system.rawValue, forKeyedSubscript: "systemID" as NSString)
        context.setObject(system.name, forKeyedSubscript: "systemName" as NSString)
        let script = "(()=>{const result=DLSComponentPreview.output(JSON.parse(inputJSON),systemID,{name:systemName,source:'Built-in',selectionScope:'this-device'});result.designSystem=result.designSystem||{id:systemID,name:systemName,source:'Built-in',selectionScope:'this-device',implementation:'html-preview',components:[]};return JSON.stringify(result,null,2)})()"
        guard let json = context.evaluateScript(script)?.toString(), !scriptFailure, json != "undefined" else { throw AppFailure.invalidResponse }
        let spec = Data(json.utf8).base64EncodedString()
        let css = try asset("component-preview", "css")
        // Generated content never enters executable JS: decode a base64 JSON value.
        // The CSP and navigation delegate deny all network and file navigations.
        let html = """
        <!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>html,body{margin:0;background:#fff;font-family:system-ui}*{box-sizing:border-box}\(css).component-preview{min-height:240px;padding:20px 12px}.cp-canvas{min-width:0} .cp-notice{padding:16px;font-size:14px;color:#55486a}</style></head><body><main id="preview"></main><script>\(interactions)</script><script>\(renderer)</script><script>
        const spec=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('\(spec)'),c=>c.charCodeAt(0))));
        if(spec.components&&spec.components.length){document.getElementById('preview').innerHTML=DLSComponentPreview.render(spec,'\(system.rawValue)');}else{document.getElementById('preview').textContent='Add a supported component such as a button or input to preview an interface. Your current source remains available in Flow and JSON.';document.getElementById('preview').style.padding='24px';}
        DLSComponentPreview.bindEvents(document);DLSInteractions.bind(document);
        </script></body></html>
        """
        return Self(source: source, system: system, revision: revision, json: json, html: html, steps: generated.steps)
    }
}

// Only the prototype canvas is HTML. No app navigation, auth, API tokens or remote page.
struct PrototypeCanvas: UIViewRepresentable {
    let snapshot: PrototypeSnapshot
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.accessibilityIdentifier = "preview.canvas"
        view.scrollView.keyboardDismissMode = .interactive
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        guard context.coordinator.revision != snapshot.revision else { return }
        context.coordinator.revision = snapshot.revision
        view.loadHTMLString(snapshot.html, baseURL: nil)
    }
    final class Coordinator: NSObject, WKNavigationDelegate {
        var revision: String?
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(action.request.url?.absoluteString == "about:blank" && action.navigationType == .other ? .allow : .cancel)
        }
        func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) { completionHandler(.cancelAuthenticationChallenge, nil) }
    }
}

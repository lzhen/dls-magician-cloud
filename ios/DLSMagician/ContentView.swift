import SwiftUI
import WebKit

struct ContentView: View {
    @State private var webView = WKWebView()
    @State private var isLoading = true
    @State private var loadError: String?

    private let productURL = URL(string: "https://dlsmagician.empathie.ai")!

    var body: some View {
        ZStack {
            Color(red: 0.03, green: 0.03, blue: 0.04)
                .ignoresSafeArea()

            ProductWebView(
                webView: webView,
                url: productURL,
                isLoading: $isLoading,
                loadError: $loadError
            )
            .ignoresSafeArea(.container, edges: .bottom)

            if isLoading {
                LaunchOverlay()
                    .transition(.opacity)
            }

            if let loadError {
                OfflineView(message: loadError) {
                    self.loadError = nil
                    self.isLoading = true
                    webView.load(URLRequest(url: productURL))
                }
            }
        }
        .animation(.easeOut(duration: 0.22), value: isLoading)
        .statusBarHidden(false)
    }
}

private struct LaunchOverlay: View {
    var body: some View {
        ZStack {
            Color(red: 0.03, green: 0.03, blue: 0.04)
                .ignoresSafeArea()

            VStack(spacing: 22) {
                Image("AppMark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 78, height: 78)
                    .accessibilityHidden(true)

                VStack(spacing: 5) {
                    Text("DLS")
                        .foregroundStyle(.secondary)
                    + Text(" MAGICIAN")
                        .foregroundStyle(.primary)

                    Text("Preparing your workspace…")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .font(.system(.title3, design: .serif, weight: .medium))

                ProgressView()
                    .tint(.white.opacity(0.72))
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("DLS Magician is loading")
    }
}

private struct OfflineView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.03, green: 0.03, blue: 0.04)
                .ignoresSafeArea()

            VStack(spacing: 18) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 34, weight: .light))
                    .foregroundStyle(.secondary)

                VStack(spacing: 7) {
                    Text("Connection interrupted")
                        .font(.system(.title2, design: .serif, weight: .semibold))

                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                }

                Button("Try Again", action: retry)
                    .buttonStyle(.borderedProminent)
                    .tint(.white)
                    .foregroundStyle(.black)
                    .controlSize(.large)
            }
            .padding(30)
        }
    }
}

private struct ProductWebView: UIViewRepresentable {
    let webView: WKWebView
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, loadError: $loadError)
    }

    func makeUIView(context: Context) -> WKWebView {
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.04, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.load(URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        @Binding private var isLoading: Bool
        @Binding private var loadError: String?

        init(isLoading: Binding<Bool>, loadError: Binding<String?>) {
            _isLoading = isLoading
            _loadError = loadError
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            loadError = nil
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            present(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            present(error)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if let scheme = url.scheme, ["mailto", "tel"].contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        private func present(_ error: Error) {
            let nsError = error as NSError
            if nsError.code == NSURLErrorCancelled { return }
            isLoading = false
            loadError = "Check your internet connection and try again."
        }
    }
}

#Preview {
    ContentView()
}

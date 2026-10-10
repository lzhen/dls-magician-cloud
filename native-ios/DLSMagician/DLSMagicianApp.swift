import SwiftUI

@main
struct DLSMagicianApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(model)
                .tint(DLSTheme.text)
                .task { await model.start() }
                .onOpenURL { url in Task { await model.receive(url) } }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var app: AppModel
    var body: some View {
        Group {
        switch app.phase {
        case .launching:
            VStack(spacing: 20) {
                BrandMark()
                ProgressView("Opening your workspace…")
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        case .signedOut: LoginView()
        case .workspace: WorkspaceView()
        case .unavailable:
            VStack(spacing: 20) {
                BrandMark()
                Text("Your workspace couldn’t open").font(.custom("Georgia", size: 28, relativeTo: .title))
                Text(app.notice ?? "Check your connection and try again.").foregroundStyle(DLSTheme.soft).multilineTextAlignment(.center)
                Button("Try again") { Task { await app.start() } }.buttonStyle(DLSPrimaryButtonStyle())
                Button("Sign out on this device") { Task { await app.signOut() } }.disabled(app.busy)
            }.padding(28)
        }
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DLSTheme.background.ignoresSafeArea())
            .foregroundStyle(DLSTheme.text)
    }
}

struct BrandMark: View {
    var size: CGFloat = 44
    var body: some View {
        Image("BrandMark").resizable().scaledToFit().frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: 8)).accessibilityHidden(true)
    }
}

struct NoticeView: View {
    let text: String
    var body: some View {
        Label(text, systemImage: "info.circle").font(.callout).foregroundStyle(DLSTheme.soft)
            .padding().frame(maxWidth: .infinity, alignment: .leading)
            .background(DLSTheme.surface2, in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.border, lineWidth: 1))
            .accessibilityElement(children: .combine)
    }
}

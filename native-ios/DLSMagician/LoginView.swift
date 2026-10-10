import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.colorScheme) private var scheme
    @State private var email = ""
    @State private var magicOpen = false
    @FocusState private var emailFocused: Bool
    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                ScrollView {
                    VStack(spacing: 0) {
                        VStack(spacing: 22) {
                            VStack(spacing: 12) {
                                BrandMark(size: 38).padding(.bottom, 4)
                                VStack(spacing: 0) {
                                    Text("Welcome to")
                                    (Text("DLS ").foregroundColor(DLSTheme.muted) + Text("Magician"))
                                }.font(DLSTheme.authTitle)
                                    .foregroundStyle(DLSTheme.text).multilineTextAlignment(.center)
                                Text("Secure sign-in for teams. No product password required.")
                                    .font(.subheadline).foregroundStyle(DLSTheme.muted)
                                    .multilineTextAlignment(.center)
                            }.padding(.bottom, 4)
                            VStack(spacing: 10) {
                                Button { emailFocused = false; Task { await app.signIn(.azure) } } label: {
                                    DLSProviderRow(kind: .microsoft, label: "Continue with Microsoft")
                                }.accessibilityIdentifier("auth.microsoft")
                                Button { emailFocused = false; Task { await app.signIn(.google) } } label: {
                                    DLSProviderRow(kind: .google, label: "Continue with Google")
                                }.accessibilityIdentifier("auth.google")
                            }.buttonStyle(.plain).disabled(app.busy).opacity(app.busy ? 0.5 : 1)
                            HStack(spacing: 14) {
                                Rectangle().fill(DLSTheme.border).frame(height: 1)
                                Text("or").font(.caption).foregroundStyle(DLSTheme.muted)
                                Rectangle().fill(DLSTheme.border).frame(height: 1)
                            }
                            VStack(spacing: 12) {
                                Button { magicOpen.toggle(); emailFocused = magicOpen } label: {
                                    DLSProviderRow(kind: .email, label: "Email magic link", expanded: magicOpen)
                                }.buttonStyle(.plain).disabled(app.busy).accessibilityIdentifier("auth.email")
                                if magicOpen {
                                    TextField("you@company.com", text: $email)
                                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                                        .focused($emailFocused).submitLabel(.go)
                                        .padding(.horizontal, 14).frame(minHeight: 48)
                                        .foregroundStyle(DLSTheme.text)
                                        .background(DLSTheme.surface, in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
                                        .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.editableOutline, lineWidth: 1))
                                        .accessibilityLabel("Work email")
                                        .accessibilityIdentifier("auth.emailAddress")
                                    Button {
                                        emailFocused = false
                                        Task { await app.sendMagicLink(email) }
                                    } label: { Text("Send link").frame(maxWidth: .infinity) }
                                        .buttonStyle(DLSPrimaryButtonStyle())
                                        .disabled(app.busy || !email.contains("@") || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                }
                            }
                            if app.busy {
                                HStack { ProgressView(); Text("Completing sign-in…").font(.callout) }
                                Button("Cancel sign-in") { app.cancelSignIn() }.frame(minHeight: 44)
                            }
                            if let notice = app.notice { NoticeView(text: notice) }
                            Label("Authentication is secured by Supabase. Your account is recorded when you sign in.", systemImage: "shield")
                                .font(.footnote).foregroundStyle(DLSTheme.muted).padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(DLSTheme.surface2, in: RoundedRectangle(cornerRadius: 8))
                            VStack(spacing: 6) {
                                Text("By continuing, you agree to the").foregroundStyle(DLSTheme.muted)
                                ViewThatFits(in: .horizontal) {
                                    HStack(spacing: 5) { legalLinks }
                                    VStack(spacing: 8) { legalLinks }
                                }
                            }.font(.footnote).multilineTextAlignment(.center).tint(DLSTheme.soft)
                        }
                        .padding(.horizontal, 20).padding(.top, 28).padding(.bottom, 22)
                        .frame(maxWidth: 420)
                        .background {
                            DLSGradientSurface(role: .authCard)
                                .clipShape(RoundedRectangle(cornerRadius: DLSTheme.radiusMobileCard))
                        }
                        .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusMobileCard).stroke(DLSTheme.border, lineWidth: 1))
                        .shadow(color: .black.opacity(scheme == .dark ? 0.25 : 0.08), radius: 28, y: 14)
                    }.padding(.horizontal, 18).padding(.vertical, 28)
                        .frame(maxWidth: .infinity, minHeight: geometry.size.height)
                }.scrollDismissesKeyboard(.interactively)
                    .background { DLSGradientSurface(role: .authBackground).ignoresSafeArea() }
            }
            .toolbarBackground(DLSTheme.background, for: .navigationBar)
            .toolbar(.hidden, for: .navigationBar)
        }
    }
    @ViewBuilder private var legalLinks: some View {
        Link("Terms of Service", destination: AppConfiguration.apiOrigin.appendingPathComponent("terms.html"))
        Text("and").foregroundStyle(DLSTheme.muted)
        Link("Privacy Policy", destination: AppConfiguration.apiOrigin.appendingPathComponent("privacy.html"))
    }
}

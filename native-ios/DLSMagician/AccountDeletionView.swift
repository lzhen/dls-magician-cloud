import SwiftUI

struct AccountDeletionView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @StateObject private var model: AccountDeletionModel
    @State private var confirmPresented = false
    @State private var reauthenticationPresented = false
    let isRecoveryRoot: Bool

    init(userID: String, receipt: AccountDeletionReceipt? = nil, isRecoveryRoot: Bool = false) {
        _model = StateObject(wrappedValue: AccountDeletionModel(userID: userID, receipt: receipt))
        self.isRecoveryRoot = isRecoveryRoot
    }
    private var canClose: Bool { !isRecoveryRoot && !model.busy && model.receipt == nil }

    var body: some View {
        Form {
            if let receipt = model.receipt {
                Section {
                    Label(receipt.confirmedDeleted ? "Account deleted; device cleanup remains" : "Deletion needs verification",
                          systemImage: receipt.confirmedDeleted ? "checkmark.shield" : "exclamationmark.shield")
                        .font(.headline)
                    Text(receipt.confirmedDeleted
                         ? "The server confirmed deletion. Finish clearing this account’s saved data from this device."
                         : "Your recovery receipt is saved securely on this device. An interrupted response does not confirm completion. Check the status before taking any other action.")
                        .foregroundStyle(DLSTheme.soft)
                    if let reference = model.reference {
                        LabeledContent("Recovery reference") { Text(reference).textSelection(.enabled) }
                    }
                }.listRowBackground(DLSTheme.surface)
                Section {
                    if receipt.confirmedDeleted {
                        Button("Finish device cleanup") { Task { await model.finishLocalCleanup(using: app) } }
                            .disabled(model.busy)
                    } else {
                        Button("Check deletion status") { Task { await model.checkStatus(using: app) } }
                            .disabled(model.busy).accessibilityIdentifier("deletion.checkStatus")
                    }
                    Link("Open help", destination: AppConfiguration.apiOrigin.appendingPathComponent("help.html"))
                } footer: {
                    Text("Recovery applies only to the account that requested deletion. A different account you sign into stays separate.")
                }.listRowBackground(DLSTheme.surface)
            } else if let current = app.user, current.id != model.userID {
                Section {
                    Text("The signed-in account changed. Return to Account and start a new review for your current account.")
                }.listRowBackground(DLSTheme.surface)
            } else {
                Section {
                    Text("Delete your account").font(DLSTheme.accountTitle)
                    Text("Deletion is permanent. Review what will be removed and what is retained before continuing.")
                        .foregroundStyle(DLSTheme.soft)
                }.listRowBackground(DLSTheme.surface)
                if let preview = model.preview {
                    Section("Data affected") {
                        LabeledContent("Private projects you own", value: String(preview.effects.ownedPrivateProjects))
                        LabeledContent("Your comments", value: String(preview.effects.comments))
                        LabeledContent("Your memberships", value: String(preview.effects.memberships))
                    }.listRowBackground(DLSTheme.surface)
                    Section("Retention") { Text(preview.retentionNotice).foregroundStyle(DLSTheme.soft) }
                        .listRowBackground(DLSTheme.surface)
                    if !preview.blockers.isEmpty {
                        Section("Resolve before deletion") {
                            ForEach(Array(preview.blockers.enumerated()), id: \.offset) { item in
                                Label(item.element.message, systemImage: "exclamationmark.circle")
                            }
                            Link("Open help", destination: AppConfiguration.apiOrigin.appendingPathComponent("help.html"))
                        }.listRowBackground(DLSTheme.surface)
                    }
                    if preview.canDelete && preview.blockers.isEmpty {
                        Section {
                            TextField("Type DELETE", text: $model.confirmation)
                                .textInputAutocapitalization(.characters).autocorrectionDisabled()
                                .keyboardType(.asciiCapable).submitLabel(.done)
                                .accessibilityIdentifier("deletion.confirmation")
                            Button("Delete account permanently", role: .destructive) { confirmPresented = true }
                                .disabled(!model.canConfirm || app.busy)
                                .accessibilityIdentifier("deletion.execute")
                        } footer: { Text("This review expires within five minutes. A changed or expired review requires a new confirmation.") }
                            .listRowBackground(DLSTheme.surface)
                    }
                }
                Section {
                    if model.needsReauthentication {
                        Button("Sign in again to continue") { reauthenticationPresented = true }
                            .disabled(model.busy || app.busy)
                    }
                    Button(model.preview == nil ? "Load deletion review" : "Refresh deletion review") {
                        Task { await model.load(using: app) }
                    }.disabled(model.busy || app.busy)
                }.listRowBackground(DLSTheme.surface)
            }
            if model.busy { Section { ProgressView("Please wait…") }.listRowBackground(DLSTheme.surface) }
            if let message = model.message {
                Section { Text(message).foregroundStyle(DLSTheme.soft) }.listRowBackground(DLSTheme.surface)
            }
        }
        .scrollContentBackground(.hidden).background(DLSTheme.background).foregroundStyle(DLSTheme.text)
        .navigationTitle("Account deletion").navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(!canClose)
        .toolbarBackground(DLSTheme.background, for: .navigationBar)
        .interactiveDismissDisabled(!canClose)
        .confirmationDialog("Permanently delete this account?", isPresented: $confirmPresented, titleVisibility: .visible) {
            Button("Delete account permanently", role: .destructive) { Task { await model.execute(using: app) } }
            Button("Keep account", role: .cancel) { }
        } message: { Text("The reviewed data will be removed permanently. This cannot be undone.") }
        .sheet(isPresented: $reauthenticationPresented) {
            LoginView().interactiveDismissDisabled(true)
                .safeAreaInset(edge: .top) {
                    HStack {
                        Spacer()
                        Button("Cancel sign-in") {
                            app.cancelSignIn()
                            if !app.auth.hasActiveSignIn { reauthenticationPresented = false }
                        }.frame(minHeight: 44)
                    }.padding(.horizontal).background(DLSTheme.background)
                }
        }
        .onChange(of: app.authenticationRevision) { _ in
            if reauthenticationPresented {
                reauthenticationPresented = false
                Task { await model.load(using: app) }
            }
        }
        .task {
            if model.receipt != nil && model.receipt?.confirmedDeleted == false { await model.checkStatus(using: app) }
            else if model.receipt == nil { await model.load(using: app) }
        }
    }
}

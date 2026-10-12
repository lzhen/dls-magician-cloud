import SwiftUI
import UIKit

struct CollaborationView: View {
    enum Mode { case share, comments }
    @ObservedObject var editor: EditorModel
    let mode: Mode
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var email = ""
    @State private var role = "Viewer"
    @State private var bodyText = ""
    @State private var anchor = "General"
    @State private var copied = false
    @State private var notice: String?
    @State private var discardPresented = false
    private var hasUnsentDraft: Bool { !email.isEmpty || !bodyText.isEmpty }
    @State private var pendingRole: RoleChange?
    @FocusState private var focused: Bool
    struct RoleChange: Identifiable { let memberID: String; let role: String; var id: String { memberID } }
    private var disabled: Bool { editor.busy || editor.collaborationNeedsRefresh || editor.hasConflict }
    var body: some View {
        NavigationStack {
            Form {
                if let error = editor.error { Section { Text(error).foregroundStyle(DLSTheme.soft) } }
                if let notice { Section { Text(notice).accessibilityIdentifier("collaboration.notice") } }
                if editor.collaborationNeedsRefresh || editor.hasConflict {
                    Section {
                        Button("Refresh and check result") { Task { await editor.refreshCollaboration(using: app) } }.disabled(editor.busy)
                        Text("If another edit changed the source, close this sheet and review the conflict in Intent.").font(.caption)
                    }
                }
                if mode == .share { shareContent } else { commentContent }
            }.scrollDismissesKeyboard(.interactively).scrollContentBackground(.hidden)
                .background(DLSTheme.background).foregroundStyle(DLSTheme.text).tint(DLSTheme.text)
                .toolbarBackground(DLSTheme.background, for: .navigationBar)
                .navigationTitle(mode == .share ? "Share" : "Comments").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { focused = false; if hasUnsentDraft { discardPresented = true } else { dismiss() } }.disabled(editor.busy).accessibilityIdentifier("collaboration.done") }
                    ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Hide keyboard") { focused = false } }
                }
        }.interactiveDismissDisabled(editor.busy || hasUnsentDraft)
            .confirmationDialog("Discard unsent draft?", isPresented: $discardPresented, titleVisibility: .visible) {
                Button("Discard draft", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) { }
            } message: { Text("Your unsent invitation or comment is still here. Keep editing to preserve it, or discard it to close.") }
            .alert(item: $pendingRole) { change in
                Alert(title: Text("Change project role?"), message: Text("Set this member to \(change.role)?"), primaryButton: .default(Text("Change")) {
                    Task {
                        let ok = await editor.mutate(using: app) { api, token in
                            _ = try await api.changeRole(projectID: editor.projectID, memberID: change.memberID, role: change.role, userID: editor.userID, token: token)
                        }
                        if ok { notice = "Role updated." }
                    }
                }, secondaryButton: .cancel())
            }
    }
    @ViewBuilder private var shareContent: some View {
        Section("Restricted project link") {
            Button(copied ? "Link copied" : (app.isDemo ? "Copy sample link" : "Copy restricted link")) {
                guard let url = app.isDemo ? URL(string: "https://example.invalid/demo/" + editor.projectID) : CollaborationPolicy.link(projectID: editor.projectID) else { return }
                UIPasteboard.general.url = url; copied = true
            }.accessibilityIdentifier("share.copy")
            Text(app.isDemo ? "This example.invalid link is a sample only and cannot open a cloud project." : "Recipients must sign in and already have project access. Copying this link grants no permissions.").font(.caption)
        }
        if editor.editable {
            Section("Invite people") {
                if app.isDemo { Text("Sample only: use teammate@example.invalid. No invitation or cloud access is created.").font(.caption) }
                TextField("Email address", text: $email).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .keyboardType(.emailAddress).focused($focused).accessibilityIdentifier("share.email")
                Picker("Role", selection: $role) {
                    ForEach(editor.role == "Admin" ? CollaborationPolicy.roles : ["Viewer", "Commenter", "Editor"], id: \.self) { Text($0).tag($0) }
                }
                Button(editor.collaborating ? "Adding…" : "Add member") {
                    focused = false
                    Task {
                        let ok = await editor.mutate(using: app) { api, token in
                            _ = try await api.invite(projectID: editor.projectID, email: email, role: role, userID: editor.userID, token: token)
                        }
                        if ok { email = ""; notice = app.isDemo ? "Sample teammate added on this device. No invitation was sent." : "Membership added. No invitation email was sent by this action." }
                    }
                }.disabled(disabled || !email.contains("@") || !(editor.project.map { CollaborationPolicy.canInvite(project: $0, userID: editor.userID, email: email.trimmingCharacters(in: .whitespacesAndNewlines), role: role) } ?? false))
                    .accessibilityIdentifier("share.add")
                Text("This adds a membership record. Share the restricted link separately. Editors can add new non-Admin members; only Admins change existing roles.").font(.caption)
            }.disabled(editor.busy)
        }
        Section("People with access") {
            ForEach(editor.project?.members ?? [], id: \.userId) { member in
                VStack(alignment: .leading, spacing: 6) {
                    Text(member.user?.name ?? member.userId)
                    Text(member.user?.email ?? "").font(.caption).foregroundStyle(DLSTheme.muted)
                    if editor.role == "Admin", member.userId != editor.project?.ownerId {
                        Picker("Role", selection: Binding(get: { member.role }, set: { pendingRole = .init(memberID: member.userId, role: $0) })) {
                            ForEach(CollaborationPolicy.roles, id: \.self) { Text($0).tag($0) }
                        }.disabled(disabled)
                    } else { Text(member.role + (member.userId == editor.project?.ownerId ? " · Owner" : "")).font(.caption) }
                }
            }
        }
    }
    @ViewBuilder private var commentContent: some View {
        if editor.canComment {
            Section("Add a comment") {
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Position label").fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("comments.positionLabel")
                        Menu {
                            Picker("Position label", selection: $anchor) {
                                ForEach(ProjectComment.anchors, id: \.self) { Text($0).tag($0) }
                            }
                        } label: {
                            HStack(alignment: .firstTextBaseline) {
                                Text(anchor).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 8)
                                Image(systemName: "chevron.up.chevron.down").font(.caption)
                            }.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).contentShape(Rectangle())
                        }.accessibilityLabel("Position label").accessibilityValue(anchor)
                            .accessibilityIdentifier("comments.position")
                    }
                } else {
                    Picker("Position label", selection: $anchor) { ForEach(ProjectComment.anchors, id: \.self) { Text($0).tag($0) } }
                }
                TextEditor(text: $bodyText).frame(minHeight: 100).focused($focused).accessibilityLabel("Comment text").accessibilityIdentifier("comments.body")
                Button(editor.collaborating ? "Adding…" : "Add comment") {
                    focused = false
                    Task {
                        let ok = await editor.mutate(using: app) { api, token in
                            _ = try await api.addComment(projectID: editor.projectID, body: bodyText, anchor: anchor, userID: editor.userID, token: token)
                        }
                        if ok { bodyText = ""; notice = "Comment added." }
                    }
                }.disabled(disabled || bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("comments.add")
                Text("Position labels describe context; they do not jump to an exact location. Comments are not threaded.").font(.caption)
            }.disabled(editor.busy)
        } else { Section { Text("Viewer access: comments are read-only.") } }
        Section("Comments") {
            if (editor.project?.comments ?? []).isEmpty { Text("No comments yet").foregroundStyle(DLSTheme.muted) }
            ForEach(editor.project?.comments ?? []) { comment in
                VStack(alignment: .leading, spacing: 10) {
                    HStack { Text(comment.user?.name ?? "Member").font(.caption.weight(.semibold)); Spacer(); Text(comment.resolved ? "Resolved" : "Open").font(.caption) }
                    Text(comment.anchor).font(.caption).foregroundStyle(DLSTheme.muted)
                    Text(comment.body).textSelection(.enabled)
                    if editor.canComment {
                        Button(comment.resolved ? "Reopen" : "Resolve") {
                            Task {
                                let ok = await editor.mutate(using: app) { api, token in
                                    _ = try await api.resolveComment(projectID: editor.projectID, commentID: comment.id, resolved: !comment.resolved, userID: editor.userID, token: token)
                                }
                                if ok { notice = "Comment updated." }
                            }
                        }.disabled(disabled).accessibilityIdentifier("comments.resolve.\(comment.id)")
                    }
                }.padding(.vertical, 6)
            }
        }
    }
}

import SwiftUI

struct ProjectEditorView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @StateObject private var editor: EditorModel
    @State private var discardPresented = false
    @State private var outputPresented = false
    @FocusState private var focused: Bool

    init(projectID: String, userID: String) {
        _editor = StateObject(wrappedValue: EditorModel(projectID: projectID, userID: userID))
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if editor.loading { ProgressView("Opening project…").frame(maxWidth: .infinity, maxHeight: .infinity) }
            else if let project = editor.project {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(editor.role).font(.caption.weight(.semibold)).foregroundStyle(DLSTheme.muted)
                        Spacer()
                        Text(editor.saving ? "Saving…" : editor.dirty ? "Unsaved changes" : editor.saved ? "Saved to workspace" : "Up to date")
                            .font(.caption).foregroundStyle(DLSTheme.muted)
                            .accessibilityLabel(editor.saving ? "Saving workflow" : editor.dirty ? "Unsaved changes" : "Workflow saved")
                    }
                    if !editor.editable { Text("You can view this workflow. Ask an owner for edit access.").font(.callout).foregroundStyle(DLSTheme.muted) }
                    if editor.restoredDraft { Text("Your unsaved draft was restored on this device.").font(.callout).foregroundStyle(DLSTheme.muted) }
                    if let error = editor.error { NoticeView(text: error) }
                    if editor.hasConflict {
                        Text("Keep a copy of your draft before discarding it. Go back and reopen the project to load the latest saved workflow.")
                            .font(.callout).foregroundStyle(DLSTheme.muted)
                    }
                }.padding()
                Rectangle().fill(DLSTheme.border).frame(height: 1)
                HStack(spacing: 8) {
                    Text("1").font(.caption2).foregroundStyle(DLSTheme.muted)
                        .frame(width: 20, height: 20)
                        .overlay(Circle().stroke(DLSTheme.border, lineWidth: 1))
                    Text("STRUCTURED LANGUAGE").font(.caption.weight(.semibold)).tracking(0.8)
                        .foregroundStyle(DLSTheme.soft)
                    Spacer()
                    Image(systemName: "text.alignleft").foregroundStyle(DLSTheme.muted)
                }.padding(.horizontal, 14).frame(minHeight: 54).background(DLSTheme.surface2)
                Rectangle().fill(DLSTheme.border).frame(height: 1)
                TextEditor(text: $editor.text)
                    .font(.system(.body, design: .monospaced)).lineSpacing(5)
                    .scrollContentBackground(.hidden).padding(.horizontal, 14).padding(.top, 12)
                    .foregroundStyle(DLSTheme.text).background(DLSTheme.surface).tint(DLSTheme.violet)
                    .overlay(Rectangle().stroke(editor.editable ? DLSTheme.editableOutline : DLSTheme.border, lineWidth: 1))
                    .focused($focused).disabled(!editor.editable || editor.saving)
                    .accessibilityLabel("Workflow structured language")
                    .onChange(of: editor.text) { _ in editor.keepDraft() }
                HStack {
                    Text("GIVEN · WHEN · THEN · AND").font(.caption).foregroundStyle(DLSTheme.muted)
                    Spacer()
                    Button("Saved output") { focused = false; outputPresented = true }
                        .buttonStyle(DLSSecondaryButtonStyle())
                }.padding(.horizontal, 12).padding(.vertical, 8).background(DLSTheme.surface2)
                    .overlay(alignment: .top) { Rectangle().fill(DLSTheme.border).frame(height: 1) }
            } else {
                VStack(spacing: 20) {
                    Text(editor.error ?? "This project could not open.").multilineTextAlignment(.center)
                    Button("Retry") { Task { await editor.load(using: app) } }.buttonStyle(DLSPrimaryButtonStyle())
                }.padding().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(DLSTheme.background.ignoresSafeArea()).foregroundStyle(DLSTheme.text)
        .toolbarBackground(DLSTheme.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .navigationTitle(editor.project?.name ?? "Workflow")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button { if editor.dirty { discardPresented = true } else { dismiss() } } label: {
                    Label("Projects", systemImage: "chevron.left")
                }.disabled(editor.saving)
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                if editor.editable {
                    Button("Save") { focused = false; Task { await editor.save(using: app) } }
                        .buttonStyle(DLSPrimaryButtonStyle()).disabled(!editor.dirty || editor.saving || editor.hasConflict)
                }
            }
            ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focused = false } }
        }
        .confirmationDialog("Discard unsaved changes?", isPresented: $discardPresented, titleVisibility: .visible) {
            Button("Discard changes", role: .destructive) {
                do { try editor.discard(); dismiss() } catch { editor.error = userMessage(error) }
            }
            Button("Keep editing", role: .cancel) { }
        } message: { Text("Your changes have not been saved to the workspace.") }
        .sheet(isPresented: $outputPresented) {
            if let generated = editor.project?.generated { GeneratedOutputView(generated: generated) }
        }
        .task { await editor.load(using: app) }
    }
}

struct GeneratedOutputView: View {
    let generated: GeneratedWorkflow
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label(generated.valid ? "Workflow structure is valid" : "GIVEN, WHEN and THEN need content",
                          systemImage: generated.valid ? "checkmark.circle" : "exclamationmark.circle")
                } footer: { Text("This is the server’s parsed output for the saved workflow. Unsaved edits are not included.") }
                    .listRowBackground(DLSTheme.surface)
                ForEach(generated.steps) { step in
                    Section(step.type) { Text(step.text).font(.system(.body, design: .monospaced)).textSelection(.enabled) }
                        .listRowBackground(DLSTheme.surface)
                }
            }.scrollContentBackground(.hidden).background(DLSTheme.background).foregroundStyle(DLSTheme.text)
                .toolbarBackground(DLSTheme.background, for: .navigationBar)
                .navigationTitle("Saved output").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { dismiss() } } }
        }
    }
}

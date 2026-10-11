import SwiftUI
import UIKit

struct ProjectEditorView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .body) private var fieldHeight = 100
    @StateObject private var editor: EditorModel
    @State private var tab = "Intent"
    @State private var rawSource = false
    @State private var output = "Interface"
    @State private var sheet: EditorSheet?
    @State private var leavePresented = false
    @State private var opening = false
    @State private var copied = false
    @State private var collaborationPicker = false
    @FocusState private var focus: String?
    enum EditorSheet: String, Identifiable { case share, comments, recovery; var id: String { rawValue } }

    init(projectID: String, userID: String) {
        _editor = StateObject(wrappedValue: EditorModel(projectID: projectID, userID: userID))
    }
    var body: some View {
        VStack(spacing: 0) {
            if editor.loading && editor.project == nil {
                ProgressView("Opening project…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if editor.project != nil {
                Picker("Editor view", selection: $tab) {
                    Text("Intent").tag("Intent"); Text("Preview").tag("Preview")
                }.pickerStyle(.segmented).padding(.horizontal).padding(.bottom, 10).accessibilityIdentifier("editor.tabs")
                ZStack {
                    intent.opacity(tab == "Intent" ? 1 : 0).allowsHitTesting(tab == "Intent").accessibilityHidden(tab != "Intent")
                    preview.opacity(tab == "Preview" ? 1 : 0).allowsHitTesting(tab == "Preview").accessibilityHidden(tab != "Preview")
                }
            } else {
                VStack(spacing: 20) {
                    Text(editor.error ?? "This project could not open.")
                    Button("Retry") { Task { await editor.load(using: app) } }.buttonStyle(DLSPrimaryButtonStyle())
                }.padding().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(DLSTheme.background.ignoresSafeArea()).foregroundStyle(DLSTheme.text)
        .navigationTitle(editor.project?.name ?? "Workflow").navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbarBackground(DLSTheme.background, for: .navigationBar).toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button { if editor.dirty { leavePresented = true } else { dismiss() } } label: { Label("Projects", systemImage: "chevron.left") }.disabled(editor.busy)
            }
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                if editor.editable {
                    Button("Save") { focus = nil; Task { await editor.save(using: app) } }
                        .disabled(!editor.dirty || editor.busy || editor.hasConflict || editor.collaborationNeedsRefresh)
                        .accessibilityIdentifier("editor.save")
                }
                Button { collaborationPicker = true } label: {
                    Image(systemName: "ellipsis.circle").frame(minWidth: 44, minHeight: 44)
                }.accessibilityLabel("Collaboration").accessibilityIdentifier("editor.collaboration")
                    .disabled(editor.busy || opening)
            }
            ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done") { focus = nil }.accessibilityIdentifier("editor.keyboardDone") }
        }
        .onChange(of: editor.text) { _ in editor.keepDraft(); if tab == "Preview" { editor.makePreview() } }
        .onChange(of: tab) { value in focus = nil; copied = false; if value == "Preview" { editor.makePreview() } }
        .confirmationDialog("Leave this workflow?", isPresented: $leavePresented, titleVisibility: .visible) {
            Button("Keep draft on this device") { if editor.keepDraft() { dismiss() } }
            Button("Discard local changes", role: .destructive) { do { try editor.discard(); dismiss() } catch { editor.error = userMessage(error) } }
            Button("Keep editing", role: .cancel) { }
        } message: { Text("Unsaved changes have not reached the workspace.") }
        .confirmationDialog("Collaborate", isPresented: $collaborationPicker, titleVisibility: .visible) {
            Button("Share") { open(.share) }
            Button("Comments") { open(.comments) }
            Button("Copy source") { UIPasteboard.general.string = editor.text }
            Button("Cancel", role: .cancel) { }
        }
        .sheet(item: $sheet) { selected in
            if selected == .recovery { recovery }
            else { CollaborationView(editor: editor, mode: selected == .share ? .share : .comments) }
        }
        .task { await editor.load(using: app) }
    }
    private var status: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text(editor.role).font(.caption.weight(.semibold))
                Spacer()
                Text(editor.saving ? "Saving…" : editor.dirty ? "Unsaved draft" : "Saved source").font(.caption)
            }.foregroundStyle(DLSTheme.muted)
            if !editor.editable { Text("Read-only intent").font(.caption) }
            if editor.restoredDraft { Text("Local draft restored").font(.caption).accessibilityIdentifier("editor.restored") }
            if let error = editor.error { Text(error).font(.caption).foregroundStyle(DLSTheme.soft).accessibilityIdentifier("editor.error") }
            if editor.hasConflict {
                Button("Review save conflict") { focus = nil; sheet = .recovery; Task { await editor.fetchRecovery(using: app) } }
                    .accessibilityIdentifier("editor.recover")
            } else if editor.collaborationNeedsRefresh {
                Button("Refresh project before continuing") { Task { await editor.refreshCollaboration(using: app) } }.disabled(editor.busy)
            }
        }.padding(.horizontal).padding(.vertical, 10)
    }
    private var intent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                status
                VStack(alignment: .leading, spacing: 10) {
                    Label(IntentDocument(source: editor.text).valid ? "Structure ready" : "Add GIVEN, WHEN and THEN", systemImage: IntentDocument(source: editor.text).valid ? "checkmark.circle" : "pencil")
                        .font(.caption).foregroundStyle(DLSTheme.muted)
                    Toggle("Raw source", isOn: $rawSource).font(.caption).accessibilityLabel("Raw source").accessibilityIdentifier("editor.rawToggle")
                }
                if rawSource {
                    TextEditor(text: $editor.text).frame(minHeight: 350).focused($focus, equals: "raw")
                        .accessibilityIdentifier("editor.raw").accessibilityLabel("Workflow source").editorField()
                        .disabled(!editor.editable || editor.busy)
                } else {
                    ForEach(IntentDocument(source: editor.text).blocks) { block in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(block.kind).font(.caption.weight(.semibold)).foregroundStyle(DLSTheme.muted)
                            TextEditor(text: Binding(get: {
                                let blocks = IntentDocument(source: editor.text).blocks
                                return blocks.indices.contains(block.id) ? blocks[block.id].body : ""
                            }, set: { editor.text = IntentDocument(source: editor.text).replacing(block.id, with: $0) }))
                            .frame(minHeight: fieldHeight).focused($focus, equals: "block-\(block.id)")
                            .editorField().accessibilityLabel("\(block.kind) intent").accessibilityIdentifier("intent.\(block.id)")
                            .disabled(!editor.editable || editor.busy)
                        }
                    }
                    if editor.editable {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 180 : 75))]) {
                            ForEach(["GIVEN", "WHEN", "THEN", "AND"], id: \.self) { kind in
                                Button("+ \(kind)") { editor.text = IntentDocument(source: editor.text).appending(kind) }
                                    .font(.caption).frame(minHeight: 44).accessibilityIdentifier("intent.add.\(kind)")
                            }
                        }.disabled(editor.busy)
                    }
                }
                Text("Incomplete drafts can be saved. Raw source preserves all original text.").font(.caption).foregroundStyle(DLSTheme.muted)
            }.padding()
        }.scrollDismissesKeyboard(.interactively)
    }
    private var preview: some View {
        ScrollView {
        VStack(spacing: 10) {
            status
            VStack(alignment: .leading, spacing: 4) {
                Text("Design system").font(.caption)
                Picker("Design system", selection: Binding(get: { editor.system }, set: { editor.selectSystem($0) })) {
                    ForEach(PrototypeSystem.allCases) { Text($0.name).tag($0) }
                }.accessibilityIdentifier("preview.system")
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal)

            DisclosureGroup("About this preview") {
                Text("Style preset on this device. HTML mappings, not the original component libraries. Changing a preset resets the preview test state.")
            }.font(.caption).foregroundStyle(DLSTheme.muted).padding(.horizontal)

            Picker("Output", selection: $output) {
                Text("Interface").tag("Interface"); Text("Flow").tag("Flow"); Text("JSON").tag("JSON")
            }.pickerStyle(.segmented).padding(.horizontal).accessibilityIdentifier("preview.output")
            if let snapshot = editor.snapshot {
                Text(editor.dirty ? "Preview of your current unsaved draft" : "Preview of current source")
                    .font(.caption).foregroundStyle(DLSTheme.muted).accessibilityIdentifier("preview.version")
                if output == "Interface" {
                    PrototypeCanvas(snapshot: snapshot).frame(minHeight: 360)
                    Text("Local interactions only; server actions are simulated.").font(.caption2).foregroundStyle(DLSTheme.muted).padding(.bottom, 8)
                } else if output == "Flow" {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(snapshot.steps) { step in
                                VStack(alignment: .leading, spacing: 8) { Text(step.type).font(.caption.weight(.bold)); Text(step.text) }
                                    .frame(maxWidth: .infinity, alignment: .leading).padding().background(DLSTheme.surface, in: RoundedRectangle(cornerRadius: 14))
                                if step.id != snapshot.steps.last?.id { Image(systemName: "arrow.down").foregroundStyle(DLSTheme.violet) }
                            }
                        }.padding()
                    }.frame(minHeight: 350).accessibilityIdentifier("preview.flow")
                } else {
                    Button(copied ? "JSON copied" : "Copy JSON") { UIPasteboard.general.string = snapshot.json; copied = true }
                        .buttonStyle(DLSSecondaryButtonStyle()).accessibilityIdentifier("preview.copyJSON")
                    ScrollView([.horizontal, .vertical]) { Text(snapshot.json).font(.system(.caption, design: .monospaced)).textSelection(.enabled).padding() }.frame(minHeight: 350)
                }
            } else { Text("No preview available. Return to Intent to check your source.").padding(); Spacer() }
        }
        }.accessibilityIdentifier("preview.scroll")
    }
    private var recovery: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Your local draft is preserved. Compare and reconcile the text manually; nothing is merged automatically.")
                    Button("Copy my draft") { UIPasteboard.general.string = editor.text }
                    Text(editor.text).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
                    Divider()
                    if let latest = editor.recoveryProject {
                        Text("Latest saved source").font(.headline)
                        Text(latest.structuredLanguage).font(.system(.caption, design: .monospaced)).textSelection(.enabled)
                        Button("Copy latest source") { UIPasteboard.general.string = latest.structuredLanguage }
                        Button("Reviewed: continue editing my draft") { editor.resumeAfterManualReview(); sheet = nil; tab = "Intent" }
                            .buttonStyle(DLSPrimaryButtonStyle()).accessibilityIdentifier("recovery.reviewed")
                        Text("This uses the displayed server revision as your new save base. Edit your draft before saving; a later server change still triggers conflict protection.").font(.caption)
                    } else { ProgressView(); Button("Retry loading latest") { Task { await editor.fetchRecovery(using: app) } } }
                }.padding()
            }.background(DLSTheme.background).foregroundStyle(DLSTheme.text)
                .navigationTitle("Recover draft").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Cancel") { sheet = nil } } }
        }
    }
    private func open(_ value: EditorSheet) {
        guard !opening else { return }; focus = nil; opening = true
        Task { defer { opening = false }; if await editor.prepareCollaboration(using: app) { sheet = value } }
    }
}
private extension View {
    func editorField() -> some View {
        font(.system(.body, design: .monospaced)).scrollContentBackground(.hidden)
            .padding(10).background(DLSTheme.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(DLSTheme.editableOutline, lineWidth: 1)).tint(DLSTheme.violet)
    }
}

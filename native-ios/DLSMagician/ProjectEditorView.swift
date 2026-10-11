import SwiftUI
import UIKit

struct ProjectEditorView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.colorScheme) private var scheme
    @StateObject private var editor: EditorModel
    @State private var tab = "Intent"
    @State private var rawSource = false
    @State private var previewInfo = false
    @State private var output = "Interface"
    @State private var sheet: EditorSheet?
    @State private var leavePresented = false
    @State private var opening = false
    @State private var copied = false
    @State private var collaborationPicker = false
    @FocusState private var focus: String?
    enum EditorSheet: String, Identifiable { case share, comments, recovery; var id: String { rawValue } }

    init(projectID: String, userID: String, drafts: DraftStore = DraftStore(), preferences: UserDefaults = .standard) {
        _editor = StateObject(wrappedValue: EditorModel(projectID: projectID, userID: userID, drafts: drafts, preferences: preferences))
    }
    var body: some View {
        VStack(spacing: 0) {
            if editor.loading && editor.project == nil {
                ProgressView("Opening project…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if editor.project != nil {
                status
                HStack(spacing: 24) {
                    ForEach(["Intent", "Preview"], id: \.self) { value in
                        Button { tab = value } label: {
                            VStack(spacing: 0) {
                                Text(value).font(.subheadline.weight(tab == value ? .semibold : .regular)).frame(minHeight: 44)
                                Rectangle().fill(tab == value ? DLSTheme.text : .clear).frame(height: 2)
                            }
                        }.buttonStyle(.plain).accessibilityAddTraits(tab == value ? .isSelected : [])
                    }
                    Spacer()
                    if tab == "Intent" {
                        Menu {
                            Toggle("Raw source", isOn: $rawSource).accessibilityIdentifier("editor.rawToggle")
                            ForEach(["GIVEN", "WHEN", "THEN", "AND"], id: \.self) { kind in
                                Button("Add \(kind)") { editor.text = IntentDocument(source: editor.text).appending(kind) }.disabled(!editor.editable || editor.busy)
                            }
                        } label: { Image(systemName: "text.badge.plus").frame(width: 44, height: 44) }.accessibilityLabel("Intent options")
                    }
                }.padding(.horizontal, 20).accessibilityElement(children: .contain).accessibilityIdentifier("editor.tabs")
                Divider()
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
                Text(editor.saving ? "Saving…" : editor.dirty ? "Unsaved draft" : app.isDemo ? "Saved on this device" : "Saved source").font(.caption)
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
        }.padding(.horizontal, 20).padding(.vertical, 5)
    }
    // Final Web CSS: .intent-block-rail / .intent-step-input and the later light overrides.
    // Canonical CSS SHA-256 68c58a97d7adf59af11cb54457fb7257a9a1ca360b24f86f966cff08276bd5f4.
    private func intentColor(_ kind: String) -> Color {
        switch kind { case "WHEN": return DLSTheme.blue; case "THEN": return DLSTheme.green; case "AND": return DLSTheme.amber; default: return DLSTheme.violet }
    }
    private var intent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Structured intent").font(.subheadline.weight(.semibold))
                    Spacer()
                    Label(IntentDocument(source: editor.text).valid ? "Ready" : "Add steps", systemImage: IntentDocument(source: editor.text).valid ? "checkmark.circle" : "pencil")
                        .font(.caption).foregroundStyle(DLSTheme.muted).accessibilityLabel(IntentDocument(source: editor.text).valid ? "Structure ready" : "Add GIVEN, WHEN and THEN")
                }
                if rawSource {
                    TextEditor(text: $editor.text).frame(minHeight: 350).focused($focus, equals: "raw")
                        .accessibilityIdentifier("editor.raw").accessibilityLabel("Workflow source").editorField()
                        .disabled(!editor.editable || editor.busy)
                } else {
                    VStack(alignment: .leading, spacing: scheme == .dark ? 12 : 18) {
                        ForEach(IntentDocument(source: editor.text).blocks) { block in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(block.kind).font(.system(.caption, design: .monospaced).weight(.semibold)).tracking(1.1).foregroundStyle(intentColor(block.kind))
                                    Spacer()
                                    if block.kind != "AND", editor.editable {
                                        Button("+ AND") {
                                            if let insertion = IntentDocument(source: editor.text).insertingAnd(after: block.id) {
                                                editor.text = insertion.source
                                                Task { @MainActor in await Task.yield(); focus = "block-\(insertion.index)" }
                                            }
                                        }.font(.system(.caption, design: .monospaced).weight(.semibold))
                                            .frame(minWidth: 60, minHeight: 44).buttonStyle(.plain)
                                            .accessibilityLabel("Add AND after \(block.kind)").accessibilityIdentifier("intent.and.\(block.id)").disabled(editor.busy)
                                    }
                                }
                                TextField("Describe this step", text: Binding(get: {
                                    let blocks = IntentDocument(source: editor.text).blocks
                                    return blocks.indices.contains(block.id) ? blocks[block.id].body : ""
                                }, set: { editor.text = IntentDocument(source: editor.text).replacing(block.id, with: $0) }), axis: .vertical)
                                .lineLimit(1...).font(.system(.subheadline, design: .monospaced)).lineSpacing(4).frame(minHeight: focus == "block-\(block.id)" ? 88 : nil, alignment: .topLeading).focused($focus, equals: "block-\(block.id)")
                                .accessibilityLabel("\(block.kind) intent").accessibilityIdentifier("intent.\(block.id)")
                                .disabled(!editor.editable || editor.busy)
                            }
                            .padding(.vertical, scheme == .dark ? 12 : 0).padding(.horizontal, scheme == .dark ? 16 : 0)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(scheme == .dark ? DLSTheme.surface : .clear, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(alignment: .leading) {
                                if scheme == .dark { Rectangle().fill(intentColor(block.kind)).frame(width: 2).padding(.vertical, 12) }
                            }
                            .overlay(alignment: .bottom) { if focus == "block-\(block.id)" { Rectangle().fill(DLSTheme.border).frame(height: 1) } }
                        }
                    }
                }
                Button { tab = "Preview" } label: { HStack { Text("Preview"); Image(systemName: "arrow.right") }.frame(minHeight: 44).padding(.horizontal, 18) }
                    .font(.subheadline.weight(.semibold)).background(DLSTheme.text, in: RoundedRectangle(cornerRadius: 8)).foregroundStyle(DLSTheme.surface)
                    .accessibilityIdentifier("intent.preview")
            }.padding(20)
        }.scrollDismissesKeyboard(.interactively)
    }
    private var previewToolbar: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) { outputTabs; Spacer(minLength: 4); designPicker }
            VStack(alignment: .leading, spacing: 0) { outputTabs; designPicker }
        }.padding(.horizontal, 16).padding(.vertical, 4)
    }
    private var outputTabs: some View {
        HStack(spacing: 0) {
            ForEach(["Interface", "Flow", "JSON"], id: \.self) { value in
                Button { output = value; copied = false } label: {
                    Text(value).font(.caption.weight(output == value ? .semibold : .regular)).padding(.horizontal, 9).frame(minHeight: 44)
                        .background(output == value ? DLSTheme.surface3 : .clear, in: RoundedRectangle(cornerRadius: 6))
                }.buttonStyle(.plain).accessibilityAddTraits(output == value ? .isSelected : [])
            }
        }.accessibilityElement(children: .contain).accessibilityIdentifier("preview.output")
    }
    private var designPicker: some View {
        HStack(spacing: 0) {
            Menu {
                ForEach(PrototypeSystem.allCases) { system in
                    Button(system.name) { editor.selectSystem(system) }
                }
            } label: {
                HStack(spacing: 4) { Text(editor.system.name == "DLS Magician" ? "DLS" : editor.system.name == "Ant Design" ? "Ant" : editor.system.name); Image(systemName: "chevron.down").font(.caption2) }
                    .font(.caption).frame(minHeight: 44)
            }.accessibilityLabel("Design system: \(editor.system.name)").accessibilityIdentifier("preview.system")
            Button { previewInfo = true } label: { Image(systemName: "info.circle").frame(width: 44, height: 44) }.accessibilityLabel("About this preview")
        }
    }
    private var preview: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    previewToolbar
                    if let snapshot = editor.snapshot {
                        if output == "Interface" {
                            VStack(spacing: 0) {
                                Text("Interactive preview").font(.caption2).foregroundStyle(DLSTheme.muted)
                                    .frame(maxWidth: .infinity).padding(10).background(DLSTheme.surface2)
                                Divider()
                                PrototypeCanvas(snapshot: snapshot).frame(height: max(320, geometry.size.height - 112))
                            }.clipShape(RoundedRectangle(cornerRadius: 10))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(DLSTheme.border, lineWidth: 1)).padding(.horizontal, 12)
                        } else if output == "Flow" {
                            ScrollView {
                                VStack(spacing: 12) {
                                    ForEach(snapshot.steps) { step in
                                        VStack(alignment: .leading, spacing: 8) { Text(step.type).font(.caption.weight(.bold)); Text(step.text) }
                                            .frame(maxWidth: .infinity, alignment: .leading).padding().background(DLSTheme.surface, in: RoundedRectangle(cornerRadius: 10))
                                        if step.id != snapshot.steps.last?.id { Image(systemName: "arrow.down").foregroundStyle(DLSTheme.violet) }
                                    }
                                }.padding()
                            }.frame(minHeight: 350).accessibilityIdentifier("preview.flow")
                        } else {
                            Button(copied ? "JSON copied" : "Copy JSON") { UIPasteboard.general.string = snapshot.json; copied = true }
                                .buttonStyle(DLSSecondaryButtonStyle()).padding(.horizontal).accessibilityIdentifier("preview.copyJSON")
                            ScrollView([.horizontal, .vertical]) { Text(snapshot.json).font(.system(.caption, design: .monospaced)).textSelection(.enabled).padding() }.frame(minHeight: 350)
                        }
                        Text(editor.dirty ? "Preview of your current unsaved draft" : "Preview of current source")
                            .font(.caption2).foregroundStyle(DLSTheme.muted).padding(10).accessibilityIdentifier("preview.version")
                    } else { Text("No preview available. Return to Intent to check your source.").padding() }
                }
            }.accessibilityIdentifier("preview.scroll")
        }.alert("About this preview", isPresented: $previewInfo) {
            Button("Done", role: .cancel) { }
        } message: { Text("Local interactions only; server actions are simulated. Design systems are HTML style mappings on this device, not the original component libraries. Changing the preset resets preview test state.") }
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

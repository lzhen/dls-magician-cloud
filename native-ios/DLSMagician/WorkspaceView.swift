import SwiftUI

struct WorkspaceView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var accountPresented = false
    @State private var search = ""
    @State private var createPresented = false
    @State private var createdProject: ProjectDetail?
    var filtered: [ProjectSummary] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        return query.isEmpty ? app.projects : app.projects.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.description.localizedCaseInsensitiveContains(query) }
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    DLSPageHeading(kicker: "Shared source of truth", title: "Projects", description: "Pick up where your team left off.")
                    if let workspaces = app.bootstrap?.workspaces, !workspaces.isEmpty {
                        HStack {
                            Image(systemName: "building.2").foregroundStyle(DLSTheme.muted)
                            Picker("Workspace", selection: $app.workspaceID) {
                                Text("All accessible projects").tag("")
                                ForEach(workspaces) { Text($0.name).tag($0.id) }
                            }.tint(DLSTheme.soft)
                            Spacer(minLength: 0)
                        }.padding(.horizontal, 14).frame(minHeight: 48)
                            .background(DLSTheme.surface2, in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
                            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.border, lineWidth: 1))
                    }
                    Button { createPresented = true } label: {
                        Label("Create a workflow", systemImage: "plus")
                    }.buttonStyle(DLSPrimaryButtonStyle()).accessibilityIdentifier("workflow.create")
                    if let notice = app.notice { NoticeView(text: notice) }
                    if app.projectLoadFailed {
                        Button("Retry loading projects") { Task { await app.refresh() } }
                    }
                    LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 250), spacing: 14)], spacing: 14) {
                        ForEach(filtered) { project in
                            NavigationLink(value: project) { DLSProjectCard(project: project) }.buttonStyle(.plain)
                        }
                    }
                    if filtered.isEmpty && !app.projectLoadFailed {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(emptyTitle).font(.headline)
                            Text(emptyDescription).font(.subheadline).foregroundStyle(DLSTheme.muted)
                            if let user = app.user {
                                Text("Signed in as \(user.email)").font(.caption).foregroundStyle(DLSTheme.soft)
                            }
                        }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                            .background(DLSTheme.surface, in: RoundedRectangle(cornerRadius: DLSTheme.radiusCard))
                            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusCard).stroke(DLSTheme.border, lineWidth: 1))
                    }
                }.padding(.horizontal, 18).padding(.vertical, 24)
            }
            .background(DLSTheme.background.ignoresSafeArea()).foregroundStyle(DLSTheme.text)
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $search, prompt: "Search projects…")
            .refreshable { await app.refresh() }
            .toolbarBackground(DLSTheme.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { DLSBrandLockup() }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { accountPresented = true } label: { Image(systemName: "person.crop.circle") }
                        .accessibilityLabel("Account")
                }
            }
            .navigationDestination(for: ProjectSummary.self) { project in
                if let user = app.user { ProjectEditorView(projectID: project.id, userID: user.id, drafts: app.draftStore, preferences: app.preferences) }
            }
            .sheet(isPresented: $accountPresented) { AccountView() }
            .sheet(isPresented: $createPresented) {
                CreateWorkflowView { project in search = ""; createdProject = project }
            }
            .navigationDestination(isPresented: Binding(get: { createdProject != nil }, set: { if !$0 { createdProject = nil } })) {
                if let project = createdProject, let user = app.user { ProjectEditorView(projectID: project.id, userID: user.id, drafts: app.draftStore, preferences: app.preferences) }
            }
        }
    }
    private var listState: ProjectListState {
        .resolve(app.bootstrap, workspaceID: app.workspaceID, search: search, loadFailed: app.projectLoadFailed)
    }
    private var emptyTitle: String {
        switch listState {
        case .noMatches: return "No matching projects"
        case .emptyWorkspace: return "No projects in this workspace"
        default: return "No accessible projects for this account"
        }
    }
    private var emptyDescription: String {
        if listState == .noMatches { return "Try a different project name." }
        if listState == .emptyWorkspace { return "Choose All accessible projects or create a workflow here." }
        if !app.creationWorkspaces.isEmpty { return "Create your first workflow in a workspace you can edit." }
        return "If your projects appear on the Web, check that you signed in with the same account. This account needs workspace access before it can create a workflow."
    }

}

struct DLSProjectCard: View {
    let project: ProjectSummary
    private var accent: Color { DLSTheme.projectAccent(project.accent) }
    private var symbol: String {
        switch project.accent {
        case "green": return "sparkles"
        case "blue": return "wand.and.stars"
        case "amber": return "clock"
        case "pink": return "building.2"
        case "cyan": return "person.2"
        default: return "doc.text"
        }
    }
    private var updated: Date? {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return parser.date(from: project.updatedAt) ?? ISO8601DateFormatter().date(from: project.updatedAt)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Image(systemName: symbol).font(.body).foregroundStyle(accent).frame(width: 38, height: 38)
                    .background(accent.opacity(0.06), in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
                    .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.border, lineWidth: 1))
                Spacer()
                DLSStatusPill(status: project.status)
            }
            Text(project.name).font(.headline).foregroundStyle(DLSTheme.text).padding(.top, 18).padding(.bottom, 6)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(project.description).font(.subheadline).foregroundStyle(DLSTheme.muted).lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 18)
            HStack {
                if let updated { Text("Updated ") + Text(updated, style: .relative) }
                Spacer()
                Image(systemName: "arrow.up.right").accessibilityHidden(true)
            }.font(.caption).foregroundStyle(DLSTheme.muted)
        }.padding(18).frame(maxWidth: .infinity, minHeight: 190, alignment: .topLeading)
            .background {
                ZStack(alignment: .topTrailing) {
                    DLSGradientSurface(role: .projectCard)
                    Circle().fill(DLSTheme.projectGlow(project.accent))
                        .frame(width: DLSTheme.projectGlowSize, height: DLSTheme.projectGlowSize)
                        .blur(radius: DLSTheme.projectGlowBlur).opacity(Double(DLSTheme.projectGlowOpacity))
                        .offset(x: -DLSTheme.projectGlowRight, y: DLSTheme.projectGlowTop)
                        .allowsHitTesting(false).accessibilityHidden(true)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: DLSTheme.radiusCard))
            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusCard).stroke(DLSTheme.border, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: DLSTheme.radiusCard))
    }
}

struct AccountView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                if let user = app.user {
                    Section("Signed in as") {
                        HStack(spacing: 14) {
                            DLSAccountAvatar(initials: user.initials, accent: user.color)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.name).font(.headline)
                                Text(user.email).foregroundStyle(DLSTheme.soft).textSelection(.enabled)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }.padding(.vertical, 8)
                    }.listRowBackground(DLSTheme.surface)
                }
                Section {
                    Link("Privacy", destination: AppConfiguration.apiOrigin.appendingPathComponent("privacy.html"))
                    Link("Help", destination: AppConfiguration.apiOrigin.appendingPathComponent("help.html"))
                }.listRowBackground(DLSTheme.surface)
                if !app.isDemo {
                Section {
                    Button(role: .destructive) {
                        Task { await app.signOut(); dismiss() }
                    } label: {
                        Label("Sign out on this device", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }.buttonStyle(DLSPrimaryButtonStyle()).disabled(app.busy)
                } footer: {
                    Text("Your saved projects stay in your workspace when you sign out.")
                }.listRowBackground(DLSTheme.surface)
                } else {
                    Section("Sample account") { Text("This is a local sample identity. No cloud account was created. Use Exit to reset the sample workspace.") }
                }
            }.scrollContentBackground(.hidden).background(DLSTheme.background)
                .foregroundStyle(DLSTheme.text)
                .navigationTitle("Account").navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(DLSTheme.background, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Text("Account").font(DLSTheme.accountTitle).foregroundStyle(DLSTheme.text)
                            .accessibilityAddTraits(.isHeader)
                    }
                    ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { dismiss() }.disabled(app.busy) }
                }

        }
    }
}

struct CreateWorkflowView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dismiss) private var dismiss
    let onCreated: (ProjectDetail) -> Void
    @State private var name = ""
    @State private var description = ""
    @State private var workspaceID = ""
    @State private var submitting = false
    @State private var submitted = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                if app.creationWorkspaces.isEmpty {
                    Section {
                        Text("No workspace available for creation")
                        Text("Creation requires an Admin or Editor workspace role. Check the signed-in account or ask the workspace owner for access.")
                        if let user = app.user { Text("Signed in as \(user.email)").textSelection(.enabled) }
                    }.listRowBackground(DLSTheme.surface)
                } else {
                    Section("Workflow") {
                        TextField("Workflow name", text: $name).accessibilityIdentifier("workflow.name")
                        TextField("Description (optional)", text: $description, axis: .vertical)
                        Picker("Workspace", selection: $workspaceID) {
                            ForEach(app.creationWorkspaces) { Text($0.name).tag($0.id) }
                        }
                    }.disabled(submitting || submitted).listRowBackground(DLSTheme.surface)
                    if let error { Section { NoticeView(text: error) }.listRowBackground(DLSTheme.surface) }
                    Section {
                        Button(submitting ? "Creating…" : "Create workflow") {
                            Task {
                                guard !submitting && !submitted else { return }
                                submitting = true; submitted = true
                                defer { submitting = false }
                                do {
                                    let input = try CreateWorkflowRequest(name: name, description: description, workspaceId: workspaceID)
                                    let project = try await app.createWorkflow(input)
                                    dismiss(); onCreated(project)
                                } catch {
                                    self.error = userMessage(error) + " Close this form and refresh projects before trying again; the request may already have saved."
                                }
                            }
                        }.buttonStyle(DLSPrimaryButtonStyle())
                            .disabled(submitting || submitted || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || workspaceID.isEmpty)
                            .accessibilityIdentifier("workflow.submit")
                    }.listRowBackground(DLSTheme.surface)
                }
            }.scrollContentBackground(.hidden).background(DLSTheme.background)
                .foregroundStyle(DLSTheme.text).navigationTitle("Create a workflow")
                .toolbar { ToolbarItem(placement: .cancellationAction) {
                    Button(submitted ? "Close" : "Cancel") { dismiss() }.disabled(submitting).accessibilityIdentifier("workflow.cancel")
                } }
                .interactiveDismissDisabled(submitting)
                .onAppear {
                    workspaceID = app.creationWorkspaces.contains(where: { $0.id == app.workspaceID }) ? app.workspaceID : (app.creationWorkspaces.first?.id ?? "")
                }
        }
    }
}

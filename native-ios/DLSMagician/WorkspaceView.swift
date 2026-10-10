import SwiftUI

struct WorkspaceView: View {
    @EnvironmentObject private var app: AppModel
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var accountPresented = false
    @State private var search = ""
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
                    if let notice = app.notice { NoticeView(text: notice) }
                    LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 250), spacing: 14)], spacing: 14) {
                        ForEach(filtered) { project in
                            NavigationLink(value: project) { DLSProjectCard(project: project) }.buttonStyle(.plain)
                        }
                    }
                    if filtered.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(search.isEmpty ? "No projects here yet" : "No matching projects").font(.headline)
                            Text(search.isEmpty ? "Ask a workspace owner to invite this account to a project, then pull down to refresh." : "Try a different project name.")
                                .font(.subheadline).foregroundStyle(DLSTheme.muted)
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
                if let user = app.user { ProjectEditorView(projectID: project.id, userID: user.id) }
            }
            .sheet(isPresented: $accountPresented) { AccountView() }
        }
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
                    Link("Help and account support", destination: AppConfiguration.apiOrigin.appendingPathComponent("help.html"))
                }.listRowBackground(DLSTheme.surface)
                Section {
                    Button(role: .destructive) {
                        Task { await app.signOut(); dismiss() }
                    } label: {
                        Label("Sign out on this device", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity)
                    }.buttonStyle(DLSPrimaryButtonStyle()).disabled(app.busy)
                } footer: {
                    Text("Your saved projects stay in your workspace. Account deletion is not available in this preview.")
                }.listRowBackground(DLSTheme.surface)
            }.scrollContentBackground(.hidden).background(DLSTheme.background)
                .foregroundStyle(DLSTheme.text)
                .navigationTitle("Account").navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(DLSTheme.background, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Text("Account").font(DLSTheme.accountTitle).foregroundStyle(DLSTheme.text)
                            .accessibilityAddTraits(.isHeader)
                    }
                    ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { dismiss() } }
                }
        }
    }
}

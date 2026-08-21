import SwiftUI

/// Danh sách phiên chơi + FAB tạo phiên.
struct SessionsView: View {
    @EnvironmentObject private var api: APIClient
    @State private var path = NavigationPath()

    @State private var sessions: [Session]?
    @State private var error: String?

    var body: some View {
        Group {
            if let error {
                VStack(spacing: 8) {
                    ErrorBox(message: error)
                    Button("Thử lại") { Task { await load() } }
                        .buttonStyle(.bordered)
                }
                .padding(16)
            } else if sessions == nil {
                ProgressView().tint(.courtLime).frame(maxHeight: .infinity)
            } else if sessions!.isEmpty {
                EmptyStateView(
                    icon: "🏸",
                    title: "Chưa có phiên nào",
                    description: "Tạo phiên chơi đầu tiên để mời đồng đội cùng đánh.",
                    ctaText: "+ Tạo phiên chơi",
                    onCta: { path.append(SessionRoute.create) },
                )
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(sessions!) { s in
                            SessionCard(s)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 96)
                }
            }
        }
        .background(CourtBackground())
        .navigationTitle("Phiên chơi")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .overlay(alignment: .bottomTrailing) {
            // FAB trong thumb zone
            NavigationLink(value: SessionRoute.create) {
                Label("Tạo phiên", systemImage: "plus")
                    .font(.subheadline.bold())
                    .padding(.horizontal, 16)
                    .frame(minHeight: 48)
                    .background(Color.courtLime, in: RoundedRectangle(cornerRadius: 14))
                    .foregroundStyle(Color.courtBg)
                    .shadow(color: .courtLime.opacity(0.25), radius: 12, y: 4)
            }
            .padding(24)
        }
        .navigationDestination(for: SessionRoute.self) { route in
            switch route {
            case .create:
                CreateSessionView(onCreated: { Task { await load() } })
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            sessions = try await api.sessions()
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được phiên chơi.")
        }
    }
}

enum SessionRoute: Hashable {
    case create
}

private struct SessionCard: View {
    let session: Session

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(session.title).font(.headline)
                Spacer()
                StatusBadge(status: session.status)
            }
            Text(session.venue?.name ?? "Chưa chọn sân")
                .font(.caption)
                .foregroundStyle(.courtTextFaint)
            HStack(spacing: 8) {
                MetaChip(text: "\(session.participantCount ?? 0)/\(session.maxParticipants ?? 0) người")
                if let split = session.costSplit { MetaChip(text: StatusMapper.viLabel(split)) }
                if ViDate.string(fromISO: session.startAt).isEmpty == false {
                    MetaChip(text: ViDate.string(fromISO: session.startAt))
                }
            }
            .padding(.top, 2)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
    }
}

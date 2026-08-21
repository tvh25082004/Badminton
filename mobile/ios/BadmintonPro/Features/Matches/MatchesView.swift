import SwiftUI

/// Danh sách trận của tôi.
struct MatchesView: View {
    @EnvironmentObject private var api: APIClient

    @State private var matches: [Match]?
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
            } else if matches == nil {
                ProgressView().tint(.courtLime).frame(maxHeight: .infinity)
            } else if matches!.isEmpty {
                ContentUnavailableView {
                    Label("Chưa có trận nào", systemImage: "bolt.badge.clock")
                } description: {
                    Text("Tham gia phiên chơi có format Rated để tạo trận tính Elo.")
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(matches!) { m in
                            NavigationLink(value: m.id) {
                                MatchCard(m)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(CourtBackground())
        .navigationTitle("Trận của tôi")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .navigationDestination(for: String.self) { id in
            MatchDetailView(matchId: id)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            matches = try await api.myMatches()
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được trận đấu.")
        }
    }
}

private struct MatchCard: View {
    let match: Match

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(match.matchType == "QUICK" ? "⚡ Quick Rated" : "🏸 Trận 2v2")
                    .font(.headline)
                Spacer()
                StatusBadge(status: match.status)
            }
            Text("\(StatusMapper.viLabel(match.format)) · \(match.players.count) người chơi")
                .font(.caption)
                .foregroundStyle(.courtTextFaint)
            if let result = match.latestResult {
                Text("\(result.scores.teamA.map(String.init).joined(separator: "-")) : \(result.scores.teamB.map(String.init).joined(separator: "-"))")
                    .font(.eloNumber(20))
                    .foregroundStyle(.courtLime)
                    .padding(.top, 2)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
    }
}

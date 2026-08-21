import SwiftUI

enum HomeRoute: Hashable {
    case notifications
    case createSession
    case leaderboard
    case assess
    case sessions
    case matches
    case matchDetail(String)
}

/// Trang chủ: Elo (điểm nhìn đầu tiên) → trận gần đây → phiên chơi → hành động nhanh.
struct HomeView: View {
    @EnvironmentObject private var api: APIClient
    @State private var path = NavigationPath()

    @State private var rating: RatingProfile?
    @State private var matches: [Match] = []
    @State private var sessions: [Session] = []
    @State private var unreadCount = 0
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error {
                    SectionCard(title: "Có lỗi", dotColor: .courtRed) {
                        ErrorBox(message: error)
                        Button("Thử lại") { Task { await load() } }
                            .buttonStyle(.bordered)
                    }
                }

                eloCard
                recentMatchesCard
                recentSessionsCard
                quickActions
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(CourtBackground())
        .navigationTitle("Tổng quan")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    path.append(HomeRoute.notifications)
                } label: {
                    Image(systemName: unreadCount > 0 ? "bell.badge" : "bell")
                        .symbolEffect(.bounce, value: unreadCount)
                }
            }
        }
        .navigationDestination(for: HomeRoute.self) { route in
            switch route {
            case .notifications: NotificationsView()
            case .createSession: CreateSessionView(onCreated: { Task { await load() } })
            case .leaderboard: LeaderboardView()
            case .assess: AssessView()
            case .sessions: SessionsView()
            case .matches: MatchesView()
            case let .matchDetail(id): MatchDetailView(matchId: id)
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            rating = try? await api.myRating()
            matches = (try? await api.myMatches(limit: 4)) ?? []
            sessions = (try? await api.sessions(limit: 4)) ?? []
            unreadCount = ((try? await api.notifications())?.items ?? []).count { !$0.readAt.isNil }
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được dữ liệu.")
        }
    }

    // MARK: - Elo card

    private var eloCard: some View {
        SectionCard(title: "Elo hiện tại") {
            if let rating {
                HStack(alignment: .bottom, spacing: 8) {
                    Text("\(rating.rating)")
                        .font(.eloNumber())
                        .foregroundStyle(.courtLimeSoft)
                        .contentTransition(.numericText())
                    Text(rating.confidence == "established" ? "Vững vàng" : "Tạm thời")
                        .font(.subheadline)
                        .foregroundStyle(.courtTextDim)
                }
                Text("\(rating.ratedMatches) trận · \(rating.uniqueOpponents) đối thủ")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
                if let milestone = rating.nextMilestone, milestone > 0 {
                    Text("Còn \(milestone) trận để chính thức")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.courtLimeSoft)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.courtLime.opacity(0.08), in: Capsule())
                        .padding(.top, 4)
                }
            } else {
                EmptyStateView(
                    icon: "🎯",
                    title: "Chưa có rating",
                    description: "Hoàn thành bài tự đánh giá để có Elo khởi điểm và bắt đầu xếp hạng.",
                    ctaText: "Làm bài tự đánh giá",
                    onCta: { path.append(HomeRoute.assess) },
                )
            }
        }
    }

    // MARK: - Trận gần đây

    private var recentMatchesCard: some View {
        SectionCard(title: "Trận gần đây") {
            if matches.isEmpty {
                Text("Chưa có trận nào.")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
            } else {
                ForEach(matches.prefix(3)) { m in
                    Button {
                        path.append(HomeRoute.matchDetail(m.id))
                    } label: {
                        matchRow(m)
                    }
                    .buttonStyle(.plain)
                }
            }
            ghostLink("Xem tất cả →") { path.append(HomeRoute.matches) }
        }
    }

    private func matchRow(_ m: Match) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(StatusMapper.viLabel(m.format)) · \(m.matchType == "QUICK" ? "Quick" : "Theo lịch")")
                    .font(.subheadline)
                    .foregroundStyle(.courtText)
                Text("\(m.players.count) người chơi")
                    .font(.caption)
                    .foregroundStyle(.courtTextFaint)
            }
            Spacer()
            StatusBadge(status: m.status)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Phiên chơi

    private var recentSessionsCard: some View {
        SectionCard(title: "Phiên chơi") {
            if sessions.isEmpty {
                Text("Chưa có phiên nào.")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
            } else {
                ForEach(sessions.prefix(3)) { s in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.title).font(.subheadline.weight(.semibold))
                            Text(s.venue?.name ?? "Chưa chọn sân")
                                .font(.caption)
                                .foregroundStyle(.courtTextFaint)
                        }
                        Spacer()
                        StatusBadge(status: s.status)
                    }
                    .padding(.vertical, 4)
                }
            }
            ghostLink("Mở phiên chơi →") { path.append(HomeRoute.sessions) }
        }
    }

    // MARK: - Quick actions (thumb zone)

    private var quickActions: some View {
        SectionCard(title: "Hành động nhanh") {
            HStack(spacing: 8) {
                PrimaryButton(title: "+ Tạo phiên", disabled: false) {
                    path.append(HomeRoute.createSession)
                }
                Button {
                    path.append(HomeRoute.leaderboard)
                } label: {
                    Text("🏆 Xếp hạng").frame(minHeight: 48)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private func ghostLink(_ text: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.courtLimeSoft)
                .padding(.top, 4)
        }
    }
}

extension Optional where Wrapped == String {
    var isNil: Bool { self == nil }
}

extension Array {
    func count(where predicate: (Element) -> Bool) -> Int {
        filter(predicate).count
    }
}

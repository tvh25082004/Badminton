import SwiftUI

/// Hộp thư thông báo — đánh dấu đã đọc optimistic + màu theo loại sự kiện.
struct NotificationsView: View {
    @EnvironmentObject private var api: APIClient

    @State private var items: [NotificationItem]?
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
            } else if items == nil {
                ProgressView().tint(.courtLime).frame(maxHeight: .infinity)
            } else if items!.isEmpty {
                EmptyStateView(
                    icon: "🔔",
                    title: "Chưa có thông báo",
                    description: "Thông báo về trận đấu, xác nhận kết quả và Elo sẽ xuất hiện ở đây.",
                )
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(items!) { n in
                            notificationRow(n)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(CourtBackground())
        .navigationTitle("Thông báo")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task { await load() }
    }

    private func load() async {
        do {
            let res = try await api.notifications()
            items = res.items
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được thông báo.")
        }
    }

    private func markRead(_ id: String) {
        guard let idx = items?.firstIndex(where: { $0.id == id }) else { return }
        // optimistic update
        items?[idx].readAt = "now"
        Task { try? await api.markNotificationRead(id: id) }
    }

    @ViewBuilder
    private func notificationRow(_ n: NotificationItem) -> some View {
        let unread = n.readAt == nil
        Button {
            if unread { markRead(n.id) }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Circle()
                    .fill(n.typeColor)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)

                VStack(alignment: .leading, spacing: 2) {
                    Text(n.title)
                        .font(.subheadline.weight(unread ? .semibold : .regular))
                        .foregroundStyle(.courtText)
                    if let body = n.body {
                        Text(body)
                            .font(.caption)
                            .foregroundStyle(.courtTextDim)
                    }
                    Text(String(n.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))
                        .font(.caption2)
                        .foregroundStyle(.courtTextFaint)
                }
                Spacer(minLength: 0)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                unread ? Color.courtSurface2 : Color.courtSurface,
                in: RoundedRectangle(cornerRadius: 14),
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Notification color mapping

private extension NotificationItem {
    var typeColor: Color {
        switch type.uppercased() {
        case "MATCH_RATED", "RESULT_CONFIRMED": return .courtLime
        case "MATCH_PENDING_CONFIRM", "RATING_REVIEW": return .courtAmber
        case "DISPUTE_OPENED", "MATCH_VOIDED": return .courtRed
        default: return .courtBlue
        }
    }
}

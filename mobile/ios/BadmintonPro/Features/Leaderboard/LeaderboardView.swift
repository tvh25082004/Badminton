import SwiftUI

/// Bảng xếp hạng Elo — phân trang, huy chương top 3.
struct LeaderboardView: View {
    @EnvironmentObject private var api: APIClient

    @State private var items: [LeaderboardItem]?
    @State private var page = 1
    @State private var totalPages = 1
    @State private var error: String?

    var body: some View {
        Group {
            if let error {
                VStack(spacing: 8) {
                    ErrorBox(message: error)
                    Button("Thử lại") { page = 1; Task { await load() } }
                        .buttonStyle(.bordered)
                }
                .padding(16)
            } else if items == nil {
                ProgressView().tint(.courtLime).frame(maxHeight: .infinity)
            } else if items!.isEmpty {
                ContentUnavailableView {
                    Label("Chưa có dữ liệu", systemImage: "trophy")
                } description: {
                    Text("Hãy hoàn thành trận Rated đầu tiên để bảng xếp hạng bắt đầu.")
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(Array(items!.enumerated()), id: \.element.userId) { _, item in
                            RankRow(item: item)
                        }

                        HStack(spacing: 12) {
                            Button("← Trước") { if page > 1 { page -= 1 } }
                                .buttonStyle(.bordered)
                                .disabled(page <= 1)
                            Button("Sau →") { if page < totalPages { page += 1 } }
                                .buttonStyle(.bordered)
                                .disabled(page >= totalPages)
                        }
                        .padding(.vertical, 12)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(CourtBackground())
        .navigationTitle("Bảng xếp hạng")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task(id: page) { await load() }
    }

    private func load() async {
        do {
            let res = try await api.leaderboard(page: page)
            items = res.items
            totalPages = max(res.meta?.totalPages ?? 1, 1)
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được bảng xếp hạng.")
        }
    }
}

private struct RankRow: View {
    let item: LeaderboardItem

    var body: some View {
        HStack(spacing: 12) {
            // Huy chương top 3 — peak visual cue
            ZStack {
                Circle().fill(medalColor.opacity(0.2))
                Text("#\(item.rank)")
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .foregroundStyle(item.rank == 1 ? .courtAmber : .courtTextDim)
            }
            .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.displayName ?? "Người chơi ẩn danh").font(.subheadline.weight(.semibold))
                Text([item.region, "\(item.ratedMatches) trận"].compactMap(\.self).joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.courtTextFaint)
            }
            Spacer()
            Text("\(item.rating)")
                .font(.eloNumber(18))
                .foregroundStyle(.courtLime)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
    }

    private var medalColor: Color {
        switch item.rank {
        case 1: return .courtAmber
        case 2: return .courtTextFaint
        case 3: return Color(red: 0xB8 / 255, green: 0x73 / 255, blue: 0x33 / 255)
        default: return .clear
        }
    }
}

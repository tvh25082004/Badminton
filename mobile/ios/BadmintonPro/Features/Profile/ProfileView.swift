import SwiftUI

/// Hồ sơ: danh tính, Elo, lịch sử Elo, chỉnh sửa, đăng xuất.
struct ProfileView: View {
    @EnvironmentObject private var api: APIClient

    @State private var user: UserMe?
    @State private var rating: RatingProfile?
    @State private var history: [RatingTxn] = []
    @State private var error: String?
    @State private var loading = true

    @State private var displayName = ""
    @State private var region = ""
    @State private var saving = false
    @State private var saveMessage: String?

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

                identityCard
                ratingCard
                if !history.isEmpty { historyCard }
                editCard
                logoutButton
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .background(CourtBackground())
        .navigationTitle("Hồ sơ")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            user = try await api.me()
            rating = try? await api.myRating()
            history = (try? await api.ratingHistory()) ?? []
            displayName = user?.profile?.displayName ?? user?.displayName ?? ""
            region = user?.profile?.region ?? ""
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được hồ sơ.")
        }
    }

    // MARK: - Cards

    private var identityCard: some View {
        SectionCard {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Color.courtLime.opacity(0.15))
                    Text(String((user?.profile?.displayName ?? user?.displayName ?? "?").prefix(1)).uppercased())
                        .font(.title2.bold())
                        .foregroundStyle(.courtLime)
                }
                .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 2) {
                    Text(user?.profile?.displayName ?? user?.displayName ?? "Người chơi")
                        .font(.headline)
                    Text("☎ \(user?.phone ?? "") · \(user?.role ?? "")")
                        .font(.caption)
                        .foregroundStyle(.courtTextFaint)
                }
                Spacer()
            }
        }
    }

    private var ratingCard: some View {
        SectionCard(title: "Elo của bạn") {
            if let rating {
                HStack(alignment: .bottom, spacing: 8) {
                    Text("\(rating.rating)")
                        .font(.eloNumber(32))
                        .foregroundStyle(.courtLime)
                        .contentTransition(.numericText())
                    Text("\(rating.ratedMatches) trận · \(rating.uniqueOpponents) đối thủ")
                        .font(.subheadline)
                        .foregroundStyle(.courtTextDim)
                }
            } else {
                Text("Chưa có rating — hãy làm bài tự đánh giá.")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
                NavigationLink {
                    AssessView()
                } label: {
                    Label("Tự đánh giá", systemImage: "list.clipboard")
                        .frame(minHeight: 44)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var historyCard: some View {
        SectionCard(title: "Lịch sử Elo") {
            ForEach(history, id: \.id) { txn in
                HStack {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(txn.type).font(.subheadline)
                        Text(String(txn.createdAt.prefix(16)).replacingOccurrences(of: "T", with: " "))
                            .font(.caption)
                            .foregroundStyle(.courtTextFaint)
                    }
                    Spacer()
                    Text("\(txn.delta >= 0 ? "+" : "")\(txn.delta)")
                        .font(.system(.subheadline, design: .monospaced).weight(.bold))
                        .foregroundStyle(txn.delta >= 0 ? Color.courtLime : Color.courtRed)
                        .contentTransition(.numericText())
                    Text("\(txn.ratingAfter)")
                        .font(.system(.subheadline, design: .monospaced))
                        .foregroundStyle(.courtTextDim)
                        .frame(width: 44, alignment: .trailing)
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var editCard: some View {
        SectionCard(title: "Chỉnh sửa thông tin") {
            VStack(alignment: .leading, spacing: 4) {
                Text("Tên hiển thị").font(.caption.weight(.semibold)).foregroundStyle(.courtTextDim)
                TextField("Tên hiển thị", text: $displayName)
                    .padding(12)
                    .background(Color.courtSurface2, in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color.courtLineStrong, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Khu vực thường chơi").font(.caption.weight(.semibold)).foregroundStyle(.courtTextDim)
                TextField("Quận 7, TP.HCM", text: $region)
                    .padding(12)
                    .background(Color.courtSurface2, in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color.courtLineStrong, lineWidth: 1))
            }

            PrimaryButton(title: "Lưu thay đổi", disabled: saving || displayName.trimmingCharacters(in: .whitespaces).isEmpty) {
                Task { await save() }
            }

            if let saveMessage {
                Text(saveMessage)
                    .font(.subheadline)
                    .foregroundStyle(saveMessage.hasPrefix("Đã") ? Color.courtLime : Color.courtRed)
            }
        }
    }

    private var logoutButton: some View {
        Button(role: .destructive) {
            api.logout()
        } label: {
            Label("Đăng xuất", systemImage: "rectangle.portrait.and.arrow.right")
                .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.bordered)
    }

    private func save() async {
        saving = true
        saveMessage = nil
        defer { saving = false }
        do {
            _ = try await api.updatePlayer(
                displayName: displayName.trimmingCharacters(in: .whitespaces),
                region: region.trimmingCharacters(in: .whitespaces),
            )
            saveMessage = "Đã lưu thay đổi."
        } catch {
            saveMessage = ApiErrors.userMessage(error, "Lưu thất bại.")
        }
    }
}

import SwiftUI

/// Chi tiết trận — UI theo trạng thái (state-driven actions).
/// Peak moment: trận RATED → haptic success + snackbar ăn mừng.
struct MatchDetailView: View {
    @EnvironmentObject private var api: APIClient

    let matchId: String

    @State private var match: Match?
    @State private var error: String?
    @State private var actionError: String?
    @State private var busy = false
    @State private var scoreA = ""
    @State private var scoreB = ""
    @State private var disputeReason = ""
    @State private var toast: String?
    @State private var successTick = 0
    @State private var errorTick = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error {
                    ErrorBox(message: error)
                } else if let match {
                    header(match)
                    if let actionError { ErrorBox(message: actionError) }
                    scoreCard(match)
                    disputeCard(match)
                    actions(match)
                } else {
                    ProgressView().tint(.courtLime).padding(.top, 80)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .background(CourtBackground())
        .navigationTitle("Chi tiết trận")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task { await load() }
        .sensoryFeedback(.success, trigger: successTick)
        .sensoryFeedback(.error, trigger: errorTick)
        .overlay(alignment: .bottom) {
            if let toast {
                Text(toast)
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                    .background(Color.courtSurface2, in: Capsule())
                    .foregroundStyle(.courtText)
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    private func load() async {
        do {
            match = try await api.match(id: matchId)
            error = nil
        } catch {
            self.error = ApiErrors.userMessage(error, "Không tải được trận.")
        }
    }

    private func run(_ okMessage: String? = nil, celebrate: Bool = false, _ body: () async throws -> Void) async {
        busy = true
        actionError = nil
        defer { busy = false }
        do {
            try await body()
            if celebrate { successTick += 1 }
            if let okMessage {
                withAnimation { toast = okMessage }
                try? await Task.sleep(for: .seconds(2.5))
                withAnimation { toast = nil }
            }
            await load()
        } catch {
            errorTick += 1
            actionError = ApiErrors.userMessage(error, "Thao tác thất bại.")
        }
    }

    // MARK: - Sections

    private func header(_ m: Match) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(m.matchType == "QUICK" ? "⚡ Quick Rated Match" : "🏸 Trận đấu 2v2")
                    .font(.title3.bold())
                Spacer()
                StatusBadge(status: m.status)
            }
            Text(subtitle(m))
                .font(.caption)
                .foregroundStyle(.courtTextDim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func subtitle(_ m: Match) -> String {
        var parts = [StatusMapper.viLabel(m.format), StatusMapper.viLabel(m.mode)]
        if let scheduled = m.scheduledAt, !ViDate.string(fromISO: scheduled).isEmpty {
            parts.append(ViDate.string(fromISO: scheduled))
        }
        return parts.joined(separator: " · ")
    }

    private func scoreCard(_ m: Match) -> some View {
        Group {
            if let result = m.latestResult {
                SectionCard(title: "Tỷ số") {
                    Text("\(result.scores.teamA.map(String.init).joined(separator: "-")) : \(result.scores.teamB.map(String.init).joined(separator: "-"))")
                        .font(.eloNumber(24))
                        .contentTransition(.numericText())
                    let aWon = (result.scores.teamA.first ?? 0) > (result.scores.teamB.first ?? 0)
                    Text("Đội \(aWon ? "A" : "B") thắng" + (result.confirmedByCount.map { " · \($0)/4 xác nhận" } ?? ""))
                        .font(.caption)
                        .foregroundStyle(.courtTextFaint)
                }
            }
        }
    }

    private func disputeCard(_ m: Match) -> some View {
        Group {
            if let dispute = m.openDispute {
                SectionCard(title: "Tranh chấp đang mở", dotColor: .courtRed) {
                    Text(dispute.reason ?? "Người chơi phản đối kết quả.").font(.subheadline)
                    Text("Quản trị viên sẽ rà soát và xử lý.")
                        .font(.caption)
                        .foregroundStyle(.courtTextFaint)
                }
            }
        }
    }

    @ViewBuilder
    private func actions(_ m: Match) -> some View {
        switch m.status.uppercased() {
        case "DRAFT":
            SectionCard(title: "Xác nhận đội hình") {
                Text("Mỗi người chơi cần xác nhận roster. Đủ 4 người → trận chuyển sang sẵn sàng.")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
                PrimaryButton(title: "Xác nhận roster của tôi", disabled: busy) {
                    Task { await run("Đã xác nhận roster") { try await api.rosterConfirm(matchId: matchId) } }
                }
            }

        case "READY":
            SectionCard(title: "Sẵn sàng") {
                HStack(spacing: 8) {
                    Button {
                        Task { await run("Check-in thành công") { try await api.checkIn(matchId: matchId) } }
                    } label: {
                        Label("Check-in", systemImage: "location")
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.bordered)

                    if isCreator(m) {
                        PrimaryButton(title: "▶ Bắt đầu", disabled: busy) {
                            Task { await run("Trận bắt đầu!") { try await api.startMatch(matchId: matchId) } }
                        }
                    }
                }
            }

        case "PLAYING":
            SectionCard(title: "Nhập tỷ số") {
                HStack(spacing: 12) {
                    scoreField("Đội A", text: $scoreA)
                    scoreField("Đội B", text: $scoreB)
                }
                PrimaryButton(
                    title: "Gửi kết quả",
                    disabled: busy || scoreA.isEmpty || scoreB.isEmpty,
                ) {
                    Task {
                        await run("Đã gửi kết quả, chờ xác nhận") {
                            try await api.submitResult(
                                matchId: matchId,
                                scores: MatchScores(teamA: [Int(scoreA) ?? 0], teamB: [Int(scoreB) ?? 0]),
                            )
                        }
                    }
                }
            }

        case "PENDING_CONFIRM":
            SectionCard(title: "Xác nhận kết quả", dotColor: .courtAmber) {
                Text("Cần tối thiểu 3/4 người chơi đồng ý và ít nhất 1 đại diện phía đối thủ để tính Elo.")
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
                HStack(spacing: 8) {
                    PrimaryButton(title: "✅ Đồng ý", disabled: busy) {
                        Task {
                            await run("Cảm ơn bạn đã xác nhận!", celebrate: true) {
                                try await api.confirmResult(matchId: matchId, decision: .confirm, reason: nil)
                            }
                        }
                    }
                    Button(role: .destructive) {
                        Task {
                            await run("Đã mở tranh chấp") {
                                try await api.confirmResult(
                                    matchId: matchId,
                                    decision: .dispute,
                                    reason: disputeReason.isEmpty ? "Kết quả không đúng" : disputeReason,
                                )
                            }
                        }
                    } label: {
                        Text("⚠ Phản đối").frame(minHeight: 48)
                    }
                    .buttonStyle(.bordered)
                }
                TextField("Lý do phản đối (nếu có)", text: $disputeReason)
                    .padding(12)
                    .background(Color.courtSurface2, in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color.courtLineStrong, lineWidth: 1))
                    .font(.subheadline)
            }

        case "RATED", "DISPUTED", "PENDING_REVIEW", "VOIDED":
            SectionCard(title: "Trạng thái trận") {
                Text(statusExplanation(m.status))
                    .font(.subheadline)
                    .foregroundStyle(.courtTextDim)
            }

        default:
            EmptyView()
        }
    }

    private func isCreator(_ m: Match) -> Bool {
        m.players.first?.userId == m.creatorId
    }

    private func statusExplanation(_ status: String) -> String {
        switch status.uppercased() {
        case "RATED": return "Trận đã hoàn tất và Elo đã được cập nhật cho cả 4 người chơi."
        case "DISPUTED": return "Trận đang chờ quản trị viên xử lý tranh chấp."
        case "PENDING_REVIEW": return "Trận đang được hệ thống rà soát (anti-fraud)."
        default: return "Trận đã bị huỷ, Elo được hoàn nguyên."
        }
    }

    private func scoreField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.courtTextDim)
            TextField("21", text: text)
                .keyboardType(.numberPad)
                .font(.eloNumber(20))
                .multilineTextAlignment(.center)
                .frame(minHeight: 48)
                .onChange(of: text.wrappedValue) { newValue in
                    let filtered = String(newValue.filter(\.isNumber).prefix(2))
                    if filtered != newValue { text.wrappedValue = filtered }
                }
                .background(Color.courtSurface2, in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color.courtLineStrong, lineWidth: 1))
        }
    }
}

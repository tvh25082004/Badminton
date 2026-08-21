import SwiftUI

/// Bài tự đánh giá 10 câu — chỉ làm một lần. Peak: hiện band + Elo khởi điểm.
struct AssessView: View {
    @EnvironmentObject private var api: APIClient

    @State private var existing: RatingProfile?
    @State private var checked = false
    @State private var answers: [String: String] = [:]
    @State private var error: String?
    @State private var success: String?
    @State private var busy = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if !checked {
                    ProgressView().tint(.courtLime).padding(.top, 80)
                } else if existing != nil {
                    doneCard
                } else {
                    intro
                    if let error { ErrorBox(message: error) }
                    if let success { successCard(success) }
                    questions
                    submitButton
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .background(CourtBackground())
        .navigationTitle("Tự đánh giá trình độ")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task {
            existing = try? await api.myRating()
            checked = true
        }
    }

    private var doneCard: some View {
        SectionCard(title: "Bạn đã hoàn thành bài tự đánh giá") {
            Text("Elo khởi điểm của bạn là").font(.subheadline).foregroundStyle(.courtTextDim)
            Text("\(existing?.rating ?? 0)")
                .font(.eloNumber(28))
                .foregroundStyle(.courtLime)
            Text("Mỗi người chỉ được làm bài này một lần.")
                .font(.caption)
                .foregroundStyle(.courtTextFaint)
        }
        .padding(.top, 8)
    }

    private var intro: some View {
        Text("Trả lời 10 câu hỏi để xác định Elo khởi điểm. Chỉ làm một lần — hãy trả lời trung thực nhất có thể.")
            .font(.subheadline)
            .foregroundStyle(.courtTextDim)
            .padding(.top, 8)
    }

    private func successCard(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.courtLime)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.courtLime.opacity(0.1), in: RoundedRectangle(cornerRadius: 9))
    }

    private var questions: some View {
        ForEach(Array(Assessment.questions.enumerated()), id: \.element.id) { index, question in
            SectionCard {
                HStack(alignment: .top, spacing: 8) {
                    Text("\(index + 1).").foregroundStyle(.courtTextFaint)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(question.label).font(.subheadline.weight(.semibold))
                        if let hint = question.hint {
                            Text(hint).font(.caption).foregroundStyle(.courtTextFaint)
                        }
                    }
                }
                VStack(spacing: 6) {
                    ForEach(question.options) { option in
                        optionRow(question.id, option)
                    }
                }
            }
        }
    }

    private func optionRow(_ questionId: String, _ option: Assessment.Option) -> some View {
        let active = answers[questionId] == option.value
        return Button {
            withAnimation(.easeOut(duration: 0.15)) {
                answers[questionId] = option.value
            }
        } label: {
            HStack {
                Image(systemName: active ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(active ? Color.courtLime : Color.courtLineStrong)
                    .symbolEffect(.bounce, value: active)
                Text(option.label)
                    .font(.subheadline)
                    .foregroundStyle(active ? Color.courtLime : Color.courtText)
                Spacer()
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(
                active ? Color.courtLime.opacity(0.08) : Color.courtBgSoft,
                in: RoundedRectangle(cornerRadius: 9),
            )
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(active ? Color.courtLime : Color.courtLine, lineWidth: 1),
            )
        }
        .buttonStyle(.plain)
    }

    private var submitButton: some View {
        PrimaryButton(
            title: "Gửi bài tự đánh giá (\(answers.count)/\(Assessment.questions.count))",
            disabled: busy || answers.count < Assessment.questions.count,
        ) {
            Task { await submit() }
        }
    }

    private func submit() async {
        guard answers.count == Assessment.questions.count else {
            error = "Vui lòng trả lời đủ 10 câu hỏi."
            return
        }
        error = nil
        busy = true
        defer { busy = false }
        do {
            let payload = Assessment.questions.compactMap { q -> AssessmentAnswer? in
                answers[q.id].map { AssessmentAnswer(questionId: q.id, value: $0) }
            }
            let res = try await api.selfAssessment(payload)
            success = "Hoàn tất! Band \(res.band ?? "") — Elo khởi điểm \(res.rating ?? 0). Xem chi tiết ở trang Hồ sơ."
        } catch {
            self.error = ApiErrors.userMessage(error, "Gửi thất bại.")
        }
    }
}

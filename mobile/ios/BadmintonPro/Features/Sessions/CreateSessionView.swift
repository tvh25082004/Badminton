import SwiftUI

/// Form tạo phiên chơi — chọn thay vì gõ (selection over manual input).
struct CreateSessionView: View {
    @EnvironmentObject private var api: APIClient
    @Environment(\.dismiss) private var dismiss

    let onCreated: () -> Void

    @State private var title = ""
    @State private var venues: [Venue] = []
    @State private var venueId: String?
    @State private var startAt = Date().addingTimeInterval(3600)
    @State private var endAt = Date().addingTimeInterval(3 * 3600)
    @State private var format = "RECREATIONAL"
    @State private var maxParticipants = 8
    @State private var courtCount = 1
    @State private var totalCost = 200_000
    @State private var minRatingText = ""
    @State private var maxRatingText = ""
    @State private var error: String?
    @State private var busy = false
    @FocusState private var focusedTitle: Bool

    var body: some View {
        Form {
            Section("Thông tin") {
                TextField("Cầu lông tối thứ 3 — Q7", text: $title)
                    .focused($focusedTitle)
                Picker("Sân", selection: $venueId) {
                    Text("Chưa chọn sân").tag(String?.none)
                    ForEach(venues) { v in
                        Text(v.name).tag(String?.some(v.id))
                    }
                }
            }

            Section("Thời gian") {
                DatePicker("Bắt đầu", selection: $startAt)
                DatePicker("Kết thúc", selection: $endAt, in: startAt...)
            }

            Section("Hình thức") {
                Picker("Format", selection: $format) {
                    Text("Giao lưu").tag("RECREATIONAL")
                    Text("Luyện tập").tag("PRACTICE")
                    Text("Rated").tag("RATED")
                }
                .pickerStyle(.segmented)

                Stepper("Tối đa \(maxParticipants) người chơi", value: $maxParticipants, in: 2 ... 24)
                Stepper("\(courtCount) sân", value: $courtCount, in: 1 ... 12)
            }

            Section("Chi phí & giới hạn Elo") {
                HStack {
                    Text("Chi phí dự kiến")
                    Spacer()
                    TextField("200000", text: .init(
                        get: { totalCost == 0 ? "" : String(totalCost) },
                        set: { totalCost = Int($0.filter(\.isNumber)) ?? 0 },
                    ))
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 120)
                }
                ratingRow("Rating tối thiểu", text: $minRatingText)
                ratingRow("Rating tối đa", text: $maxRatingText)
            }

            Section {
                if let error { ErrorBox(message: error) }
                PrimaryButton(title: "Tạo phiên", disabled: busy || title.trimmingCharacters(in: .whitespaces).isEmpty) {
                    Task { await submit() }
                }
                .listRowBackground(Color.clear)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.courtBg)
        .navigationTitle("Tạo phiên chơi")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Color.courtBg, for: .navigationBar)
        .task {
            venues = (try? await api.venues()) ?? []
        }
    }

    private func ratingRow(_ label: String, text: Binding<String>) -> some View {
        HStack {
            Text(label)
            Spacer()
            TextField("—", text: text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
        }
    }

    private func submit() async {
        guard startAt < endAt else {
            error = "Thời gian kết thúc phải sau thời gian bắt đầu."
            return
        }
        error = nil
        busy = true
        defer { busy = false }
        do {
            _ = try await api.createSession(CreateSessionRequest(
                title: title.trimmingCharacters(in: .whitespaces),
                venueId: venueId,
                startAt: startAt.ISO8601Format(),
                endAt: endAt.ISO8601Format(),
                courtCount: courtCount,
                minParticipants: 2,
                maxParticipants: maxParticipants,
                minRating: Int(minRatingText),
                maxRating: Int(maxRatingText),
                format: format,
                totalCost: totalCost,
                costSplitMode: "EQUAL",
                costBreakdown: ["Thuê sân": totalCost],
            ))
            onCreated()
            dismiss()
        } catch {
            self.error = ApiErrors.userMessage(error, "Tạo phiên thất bại.")
        }
    }
}

import SwiftUI

// MARK: - Bảng màu "Sân đêm" (dark-first, ánh xạ 1:1 với web + Android)

extension Color {
    /// Nền chính (60%)
    static let courtBg = Color(red: 0x0A / 255, green: 0x0E / 255, blue: 0x13 / 255)
    /// Nền phụ
    static let courtBgSoft = Color(red: 0x10 / 255, green: 0x16 / 255, blue: 0x1D / 255)
    /// Bề mặt thẻ (30%)
    static let courtSurface = Color(red: 0x15 / 255, green: 0x1D / 255, blue: 0x26 / 255)
    /// Bề mặt nâng
    static let courtSurface2 = Color(red: 0x1B / 255, green: 0x25 / 255, blue: 0x30 / 255)
    /// Đường kẻ sân
    static let courtLine = Color(red: 0x23 / 255, green: 0x2F / 255, blue: 0x3C / 255)
    static let courtLineStrong = Color(red: 0x31 / 255, green: 0x40 / 255, blue: 0x4F / 255)

    /// Accent (10%) — xanh vôi sân cầu lông
    static let courtLime = Color(red: 0xA8 / 255, green: 0xE0 / 255, blue: 0x63 / 255)
    static let courtLimeSoft = Color(red: 0xBF / 255, green: 0xF0 / 255, blue: 0x8A / 255)
    /// Đèn amber
    static let courtAmber = Color(red: 0xFF / 255, green: 0xB4 / 255, blue: 0x54 / 255)
    static let courtRed = Color(red: 0xFF / 255, green: 0x6B / 255, blue: 0x6B / 255)
    static let courtBlue = Color(red: 0x6E / 255, green: 0xA8 / 255, blue: 0xFF / 255)

    static let courtText = Color(red: 0xE9 / 255, green: 0xEF / 255, blue: 0xF6 / 255)
    static let courtTextDim = Color(red: 0x9A / 255, green: 0xA8 / 255, blue: 0xB8 / 255)
    static let courtTextFaint = Color(red: 0x64 / 255, green: 0x74 / 255, blue: 0x8B / 255)
}

// MARK: - Typography

extension Font {
    /// Số Elo / tỷ số — monospaced digits để layout số ổn định khi thay đổi.
    static func eloNumber(_ size: CGFloat = 40) -> Font {
        .system(size: size, weight: .bold, design: .monospaced)
    }

    /// Tiêu đề màn hình — bold, tracking chặt.
    static let screenTitle = Font.system(.title, design: .default).weight(.bold)
}

extension Text {
    /// Nhãn cấu trúc dạng small-caps (ios-design skill: typographic contrast).
    func sectionLabel() -> some View {
        font(.caption.smallCaps())
            .fontWeight(.semibold)
            .foregroundStyle(.courtTextFaint)
            .textCase(nil)
    }
}

// MARK: - Trạng thái nghiệp vụ

struct StatusStyle {
    let label: String
    let color: Color
}

enum StatusMapper {
    static func style(_ status: String) -> StatusStyle {
        switch status.uppercased() {
        case "DRAFT", "OPEN":
            return StatusStyle(label: viLabel(status), color: .courtBlue)
        case "READY", "CONFIRMED", "ACTIVE", "CHECKED_IN":
            return StatusStyle(label: viLabel(status), color: .courtLime)
        case "PLAYING", "PENDING_CONFIRM", "PENDING_REVIEW":
            return StatusStyle(label: viLabel(status), color: .courtAmber)
        case "RATED", "COMPLETED":
            return StatusStyle(label: viLabel(status), color: .courtLimeSoft)
        case "DISPUTED", "VOIDED", "CANCELLED", "REJECTED":
            return StatusStyle(label: viLabel(status), color: .courtRed)
        default:
            return StatusStyle(label: viLabel(status), color: .courtTextFaint)
        }
    }

    static func viLabel(_ raw: String) -> String {
        switch raw.uppercased() {
        case "DRAFT": return "Nháp"
        case "OPEN": return "Mở"
        case "READY": return "Sẵn sàng"
        case "CONFIRMED": return "Đã xác nhận"
        case "ACTIVE": return "Đang diễn ra"
        case "CHECKED_IN": return "Đã check-in"
        case "PLAYING": return "Đang chơi"
        case "PENDING_CONFIRM": return "Chờ xác nhận"
        case "PENDING_REVIEW": return "Chờ rà soát"
        case "RATED": return "Đã chấm Elo"
        case "COMPLETED": return "Hoàn tất"
        case "DISPUTED": return "Tranh chấp"
        case "VOIDED": return "Đã huỷ"
        case "CANCELLED": return "Đã huỷ"
        case "RECREATIONAL": return "Giao lưu"
        case "PRACTICE": return "Luyện tập"
        case "EQUAL": return "Chia đều"
        default:
            return raw.replacingOccurrences(of: "_", with: " ").lowercased().capitalized
        }
    }
}

// MARK: - Ngày tháng

enum ViDate {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "vi_VN")
        f.dateFormat = "EEE dd/MM · HH:mm"
        return f
    }()

    static func string(fromISO iso: String?) -> String {
        guard let iso,
              let date = ISO8601DateFormatter().date(from: iso) else { return "" }
        return formatter.string(from: date)
    }
}

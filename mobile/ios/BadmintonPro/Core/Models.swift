import Foundation

// MARK: - Auth

struct OtpRequest: Encodable { let phone: String }
struct RegisterRequest: Encodable { let phone: String, name: String, region: String }
struct OtpVerify: Encodable { let phone: String, otp: String, deviceId: String }
struct RegisterVerify: Encodable {
    let phone: String, otp: String, name: String, region: String, deviceId: String
}
struct RefreshRequest: Encodable { let refreshToken: String }

struct TokenPair: Decodable {
    let accessToken: String
    let refreshToken: String
    let devOtp: String?
    let expiresInSeconds: String?
}

// MARK: - User / Profile

struct PlayerProfile: Codable {
    let id: String
    let userId: String
    var displayName: String?
    var region: String?
    var gender: String?
    var handedness: String?
    var position: String?
    var selfLevel: String?
    var band: String?
}

struct UserMe: Codable {
    let id: String
    let phone: String
    let role: String
    let status: String
    var displayName: String?
    var profile: PlayerProfile?
}

struct UpdateProfileRequest: Encodable { let displayName: String, region: String }

// MARK: - Rating

struct RatingProfile: Codable {
    let id: String
    let userId: String
    let type: String
    let rating: Int
    let ratingState: String
    let ratedMatches: Int
    let uniqueOpponents: Int
    let ratingDeviation: Double
    var lastRankedAt: String?
    var confidence: String?
    var nextMilestone: Int?
}

struct LeaderboardItem: Codable {
    let rank: Int
    let userId: String
    let rating: Int
    let ratingDeviation: Double
    let ratingState: String
    let ratedMatches: Int
    let uniqueOpponents: Int
    var displayName: String?
    var region: String?
}

struct LeaderboardResponse: Codable {
    var items: [LeaderboardItem] = []
    var meta: PageMeta?
}

struct MatchRef: Codable {
    var id: String?
    var status: String?
    var format: String?
}

struct RatingTxn: Codable {
    let id: String
    let type: String
    let ratingBefore: Int
    let delta: Int
    let ratingAfter: Int
    let state: String
    let createdAt: String
    var match: MatchRef?
}

struct AssessmentAnswer: Encodable { let questionId: String, value: String }
struct SelfAssessmentRequest: Encodable { let schemaVersion: String, answers: [AssessmentAnswer] }

struct SelfAssessmentResult: Decodable {
    var band: String?
    var rating: Int?
    var selfLevel: String?
}

// MARK: - Session / Venue

struct VenueRef: Codable { var name: String?, address: String? }

struct Session: Codable, Identifiable {
    let id: String
    let title: String
    let hostId: String
    var venueId: String?
    var venue: VenueRef?
    let status: String
    var startAt: String?
    var endAt: String?
    var totalCost: Int?
    var costSplit: String?
    var maxParticipants: Int?
    var participantCount: Int?
}

struct Venue: Codable, Identifiable {
    let id: String
    let name: String
    var address: String?
}

struct CreateSessionRequest: Encodable {
    let title: String
    var venueId: String?
    let startAt: String
    let endAt: String
    let courtCount: Int
    let minParticipants: Int
    let maxParticipants: Int
    var minRating: Int?
    var maxRating: Int?
    let format: String
    let totalCost: Int
    let costSplitMode: String
    let costBreakdown: [String: Int]
}

// MARK: - Match

struct MatchPlayer: Codable, Identifiable {
    let userId: String
    let team: String
    let rosterConfirmed: Bool
    var deviceId: String?
    var displayName: String?
    var rating: Int?
    var joinedAt: String?

    var id: String { userId }
}

struct MatchScores: Codable, Equatable {
    let teamA: [Int]
    let teamB: [Int]
}

struct LatestResult: Codable {
    let id: String
    let scores: MatchScores
    let status: String
    var confirmedByCount: Int?
}

struct OpenDispute: Codable {
    let id: String
    let status: String
    var reason: String?
}

struct Match: Codable, Identifiable {
    let id: String
    let matchType: String
    let mode: String
    let format: String
    let status: String
    let creatorId: String
    var scheduledAt: String?
    var startedAt: String?
    var ratedAt: String?
    var players: [MatchPlayer] = []
    var latestResult: LatestResult?
    var openDispute: OpenDispute?
}

struct SubmitResultRequest: Encodable { let scores: MatchScores }

enum ConfirmDecision: String, Encodable {
    case confirm = "CONFIRM"
    case dispute = "DISPUTE"
}

struct ConfirmResultRequest: Encodable {
    let decision: ConfirmDecision
    var reason: String?
}

// MARK: - Notification

struct NotificationItem: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    var body: String?
    let resourceType: String
    var resourceId: String?
    var deepLink: String?
    var readAt: String?
    let createdAt: String
}

struct NotificationsResponse: Codable {
    var items: [NotificationItem] = []
    var total: Int = 0
}

// MARK: - Envelope

struct PageMeta: Codable {
    var page: Int = 0
    var limit: Int = 0
    var total: Int = 0
    var totalPages: Int = 0
}

struct PageResponse<T: Codable>: Codable {
    var items: [T] = []
    var meta: PageMeta?
}

struct ApiErrorBody: Decodable { var code: String?, message: String? }
struct ApiErrorEnvelope: Decodable { var error: ApiErrorBody? }

/// Lỗi API có cấu trúc — message thân thiện tiếng Việt.
struct ApiError: LocalizedError {
    let status: Int
    let code: String
    let message: String
    var errorDescription: String? { message }
}

enum ApiErrors {
    static func userMessage(_ error: Error, _ fallback: String = "Đã có lỗi xảy ra.") -> String {
        if let apiError = error as? ApiError { return apiError.message }
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .cannotFindHost, .cannotConnectToHost:
                return "Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API."
            case .timedOut:
                return "Hết thời gian chờ máy chủ, thử lại nhé."
            default:
                return fallback
            }
        }
        return fallback
    }
}

// MARK: - Tự đánh giá (đồng bộ schema web)

enum Assessment {
    static let schemaVersion = "2026.08.2"

    struct Option: Identifiable { let value: String, label: String; var id: String { value } }
    struct Question: Identifiable {
        let id: String
        let label: String
        var hint: String?
        let options: [Option]
    }

    private static let skillOptions = [
        Option(value: "NOT_YET", label: "Chưa thành thạo"),
        Option(value: "BASIC", label: "Cơ bản"),
        Option(value: "CONSISTENT", label: "Ổn định"),
        Option(value: "RELIABLE_UNDER_PRESSURE", label: "Chuẩn xác cả khi bị ép"),
    ]

    static let questions: [Question] = [
        Question(id: "experience_years", label: "Bạn chơi cầu lông được bao lâu?", hint: nil, options: [
            Option(value: "LT_6M", label: "Dưới 6 tháng"),
            Option(value: "M6_TO_1Y", label: "6 tháng – 1 năm"),
            Option(value: "Y1_TO_3Y", label: "1 – 3 năm"),
            Option(value: "Y3_TO_5Y", label: "3 – 5 năm"),
            Option(value: "GT_5Y", label: "Trên 5 năm"),
        ]),
        Question(id: "weekly_frequency", label: "Tần suất chơi mỗi tuần?", hint: nil, options: [
            Option(value: "LT_1", label: "Chưa tới 1 buổi/tuần"),
            Option(value: "ONE", label: "1 buổi/tuần"),
            Option(value: "TWO_TO_THREE", label: "2 – 3 buổi/tuần"),
            Option(value: "FOUR_PLUS", label: "4 buổi trở lên/tuần"),
        ]),
        Question(id: "clear_skill", label: "Kỹ thuật cầu cao sâu (clear)", hint: nil, options: skillOptions),
        Question(id: "smash_skill", label: "Kỹ thuật đập cầu (smash)", hint: nil, options: skillOptions),
        Question(id: "net_skill", label: "Kỹ thuật lưới (net/drop)", hint: nil, options: skillOptions),
        Question(id: "defense_skill", label: "Khả năng phòng thủ", hint: nil, options: skillOptions),
        Question(id: "footwork_skill", label: "Di chuyển chân (footwork)", hint: nil, options: skillOptions),
        Question(id: "doubles_rotation", label: "Xoay vòng đánh đôi", hint: nil, options: skillOptions),
        Question(id: "competition_experience", label: "Kinh nghiệm thi đấu", hint: nil, options: [
            Option(value: "NONE", label: "Chưa thi đấu giải nào"),
            Option(value: "CLUB_PRACTICE", label: "Đấu tập trong câu lạc bộ"),
            Option(value: "RECREATIONAL_TOURNAMENT", label: "Giải phong trào"),
            Option(value: "CLUB_TOURNAMENT_OR_HIGHER", label: "Giải CLB hoặc cao hơn"),
        ]),
        Question(id: "self_level", label: "Bạn tự nhận mình ở trình độ nào?",
                 hint: "Câu này không chấm điểm — dùng để đối chiếu với kết quả đánh giá.", options: [
            Option(value: "NEWCOMER", label: "Mới bắt đầu"),
            Option(value: "BEGINNER", label: "Sơ cấp"),
            Option(value: "INTERMEDIATE", label: "Trung cấp"),
            Option(value: "INTERMEDIATE_PLUS", label: "Trung cấp khá"),
            Option(value: "ADVANCED", label: "Nâng cao"),
            Option(value: "COMPETITIVE", label: "Thi đấu"),
        ]),
    ]
}

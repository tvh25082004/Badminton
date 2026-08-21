import Foundation

/// API client async/await — tự refresh token khi gặp 401 (đúng một lần),
/// phát sự kiện đăng xuất toàn cục khi refresh thất bại.
@MainActor
final class APIClient: ObservableObject {
    static let shared = APIClient()

    /// null = đang kiểm tra token đã lưu; false = chưa đăng nhập; true = đã đăng nhập.
    @Published var loggedIn: Bool?

    #if DEBUG
    /// Emulator/simulator: trỏ về backend local. Device thật: đổi sang IP LAN.
    static let defaultBaseURL = URL(string: "http://localhost:4000/api/v1")!
    #else
    static let defaultBaseURL = URL(string: "https://api.caulongpro.vn/api/v1")!
    #endif

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let refreshQueue = DispatchQueue(label: "vn.caulongpro.refresh")

    private(set) var baseURL: URL {
        didSet { UserDefaults.standard.set(baseURL.absoluteString, forKey: "bm_base_url") }
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
        encoder = JSONEncoder()

        if let saved = UserDefaults.standard.string(forKey: "bm_base_url"), let url = URL(string: saved) {
            baseURL = url
        } else {
            baseURL = Self.defaultBaseURL
        }

        loggedIn = TokenStore.current() != nil
    }

    // MARK: - Base URL override (debug)

    func setBaseURL(_ string: String) {
        if let url = URL(string: string.trimmingCharacters(in: .whitespaces)) {
            baseURL = url
        }
    }

    // MARK: - Endpoints

    func requestOtp(phone: String) async throws -> TokenPair {
        try await post("auth/otp/request", body: OtpRequest(phone: phone))
    }

    func verifyOtp(phone: String, otp: String) async throws -> TokenPair {
        try await post(
            "auth/otp/verify",
            body: OtpVerify(phone: phone, otp: otp, deviceId: deviceId()),
            authenticated: false,
        )
    }

    func register(phone: String, name: String, region: String) async throws -> TokenPair {
        try await post("auth/register", body: RegisterRequest(phone: phone, name: name, region: region))
    }

    func verifyRegister(phone: String, otp: String, name: String, region: String) async throws -> TokenPair {
        try await post(
            "auth/register/verify",
            body: RegisterVerify(phone: phone, otp: otp, name: name, region: region, deviceId: deviceId()),
            authenticated: false,
        )
    }

    func me() async throws -> UserMe { try await get("users/me") }

    func updatePlayer(displayName: String, region: String) async throws -> UserMe {
        try await patch("players/me", body: UpdateProfileRequest(displayName: displayName, region: region))
    }

    func myRating() async throws -> RatingProfile? { try await getOptional("ratings/me") }

    func ratingHistory() async throws -> [RatingTxn] {
        let page: PageResponse<RatingTxn> = try await get("ratings/history?page=1&limit=10")
        return page.items
    }

    func leaderboard(page: Int) async throws -> LeaderboardResponse {
        try await get("ratings/leaderboard?page=\(page)&limit=20")
    }

    func selfAssessment(_ answers: [AssessmentAnswer]) async throws -> SelfAssessmentResult {
        try await post("ratings/self-assessment", body: SelfAssessmentRequest(schemaVersion: Assessment.schemaVersion, answers: answers))
    }

    func myMatches(limit: Int = 20) async throws -> [Match] {
        let page: PageResponse<Match> = try await get("matches/me?page=1&limit=\(limit)")
        return page.items
    }

    func match(id: String) async throws -> Match { try await get("matches/\(id)") }

    func rosterConfirm(matchId: String) async throws { let _: EmptyResponse? = try await postEmpty("matches/\(matchId)/roster-confirm") }
    func checkIn(matchId: String) async throws { let _: EmptyResponse? = try await postEmpty("matches/\(matchId)/check-in") }
    func startMatch(matchId: String) async throws { let _: EmptyResponse? = try await postEmpty("matches/\(matchId)/start") }

    func submitResult(matchId: String, scores: MatchScores) async throws {
        let _: EmptyResponse? = try await postEmpty("matches/\(matchId)/result", body: SubmitResultRequest(scores: scores))
    }

    func confirmResult(matchId: String, decision: ConfirmDecision, reason: String?) async throws {
        let _: EmptyResponse? = try await postEmpty(
            "matches/\(matchId)/confirm",
            body: ConfirmResultRequest(decision: decision, reason: reason),
        )
    }

    func sessions(limit: Int = 20) async throws -> [Session] {
        let page: PageResponse<Session> = try await get("sessions?page=1&limit=\(limit)")
        return page.items
    }

    func createSession(_ body: CreateSessionRequest) async throws -> Session {
        try await post("sessions", body: body)
    }

    func venues() async throws -> [Venue] {
        let page: PageResponse<Venue> = try await get("venues")
        return page.items
    }

    func notifications() async throws -> NotificationsResponse {
        try await get("notifications?page=1&limit=30")
    }

    func markNotificationRead(id: String) async throws {
        let _: EmptyResponse? = try await postEmpty("notifications/\(id)/read")
    }

    // MARK: - Auth state

    func onLogin(_ tokens: TokenPair) {
        TokenStore.save(TokenStore.Tokens(access: tokens.accessToken, refresh: tokens.refreshToken))
        loggedIn = true
    }

    func logout() {
        TokenStore.clear()
        loggedIn = false
    }

    private func deviceId() -> String {
        let key = "bm_device_id"
        if let saved = UserDefaults.standard.string(forKey: key) { return saved }
        let id = "ios-" + UUID().uuidString.prefix(8)
        UserDefaults.standard.set(id, forKey: key)
        return id
    }

    // MARK: - Transport

    typealias EmptyResponse = Data

    private func makeRequest(path: String, method: String, body: Data?, token: String?) -> URLRequest {
        var url = baseURL
        url.append(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }

    private func perform(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ApiError(status: 0, code: "NO_RESPONSE", message: "Phản hồi không hợp lệ từ máy chủ.")
        }
        return (data, http)
    }

    private func parseError(_ data: Data, status: Int) -> ApiError {
        if let envelope = try? decoder.decode(ApiErrorEnvelope.self, from: data),
           let err = envelope.error {
            return ApiError(status: status, code: err.code ?? "HTTP_\(status)", message: err.message ?? "Yêu cầu thất bại (\(status)).")
        }
        return ApiError(status: status, code: "HTTP_\(status)", message: "Yêu cầu thất bại (\(status)).")
    }

    private func refreshTokenIfNeeded() async -> Bool {
        guard let tokens = TokenStore.current(), !tokens.refresh.isEmpty else { return false }
        let body = try? encoder.encode(RefreshRequest(refreshToken: tokens.refresh))
        let request = makeRequest(path: "auth/refresh", method: "POST", body: body, token: nil)
        guard let (data, http) = try? await perform(request), http.statusCode == 200,
              let pair = try? decoder.decode(TokenPair.self, from: data) else {
            TokenStore.clear()
            await MainActor.run { loggedIn = false }
            return false
        }
        TokenStore.save(TokenStore.Tokens(access: pair.accessToken, refresh: pair.refreshToken))
        return true
    }

    private func send<T: Decodable>(_ request: URLRequest, retryOn401: Bool = true) async throws -> T? {
        let (data, http) = try await perform(request)
        if http.statusCode == 401 && retryOn401 && request.value(forHTTPHeaderField: "Authorization") != nil {
            if await refreshTokenIfNeeded() {
                var retried = request
                retried.setValue("Bearer \(TokenStore.current()?.access ?? "")", forHTTPHeaderField: "Authorization")
                return try await send(retried, retryOn401: false)
            }
            throw parseError(data, status: 401)
        }
        if http.statusCode == 204 || data.isEmpty { return nil }
        guard (200 ..< 300).contains(http.statusCode) else { throw parseError(data, status: http.statusCode) }
        return try decoder.decode(T.self, from: data)
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        let request = makeRequest(path: path, method: "GET", body: nil, token: TokenStore.current()?.access)
        guard let result: T = try await send(request) else {
            throw ApiError(status: 0, code: "EMPTY", message: "Dữ liệu rỗng.")
        }
        return result
    }

    private func getOptional<T: Decodable>(_ path: String) async throws -> T? {
        let request = makeRequest(path: path, method: "GET", body: nil, token: TokenStore.current()?.access)
        return try await send(request) as T?
    }

    private func post<B: Encodable, T: Decodable>(_ path: String, body: B, authenticated: Bool = true) async throws -> T {
        let payload = try? encoder.encode(body)
        let token = authenticated ? TokenStore.current()?.access : nil
        let request = makeRequest(path: path, method: "POST", body: payload, token: token)
        guard let result: T = try await send(request) else {
            throw ApiError(status: 0, code: "EMPTY", message: "Dữ liệu rỗng.")
        }
        return result
    }

    private func postEmpty<B: Encodable>(_ path: String, body: B? = nil) async throws -> Data? {
        let payload = body.flatMap { try? encoder.encode($0) }
        let request = makeRequest(path: path, method: "POST", body: payload, token: TokenStore.current()?.access)
        return try await send(request) as Data?
    }

    private func patch<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let payload = try? encoder.encode(body)
        let request = makeRequest(path: path, method: "PATCH", body: payload, token: TokenStore.current()?.access)
        guard let result: T = try await send(request) else {
            throw ApiError(status: 0, code: "EMPTY", message: "Dữ liệu rỗng.")
        }
        return result
    }
}

private extension URL {
    mutating func append(path: String) {
        self = appendingPathComponent(path)
    }
}

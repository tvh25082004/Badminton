package vn.caulongpro.app.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import vn.caulongpro.app.core.AssessmentAnswer
import vn.caulongpro.app.core.ConfirmResultRequest
import vn.caulongpro.app.core.CreateSessionRequest
import vn.caulongpro.app.core.LeaderboardResponse
import vn.caulongpro.app.core.Match
import vn.caulongpro.app.core.NotificationItem
import vn.caulongpro.app.core.NotificationsResponse
import vn.caulongpro.app.core.OtpRequest
import vn.caulongpro.app.core.OtpVerify
import vn.caulongpro.app.core.PageResponse
import vn.caulongpro.app.core.RatingProfile
import vn.caulongpro.app.core.RatingTxn
import vn.caulongpro.app.core.RefreshRequest
import vn.caulongpro.app.core.RegisterRequest
import vn.caulongpro.app.core.RegisterVerify
import vn.caulongpro.app.core.SelfAssessmentRequest
import vn.caulongpro.app.core.SelfAssessmentResult
import vn.caulongpro.app.core.Session
import vn.caulongpro.app.core.SubmitResultRequest
import vn.caulongpro.app.core.TokenPair
import vn.caulongpro.app.core.UpdateProfileRequest
import vn.caulongpro.app.core.UserMe
import vn.caulongpro.app.core.Venue

interface BadmintonApi {

    // ----- Auth -----
    @POST("auth/otp/request")
    suspend fun requestOtp(@Body body: OtpRequest): TokenPair

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: OtpVerify): TokenPair

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): TokenPair

    @POST("auth/register/verify")
    suspend fun verifyRegister(@Body body: RegisterVerify): TokenPair

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): TokenPair

    // ----- User / Profile -----
    @GET("users/me")
    suspend fun me(): UserMe

    @PATCH("players/me")
    suspend fun updatePlayer(@Body body: UpdateProfileRequest): UserMe

    // ----- Rating -----
    @GET("ratings/me")
    suspend fun myRating(): RatingProfile?

    @GET("ratings/history")
    suspend fun ratingHistory(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
    ): PageResponse<RatingTxn>

    @GET("ratings/leaderboard")
    suspend fun leaderboard(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): LeaderboardResponse

    @POST("ratings/self-assessment")
    suspend fun selfAssessment(@Body body: SelfAssessmentRequest): SelfAssessmentResult

    // ----- Matches -----
    @GET("matches/me")
    suspend fun myMatches(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): PageResponse<Match>

    @GET("matches/{id}")
    suspend fun match(@Path("id") id: String): Match

    @POST("matches/{id}/roster-confirm")
    suspend fun rosterConfirm(@Path("id") id: String)

    @POST("matches/{id}/check-in")
    suspend fun checkIn(@Path("id") id: String, @Body body: Map<String, String> = emptyMap())

    @POST("matches/{id}/start")
    suspend fun startMatch(@Path("id") id: String)

    @POST("matches/{id}/result")
    suspend fun submitResult(@Path("id") id: String, @Body body: SubmitResultRequest)

    @POST("matches/{id}/confirm")
    suspend fun confirmResult(@Path("id") id: String, @Body body: ConfirmResultRequest)

    // ----- Sessions / Venues -----
    @GET("sessions")
    suspend fun sessions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): PageResponse<Session>

    @POST("sessions")
    suspend fun createSession(@Body body: CreateSessionRequest): Session

    @GET("venues")
    suspend fun venues(): PageResponse<Venue>

    // ----- Notifications -----
    @GET("notifications")
    suspend fun notifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
    ): NotificationsResponse

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String)
}

/** Câu hỏi tự đánh giá — đồng bộ schema với web (lib/assessment.ts). */
object Assessment {
    const val SCHEMA_VERSION = "2026.08.2"

    data class Option(val value: String, val label: String)
    data class Question(val id: String, val label: String, val hint: String? = null, val options: List<Option>)

    private val skillOptions = listOf(
        Option("NOT_YET", "Chưa thành thạo"),
        Option("BASIC", "Cơ bản"),
        Option("CONSISTENT", "Ổn định"),
        Option("RELIABLE_UNDER_PRESSURE", "Chuẩn xác cả khi bị ép"),
    )

    val questions = listOf(
        Question(
            "experience_years",
            "Bạn chơi cầu lông được bao lâu?",
            options = listOf(
                Option("LT_6M", "Dưới 6 tháng"),
                Option("M6_TO_1Y", "6 tháng – 1 năm"),
                Option("Y1_TO_3Y", "1 – 3 năm"),
                Option("Y3_TO_5Y", "3 – 5 năm"),
                Option("GT_5Y", "Trên 5 năm"),
            ),
        ),
        Question(
            "weekly_frequency",
            "Tần suất chơi mỗi tuần?",
            options = listOf(
                Option("LT_1", "Chưa tới 1 buổi/tuần"),
                Option("ONE", "1 buổi/tuần"),
                Option("TWO_TO_THREE", "2 – 3 buổi/tuần"),
                Option("FOUR_PLUS", "4 buổi trở lên/tuần"),
            ),
        ),
        Question("clear_skill", "Kỹ thuật cầu cao sâu (clear)", options = skillOptions),
        Question("smash_skill", "Kỹ thuật đập cầu (smash)", options = skillOptions),
        Question("net_skill", "Kỹ thuật lưới (net/drop)", options = skillOptions),
        Question("defense_skill", "Khả năng phòng thủ", options = skillOptions),
        Question("footwork_skill", "Di chuyển chân (footwork)", options = skillOptions),
        Question("doubles_rotation", "Xoay vòng đánh đôi", options = skillOptions),
        Question(
            "competition_experience",
            "Kinh nghiệm thi đấu",
            options = listOf(
                Option("NONE", "Chưa thi đấu giải nào"),
                Option("CLUB_PRACTICE", "Đấu tập trong câu lạc bộ"),
                Option("RECREATIONAL_TOURNAMENT", "Giải phong trào"),
                Option("CLUB_TOURNAMENT_OR_HIGHER", "Giải CLB hoặc cao hơn"),
            ),
        ),
        Question(
            "self_level",
            "Bạn tự nhận mình ở trình độ nào?",
            hint = "Câu này không chấm điểm — dùng để đối chiếu với kết quả đánh giá.",
            options = listOf(
                Option("NEWCOMER", "Mới bắt đầu"),
                Option("BEGINNER", "Sơ cấp"),
                Option("INTERMEDIATE", "Trung cấp"),
                Option("INTERMEDIATE_PLUS", "Trung cấp khá"),
                Option("ADVANCED", "Nâng cao"),
                Option("COMPETITIVE", "Thi đấu"),
            ),
        ),
    )

    fun toAnswers(values: Map<String, String>): List<AssessmentAnswer> =
        questions.mapNotNull { q -> values[q.id]?.let { AssessmentAnswer(q.id, it) } }
}

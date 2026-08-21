package vn.caulongpro.app.core

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ---------- Auth ----------

@Serializable
data class OtpRequest(val phone: String)

@Serializable
data class RegisterRequest(val phone: String, val name: String, val region: String)

@Serializable
data class OtpVerify(val phone: String, val otp: String, val deviceId: String)

@Serializable
data class RegisterVerify(
    val phone: String,
    val otp: String,
    val name: String,
    val region: String,
    val deviceId: String,
)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
    val devOtp: String? = null,
    val expiresInSeconds: String? = null,
)

// ---------- User / Profile ----------

@Serializable
data class PlayerProfile(
    val id: String,
    val userId: String,
    val displayName: String? = null,
    val region: String? = null,
    val gender: String? = null,
    val handedness: String? = null,
    val position: String? = null,
    val selfLevel: String? = null,
    val band: String? = null,
)

@Serializable
data class UserMe(
    val id: String,
    val phone: String,
    val role: String,
    val status: String,
    val displayName: String? = null,
    val profile: PlayerProfile? = null,
)

@Serializable
data class UpdateProfileRequest(val displayName: String, val region: String)

// ---------- Rating ----------

@Serializable
data class RatingProfile(
    val id: String,
    val userId: String,
    val type: String,
    val rating: Int,
    val ratingState: String,
    val ratedMatches: Int,
    val uniqueOpponents: Int,
    val ratingDeviation: Double,
    val lastRankedAt: String? = null,
    val confidence: String? = null,
    val nextMilestone: Int? = null,
)

@Serializable
data class LeaderboardItem(
    val rank: Int,
    val userId: String,
    val rating: Int,
    val ratingDeviation: Double,
    val ratingState: String,
    val ratedMatches: Int,
    val uniqueOpponents: Int,
    val displayName: String? = null,
    val region: String? = null,
)

@Serializable
data class RatingTxn(
    val id: String,
    val type: String,
    val ratingBefore: Int,
    val delta: Int,
    val ratingAfter: Int,
    val state: String,
    val createdAt: String,
    val match: MatchRef? = null,
)

@Serializable
data class MatchRef(
    val id: String? = null,
    val status: String? = null,
    val format: String? = null,
)

@Serializable
data class AssessmentAnswer(val questionId: String, val value: String)

@Serializable
data class SelfAssessmentRequest(val schemaVersion: String, val answers: List<AssessmentAnswer>)

@Serializable
data class SelfAssessmentResult(
    val band: String? = null,
    val rating: Int? = null,
    val selfLevel: String? = null,
)

// ---------- Session / Venue ----------

@Serializable
data class VenueRef(val name: String? = null, val address: String? = null)

@Serializable
data class Session(
    val id: String,
    val title: String,
    val hostId: String,
    val venueId: String? = null,
    val venue: VenueRef? = null,
    val status: String,
    val startAt: String? = null,
    val endAt: String? = null,
    val totalCost: Long? = null,
    val costSplit: String? = null,
    val maxParticipants: Int? = null,
    val participantCount: Int? = null,
)

@Serializable
data class Venue(val id: String, val name: String, val address: String? = null)

@Serializable
data class CreateSessionRequest(
    val title: String,
    val venueId: String? = null,
    val startAt: String,
    val endAt: String,
    val courtCount: Int,
    val minParticipants: Int,
    val maxParticipants: Int,
    val minRating: Int? = null,
    val maxRating: Int? = null,
    val format: String,
    val totalCost: Long,
    val costSplitMode: String,
    @SerialName("costBreakdown") val costBreakdown: Map<String, Long> = emptyMap(),
)

// ---------- Match ----------

@Serializable
data class MatchPlayer(
    val userId: String,
    val team: String,
    val rosterConfirmed: Boolean,
    val deviceId: String? = null,
    val displayName: String? = null,
    val rating: Int? = null,
    val joinedAt: String? = null,
)

@Serializable
data class MatchScores(val teamA: List<Int>, val teamB: List<Int>)

@Serializable
data class LatestResult(
    val id: String,
    val scores: MatchScores,
    val status: String,
    val confirmedByCount: Int? = null,
)

@Serializable
data class OpenDispute(val id: String, val status: String, val reason: String? = null)

@Serializable
data class Match(
    val id: String,
    val matchType: String,
    val mode: String,
    val format: String,
    val status: String,
    val creatorId: String,
    val scheduledAt: String? = null,
    val startedAt: String? = null,
    val ratedAt: String? = null,
    val players: List<MatchPlayer> = emptyList(),
    val latestResult: LatestResult? = null,
    val openDispute: OpenDispute? = null,
)

@Serializable
data class SubmitResultRequest(val scores: MatchScores)

@Serializable
data class ConfirmResultRequest(val decision: String, val reason: String? = null)

// ---------- Notification ----------

@Serializable
data class NotificationItem(
    val id: String,
    val type: String,
    val title: String,
    val body: String? = null,
    val resourceType: String,
    val resourceId: String? = null,
    val deepLink: String? = null,
    val readAt: String? = null,
    val createdAt: String,
)

// ---------- Envelope ----------

@Serializable
data class PageMeta(
    val page: Int = 0,
    val limit: Int = 0,
    val total: Int = 0,
    val totalPages: Int = 0,
)

@Serializable
data class PageResponse<T>(val items: List<T> = emptyList(), val meta: PageMeta? = null)

@Serializable
data class NotificationsResponse(val items: List<NotificationItem> = emptyList(), val total: Int = 0)

@Serializable
data class LeaderboardResponse(
    val items: List<LeaderboardItem> = emptyList(),
    val meta: PageMeta? = null,
)

// ---------- API error ----------

@Serializable
data class ApiErrorBody(val code: String? = null, val message: String? = null)

@Serializable
data class ApiErrorEnvelope(val error: ApiErrorBody? = null)

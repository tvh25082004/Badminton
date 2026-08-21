package vn.caulongpro.app.core

import kotlinx.serialization.json.Json
import retrofit2.HttpException

/** Lỗi API có cấu trúc từ backend ({ error: { code, message } }). */
class ApiError(
    val status: Int,
    val code: String,
    override val message: String,
) : Exception(message)

object ApiErrors {
    private val json = Json { ignoreUnknownKeys = true }

    /** Map mọi exception thành thông điệp tiếng Việt thân thiện cho UI. */
    fun userMessage(e: Throwable, fallback: String): String = when (e) {
        is ApiError -> e.message
        is HttpException -> {
            val parsed = runCatching {
                val body = e.response()?.errorBody()?.string()
                if (body != null) json.decodeFromString<ApiErrorEnvelope>(body).error?.message else null
            }.getOrNull()
            parsed ?: when (e.code()) {
                401 -> "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."
                403 -> "Bạn không có quyền thực hiện thao tác này."
                404 -> "Không tìm thấy dữ liệu."
                429 -> "Thao tác quá nhanh, vui lòng chờ chút rồi thử lại."
                in 500..599 -> "Máy chủ đang bận, thử lại sau ít phút."
                else -> fallback
            }
        }
        is java.net.UnknownHostException, is java.net.ConnectException ->
            "Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API."
        is java.net.SocketTimeoutException -> "Hết thời gian chờ máy chủ, thử lại nhé."
        else -> e.message?.takeIf { it.isNotBlank() } ?: fallback
    }
}

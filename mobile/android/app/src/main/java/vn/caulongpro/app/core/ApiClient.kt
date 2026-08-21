package vn.caulongpro.app.core

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import vn.caulongpro.app.BuildConfig
import vn.caulongpro.app.data.BadmintonApi
import java.util.concurrent.TimeUnit

/** Sự kiện đăng xuất toàn cục (refresh token hết hạn / bị thu hồi). */
val SessionEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)

class AuthInterceptor(private val store: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { store.snapshot() }?.access
        val request = if (token != null) {
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}

/**
 * Refresh token tự động khi gặp 401 — chỉ refresh đúng một lần cho mỗi token hết hạn;
 * các request khác chờ dùng token mới (đồng bộ qua monitor).
 */
class TokenAuthenticator(
    private val store: TokenStore,
    private val json: Json,
    private val scope: CoroutineScope,
) : okhttp3.Authenticator {

    @Volatile
    var baseUrl: String = BuildConfig.API_BASE_URL

    override fun authenticate(route: okhttp3.Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null // đã retry 1 lần → bỏ
        if (response.request.header("Authorization") == null) return null

        synchronized(this) {
            val current = runBlocking { store.snapshot() } ?: return null
            val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")
            if (current.access == failedToken) {
                val refreshed = runBlocking { doRefresh(current.refresh) }
                if (!refreshed) {
                    runBlocking { store.clear() }
                    scope.launch { SessionEvent.emit(Unit) }
                    return null
                }
            }
        }
        val fresh = runBlocking { store.snapshot() }?.access ?: return null
        return response.request.newBuilder()
            .header("Authorization", "Bearer $fresh")
            .build()
    }

    private suspend fun doRefresh(refreshToken: String): Boolean = try {
        val body = json.encodeToString(RefreshRequest.serializer(), RefreshRequest(refreshToken))
        val client = OkHttpClient.Builder().callTimeout(15, TimeUnit.SECONDS).build()
        val req = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/auth/refresh")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) false
            else {
                val pair = json.decodeFromString(TokenPair.serializer(), resp.body!!.string())
                store.save(pair.accessToken, pair.refreshToken)
                true
            }
        }
    } catch (_: Exception) {
        false
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}

/** Container thủ công — không cần DI framework cho quy mô này. */
class ApiClient(context: Context, private val store: TokenStore) {

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
        encodeDefaults = false
    }

    /** Trạng thái đăng nhập quan sát được từ UI. null = đang kiểm tra token đã lưu. */
    val loggedIn = MutableStateFlow<Boolean?>(null)

    private val authenticator = TokenAuthenticator(store, json, appScope)

    init {
        appScope.launch {
            val override = store.baseUrlOverride.firstOrNull()
            if (override != null) authenticator.baseUrl = override
            loggedIn.value = store.snapshot() != null
        }
        appScope.launch {
            SessionEvent.collect { loggedIn.value = false }
        }
    }

    private fun okHttp(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(store))
            .authenticator(authenticator)
        if (BuildConfig.DEBUG) {
            builder.addInterceptor(
                HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC },
            )
        }
        return builder.build()
    }

    @Volatile
    private var cachedApi: BadmintonApi? = null

    val api: BadmintonApi
        get() = cachedApi ?: buildApi()

    private fun buildApi(): BadmintonApi = synchronized(this) {
        cachedApi?.let { return it }
        Retrofit.Builder()
            .baseUrl(authenticator.baseUrl.let { if (it.endsWith('/')) it else "$it/" })
            .client(okHttp())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(BadmintonApi::class.java)
            .also { cachedApi = it }
    }

    /** Đổi máy chủ API lúc runtime (chỉ dùng cho debug). */
    suspend fun setBaseUrl(url: String?) {
        val normalized = url?.trim()?.takeIf { it.isNotBlank() }
            ?.let { if (it.endsWith('/')) it else "$it/" }
        authenticator.baseUrl = normalized ?: BuildConfig.API_BASE_URL
        store.setBaseUrl(normalized)
        synchronized(this) { cachedApi = null }
    }

    suspend fun onLogin(access: String, refresh: String) {
        store.save(access, refresh)
        loggedIn.value = true
    }

    suspend fun logout() {
        store.clear()
        loggedIn.value = false
    }
}

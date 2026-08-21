package vn.caulongpro.app.core

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "caulongpro_auth")

/** Lưu trữ token + tuỳ chọn máy chủ API. App-private storage (sandbox). */
class TokenStore(private val context: Context) {

    private val accessKey = stringPreferencesKey("bm_access")
    private val refreshKey = stringPreferencesKey("bm_refresh")
    private val baseUrlKey = stringPreferencesKey("bm_base_url")

    val tokens: Flow<Tokens?> = context.dataStore.data.map { prefs ->
        val access = prefs[accessKey] ?: return@map null
        Tokens(access, prefs[refreshKey].orEmpty())
    }

    val baseUrlOverride: Flow<String?> = context.dataStore.data.map { it[baseUrlKey] }

    suspend fun save(access: String, refresh: String) {
        context.dataStore.edit {
            it[accessKey] = access
            it[refreshKey] = refresh
        }
    }

    suspend fun clear() {
        context.dataStore.edit {
            it.remove(accessKey)
            it.remove(refreshKey)
        }
    }

    suspend fun setBaseUrl(url: String?) {
        context.dataStore.edit {
            if (url.isNullOrBlank()) it.remove(baseUrlKey) else it[baseUrlKey] = url
        }
    }

    suspend fun snapshot(): Tokens? = tokens.first()

    data class Tokens(val access: String, val refresh: String)
}

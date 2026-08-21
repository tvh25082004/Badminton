package vn.caulongpro.app

import android.app.Application
import vn.caulongpro.app.core.ApiClient
import vn.caulongpro.app.core.TokenStore

class CauLongProApp : Application() {

    lateinit var container: ApiClient
        private set

    override fun onCreate() {
        super.onCreate()
        val store = TokenStore(this)
        container = ApiClient(this, store)
    }
}

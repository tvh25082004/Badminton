package vn.caulongpro.app.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.RatingProfile
import vn.caulongpro.app.core.RatingTxn
import vn.caulongpro.app.core.UpdateProfileRequest
import vn.caulongpro.app.core.UserMe
import vn.caulongpro.app.ui.components.SectionCard
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.Red
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

@Composable
fun ProfileScreen(onOpenAssess: () -> Unit, onLoggedOut: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = rememberCoroutineScope()

    var user by remember { mutableStateOf<UserMe?>(null) }
    var rating by remember { mutableStateOf<RatingProfile?>(null) }
    var history by remember { mutableStateOf<List<RatingTxn>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    var displayName by remember { mutableStateOf("") }
    var region by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var saveMsg by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        try {
            val api = app.container.api
            user = api.me()
            rating = runCatching { api.myRating() }.getOrNull()
            history = runCatching { api.ratingHistory().items }.getOrDefault(emptyList())
            displayName = user?.profile?.displayName ?: user?.displayName ?: ""
            region = user?.profile?.region ?: ""
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được hồ sơ.")
        } finally {
            loading = false
        }
    }

    if (loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Lime)
        }
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Text("Hồ sơ", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))

        if (error != null) {
            SectionCard(title = "Có lỗi", dotColor = Red) {
                Text(error!!, color = Red, style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.height(16.dp))
        }

        // ---- Thẻ danh tính ----
        SectionCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(52.dp)
                        .background(Lime.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        (user?.profile?.displayName ?: user?.displayName ?: "?").take(1).uppercase(),
                        fontWeight = FontWeight.ExtraBold,
                        color = Lime,
                    )
                }
                Spacer(Modifier.size(12.dp))
                Column {
                    Text(
                        user?.profile?.displayName ?: user?.displayName ?: "Người chơi",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text("☎ ${user?.phone ?: ""} · ${user?.role ?: ""}", style = MaterialTheme.typography.bodyMedium, color = TextFaint)
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        // ---- Rating ----
        val r = rating
        SectionCard(title = "Elo của bạn") {
            if (r == null) {
                Text("Chưa có rating — hãy làm bài tự đánh giá.", color = TextDim, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = onOpenAssess) { Text("📋 Tự đánh giá") }
            } else {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        r.rating.toString(),
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 32.sp,
                        color = Lime,
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("${r.ratedMatches} trận · ${r.uniqueOpponents} đối thủ", color = TextDim, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        // ---- Lịch sử Elo (timeline đơn giản) ----
        if (history.isNotEmpty()) {
            SectionCard(title = "Lịch sử Elo") {
                history.forEach { txn ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(txn.type, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                txn.createdAt.take(16).replace('T', ' '),
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextFaint,
                            )
                        }
                        Text(
                            "${if (txn.delta >= 0) "+" else ""}${txn.delta}",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = if (txn.delta >= 0) Lime else Red,
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(
                            txn.ratingAfter.toString(),
                            fontFamily = FontFamily.Monospace,
                            color = TextDim,
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
        }

        // ---- Chỉnh sửa hồ sơ ----
        SectionCard(title = "Chỉnh sửa thông tin") {
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it.take(50) },
                label = { Text("Tên hiển thị") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = region,
                onValueChange = { region = it.take(120) },
                label = { Text("Khu vực thường chơi") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors(),
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    saving = true
                    saveMsg = null
                    scope.launch {
                        try {
                            app.container.api.updatePlayer(UpdateProfileRequest(displayName.trim(), region.trim()))
                            saveMsg = "Đã lưu thay đổi."
                        } catch (e: Exception) {
                            saveMsg = ApiErrors.userMessage(e, "Lưu thất bại.")
                        } finally {
                            saving = false
                        }
                    }
                },
                enabled = !saving && displayName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                shape = RoundedCornerShape(9.dp),
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.background)
                else Text("Lưu thay đổi", fontWeight = FontWeight.Bold)
            }
            saveMsg?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = if (it.startsWith("Đã")) Lime else Red)
            }
        }
        Spacer(Modifier.height(16.dp))

        // ---- Đăng xuất ----
        OutlinedButton(
            onClick = {
                scope.launch {
                    app.container.logout()
                    onLoggedOut()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Red),
        ) {
            androidx.compose.material3.Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
            Spacer(Modifier.size(6.dp))
            Text("Đăng xuất")
        }
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Lime,
    unfocusedBorderColor = vn.caulongpro.app.ui.theme.LineStrong,
)

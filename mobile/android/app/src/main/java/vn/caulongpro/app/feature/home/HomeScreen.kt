package vn.caulongpro.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.Match
import vn.caulongpro.app.core.RatingProfile
import vn.caulongpro.app.core.Session
import vn.caulongpro.app.ui.components.EmptyState
import vn.caulongpro.app.ui.components.SectionCard
import vn.caulongpro.app.ui.components.StatusBadge
import vn.caulongpro.app.ui.components.viLabel
import vn.caulongpro.app.ui.theme.LimeSoft
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

/**
 * Trang chủ: Elo (điểm nhìn đầu tiên) → trận gần đây → phiên chơi → hành động nhanh.
 * F-pattern + thumb zone: CTA chính nằm dưới cùng.
 */
@Composable
fun HomeScreen(
    onOpenNotifications: () -> Unit,
    onCreateSession: () -> Unit,
    onOpenLeaderboard: () -> Unit,
    onOpenAssess: () -> Unit,
    onOpenSessions: () -> Unit,
    onOpenMatches: () -> Unit,
    onOpenMatch: (String) -> Unit,
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp

    var rating by remember { mutableStateOf<RatingProfile?>(null) }
    var matches by remember { mutableStateOf<List<Match>>(emptyList()) }
    var sessions by remember { mutableStateOf<List<Session>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    var refreshKey by remember { mutableStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(refreshKey) {
        loading = true
        error = null
        try {
            val api = app.container.api
            val r = runCatching { api.myRating() }.getOrNull()
            val m = runCatching { api.myMatches(limit = 4).items }.getOrDefault(emptyList())
            val s = runCatching { api.sessions(limit = 4).items }.getOrDefault(emptyList())
            rating = r
            matches = m
            sessions = s
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được dữ liệu.")
        } finally {
            loading = false
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Tổng quan", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Trạng thái rating, trận đấu và phiên chơi gần đây của bạn.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDim,
                )
            }
            IconButton(onClick = onOpenNotifications) {
                BadgedBox(badge = {
                    // Badge số thông báo chưa đọc (đếm sơ bộ từ danh sách mới nhất)
                    val unread = remember { mutableStateOf(0) }
                    androidx.compose.runtime.LaunchedEffect(Unit) {
                        unread.value = runCatching {
                            app.container.api.notifications().items.count { it.readAt == null }
                        }.getOrDefault(0)
                    }
                    if (unread.value > 0) Badge { Text(unread.value.toString()) }
                }) {
                    Icon(Icons.Filled.Notifications, contentDescription = "Thông báo", tint = TextDim)
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        if (error != null) {
            SectionCard(title = "Có lỗi", dotColor = vn.caulongpro.app.ui.theme.Red) {
                Text(error!!, color = vn.caulongpro.app.ui.theme.Red, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = { refreshKey++ }) { Text("Thử lại") }
            }
            Spacer(Modifier.height(16.dp))
        }

        // ---- Elo card ----
        SectionCard(title = "Elo hiện tại") {
            val r = rating
            if (r == null) {
                EmptyState(
                    icon = "🎯",
                    title = "Chưa có rating",
                    description = "Hoàn thành bài tự đánh giá để có Elo khởi điểm và bắt đầu xếp hạng.",
                    ctaText = "Làm bài tự đánh giá",
                    onCta = onOpenAssess,
                )
            } else {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        r.rating.toString(),
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 40.sp,
                        color = LimeSoft,
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        if (r.confidence == "established") "Vững vàng" else "Tạm thời",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextDim,
                        modifier = Modifier.padding(bottom = 6.dp),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "${r.ratedMatches} trận · ${r.uniqueOpponents} đối thủ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDim,
                )
                if (r.nextMilestone != null && r.nextMilestone > 0) {
                    Spacer(Modifier.height(8.dp))
                    Box(
                        Modifier
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f), RoundedCornerShape(9.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "Còn ${r.nextMilestone} trận để chính thức",
                            style = MaterialTheme.typography.labelMedium,
                            color = LimeSoft,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))

        // ---- Trận gần đây ----
        SectionCard(title = "Trận gần đây") {
            if (matches.isEmpty()) {
                Text("Chưa có trận nào.", style = MaterialTheme.typography.bodyMedium, color = TextDim)
            } else {
                matches.take(3).forEach { m ->
                    MatchRow(m, onClick = { onOpenMatch(m.id) })
                }
            }
            Spacer(Modifier.height(8.dp))
            GhostLink("Xem tất cả →", onOpenMatches)
        }
        Spacer(Modifier.height(16.dp))

        // ---- Phiên chơi ----
        SectionCard(title = "Phiên chơi") {
            if (sessions.isEmpty()) {
                Text("Chưa có phiên nào.", style = MaterialTheme.typography.bodyMedium, color = TextDim)
            } else {
                sessions.take(3).forEach { s ->
                    SessionRow(s, onClick = onOpenSessions)
                }
            }
            Spacer(Modifier.height(8.dp))
            GhostLink("Mở phiên chơi →", onOpenSessions)
        }
        Spacer(Modifier.height(16.dp))

        // ---- Hành động nhanh (thumb zone) ----
        SectionCard(title = "Hành động nhanh") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onCreateSession,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.background),
                ) { Text("+ Tạo phiên", fontWeight = FontWeight.Bold) }
                OutlinedButton(onClick = onOpenLeaderboard) { Text("🏆 Xếp hạng") }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun MatchRow(m: Match, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                "${viLabel(m.format)} · ${if (m.matchType == "QUICK") "Quick" else "Theo lịch"}",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text("${m.players.size} người chơi", style = MaterialTheme.typography.bodyMedium, color = TextFaint)
        }
        StatusBadge(m.status)
    }
}

@Composable
private fun SessionRow(s: Session, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(s.title, style = MaterialTheme.typography.titleMedium)
            Text(
                s.venue?.name ?: "Chưa chọn sân",
                style = MaterialTheme.typography.bodyMedium,
                color = TextFaint,
            )
        }
        StatusBadge(s.status)
    }
}

@Composable
private fun GhostLink(text: String, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
    ) {
        Text(text, color = LimeSoft, style = MaterialTheme.typography.labelLarge)
        Icon(
            Icons.AutoMirrored.Outlined.ArrowForward,
            contentDescription = null,
            tint = LimeSoft,
            modifier = Modifier
                .padding(start = 4.dp)
                .size(14.dp),
        )
    }
}

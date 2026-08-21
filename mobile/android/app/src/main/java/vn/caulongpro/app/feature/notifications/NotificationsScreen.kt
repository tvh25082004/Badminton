package vn.caulongpro.app.feature.notifications

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.NotificationItem
import vn.caulongpro.app.ui.components.EmptyState
import vn.caulongpro.app.ui.theme.Amber
import vn.caulongpro.app.ui.theme.Bg
import vn.caulongpro.app.ui.theme.Blue
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.Red
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(onBack: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    var items by remember { mutableStateOf<List<NotificationItem>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        try {
            items = app.container.api.notifications().items
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được thông báo.")
        }
    }

    fun markRead(id: String) {
        // optimistic update
        items = items?.map { if (it.id == id && it.readAt == null) it.copy(readAt = "now") else it }
        scope.launch { runCatching { app.container.api.markNotificationRead(id) } }
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại", tint = MaterialTheme.colorScheme.onBackground)
                }
            },
            title = { Text("Thông báo", fontWeight = FontWeight.Bold) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg),
        )

        when {
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(error!!, color = Red)
            }
            items == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Lime)
            }
            items!!.isEmpty() -> EmptyState(
                icon = "🔔",
                title = "Chưa có thông báo",
                description = "Thông báo về trận đấu, xác nhận kết quả và Elo sẽ xuất hiện ở đây.",
            )
            else -> LazyColumn(
                Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(items!!, key = { it.id }) { n ->
                    NotificationRow(n, onClick = { if (n.readAt == null) markRead(n.id) })
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun NotificationRow(n: NotificationItem, onClick: () -> Unit) {
    val unread = n.readAt == null
    Row(
        Modifier
            .fillMaxWidth()
            .background(
                if (unread) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface,
                MaterialTheme.shapes.medium,
            )
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier
                .size(8.dp)
                .padding(top = 6.dp)
                .background(n.color(), CircleShape),
        )
        Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) {
            Text(n.title, style = MaterialTheme.typography.titleMedium, fontWeight = if (unread) FontWeight.Bold else FontWeight.Normal)
            n.body?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = TextDim) }
            Text(n.createdAt.take(16).replace('T', ' '), style = MaterialTheme.typography.bodyMedium, color = TextFaint)
        }
    }
}

private fun NotificationItem.color() = when (type.uppercase()) {
    "MATCH_RATED", "RESULT_CONFIRMED" -> Lime
    "MATCH_PENDING_CONFIRM", "RATING_REVIEW" -> Amber
    "DISPUTE_OPENED", "MATCH_VOIDED" -> Red
    else -> Blue
}

package vn.caulongpro.app.feature.sessions

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.CreateSessionRequest
import vn.caulongpro.app.core.Session
import vn.caulongpro.app.core.Venue
import vn.caulongpro.app.data.Assessment
import vn.caulongpro.app.ui.components.EmptyState
import vn.caulongpro.app.ui.components.StatusBadge
import vn.caulongpro.app.ui.components.viLabel
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val viDateTime: DateTimeFormatter =
    DateTimeFormatter.ofPattern("EEE dd/MM · HH:mm").withLocale(java.util.Locale("vi"))

@Composable
fun SessionsScreen(onCreateSession: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp

    var sessions by remember { mutableStateOf<List<Session>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refresh by remember { mutableStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(refresh) {
        error = null
        try {
            sessions = app.container.api.sessions().items
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được phiên chơi.")
        }
    }

    Scaffold(
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onCreateSession,
                containerColor = Lime,
                contentColor = MaterialTheme.colorScheme.background,
                shape = RoundedCornerShape(14.dp),
            ) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Tạo phiên", fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 6.dp))
            }
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            Spacer(Modifier.height(12.dp))
            Text("Phiên chơi", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Các buổi đánh cầu sắp tới và gần đây.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextDim,
            )
            Spacer(Modifier.height(16.dp))

            when {
                error != null -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(error!!, color = vn.caulongpro.app.ui.theme.Red, style = MaterialTheme.typography.bodyMedium)
                    OutlinedButton(onClick = { refresh++ }) { Text("Thử lại") }
                }
                sessions == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Lime)
                }
                sessions!!.isEmpty() -> EmptyState(
                    icon = "🏸",
                    title = "Chưa có phiên nào",
                    description = "Tạo phiên chơi đầu tiên để mời đồng đội cùng đánh.",
                    ctaText = "+ Tạo phiên chơi",
                    onCta = onCreateSession,
                )
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(sessions!!, key = { it.id }) { s ->
                        SessionCard(s)
                    }
                    item { Spacer(Modifier.height(88.dp)) } // chừa chỗ cho FAB
                }
            }
        }
    }
}

@Composable
private fun SessionCard(s: Session) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(s.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            StatusBadge(s.status)
        }
        Spacer(Modifier.height(4.dp))
        Text(s.venue?.name ?: "Chưa chọn sân", style = MaterialTheme.typography.bodyMedium, color = TextFaint)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetaChip("${s.participantCount ?: 0}/${s.maxParticipants ?: 0} người")
            MetaChip(viLabel(s.costSplit ?: ""))
            if (s.startAt != null) MetaChip(formatVi(s.startAt!!))
        }
    }
}

@Composable
fun MetaChip(text: String) {
    Box(
        Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(9.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Text(text, style = MaterialTheme.typography.labelMedium, color = TextDim)
    }
}

private fun formatVi(iso: String): String = runCatching {
    LocalDateTime.ofInstant(Instant.parse(iso), ZoneId.systemDefault()).format(viDateTime)
}.getOrDefault("")

package vn.caulongpro.app.feature.matches

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.Match
import vn.caulongpro.app.ui.components.EmptyState
import vn.caulongpro.app.ui.components.StatusBadge
import vn.caulongpro.app.ui.components.viLabel
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

@Composable
fun MatchesScreen(onOpenMatch: (String) -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp

    var matches by remember { mutableStateOf<List<Match>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refresh by remember { mutableStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(refresh) {
        error = null
        try {
            matches = app.container.api.myMatches().items
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được trận đấu.")
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Text("Trận của tôi", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Quick Rated Match và trận 2v2 theo lịch.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextDim,
        )
        Spacer(Modifier.height(16.dp))

        when {
            error != null -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(error!!, color = vn.caulongpro.app.ui.theme.Red, style = MaterialTheme.typography.bodyMedium)
                OutlinedButton(onClick = { refresh++ }) { Text("Thử lại") }
            }
            matches == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Lime)
            }
            matches!!.isEmpty() -> EmptyState(
                icon = "⚡",
                title = "Chưa có trận nào",
                description = "Tham gia phiên chơi có format Rated để tạo trận tính Elo.",
            )
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(matches!!, key = { it.id }) { m ->
                    MatchCard(m, onClick = { onOpenMatch(m.id) })
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun MatchCard(m: Match, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (m.matchType == "QUICK") "⚡ Quick Rated" else "🏸 Trận 2v2",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
            )
            StatusBadge(m.status)
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "${viLabel(m.format)} · ${m.players.size} người chơi",
            style = MaterialTheme.typography.bodyMedium,
            color = TextFaint,
        )
        m.latestResult?.let { result ->
            Spacer(Modifier.height(8.dp))
            Text(
                "${result.scores.teamA.joinToString("-")} : ${result.scores.teamB.joinToString("-")}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

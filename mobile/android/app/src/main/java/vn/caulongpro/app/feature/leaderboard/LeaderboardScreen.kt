package vn.caulongpro.app.feature.leaderboard

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.LeaderboardItem
import vn.caulongpro.app.ui.components.EmptyState
import vn.caulongpro.app.ui.theme.Amber
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

@Composable
fun LeaderboardScreen() {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp

    var items by remember { mutableStateOf<List<LeaderboardItem>?>(null) }
    var page by remember { mutableStateOf(1) }
    var totalPages by remember { mutableStateOf(1) }
    var error by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(page) {
        error = null
        try {
            val res = app.container.api.leaderboard(page = page)
            items = res.items
            totalPages = res.meta?.totalPages?.coerceAtLeast(1) ?: 1
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được bảng xếp hạng.")
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Text("Bảng xếp hạng", style = MaterialTheme.typography.headlineSmall)
        Text("Top người chơi theo Elo — trang $page/$totalPages", style = MaterialTheme.typography.bodyMedium, color = TextDim)
        Spacer(Modifier.height(16.dp))

        when {
            error != null -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(error!!, color = vn.caulongpro.app.ui.theme.Red, style = MaterialTheme.typography.bodyMedium)
                OutlinedButton(onClick = { page = 1 }) { Text("Thử lại") }
            }
            items == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Lime)
            }
            items!!.isEmpty() -> EmptyState(
                icon = "🏆",
                title = "Chưa có dữ liệu",
                description = "Hãy hoàn thành trận Rated đầu tiên để bảng xếp hạng bắt đầu.",
            )
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(items!!, key = { _, it -> it.userId }) { _, item ->
                    RankRow(item)
                }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                    ) {
                        OutlinedButton(onClick = { if (page > 1) page-- }, enabled = page > 1) { Text("← Trước") }
                        OutlinedButton(onClick = { if (page < totalPages) page++ }, enabled = page < totalPages) { Text("Sau →") }
                    }
                }
            }
        }
    }
}

@Composable
private fun RankRow(item: LeaderboardItem) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, MaterialTheme.shapes.medium)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        // Huy chương top 3 — peak visual cue
        Box(
            Modifier
                .size(32.dp)
                .background(
                    when (item.rank) {
                        1 -> Amber.copy(alpha = 0.2f)
                        2 -> TextFaint.copy(alpha = 0.25f)
                        3 -> androidx.compose.ui.graphics.Color(0xFFB87333).copy(alpha = 0.25f)
                        else -> androidx.compose.ui.graphics.Color.Transparent
                    },
                    CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "#${item.rank}",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                color = when (item.rank) {
                    1 -> Amber
                    else -> TextDim
                },
            )
        }
        Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) {
            Text(item.displayName ?: "Người chơi ẩn danh", style = MaterialTheme.typography.titleMedium)
            Text(
                listOfNotNull(item.region, "${item.ratedMatches} trận").joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = TextFaint,
            )
        }
        Text(
            item.rating.toString(),
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            color = Lime,
        )
    }
}

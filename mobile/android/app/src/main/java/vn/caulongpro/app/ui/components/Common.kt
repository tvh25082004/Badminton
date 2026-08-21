package vn.caulongpro.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import vn.caulongpro.app.ui.theme.Amber
import vn.caulongpro.app.ui.theme.Blue
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.LimeSoft
import vn.caulongpro.app.ui.theme.Red
import vn.caulongpro.app.ui.theme.TextFaint

/** Chuẩn hoá màu trạng thái nghiệp vụ — cùng một màu = cùng một ý nghĩa ở mọi nơi. */
data class StatusStyle(val label: String, val color: Color)

fun statusStyle(status: String): StatusStyle = when (status.uppercase()) {
    "DRAFT", "OPEN" -> StatusStyle(status, Blue)
    "READY", "CONFIRMED", "ACTIVE", "CHECKED_IN" -> StatusStyle(status, Lime)
    "PLAYING", "PENDING_CONFIRM", "PENDING_REVIEW" -> StatusStyle(status, Amber)
    "RATED", "COMPLETED" -> StatusStyle(status, LimeSoft)
    "DISPUTED", "VOIDED", "CANCELLED", "REJECTED" -> StatusStyle(status, Red)
    else -> StatusStyle(status, TextFaint)
}

private val statusLabelsVi = mapOf(
    "DRAFT" to "Nháp",
    "OPEN" to "Mở",
    "READY" to "Sẵn sàng",
    "CONFIRMED" to "Đã xác nhận",
    "ACTIVE" to "Đang diễn ra",
    "CHECKED_IN" to "Đã check-in",
    "PLAYING" to "Đang chơi",
    "PENDING_CONFIRM" to "Chờ xác nhận",
    "PENDING_REVIEW" to "Chờ rà soát",
    "RATED" to "Đã chấm Elo",
    "COMPLETED" to "Hoàn tất",
    "DISPUTED" to "Tranh chấp",
    "VOIDED" to "Đã huỷ",
    "CANCELLED" to "Đã huỷ",
    "RECREATIONAL" to "Giao lưu",
    "PRACTICE" to "Luyện tập",
    "RATED_FORMAT" to "Rated",
)

fun viLabel(raw: String): String =
    statusLabelsVi[raw.uppercase()] ?: raw.replace('_', ' ').lowercase()
    .replaceFirstChar { it.uppercase() }

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val style = statusStyle(status)
    Box(
        modifier = modifier
            .background(style.color.copy(alpha = 0.12f), RoundedCornerShape(9.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(
            text = viLabel(status),
            style = MaterialTheme.typography.labelMedium,
            color = style.color,
        )
    }
}

/** Thẻ section với tiêu đề có dot màu accent — ngôn ngữ thị giác của web app. */
@Composable
fun SectionCard(
    title: String? = null,
    dotColor: Color = Lime,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            if (title != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(7.dp)
                            .background(dotColor, CircleShape),
                    )
                    Text(
                        title,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(start = 8.dp),
                    )
                }
                androidx.compose.foundation.layout.Spacer(Modifier.size(12.dp))
            }
            content()
        }
    }
}

/** Empty state có hướng dẫn + CTA — không bao giờ để màn hình trống trơ. */
@Composable
fun EmptyState(
    icon: String,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    ctaText: String? = null,
    onCta: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(icon, style = MaterialTheme.typography.displayMedium)
        Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        Text(
            description,
            style = MaterialTheme.typography.bodyMedium,
            color = TextFaint,
            textAlign = TextAlign.Center,
        )
        if (ctaText != null && onCta != null) {
            Button(onClick = onCta) {
                Text(ctaText, fontWeight = FontWeight.Bold)
            }
        }
    }
}

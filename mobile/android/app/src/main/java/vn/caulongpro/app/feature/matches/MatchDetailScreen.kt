package vn.caulongpro.app.feature.matches

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.ConfirmResultRequest
import vn.caulongpro.app.core.Match
import vn.caulongpro.app.core.MatchPlayer
import vn.caulongpro.app.core.SubmitResultRequest
import vn.caulongpro.app.ui.components.SectionCard
import vn.caulongpro.app.ui.components.StatusBadge
import vn.caulongpro.app.ui.components.viLabel
import vn.caulongpro.app.ui.theme.Amber
import vn.caulongpro.app.ui.theme.Bg
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.Red
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint
import vn.caulongpro.app.ui.theme.TextPrimary

/**
 * Chi tiết trận — UI theo trạng thái (state-driven actions).
 * Peak moment: trận RATED → hiện tỷ số + xác nhận Elo với haptic success.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MatchDetailScreen(matchId: String, onBack: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    val snackbar = remember { SnackbarHostState() }

    var match by remember { mutableStateOf<Match?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var scoreA by remember { mutableStateOf("") }
    var scoreB by remember { mutableStateOf("") }
    var disputeReason by remember { mutableStateOf("") }
    var refresh by remember { mutableStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(refresh) {
        try {
            match = app.container.api.match(matchId)
            error = null
        } catch (e: Exception) {
            error = ApiErrors.userMessage(e, "Không tải được trận.")
        }
    }

    fun act(action: suspend () -> Unit, okMsg: String? = null, celebrate: Boolean = false) {
        busy = true
        error = null
        scope.launch {
            try {
                action()
                if (celebrate) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                if (okMsg != null) snackbar.showSnackbar(okMsg)
                refresh++
            } catch (e: Exception) {
                error = ApiErrors.userMessage(e, "Thao tác thất bại.")
            } finally {
                busy = false
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            TopAppBar(
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại", tint = TextPrimary)
                }
            },
            title = { Text("Chi tiết trận", fontWeight = FontWeight.Bold) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg),
        )

        val m = match
        if (m == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (error != null) Text(error!!, color = Red) else CircularProgressIndicator(color = Lime)
            }
        } else {
            Column(
                Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        if (m.matchType == "QUICK") "⚡ Quick Rated Match" else "🏸 Trận đấu 2v2",
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.weight(1f),
                    )
                    StatusBadge(m.status)
                }
                Text(
                    buildString {
                        append(viLabel(m.format))
                        append(" · ")
                        append(viLabel(m.mode))
                        m.scheduledAt?.let { append(" · ${it.take(16).replace('T', ' ')}") }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDim,
                )

                if (error != null) {
                    SectionCard(title = "Có lỗi", dotColor = Red) {
                        Text(error!!, color = Red, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TeamCard("A", m.players.filter { it.team == "A" }, Modifier.weight(1f))
                    TeamCard("B", m.players.filter { it.team == "B" }, Modifier.weight(1f))
                }

                // ---- Tỷ số ----
                m.latestResult?.let { result ->
                    SectionCard(title = "Tỷ số") {
                        Text(
                            "${result.scores.teamA.joinToString("-")} : ${result.scores.teamB.joinToString("-")}",
                            fontFamily = FontFamily.Monospace,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        val aWon = (result.scores.teamA.firstOrNull() ?: 0) > (result.scores.teamB.firstOrNull() ?: 0)
                        Text(
                            "Đội ${if (aWon) "A" else "B"} thắng" +
                                (result.confirmedByCount?.let { " · $it/4 xác nhận" } ?: ""),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextFaint,
                        )
                    }
                }

                // ---- Tranh chấp ----
                m.openDispute?.let { dispute ->
                    SectionCard(title = "Tranh chấp đang mở", dotColor = Red) {
                        Text(dispute.reason ?: "Người chơi phản đối kết quả.", style = MaterialTheme.typography.bodyMedium)
                        Text("Quản trị viên sẽ rà soát và xử lý.", style = MaterialTheme.typography.bodyMedium, color = TextFaint)
                    }
                }

                // ---- Actions theo trạng thái ----
                when (m.status.uppercase()) {
                    "DRAFT" -> SectionCard(title = "Xác nhận đội hình") {
                        Text(
                            "Mỗi người chơi cần xác nhận roster. Đủ 4 người → trận chuyển sang sẵn sàng.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextDim,
                        )
                        Spacer(Modifier.height(12.dp))
                        PrimaryAction("Xác nhận roster của tôi", busy) {
                            act({ app.container.api.rosterConfirm(matchId) }, "Đã xác nhận roster")
                        }
                    }

                    "READY" -> SectionCard(title = "Sẵn sàng") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = {
                                act({ app.container.api.checkIn(matchId) }, "Check-in thành công")
                            }, enabled = !busy) { Text("📍 Check-in") }
                            val isCreator = m.players.firstOrNull()?.userId == m.creatorId
                            if (isCreator) {
                                Button(
                                    onClick = { act({ app.container.api.startMatch(matchId) }, "Trận bắt đầu!") },
                                    enabled = !busy,
                                    colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                                ) { Text("▶ Bắt đầu", fontWeight = FontWeight.Bold) }
                            }
                        }
                    }

                    "PLAYING" -> SectionCard(title = "Nhập tỷ số") {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = scoreA,
                                onValueChange = { scoreA = it.filter(Char::isDigit).take(2) },
                                label = { Text("Đội A") },
                                placeholder = { Text("21") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                textStyle = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.Monospace),
                                modifier = Modifier.weight(1f),
                                colors = fieldColors(),
                            )
                            OutlinedTextField(
                                value = scoreB,
                                onValueChange = { scoreB = it.filter(Char::isDigit).take(2) },
                                label = { Text("Đội B") },
                                placeholder = { Text("18") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                textStyle = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.Monospace),
                                modifier = Modifier.weight(1f),
                                colors = fieldColors(),
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        PrimaryAction("Gửi kết quả", busy || scoreA.isEmpty() || scoreB.isEmpty()) {
                            act({
                                app.container.api.submitResult(
                                    matchId,
                                    SubmitResultRequest(
                                        vn.caulongpro.app.core.MatchScores(
                                            teamA = listOf(scoreA.toInt()),
                                            teamB = listOf(scoreB.toInt()),
                                        ),
                                    ),
                                )
                            }, "Đã gửi kết quả, chờ xác nhận")
                        }
                    }

                    "PENDING_CONFIRM" -> SectionCard(title = "Xác nhận kết quả", dotColor = Amber) {
                        Text(
                            "Cần tối thiểu 3/4 người chơi đồng ý và ít nhất 1 đại diện phía đối thủ để tính Elo.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextDim,
                        )
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    act({
                                        app.container.api.confirmResult(matchId, ConfirmResultRequest(decision = "CONFIRM"))
                                    }, "Cảm ơn bạn đã xác nhận!", celebrate = true)
                                },
                                enabled = !busy,
                                colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                            ) { Text("✅ Đồng ý", fontWeight = FontWeight.Bold) }
                            OutlinedButton(onClick = {
                                act({
                                    app.container.api.confirmResult(
                                        matchId,
                                        ConfirmResultRequest(decision = "DISPUTE", reason = disputeReason.ifBlank { "Kết quả không đúng" }),
                                    )
                                }, "Đã mở tranh chấp")
                            }, enabled = !busy) { Text("⚠ Phản đối", color = Red) }
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = disputeReason,
                            onValueChange = { disputeReason = it.take(200) },
                            label = { Text("Lý do phản đối (nếu có)") },
                            placeholder = { Text("Tỷ số bị nhập sai…") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = fieldColors(),
                        )
                    }

                    "RATED", "DISPUTED", "PENDING_REVIEW", "VOIDED" -> SectionCard(title = "Trạng thái trận") {
                        Text(
                            when (m.status.uppercase()) {
                                "RATED" -> "Trận đã hoàn tất và Elo đã được cập nhật cho cả 4 người chơi."
                                "DISPUTED" -> "Trận đang chờ quản trị viên xử lý tranh chấp."
                                "PENDING_REVIEW" -> "Trận đang được hệ thống rà soát (anti-fraud)."
                                else -> "Trận đã bị huỷ, Elo được hoàn nguyên."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextDim,
                        )
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
        }
        SnackbarHost(
            hostState = snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
        )
    }
}

@Composable
private fun TeamCard(label: String, members: List<MatchPlayer>, modifier: Modifier = Modifier) {
    SectionCard(title = "Đội $label", modifier = modifier) {
        if (members.isEmpty()) {
            Text("Chưa đủ người.", style = MaterialTheme.typography.bodyMedium, color = TextDim)
        } else {
            members.forEach { p ->
                Column(Modifier.padding(vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            p.displayName ?: "Người chơi",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.weight(1f),
                        )
                        if (p.rosterConfirmed) {
                            Box(
                                Modifier
                                    .background(Lime.copy(alpha = 0.12f), RoundedCornerShape(9.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            ) {
                                Text("Đã xác nhận", style = MaterialTheme.typography.labelMedium, color = Lime)
                            }
                        }
                    }
                    Text(
                        p.rating?.let { "Elo $it" } ?: "Chưa có Elo",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextFaint,
                    )
                }
            }
        }
    }
}

@Composable
private fun PrimaryAction(text: String, disabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = !disabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
        shape = RoundedCornerShape(9.dp),
    ) {
        if (disabled) CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.background)
        else Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Lime,
    unfocusedBorderColor = vn.caulongpro.app.ui.theme.LineStrong,
)

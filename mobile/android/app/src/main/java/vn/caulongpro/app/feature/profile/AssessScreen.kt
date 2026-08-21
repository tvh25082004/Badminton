package vn.caulongpro.app.feature.profile

import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiErrors
import vn.caulongpro.app.core.RatingProfile
import vn.caulongpro.app.core.SelfAssessmentRequest
import vn.caulongpro.app.data.Assessment
import vn.caulongpro.app.ui.components.SectionCard
import vn.caulongpro.app.ui.theme.Bg
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.Red
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

/** Bài tự đánh giá 10 câu — chỉ làm một lần. Peak: hiện band + Elo khởi điểm. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssessScreen(onBack: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current

    var existing by remember { mutableStateOf<RatingProfile?>(null) }
    var checked by remember { mutableStateOf(false) }
    var answers by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        existing = runCatching { app.container.api.myRating() }.getOrNull()
        checked = true
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại", tint = MaterialTheme.colorScheme.onBackground)
                }
            },
            title = { Text("Tự đánh giá trình độ", fontWeight = FontWeight.Bold) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg),
        )

        if (!checked) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Lime) }
            return@Column
        }

        val done = existing != null
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (done) {
                Spacer(Modifier.height(8.dp))
                SectionCard(title = "Bạn đã hoàn thành bài tự đánh giá") {
                    Text("Elo khởi điểm của bạn là", style = MaterialTheme.typography.bodyMedium, color = TextDim)
                    Text(
                        existing!!.rating.toString(),
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = Lime,
                    )
                    Text("Mỗi người chỉ được làm bài này một lần.", style = MaterialTheme.typography.bodyMedium, color = TextFaint)
                }
            } else {
                Spacer(Modifier.height(8.dp))
                Text(
                    "Trả lời 10 câu hỏi để xác định Elo khởi điểm. Chỉ làm một lần — hãy trả lời trung thực nhất có thể.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDim,
                )
                if (error != null) Text(error!!, color = Red, style = MaterialTheme.typography.bodyMedium)
                if (success != null) {
                    Card(colors = CardDefaults.cardColors(containerColor = Lime.copy(alpha = 0.1f)), shape = RoundedCornerShape(9.dp)) {
                        Text(success!!, color = Lime, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Assessment.questions.forEachIndexed { idx, q ->
                    SectionCard {
                        Row {
                            Text("${idx + 1}.", color = TextFaint, modifier = Modifier.padding(end = 8.dp))
                            Column {
                                Text(q.label, style = MaterialTheme.typography.titleMedium)
                                q.hint?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = TextFaint) }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        q.options.forEach { opt ->
                            val active = answers[q.id] == opt.value
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 3.dp)
                                    .border(
                                        width = 1.dp,
                                        color = if (active) Lime else vn.caulongpro.app.ui.theme.Line,
                                        shape = RoundedCornerShape(9.dp),
                                    )
                                    .clickable { answers = answers + (q.id to opt.value) }
                                    .padding(horizontal = 12.dp, vertical = 9.dp),
                            ) {
                                Text(opt.label, style = MaterialTheme.typography.bodyMedium, color = if (active) Lime else MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }
                }

                Button(
                    onClick = {
                        if (answers.size < Assessment.questions.size) {
                            error = "Vui lòng trả lời đủ 10 câu hỏi."
                            return@Button
                        }
                        error = null
                        busy = true
                        scope.launch {
                            try {
                                val res = app.container.api.selfAssessment(
                                    SelfAssessmentRequest(Assessment.SCHEMA_VERSION, Assessment.toAnswers(answers)),
                                )
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                success = "Hoàn tất! Band ${res.band ?: ""} — Elo khởi điểm ${res.rating ?: ""}. Xem chi tiết ở trang Hồ sơ."
                            } catch (e: Exception) {
                                error = ApiErrors.userMessage(e, "Gửi thất bại.")
                            } finally {
                                busy = false
                            }
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                    shape = RoundedCornerShape(9.dp),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.background)
                    else Text("Gửi bài tự đánh giá (${answers.size}/${Assessment.questions.size})", fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

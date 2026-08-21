package vn.caulongpro.app.feature.sessions

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
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
import vn.caulongpro.app.core.Venue
import vn.caulongpro.app.ui.theme.Bg
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextPrimary
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val displayFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

/** Form tạo phiên chơi — chọn thay vì gõ (selection over manual input). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSessionScreen(onCreated: () -> Unit, onCancel: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = rememberCoroutineScope()

    var title by remember { mutableStateOf("") }
    var venues by remember { mutableStateOf<List<Venue>>(emptyList()) }
    var venueId by remember { mutableStateOf<String?>(null) }
    var startDate by remember { mutableStateOf<LocalDate?>(null) }
    var startTime by remember { mutableStateOf<LocalTime?>(null) }
    var endDate by remember { mutableStateOf<LocalDate?>(null) }
    var endTime by remember { mutableStateOf<LocalTime?>(null) }
    var format by remember { mutableStateOf("RECREATIONAL") }
    var maxParticipants by remember { mutableStateOf("8") }
    var courtCount by remember { mutableStateOf("1") }
    var totalCost by remember { mutableStateOf("200000") }
    var minRating by remember { mutableStateOf("") }
    var maxRating by remember { mutableStateOf("") }

    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    // picker state
    var pickingDateFor by remember { mutableStateOf<String?>(null) } // start|end
    var pickingTimeFor by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        venues = runCatching { app.container.api.venues().items }.getOrDefault(emptyList())
    }

    fun submit() {
        if (title.isBlank()) {
            error = "Vui lòng nhập tiêu đề phiên."
            return
        }
        if (startDate == null || startTime == null || endDate == null || endTime == null) {
            error = "Vui lòng chọn thời gian bắt đầu và kết thúc."
            return
        }
        error = null
        busy = true
        scope.launch {
            try {
                val zone = ZoneId.systemDefault()
                val body = CreateSessionRequest(
                    title = title.trim(),
                    venueId = venueId?.takeIf { it.isNotBlank() },
                    startAt = LocalDateTime.of(startDate!!, startTime!!).atZone(zone).toInstant().toString(),
                    endAt = LocalDateTime.of(endDate!!, endTime!!).atZone(zone).toInstant().toString(),
                    courtCount = courtCount.toIntOrNull() ?: 1,
                    minParticipants = 2,
                    maxParticipants = maxParticipants.toIntOrNull() ?: 8,
                    minRating = minRating.toIntOrNull(),
                    maxRating = maxRating.toIntOrNull(),
                    format = format,
                    totalCost = totalCost.toLongOrNull() ?: 0L,
                    costSplitMode = "EQUAL",
                )
                app.container.api.createSession(body)
                onCreated()
            } catch (e: Exception) {
                error = ApiErrors.userMessage(e, "Tạo phiên thất bại.")
            } finally {
                busy = false
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            navigationIcon = {
                IconButton(onClick = onCancel) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại", tint = TextPrimary)
                }
            },
            title = { Text("Tạo phiên chơi", fontWeight = FontWeight.Bold) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg),
        )

        Column(
            Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (error != null) {
                Text(error!!, color = vn.caulongpro.app.ui.theme.Red, style = MaterialTheme.typography.bodyMedium)
            }

            LabeledField("Tiêu đề") {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it.take(120) },
                    placeholder = { Text("Cầu lông tối thứ 3 — Q7") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = fieldColors(),
                )
            }

            LabeledField("Sân (tuỳ chọn)") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    ChoiceChip("Chưa chọn", venueId == null) { venueId = null }
                    venues.take(2).forEach { v ->
                        ChoiceChip(v.name, venueId == v.id) { venueId = v.id }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                LabeledField("Bắt đầu", Modifier.weight(1f)) {
                    DateTimeField(
                        date = startDate, time = startTime,
                        onPickDate = { pickingDateFor = "start" },
                        onPickTime = { pickingTimeFor = "start" },
                    )
                }
                LabeledField("Kết thúc", Modifier.weight(1f)) {
                    DateTimeField(
                        date = endDate, time = endTime,
                        onPickDate = { pickingDateFor = "end" },
                        onPickTime = { pickingTimeFor = "end" },
                    )
                }
            }

            LabeledField("Hình thức") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        "RECREATIONAL" to "Giao lưu",
                        "PRACTICE" to "Luyện tập",
                        "RATED" to "Rated",
                    ).forEach { (value, label) ->
                        ChoiceChip(label, format == value) { format = value }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField("Tối đa người chơi", maxParticipants, { maxParticipants = it }, Modifier.weight(1f))
                NumberField("Số sân", courtCount, { courtCount = it }, Modifier.weight(1f))
            }
            NumberField("Chi phí dự kiến (VNĐ)", totalCost, { totalCost = it }, Modifier.fillMaxWidth())

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField("Rating tối thiểu", minRating, { minRating = it }, Modifier.weight(1f))
                NumberField("Rating tối đa", maxRating, { maxRating = it }, Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))

            Button(
                onClick = ::submit,
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                shape = RoundedCornerShape(9.dp),
            ) {
                if (busy) CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.background)
                else Text("Tạo phiên", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(32.dp))
        }
    }

    // ---- Pickers ----
    if (pickingDateFor != null) {
        val state = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { pickingDateFor = null },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        val d = Instant.ofEpochMilli(millis).atZone(ZoneId.of("UTC")).toLocalDate()
                        if (pickingDateFor == "start") startDate = d else endDate = d
                    }
                    pickingDateFor = null
                }) { Text("Chọn", color = Lime) }
            },
            dismissButton = { TextButton(onClick = { pickingDateFor = null }) { Text("Huỷ") } },
        ) { DatePicker(state = state) }
    }
    if (pickingTimeFor != null) {
        val state = rememberTimePickerState(is24Hour = true)
        DatePickerDialog(
            onDismissRequest = { pickingTimeFor = null },
            confirmButton = {
                TextButton(onClick = {
                    val t = LocalTime.of(state.hour, state.minute)
                    if (pickingTimeFor == "start") startTime = t else endTime = t
                    pickingTimeFor = null
                }) { Text("Chọn", color = Lime) }
            },
            dismissButton = { TextButton(onClick = { pickingTimeFor = null }) { Text("Huỷ") } },
        ) { TimePicker(state = state) }
    }
}

@Composable
private fun LabeledField(label: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = TextDim)
        Spacer(Modifier.height(6.dp))
        content()
    }
}

@Composable
private fun DateTimeField(
    date: LocalDate?,
    time: LocalTime?,
    onPickDate: () -> Unit,
    onPickTime: () -> Unit,
) {
    OutlinedButton(onClick = onPickDate, modifier = Modifier.fillMaxWidth()) {
        Text(date?.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) ?: "Chọn ngày")
    }
    Spacer(Modifier.height(6.dp))
    OutlinedButton(onClick = onPickTime, modifier = Modifier.fillMaxWidth()) {
        Text(time?.toString()?.take(5) ?: "Chọn giờ")
    }
}

@Composable
private fun NumberField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { onChange(it.filter(Char::isDigit).take(9)) },
        label = { Text(label) },
        singleLine = true,
        modifier = modifier.fillMaxWidth(),
        colors = fieldColors(),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChoiceChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Lime.copy(alpha = 0.15f),
            selectedLabelColor = Lime,
        ),
    )
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Lime,
    unfocusedBorderColor = vn.caulongpro.app.ui.theme.LineStrong,
)

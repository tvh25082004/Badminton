package vn.caulongpro.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import vn.caulongpro.app.CauLongProApp
import vn.caulongpro.app.core.ApiError
import vn.caulongpro.app.core.OtpRequest
import vn.caulongpro.app.core.OtpVerify
import vn.caulongpro.app.core.RegisterRequest
import vn.caulongpro.app.core.RegisterVerify
import vn.caulongpro.app.ui.theme.Amber
import vn.caulongpro.app.ui.theme.Lime
import vn.caulongpro.app.ui.theme.TextDim
import vn.caulongpro.app.ui.theme.TextFaint

private const val DEV_OTP_ADMIN = "111"
private const val DEV_OTP_MOD = "222"
private const val DEV_OTP_PLAYER = "333"

/**
 * Đăng nhập / Đăng ký bằng SĐT + OTP.
 * Peak-End: sau verify thành công chuyển thẳng vào app, không chặn thêm bước nào.
 */
@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val scope = rememberCoroutineScope()

    var mode by remember { mutableStateOf("login") } // login | register
    var step by remember { mutableStateOf(1) }
    var phone by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var region by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var devOtp by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var resendIn by remember { mutableStateOf(0) }

    val isRegister = mode == "register"

    fun startResendTimer() {
        scope.launch {
            resendIn = 60
            while (resendIn > 0) {
                delay(1000)
                resendIn -= 1
            }
        }
    }

    fun requestOtp() {
        if (!Regex("^0\\d{9}$").matches(phone)) {
            error = "Số điện thoại phải là 10 chữ số, bắt đầu bằng 0 (VD: 0912345678)."
            return
        }
        if (isRegister) {
            if (name.trim().length < 2) {
                error = "Vui lòng nhập tên hiển thị (ít nhất 2 ký tự)."
                return
            }
            if (region.trim().length < 2) {
                error = "Vui lòng nhập khu vực bạn thường chơi (VD: Quận 7, TP.HCM)."
                return
            }
        }
        error = null
        busy = true
        scope.launch {
            try {
                val api = app.container.api
                val res = if (isRegister) {
                    api.register(RegisterRequest(phone, name.trim(), region.trim()))
                } else {
                    api.requestOtp(OtpRequest(phone))
                }
                devOtp = res.devOtp
                step = 2
                startResendTimer()
            } catch (e: Exception) {
                error = e.userMessage("Không gửi được mã OTP.")
            } finally {
                busy = false
            }
        }
    }

    fun verifyOtp() {
        if (!Regex("^\\d{3,6}$").matches(otp)) {
            error = "Mã OTP gồm 3–6 chữ số."
            return
        }
        error = null
        busy = true
        scope.launch {
            try {
                val deviceId = "android-" + android.os.Build.MODEL.filter { it.isLetterOrDigit() }
                val res = if (isRegister) {
                    app.container.api.verifyRegister(
                        RegisterVerify(phone, otp, name.trim(), region.trim(), deviceId),
                    )
                } else {
                    app.container.api.verifyOtp(OtpVerify(phone, otp, deviceId))
                }
                app.container.onLogin(res.accessToken, res.refreshToken)
                onLoggedIn()
            } catch (e: Exception) {
                error = e.userMessage("Mã OTP không hợp lệ.")
            } finally {
                busy = false
            }
        }
    }

    // Dev-only: đăng nhập nhanh theo vai trò (backend dev hiển thị OTP cố định).
    fun quickLogin(devPhone: String, expectedOtp: String) {
        error = null
        busy = true
        scope.launch {
            try {
                val api = app.container.api
                val req = runCatching { api.requestOtp(OtpRequest(devPhone)) }.getOrNull()
                val code = req?.devOtp ?: expectedOtp
                val res = api.verifyOtp(
                    OtpVerify(devPhone, code, "quick-${(100..999).random()}"),
                )
                app.container.onLogin(res.accessToken, res.refreshToken)
                onLoggedIn()
            } catch (e: Exception) {
                error = e.userMessage("Đăng nhập nhanh thất bại.")
            } finally {
                busy = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(64.dp))
        Row {
            Text("CầuLông", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Text("Pro", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, color = Lime)
        }
        Spacer(Modifier.height(32.dp))

        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(
                        selected = !isRegister,
                        onClick = {
                            mode = "login"; step = 1; error = null; devOtp = null; otp = ""
                        },
                        shape = SegmentedButtonDefaults.itemShape(0, 2),
                        colors = SegmentedButtonDefaults.colors(
                            activeContainerColor = Lime,
                            activeContentColor = MaterialTheme.colorScheme.background,
                        ),
                    ) { Text("Đăng nhập", fontWeight = FontWeight.Bold) }
                    SegmentedButton(
                        selected = isRegister,
                        onClick = {
                            mode = "register"; step = 1; error = null; devOtp = null; otp = ""
                        },
                        shape = SegmentedButtonDefaults.itemShape(1, 2),
                        colors = SegmentedButtonDefaults.colors(
                            activeContainerColor = Lime,
                            activeContentColor = MaterialTheme.colorScheme.background,
                        ),
                    ) { Text("Đăng ký", fontWeight = FontWeight.Bold) }
                }

                Text(
                    when {
                        step == 1 && isRegister -> "Tạo tài khoản mới"
                        step == 1 -> "Đăng nhập bằng số điện thoại"
                        else -> "Nhập mã OTP gửi tới $phone"
                    },
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    when {
                        step == 1 && isRegister ->
                            "Đăng ký bằng số điện thoại — tài khoản được tạo sau khi xác thực OTP."
                        step == 1 ->
                            "Nhập số điện thoại để nhận mã OTP. Tài khoản mới được tạo tự động."
                        else -> "Nhập mã OTP gồm 3–6 chữ số."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDim,
                )

                if (error != null) ErrorBox(error!!)
                if (devOtp != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Lime.copy(alpha = 0.08f)),
                        shape = RoundedCornerShape(9.dp),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text("Mã OTP của bạn là:", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                devOtp!!,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = Lime,
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                "(SMS mock — hiển thị để dùng thử)",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextFaint,
                            )
                        }
                    }
                }

                if (step == 1) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it.filter(Char::isDigit).take(10) },
                        label = { Text("Số điện thoại") },
                        placeholder = { Text("0912345678") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors(),
                    )
                    if (isRegister) {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it.take(50) },
                            label = { Text("Tên hiển thị") },
                            placeholder = { Text("Nguyễn Văn A") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = fieldColors(),
                        )
                        OutlinedTextField(
                            value = region,
                            onValueChange = { region = it.take(120) },
                            label = { Text("Khu vực thường chơi") },
                            placeholder = { Text("Quận 7, TP.HCM") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = fieldColors(),
                        )
                    }
                    Button(
                        onClick = ::requestOtp,
                        enabled = !busy,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                        shape = RoundedCornerShape(9.dp),
                    ) {
                        if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text(if (isRegister) "Đăng ký & nhận mã OTP" else "Gửi mã OTP", fontWeight = FontWeight.Bold)
                    }
                } else {
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { otp = it.filter(Char::isDigit).take(6) },
                        label = { Text("Mã OTP") },
                        placeholder = { Text("••••••") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        singleLine = true,
                        textStyle = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 4.sp,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors(),
                    )
                    Button(
                        onClick = ::verifyOtp,
                        enabled = !busy,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Lime, contentColor = MaterialTheme.colorScheme.background),
                        shape = RoundedCornerShape(9.dp),
                    ) {
                        if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text(if (isRegister) "Xác nhận & tạo tài khoản" else "Xác nhận & vào ứng dụng", fontWeight = FontWeight.Bold)
                    }
                    TextButton(
                        onClick = ::requestOtp,
                        enabled = resendIn <= 0 && !busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(if (resendIn > 0) "Gửi lại sau ${resendIn}s" else "Gửi lại mã", color = TextDim)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Đăng nhập nhanh theo vai trò (dev — không cần gõ OTP)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextFaint,
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("ADMIN" to "0900000000", "MODERATOR" to "0900000001", "PLAYER" to "0901000001").forEach { (label, devPhone) ->
                        Button(
                            onClick = {
                                quickLogin(
                                    devPhone,
                                    when (label) {
                                        "ADMIN" -> DEV_OTP_ADMIN
                                        "MODERATOR" -> DEV_OTP_MOD
                                        else -> DEV_OTP_PLAYER
                                    },
                                )
                            },
                            enabled = !busy,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant, contentColor = MaterialTheme.colorScheme.onSurface),
                        ) {
                            if (busy) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                            else Text(label, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "OTP theo role: ADMIN=111 · MODERATOR=222 · PLAYER=333",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Amber.copy(alpha = 0.7f),
                )
            }
        }
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun ErrorBox(message: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = vn.caulongpro.app.ui.theme.Red.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(9.dp),
    ) {
        Text(
            message,
            color = vn.caulongpro.app.ui.theme.Red,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(12.dp),
        )
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Lime,
    unfocusedBorderColor = vn.caulongpro.app.ui.theme.LineStrong,
    focusedTextColor = MaterialTheme.colorScheme.onBackground,
    unfocusedTextColor = MaterialTheme.colorScheme.onBackground,
)

/** Chuyển lỗi mạng/HTTP thành thông điệp tiếng Việt thân thiện. */
fun Exception.userMessage(fallback: String): String = when (this) {
    is ApiError -> message ?: fallback
    is java.net.UnknownHostException, is java.net.ConnectException -> "Không kết nối được máy chủ."
    else -> message?.takeIf { it.isNotBlank() } ?: fallback
}

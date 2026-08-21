package vn.caulongpro.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Theme "Sân đêm" — dark-first. Vẫn hỗ trợ light mode bằng bảng màu sáng tương ứng
 * (HIG/Accessibility: tôn trọng cài đặt hệ thống).
 */
private val NightCourtDark = darkColorScheme(
    primary = Lime,
    onPrimary = Bg,
    primaryContainer = LimeDim,
    onPrimaryContainer = LimeSoft,
    secondary = Amber,
    onSecondary = Bg,
    secondaryContainer = AmberDim,
    onSecondaryContainer = AmberSoft,
    tertiary = Blue,
    error = Red,
    errorContainer = RedDim,
    background = Bg,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = Surface2,
    onSurfaceVariant = TextDim,
    outline = LineStrong,
    outlineVariant = Line,
)

private val NightCourtLight = lightColorScheme(
    primary = Color(0xFF4C7A10),
    onPrimary = Color.White,
    secondary = Color(0xFF9A5B00),
    tertiary = Color(0xFF2D5FA8),
    error = Color(0xFFB3261E),
    background = Color(0xFFF7F9F4),
    onBackground = Color(0xFF171C22),
    surface = Color.White,
    onSurface = Color(0xFF171C22),
    surfaceVariant = Color(0xFFEDF1EA),
    onSurfaceVariant = Color(0xFF54616F),
    outline = Color(0xFFC6CFDA),
)

@Composable
fun CauLongProTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) NightCourtDark else NightCourtLight,
        typography = AppTypography,
        content = content,
    )
}

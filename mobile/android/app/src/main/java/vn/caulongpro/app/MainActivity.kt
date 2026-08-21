package vn.caulongpro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.SportsTennis
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import vn.caulongpro.app.feature.auth.LoginScreen
import vn.caulongpro.app.feature.home.HomeScreen
import vn.caulongpro.app.feature.leaderboard.LeaderboardScreen
import vn.caulongpro.app.feature.matches.MatchDetailScreen
import vn.caulongpro.app.feature.matches.MatchesScreen
import vn.caulongpro.app.feature.notifications.NotificationsScreen
import vn.caulongpro.app.feature.profile.AssessScreen
import vn.caulongpro.app.feature.profile.ProfileScreen
import vn.caulongpro.app.feature.sessions.CreateSessionScreen
import vn.caulongpro.app.feature.sessions.SessionsScreen
import vn.caulongpro.app.ui.theme.Bg
import vn.caulongpro.app.ui.theme.CauLongProTheme
import vn.caulongpro.app.ui.theme.TextPrimary

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val SESSIONS = "sessions"
    const val CREATE_SESSION = "sessions/create"
    const val MATCHES = "matches"
    const val LEADERBOARD = "leaderboard"
    const val PROFILE = "profile"
    const val ASSESS = "assess"
    const val NOTIFICATIONS = "notifications"
    const val MATCH_DETAIL = "match/{id}"
    fun matchDetail(id: String) = "match/$id"
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CauLongProTheme {
                RootApp()
            }
        }
    }
}

private data class BottomDest(val route: String, val label: String, val icon: @Composable () -> Unit, val selectedIcon: @Composable () -> Unit)

@Composable
fun RootApp() {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as CauLongProApp
    val loggedIn by app.container.loggedIn.collectAsState()

    // Giữ splash cho tới khi biết chắc đã đăng nhập hay chưa (tránh nháy màn login).
    if (loggedIn == null) return

    val navController = rememberNavController()
    if (loggedIn != true) {
        LoginScreen(
            onLoggedIn = {
                navController.navigate(Routes.HOME) {
                    popUpTo(0) { inclusive = true }
                }
            },
        )
        return
    }

    MainScaffold(navController)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScaffold(navController: NavHostController) {
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val tabs = listOf(
        BottomDest(Routes.HOME, "Trang chủ", { Icon(Icons.Outlined.Home, null) }, { Icon(Icons.Filled.Home, null) }),
        BottomDest(Routes.SESSIONS, "Phiên", { Icon(Icons.Outlined.CalendarMonth, null) }, { Icon(Icons.Filled.SportsTennis, null) }),
        BottomDest(Routes.MATCHES, "Trận", { Icon(Icons.Filled.SportsTennis, null) }, { Icon(Icons.Filled.SportsTennis, null) }),
        BottomDest(Routes.LEADERBOARD, "Xếp hạng", { Icon(Icons.Outlined.EmojiEvents, null) }, { Icon(Icons.Filled.EmojiEvents, null) }),
        BottomDest(Routes.PROFILE, "Cá nhân", { Icon(Icons.Outlined.Person, null) }, { Icon(Icons.Outlined.Person, null) }),
    )

    val showBottomBar = currentRoute in tabs.map { it.route }
    val showTopBar = currentRoute !in setOf(Routes.LOGIN)

    Scaffold(
        containerColor = Bg,
        topBar = {
            if (showTopBar && currentRoute != Routes.HOME && showBottomBar) {
                TopAppBar(
                    title = {
                        Text(
                            when (currentRoute) {
                                Routes.SESSIONS -> "Phiên chơi"
                                Routes.MATCHES -> "Trận của tôi"
                                Routes.LEADERBOARD -> "Bảng xếp hạng"
                                Routes.PROFILE -> "Hồ sơ"
                                else -> "CầuLôngPro"
                            },
                            fontWeight = FontWeight.Bold,
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg, titleContentColor = TextPrimary),
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = Bg) {
                    tabs.forEach { tab ->
                        val selected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { if (selected) tab.selectedIcon() else tab.icon() },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(padding),
            enterTransition = { fadeIn(tween(180)) },
            exitTransition = { fadeOut(tween(120)) },
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                    onCreateSession = { navController.navigate(Routes.CREATE_SESSION) },
                    onOpenLeaderboard = { navController.navigate(Routes.LEADERBOARD) },
                    onOpenAssess = { navController.navigate(Routes.ASSESS) },
                    onOpenSessions = { navController.navigate(Routes.SESSIONS) },
                    onOpenMatches = { navController.navigate(Routes.MATCHES) },
                    onOpenMatch = { navController.navigate(Routes.matchDetail(it)) },
                )
            }
            composable(Routes.SESSIONS) {
                SessionsScreen(onCreateSession = { navController.navigate(Routes.CREATE_SESSION) })
            }
            composable(Routes.CREATE_SESSION) {
                CreateSessionScreen(onCreated = { navController.popBackStack() }, onCancel = { navController.popBackStack() })
            }
            composable(Routes.MATCHES) {
                MatchesScreen(onOpenMatch = { navController.navigate(Routes.matchDetail(it)) })
            }
            composable(Routes.MATCH_DETAIL) { entry ->
                MatchDetailScreen(
                    matchId = entry.arguments?.getString("id").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Routes.LEADERBOARD) { LeaderboardScreen() }
            composable(Routes.PROFILE) {
                ProfileScreen(
                    onOpenAssess = { navController.navigate(Routes.ASSESS) },
                    onLoggedOut = {
                        navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                    },
                )
            }
            composable(Routes.ASSESS) { AssessScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.NOTIFICATIONS) { NotificationsScreen(onBack = { navController.popBackStack() }) }
        }
    }
}

import SwiftUI

@main
struct BadmintonProApp: App {
    @StateObject private var api = APIClient.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(api)
                .preferredColorScheme(.dark) // dark-first "sân đêm"
                .tint(.courtLime)
        }
    }
}

/// Điều hướng gốc: splash chờ kiểm tra token → Login hoặc Tab chính.
struct RootView: View {
    @EnvironmentObject private var api: APIClient

    var body: some View {
        switch api.loggedIn {
        case nil:
            CourtBackground()
                .overlay(ProgressView().tint(.courtLime))
        case .some(false):
            LoginView()
        case .some(true):
            MainTabView()
        }
    }
}

// MARK: - Tab chính (5 mục — thumb zone)

struct MainTabView: View {
    @EnvironmentObject private var api: APIClient

    var body: some View {
        TabView {
            NavigationStack { HomeView() }
                .tabItem { Label("Trang chủ", systemImage: "house") }
            NavigationStack { SessionsView() }
                .tabItem { Label("Phiên", systemImage: "calendar") }
            NavigationStack { MatchesView() }
                .tabItem { Label("Trận", systemImage: "figure.badminton") }
            NavigationStack { LeaderboardView() }
                .tabItem { Label("Xếp hạng", systemImage: "trophy") }
            NavigationStack { ProfileView() }
                .tabItem { Label("Cá nhân", systemImage: "person") }
        }
        .scrollContentBackground(.hidden)
    }
}

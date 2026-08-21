# CầuLôngPro — Mobile Build Guide

> Hướng dẫn build Android (APK/AAB) và iOS (Archive) từ source.

---

## 1. Prérequisites

| Yêu cầu | Android | iOS |
|---|---|---|
| OS | Linux / macOS / Windows | macOS (Xcode) |
| JDK | 17 (Temurin hoặc Zulu) | N/A (Xcode bundled) |
| Android SDK | API 35, Build Tools 35.x | N/A |
| Xcode | N/A | ≥ 16.0, iOS 17+ SDK |
| XcodeGen | N/A | `brew install xcodegen` |
| Gradle | Wrapper (tự tải) | N/A |

### Toolchain auto-detect (nếu dùng Codebuff/Freebuff server)

Toolchain có sẵn tại:
```
/tmp/opencode/toolchain/jdk        # JDK 17
/tmp/opencode/toolchain/sdk        # Android SDK (API 35)
```

Setup env trước mỗi lệnh build:
```bash
export JAVA_HOME=/tmp/opencode/toolchain/jdk
export ANDROID_HOME=/tmp/opencode/toolchain/sdk
export PATH=$JAVA_HOME/bin:$PATH
```

---

## 2. Android Build

### 2.1 Debug APK

```bash
cd mobile/android
./gradlew :app:assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`
- Chưa ký release, dùng debug signing key
- API base URL: `http://10.0.2.2:4000/api/v1/` (emulator) hoặc localhost (device debug)

### 2.2 Release APK / AAB

**Release signing** cần `keystore.properties` ở `mobile/android/keystore.properties`:

```properties
storeFile=path/to/your.keystore
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

Build:
```bash
cd mobile/android
./gradlew :app:assembleRelease     # APK
./gradlew :app:bundleRelease       # AAB (Play Store)
```

Nếu **thiếu** `keystore.properties`, release tự động dùng debug signing key.

Output:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

### 2.3 Compile Check (không build APK)

```bash
./gradlew :app:compileDebugKotlin
```

### 2.4 R8 / ProGuard

Release đã bật:
- `isMinifyEnabled = true` — R8 code shrinking
- `isShrinkResources = true` — resource shrinking
- ProGuard rules: `mobile/android/app/proguard-rules.pro`

Kết quả: APK giảm từ ~18MB (debug) xuống ~1.8MB (release).

### 2.5 API Base URL

| Build Type | URL |
|---|---|
| Debug | `http://10.0.2.2:4000/api/v1/` |
| Release | `https://api.caulongpro.vn/api/v1/` |

Để override, sửa `buildConfigField` trong `app/build.gradle.kts`.

---

## 3. iOS Build

### 3.1 Generate Xcode Project

iOS project dùng **XcodeGen** để tạo `.xcodeproj` từ `project.yml`:

```bash
cd mobile/ios
xcodegen generate
open BadmintonPro.xcodeproj
```

### 3.2 Build & Run (Simulator)

```bash
# Command-line build (no Xcode UI)
xcodebuild -project BadmintonPro.xcodeproj \
  -scheme BadmintonPro \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build
```

### 3.3 Archive (Ad Hoc / App Store)

```bash
xcodebuild -project BadmintonPro.xcodeproj \
  -scheme BadmintonPro \
  -archivePath build/BadmintonPro.xcarchive \
  -destination 'generic/platform=iOS' \
  archive
```

Export IPA cần export options plist (thường tạo qua Xcode Organizer).

### 3.4 Configuration

| Config | API Base URL |
|---|---|
| Debug | `http://localhost:4000/api/v1` |
| Release | `https://api.caulongpro.vn/api/v1` |

Để test trên device thật với backend local, sửa `APIClient.defaultBaseURL` và đổi IP.

---

## 4. Project Structure

```
mobile/
├── android/
│   ├── app/
│   │   ├── build.gradle.kts          # Dependencies, signing, build types
│   │   └── src/main/java/vn/caulongpro/app/
│   │       ├── CauLongProApp.kt      # Application class
│   │       ├── MainActivity.kt       # Navigation, tabs, routes
│   │       ├── core/                  # ApiClient, Models, TokenStore, ApiError
│   │       ├── data/                  # BadmintonApi (Retrofit), Assessment
│   │       ├── feature/               # 10 screens (one package per feature)
│   │       │   ├── auth/              # LoginScreen
│   │       │   ├── home/              # HomeScreen (dashboard)
│   │       │   ├── sessions/          # SessionsScreen, CreateSessionScreen
│   │       │   ├── matches/           # MatchesScreen, MatchDetailScreen
│   │       │   ├── leaderboard/       # LeaderboardScreen
│   │       │   ├── profile/           # ProfileScreen, AssessScreen
│   │       │   └── notifications/     # NotificationsScreen
│   │       └── ui/                    # Theme (Color, Type, Theme), Components
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle/libs.versions.toml
├── ios/
│   ├── project.yml                    # XcodeGen config
│   └── BadmintonPro/
│       ├── App/                       # BadmintonProApp.swift (entry + tabs)
│       ├── Core/                      # APIClient, Models, TokenStore
│       ├── DesignSystem/              # Theme.swift, Components.swift
│       ├── Features/                  # 10 screens (one folder per feature)
│       │   ├── Auth/                  # LoginView
│       │   ├── Home/                  # HomeView
│       │   ├── Sessions/              # SessionsView, CreateSessionView
│       │   ├── Matches/               # MatchesView, MatchDetailView
│       │   ├── Leaderboard/           # LeaderboardView
│       │   ├── Profile/               # ProfileView, AssessView
│       │   └── Notifications/         # NotificationsView
│       └── Resources/                 # Info.plist, Assets.xcassets
└── docs/
    └── mobile/
        └── DESIGN_SYSTEM.md           # Design system "Night Court"
```

---

## 5. Dependencies

### Android (`gradle/libs.versions.toml`)

| Library | Purpose |
|---|---|
| Jetpack Compose (BOM) | UI framework |
| Material 3 | Design system |
| Navigation Compose | Screen navigation |
| Retrofit + OkHttp | HTTP client |
| Kotlinx Serialization | JSON |
| DataStore Preferences | Token storage |
| Splash Screen | Launch screen |

### iOS (SPM via Xcode)

| Framework | Purpose |
|---|---|
| SwiftUI | UI framework |
| Combine | Reactive (via ObservableObject) |
| Security (Keychain) | Token storage |
| Foundation/URLSession | HTTP client |

No third-party dependencies — pure Apple frameworks.

---

## 6. Common Issues

### "Unresolved reference" in Kotlin
→ Missing import. Check `BadmintonApi.kt`, `Models.kt`, `ApiClient.kt` imports.

### "This material API is experimental"
→ Add `@OptIn(ExperimentalMaterial3Api::class)` before the `@Composable` function.

### "None of the following candidates is applicable" for Text()
→ You wrote `Text("...", FontWeight.Bold)`. Fix: `Text("...", fontWeight = FontWeight.Bold)`.

### iOS: "Cannot find Xcode project"
→ Run `xcodegen generate` in `mobile/ios/` first.

### Release build fails signing
→ Create `mobile/android/keystore.properties` with your keystore credentials.

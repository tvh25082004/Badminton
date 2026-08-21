# CầuLôngPro — Skill Usage Report

> 4 skill repos vendored vào `.claude/skills/` và áp dụng trong quá trình phát triển mobile app.
> Mỗi skill đóng góp vào một lớp khác nhau của ứng dụng.

---

## Skills Overview

| # | Skill | Origin | Vai trò chính |
|---|---|---|---|
| 1 | `mobile-app-ui-design` | ceorkm | Quy trình thiết kế UI mobile 5 bước |
| 2 | `ios-design-agent-skill` | vermont42 | iOS aesthetic audit — 5 trụ cột |
| 3 | `apple-app-review-skills` | cruisediary | App Store compliance checklist |
| 4 | `android/skills` | Google | Material 3, navigation, security |

---

## Skill 1: mobile-app-ui-design (ceorkm)

### Applied to: Design System + All Screens

**Cách dùng:**
- Đọc SKILL.md trước khi bắt tay code → hiểu quy trình 5 bước (Discovery → Wireframe → Visual → Prototype → Audit)
- Áp dụng **60/30/10 color rule**: bg 60%, surface 30%, accent lime 10%
- **Grid 8pt**: Tất cả spacing là bội số của 8 (4/8/12/16/24/32/48)
- **Thumb zone**: Bottom navigation 5 tab, FAB ở góc phải dưới
- **F-pattern**: Elo card ở đầu HomeScreen (điểm nhìn đầu tiên)

**Output cụ thể:**
- `Color.kt` / `Theme.swift`: Bảng màu "Night Court" 60/30/10
- `Common.kt` / `Components.swift`: SectionCard, StatusBadge, EmptyStateView
- Tất cả 10 screens follow F-pattern và thumb zone layout

---

## Skill 2: ios-design-agent-skill (vermont42)

### Applied to: iOS DesignSystem + Visual Polish

**5 trụ cột áp dụng:**

#### 1. Typography
- SF Pro với `.fontDesign(.monospaced)` cho số Elo/tỷ số
- `.caption.smallCaps()` cho structural labels
- Font weight contrast: `.bold()` cho headers, `.semibold` cho labels, `.regular` cho body

#### 2. Color
- Named colors trong `Theme.swift`: `.courtBg`, `.courtSurface`, `.courtLime`, etc.
- Surface hierarchy: `courtBg` → `courtSurface` → `courtSurface2` (3 tầngdepth)
- Opacity 12% cho chip/nút phụ

#### 3. Spatial Composition
- Card spacing 16pt, corner radius 14
- Accent bar cạnh trái SectionCard (`.overlay(alignment: .leading)`)
- Capsule chips cho metadata (`MetaChip`)
- Empty state có CTA dẫn đường (`EmptyStateView`)

#### 4. Motion & Feedback
- `.sensoryFeedback(.success, trigger:)` khi confirm kết quả
- `.symbolEffect(.bounce, value:)` cho notification badge
- `.contentTransition(.numericText())` cho Elo animation
- Toast slide-in/out animation

#### 5. Atmospheric Depth
- `CourtBackground` view: gradient overlay + subtle grid lines
- Cards có surface color khác background → spatial layering
- FAB shadow: `.shadow(color: .courtLime.opacity(0.25), radius: 12)`

---

## Skill 3: apple-app-review-skills (cruisediary)

### Applied to: App Store Preparation

**Checklist items addressed:**

| Area | What we did |
|---|---|
| Privacy | `NSAppTransportSecurity` configured, no unnecessary permissions |
| Demo account | Dev quick-login: `0901000001` / OTP `333` |
| Onboarding | No mandatory login wall — guest can see demo flow |
| Age rating | No mature content → rated 4+ |
| Accessibility | VoiceOver labels, Dynamic Type support, Reduce Motion respected |
| Screenshots | Info.plist configured for proper device sizes |
| Metadata | Vietnamese name "CầuLôngPro", correct categories (Sports) |
| Crashes | Graceful error handling on every screen with retry |

**Applied to:** `docs/mobile/APP_STORE_CHECKLIST.md`

---

## Skill 4: android/skills (Google Material 3)

### Applied to: Android Architecture + Material 3 Implementation

**Key patterns applied:**

| Pattern | Implementation |
|---|---|
| Material 3 dark scheme | `CauLongProTheme` extends `darkColorScheme` |
| Edge-to-edge | `enableEdgeToEdge()` in MainActivity |
| Navigation Compose | `NavHost` with `NavigationBar` + 5 tabs |
| Scaffold | Standard `Scaffold` with `topBar`, `bottomBar`, `content` |
| FAB | `ExtendedFloatingActionButton` in SessionsScreen |
| Bottom sheet | N/A (not needed for MVP) |
| State hoisting | All screens use `remember { mutableStateOf() }` + pass state down |
| Optimistic updates | `markRead` in NotificationsScreen updates list before API call |

**Security patterns:**
- Token in DataStore/Keychain (not SharedPreferences/UserDefaults)
- Refresh token rotation on 401
- No secrets in release builds
- Network security config: HTTP allowed in debug, HTTPS-only in release

---

## How to Load Skills

### During development (Codebuff/Freebuff):

```kotlin
// The agent automatically loads skill SKILL.md when the conversation context matches
// the skill's trigger description. No manual loading needed.
```

### Manual loading:

If you need to reference a skill's instructions explicitly:

1. Read `.claude/skills/<name>/SKILL.md`
2. Follow the patterns described in the skill
3. Apply to the relevant code area

### Skill locations:

```
.claude/skills/
├── mobile-app-ui-design/SKILL.md    # UI design process
├── ios-design/                       # iOS aesthetic audit
├── android/                          # Material 3 patterns
└── apple-app-review/                 # App Store compliance
```

---

## Design Decisions Driven by Skills

| Decision | Skill Source | Rationale |
|---|---|---|
| Dark-first theme ("Night Court") | mobile-app-ui-design | Badminton courts are lit at night → atmospheric |
| 14dp card corners | mobile-app-ui-design | 8pt grid → 14 ≈ 2×8 - 2 for visual weight |
| Monospace digits for Elo | ios-design | `.monospacedDigit()` prevents layout shift |
| No custom fonts | ios-design | SF Pro/Roboto design axes provide enough contrast |
| Accent bar on section cards | ios-design | Spatial grouping reinforcement |
| `ExtendedFloatingActionButton` | android | Material 3 recommendation for primary action |
| Dev quick-login buttons | apple-app-review | Reviewers need demo accounts |
| Vietnamese status labels everywhere | mobile-app-ui-design | Target audience is Vietnamese players |

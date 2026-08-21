# CầuLôngPro — App Store & Google Play Checklist

> Checklist đầy đủ trước khi submit lên App Store (iOS) và Google Play (Android).
> Tham khảo: Apple App Review Guidelines, Google Play Developer Policy.

---

## Google Play Store

### Prep

- [ ] **Google Play Developer Account** ($25 one-time fee)
- [ ] **App signing by Google Play** bật (Play App Signing)
- [ ] **Keystore upload** (chỉ cần lần đầu): upload keystore và retain key
- [ ] **Privacy Policy URL** hosted online (Firebase Hosting hoặc GitHub Pages)

### Store Listing

- [ ] **App name**: `CầuLôngPro` (≤ 30 chars)
- [ ] **Short description** (≤ 80 chars): "Quản lý trận cầu lông, tính Elo, chia chi phí"
- [ ] **Full description** (≤ 4000 chars): Mô tả chi tiết tính năng
- [ ] **App icon**: 512×512 PNG, không trong suốt
- [ ] **Feature graphic**: 1024×500 JPG/PNG
- [ ] **Screenshots**: 
  - Phone: min 2, recommended 4–8
  - 16:9 hoặc 9:16
  - Không có viền đen, không có status bar mockup
  - Chụp từ emulator hoặc device thật
- [ ] **Video trailer** (tùy chọn): YouTube link, ≤ 30 giây

### Content Rating

- [ ] **IARC questionnaire** điền xong (Sports → moderate)
- [ ] Rated **Everyone** hoặc **Everyone 10+**

### Target Audience

- [ ] Target age group: 13–35
- [ ] Confirm không hướng đến children under 13

### Content Declarations

- [ ] **User-generated content**: Có (tên hiển thị, tỷ số nhập tay) → bật UGC flag
- [ ] **Social features**: Có (leaderboard, match confirm) → khai báo
- [ ] **Location**: Không bắt buộc (region nhập tay, không GPS)
- [ ] **Data safety form**: 
  - Data collected: Name, phone, gameplay data
  - Data shared: No
  - Data encrypted in transit: Yes (HTTPS release)
  - Data deletion: Có (xóa tài khoản qua support)
  - E2E encryption: No

### Technical

- [ ] **AAB** upload (không phải APK)
- [ ] **Target SDK ≥ 35** (Android 15)
- [ ] **Min SDK ≥ 26** (Android 8.0)
- [ ] **64-bit support**: Yes (ARM64)
- [ ] **No hardcoded secrets** trong APK
- [ ] **Network security config**: Debug cho phép HTTP, Release HTTPS only
- [ ] **ProGuard/R8** rules không break serialization

### Policy Compliance

- [ ] **No malware**, no deceptive behavior
- [ ] **No impersonation** of other apps/services
- [ ] **Privacy Policy** accessible from app (Profile → link)
- [ ] **Permissions** justify用途:
  - No camera permission (không dùng)
  - No location permission (không GPS)
  - No contacts permission
  - No phone permission
- [ ] **Ads**: Không có quảng cáo → không cần khai báo
- [ ] **In-app purchases**: Không có → không cần khai báo
- [ ] **Content moderation**: Tên hiển thị có thể report → cần mod workflow

---

## Apple App Store

### Prep

- [ ] **Apple Developer Account** ($99/year)
- [ ] **App Store Connect** app record tạo sẵn
- [ ] **Certificates + Provisioning Profile**:
  - Development: Apple Development cert + dev provisioning
  - Distribution: Apple Distribution cert + App Store provisioning
- [ ] **Privacy Policy URL** (cùng URL dùng cho Android)

### App Information

- [ ] **App name**: `CầuLôngPro`
- [ ] **Subtitle** (≤ 30 chars): "Cầu lông · Elo · Xếp hạng"
- [ ] **Category**: Primary: Sports; Secondary: Lifestyle
- [ ] **Content Rights**: Không chứa nội dung third-party có bản quyền
- [ ] **Age Rating**: Completed the age rating questionnaire → dự kiến **4+**

### Store Listing

- [ ] **App icon**: 1024×1024 PNG, sRGB, không beta/Transparency
- [ ] **Screenshots**:
  - iPhone 6.7" (1290×2796): min 1, recommended 3–6
  - iPhone 6.5" (1242×2688): min 1, required nếu hỗ trợ
  - iPad 12.9" (2048×2732): min 1 nếu universal
  - Không có viền rounded, không có notch mockup
- [ ] **App Preview video** (tùy chọn): ≤ 30 giây, matching device size
- [ ] **Promotional text** (≤ 170 chars): Có thể update sau submit
- [ ] **Description**: ≤ 4000 chars
- [ ] **Keywords**: ≤ 100 chars, separated by commas
  - Suggested: `cau long, badminton, elo, ranking, sport, tournament, lich choi, diem so`
- [ ] **Support URL**: link到 website hoặc GitHub Issues
- [ ] **Marketing URL** (tùy chọn)

### Privacy & Compliance

- [ ] **App Privacy** section trong App Store Connect:
  - Data Types collected: Name, Phone Number, Usage Data, Gameplay Content
  - Purpose: App Functionality, Analytics (nếu có)
  - Linked to identity: Yes
  - Used for tracking: No
- [ ] **App Privacy nutrition labels** khai báo chính xác
- [ ] **ATT (App Tracking Transparency)**: Không cần nếu không track cross-app
- [ ] **Privacy manifest** (`PrivacyInfo.xcprivacy`): Thêm vào project nếu dùng UserDefaults/purchases
- [ ] **NSAppTransportSecurity**: `NSAllowsArbitraryLoads` chỉ cho debug; Release nên allowlist domains

### Technical

- [ ] **iOS 17.0+** minimum deployment target
- [ ] **Swift 5.9+**
- [ ] **No private APIs** sử dụng
- [ ] **No mock/dummy endpoints** trong release build
- [ ] **Launch screen** đúng cách (không dùng `UILaunchStoryboardName` deprecated)
- [ ] **Dynamic Type** hỗ trợ đầy đủ
- [ ] **VoiceOver** accessibility: labels cho các interactive elements
- [ ] **Dark mode** hỗ trợ (app dùng dark-first nhưng light cũng OK)
- [ ] **No crashes** trong test flow cơ bản
- [ ] **IPv6 support**: Backend accessible qua IPv6 (Apple reject nếu không)

### Simulator/Device Testing

- [ ] iPhone SE (3rd gen) — smallest supported
- [ ] iPhone 15 Pro Max — largest
- [ ] iPad Pro 12.9" (nếu universal)
- [ ] All orientations (nếu hỗ trợ landscape, portrait lock OK)
- [ ] Low memory warning behavior
- [ ] Background/foreground transitions
- [ ] Network loss graceful degradation (error state)
- [ ] Deep link test (nếu có)

### Common App Review Rejections

| Lý do reject | Prevention |
|---|---|
| Crash hoặc bug | Test đầy đủ flow trước submit |
| Placeholder content | Không có lorem ipsum, dummy images |
| Incomplete metadata | Tất cả fields điền đầy đủ |
| Privacy issues | Nutrition labels chính xác |
| Login required without demo | Cung cấp demo account cho reviewer |
| Broken links | Support URL hoạt động |
| Misleading screenshots | Screenshots match actual app |
| In-app purchase issues | N/A (không có IAP) |

### Demo Account cho Reviewer

Tạo tài khoản dev cho Apple reviewer:
```
Phone: 0901000001
OTP: 333 (Player role)
```

Hoặc tạo dedicated account:
```
Phone: <your_review_phone>
OTP: <shared securely in notes>
```

Điền vào App Store Connect → TestFlight → Build → App Review Information → Notes.

---

## Cross-Platform Consistency

### Kiểm tra song song Android + iOS

| Feature | Android | iOS |
|---|---|---|
| Login/OTP flow | ✅ | ✅ |
| Home dashboard + Elo | ✅ | ✅ |
| Sessions list + create | ✅ | ✅ |
| Matches list + detail | ✅ | ✅ |
| Leaderboard | ✅ | ✅ |
| Profile + edit | ✅ | ✅ |
| Self-assessment (10Q) | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Match confirm/dispute | ✅ | ✅ |
| Dark theme | ✅ | ✅ |

### Design System Consistency

- Same color tokens across platforms (Night Court palette)
- Same status → color mapping (StatusMapper/StatusBadge)
- Same Vietnamese labels for statuses
- Same Elo number display (monospace digits)
- Same section card pattern (dot + title + content)

---

## Release Checklist (per version)

### Pre-release

- [ ] Version bump: `versionCode` (Android) / `CURRENT_PROJECT_VERSION` (iOS)
- [ ] Changelog / release notes viết xong
- [ ] API `versionName` match app version
- [ ] Keystore/profile expires date check (> 6 months ahead)
- [ ] ProGuard/R8 không break新models
- [ ] No `println`/`print` debug logs trong code
- [ ] No `.debug` API URLs trong release build

### Release Day

- [ ] Build signed AAB (Android) + Archive (iOS)
- [ ] Upload to Google Play Console → Internal Testing → Production
- [ ] Upload to App Store Connect → TestFlight → Submit for Review
- [ ] Monitor crash reports (Firebase Crashlytics nếu tích hợp)
- [ ] Monitor backend logs cho new user errors

### Post-release

- [ ] Verify install + onboarding trên real devices
- [ ] Check Play Store / App Store console for crashes
- [ ] Respond to any user reviews within 24h
- [ ] Monitor backend load from new version

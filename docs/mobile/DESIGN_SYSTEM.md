# CầuLôngPro — Mobile Design System (Android + iOS)

> Chưng cất từ 4 skill:
> - `mobile-app-ui-design` (ceorkm) — quy trình 5 bước, 60/30/10, lưới 8pt, thumb zone, Peak-End
> - `ios-design-agent-skill` (vermont42) — 5 trụ cột: Typography, Color, Space, Motion, Depth
> - `apple-app-review-skills` (cruisediary) — checklist tuân thủ App Review Guidelines
> - `android/skills` (Google) — Material 3 theming, navigation, security, testing

## 1. Ngôn ngữ thiết kế: "Sân đêm" (Night Court)

Kế thừa design system web (`frontend/app/globals.css`): nền than đen-lam như sân cầu lông
ban đêm, vạch sân xanh vôi (court lime), ánh amber của đèn pha.

### Màu sắc (quy tắc 60/30/10)

| Vai trò | Token | Hex | Tỷ trọng |
|---|---|---|---|
| Nền chính (60%) | `bg` | `#0A0E13` | nền app |
| Nền phụ | `bgSoft` | `#10161D` | thanh dưới, sheet |
| Bề mặt thẻ | `surface` | `#151D26` | card (30%) |
| Bề mặt nâng | `surface2` | `#1B2530` | chip, input |
| Đường kẻ | `line` / `lineStrong` | `#232F3C` / `#31404F` | divider, viền |
| Accent (10%) | `lime` | `#A8E063` | CTA, Elo, trạng thái tốt |
| Accent mềm | `limeSoft` | `#BFF08A` | số liệu nổi bật |
| Cảnh báo | `amber` | `#FFB454` | pending, chờ xác nhận |
| Lỗi/tranh chấp | `red` | `#FF6B6B` | dispute, huỷ |
| Info | `blue` | `#6EA8FF` | link, thông tin |
| Text chính | `text` | `#E9EFF6` | heading, body |
| Text phụ | `textDim` | `#9AA8B8` | secondary |
| Text mờ | `textFaint` | `#64748B` | caption |

Nguyên tắc: màu mạnh (đỏ) chỉ dùng cho khoảnh khắc có ý nghĩa; accent ở opacity 12%
làm nền chip/nút phụ; bóng đổ tint theo nền (không dùng đen thuần).

## 2. Typography

- **1 font family** mỗi nền tảng: Android = Roboto (system), iOS = SF Pro (system).
- **Tối đa 4 cỡ + 2 weight**: Display 40 / Title 22–24 / Body 15–16 / Caption 12–13;
  Bold (700) + Regular (400). Medium chỉ cho label nút.
- **Số liệu động (Elo, tỷ số)** dùng **monospace digits**:
  - Android: `FontFamily.Monospace`
  - iOS: `.monospacedDigit()` / `.fontDesign(.monospaced)`
- iOS thêm tương phản kiểu chữ: tiêu đề màn hình `.title.bold()`, nhãn cấu trúc
  `.caption.smallCaps()`.

## 3. Spacing & Hình dạng (lưới 8pt)

- Khoảng cách: **4 / 8 / 12 / 16 / 24 / 32 / 48**. Không dùng giá trị lẻ.
- Padding trong card: **16dp/pt** cơ bản, section cách nhau **24–32**.
- Bo góc: card **14**, chip/input **9**, pill **999**.
- Tap target tối thiểu **44×44pt / 48×48dp**.

## 4. Điều hướng & Thumb Zone

- Bottom navigation 5 mục (nằm trong vùng ngón tay cái):
  **Trang chủ · Phiên · Trận · Xếp hạng · Cá nhân**
- Primary action ("+ Tạo phiên") = FAB góc phải dưới.
- Nội dung đọc theo F-pattern; thẻ Elo đặt đầu trang chủ (điểm nhìn đầu tiên).

## 5. Trạng thái & Peak-End

- Mọi màn hình có đủ 4 trạng thái: **loading (skeleton), empty (có CTA dẫn đường),
  error (có nút thử lại), success**.
- **Peak moment**: trận được rate → hiện chip delta Elo (+12/-8) với animation,
  haptic success, snackbar ăn mừng.
- **End**: sau hành động quan trọng luôn có thẻ tổng kết/kết luận, không để app
  "rơi tự do".
- Motion: micro-animation 150–250ms, tôn trọng Reduce Motion.

## 6. Chuẩn hoá trạng thái nghiệp vụ

| Trạng thái | Màu |
|---|---|
| DRAFT, OPEN | blue |
| READY, CONFIRMED, ACTIVE | lime |
| PLAYING, PENDING_CONFIRM, PENDING_REVIEW | amber |
| RATED, COMPLETED | limeSoft |
| DISPUTED, VOIDED, CANCELLED | red |

## 7. Platform conventions

- Android: Material 3 dark scheme, edge-to-edge, dynamic status bar, ripple mặc định.
- iOS: HIG — TabView + NavigationStack, system semantic colors khi phù hợp,
  `sensoryFeedback`, `symbolEffect`, `ContentUnavailableView`, Dynamic Type đầy đủ,
  Dark Mode là chế độ gốc (app là dark-first nhưng vẫn hỗ trợ light bằng token riêng).

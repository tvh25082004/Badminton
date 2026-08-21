import SwiftUI

// MARK: - Badge trạng thái

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(StatusMapper.style(status).label)
            .font(.caption2.weight(.bold))
            .foregroundStyle(StatusMapper.style(status).color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(StatusMapper.style(status).color.opacity(0.12), in: Capsule())
    }
}

// MARK: - Thẻ section (dot màu accent + tiêu đề — ngôn ngữ thị giác của web)

struct SectionCard<Content: View>: View {
    var title: String?
    var dotColor: Color = .courtLime
    @ViewBuilder let content: Content

    init(title: String? = nil, dotColor: Color = .courtLime, @ViewBuilder content: () -> Content) {
        self.title = title
        self.dotColor = dotColor
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                HStack(spacing: 8) {
                    Circle().fill(dotColor).frame(width: 7, height: 7)
                    Text(title).font(.headline)
                }
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
        // Accent bar cạnh trái — spatial grouping theo ios-design skill
        .overlay(alignment: .leading) {
            if title != nil {
                Rectangle()
                    .fill(dotColor.opacity(0.25))
                    .frame(width: 2)
                    .clipShape(RoundedRectangle(cornerRadius: 1))
            }
        }
    }
}

// MARK: - Empty state có CTA dẫn đường

struct EmptyStateView: View {
    let icon: String
    let title: String
    let description: String
    var ctaText: String?
    var onCta: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 8) {
            Text(icon).font(.system(size: 40))
            Text(title).font(.headline).multilineTextAlignment(.center)
            Text(description)
                .font(.subheadline)
                .foregroundStyle(.courtTextFaint)
                .multilineTextAlignment(.center)
            if let ctaText, let onCta {
                Button(action: onCta) {
                    Text(ctaText).fontWeight(.semibold)
                }
                .buttonStyle(.borderedProminent)
                .tint(.courtLime)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
    }
}

// MARK: - Ô lỗi

struct ErrorBox: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline)
            .foregroundStyle(.courtRed)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.courtRed.opacity(0.1), in: RoundedRectangle(cornerRadius: 9))
    }
}

// MARK: - Chip meta

struct MetaChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.courtTextDim)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.courtSurface2, in: Capsule())
    }
}

// MARK: - Nút chính (lime, thumb-friendly 48pt)

struct PrimaryButton: View {
    let title: String
    var systemImage: String?
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title).fontWeight(.bold)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.borderedProminent)
        .tint(.courtLime)
        .foregroundStyle(Color.courtBg)
        .disabled(disabled)
    }
}

// MARK: - Nền "vạch sân" mờ (atmospheric depth)

struct CourtBackground: View {
    var body: some View {
        ZStack {
            Color.courtBg.ignoresSafeArea()
            Canvas { context, size in
                let step: CGFloat = 44
                var path = Path()
                var x: CGFloat = 0
                while x <= size.width {
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                    x += step
                }
                var y: CGFloat = 0
                while y <= size.height {
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                    y += step
                }
                context.stroke(path, with: .color(.courtLime.opacity(0.028)), lineWidth: 1)
            }
            LinearGradient(
                colors: [.courtLime.opacity(0.05), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )
        }
    }
}

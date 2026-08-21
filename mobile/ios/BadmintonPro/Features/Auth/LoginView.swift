import SwiftUI

/// Đăng nhập / Đăng ký bằng SĐT + OTP.
struct LoginView: View {
    @EnvironmentObject private var api: APIClient

    @State private var mode: Mode = .login
    @State private var step: Step = .phone
    @State private var phone = ""
    @State private var name = ""
    @State private var region = ""
    @State private var otp = ""
    @State private var devOtp: String?
    @State private var error: String?
    @State private var busy = false
    @State private var resendIn = 0
    @State private var timer: Timer?

    enum Mode { case login, register }
    enum Step { case phone, otp }

    var body: some View {
        CourtBackground()
            .overlay(
                ScrollView {
                    VStack(spacing: 16) {
                        header
                        card
                        devCard
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 64)
                    .padding(.bottom, 32)
                }
                .scrollDismissesKeyboard(.interactively),
            )
            .onDisappear { timer?.invalidate() }
    }

    private var header: some View {
        HStack(spacing: 0) {
            Text("CầuLông").font(.title.bold()).foregroundStyle(.courtText)
            Text("Pro").font(.title.bold()).foregroundStyle(.courtLime)
        }
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("", selection: $mode) {
                Text("Đăng nhập").tag(Mode.login)
                Text("Đăng ký").tag(Mode.register)
            }
            .pickerStyle(.segmented)
            .onChange(of: mode) { _ in reset() }

            Text(titleText).font(.headline)
            Text(subtitleText).font(.subheadline).foregroundStyle(.courtTextDim)

            if let error { ErrorBox(message: error) }

            if let devOtp {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Mã OTP của bạn là:").font(.subheadline)
                    Text(devOtp)
                        .font(.eloNumber(20))
                        .foregroundStyle(.courtLime)
                        .contentTransition(.numericText())
                    Text("(SMS mock — hiển thị để dùng thử)")
                        .font(.caption)
                        .foregroundStyle(.courtTextFaint)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.courtLime.opacity(0.08), in: RoundedRectangle(cornerRadius: 9))
            }

            switch step {
            case .phone:
                field("Số điện thoại", text: $phone, placeholder: "0912345678", keyboard: .numberPad, max: 10)
                if mode == .register {
                    field("Tên hiển thị", text: $name, placeholder: "Nguyễn Văn A", keyboard: .default, max: 50)
                    field("Khu vực thường chơi", text: $region, placeholder: "Quận 7, TP.HCM", keyboard: .default, max: 120)
                }
                PrimaryButton(title: mode == .register ? "Đăng ký & nhận mã OTP" : "Gửi mã OTP", disabled: busy) {
                    Task { await requestOtp() }
                }

            case .otp:
                field("Mã OTP", text: $otp, placeholder: "••••••", keyboard: .numberPad, max: 6, mono: true)
                PrimaryButton(title: mode == .register ? "Xác nhận & tạo tài khoản" : "Xác nhận & vào ứng dụng", disabled: busy) {
                    Task { await verifyOtp() }
                }
                Button {
                    Task { await requestOtp() }
                } label: {
                    Text(resendIn > 0 ? "Gửi lại sau \(resendIn)s" : "Gửi lại mã")
                        .frame(maxWidth: .infinity)
                }
                .disabled(resendIn > 0 || busy)
            }
        }
        .padding(16)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
    }

    /// Dev-only: đăng nhập nhanh theo vai trò.
    private var devCard: some View {
        VStack(spacing: 8) {
            Text("Đăng nhập nhanh theo vai trò (dev — không cần gõ OTP)")
                .font(.caption)
                .foregroundStyle(.courtTextFaint)
            HStack(spacing: 8) {
                ForEach([("ADMIN", "0900000000", "111"), ("MODERATOR", "0900000001", "222"), ("PLAYER", "0901000001", "333")], id: \.0) { item in
                    Button {
                        Task { await quickLogin(phone: item.1, fallbackOtp: item.2) }
                    } label: {
                        Text(item.0).font(.caption.bold())
                            .frame(maxWidth: .infinity, minHeight: 36)
                    }
                    .buttonStyle(.bordered)
                    .disabled(busy)
                }
            }
            Text("OTP theo role: ADMIN=111 · MODERATOR=222 · PLAYER=333")
                .font(.caption2)
                .foregroundStyle(.courtAmber.opacity(0.7))
        }
        .padding(16)
        .background(Color.courtSurface, in: RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Logic

    private var titleText: String {
        switch (step, mode) {
        case (.phone, .login): return "Đăng nhập bằng số điện thoại"
        case (.phone, .register): return "Tạo tài khoản mới"
        case (.otp, _): return "Nhập mã OTP gửi tới \(phone)"
        }
    }

    private var subtitleText: String {
        switch (step, mode) {
        case (.phone, .login):
            return "Nhập số điện thoại để nhận mã OTP. Tài khoản mới được tạo tự động."
        case (.phone, .register):
            return "Đăng ký bằng số điện thoại — tài khoản được tạo sau khi xác thực OTP."
        case (.otp, _):
            return "Nhập mã OTP gồm 3–6 chữ số."
        }
    }

    private func reset() {
        step = .phone
        error = nil
        devOtp = nil
        otp = ""
    }

    private func startResendTimer() {
        resendIn = 60
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
            resendIn -= 1
            if resendIn <= 0 { t.invalidate() }
        }
    }

    private func requestOtp() async {
        guard phone.count == 10, phone.hasPrefix("0"), phone.allSatisfy(\.isNumber) else {
            error = "Số điện thoại phải là 10 chữ số, bắt đầu bằng 0 (VD: 0912345678)."
            return
        }
        if mode == .register {
            if name.trimmingCharacters(in: .whitespaces).count < 2 {
                error = "Vui lòng nhập tên hiển thị (ít nhất 2 ký tự)."
                return
            }
            if region.trimmingCharacters(in: .whitespaces).count < 2 {
                error = "Vui lòng nhập khu vực bạn thường chơi (VD: Quận 7, TP.HCM)."
                return
            }
        }
        error = nil
        busy = true
        defer { busy = false }
        do {
            let res: TokenPair = mode == .register
                ? try await api.register(phone: phone, name: name.trimmingCharacters(in: .whitespaces), region: region.trimmingCharacters(in: .whitespaces))
                : try await api.requestOtp(phone: phone)
            devOtp = res.devOtp
            step = .otp
            startResendTimer()
        } catch {
            self.error = ApiErrors.userMessage(error, "Không gửi được mã OTP.")
        }
    }

    private func verifyOtp() async {
        guard otp.count >= 3 else {
            error = "Mã OTP gồm 3–6 chữ số."
            return
        }
        error = nil
        busy = true
        defer { busy = false }
        do {
            let res: TokenPair = mode == .register
                ? try await api.verifyRegister(phone: phone, otp: otp, name: name.trimmingCharacters(in: .whitespaces), region: region.trimmingCharacters(in: .whitespaces))
                : try await api.verifyOtp(phone: phone, otp: otp)
            api.onLogin(res)
        } catch {
            self.error = ApiErrors.userMessage(error, "Mã OTP không hợp lệ.")
        }
    }

    private func quickLogin(phone devPhone: String, fallbackOtp: String) async {
        error = nil
        busy = true
        defer { busy = false }
        do {
            let req = try? await api.requestOtp(phone: devPhone)
            let code = req?.devOtp ?? fallbackOtp
            let res: TokenPair = try await api.verifyOtp(phone: devPhone, otp: code)
            api.onLogin(res)
        } catch {
            self.error = ApiErrors.userMessage(error, "Đăng nhập nhanh thất bại.")
        }
    }

    // MARK: - Field builder

    @ViewBuilder
    private func field(_ label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType, max: Int, mono: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.courtTextDim)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onChange(of: text.wrappedValue) { newValue in
                    let filtered = String(newValue.filter(\.isNumber).prefix(max))
                    if filtered != newValue { text.wrappedValue = filtered }
                }
                .font(mono ? .eloNumber(18) : .body)
                .padding(12)
                .background(Color.courtSurface2, in: RoundedRectangle(cornerRadius: 9))
                .overlay(
                    RoundedRectangle(cornerRadius: 9)
                        .stroke(Color.courtLineStrong, lineWidth: 1),
                )
        }
    }
}

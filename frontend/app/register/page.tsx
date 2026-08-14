'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { publicApi, setTokens } from '@/lib/api';

const REGION_PRESETS = [
  'Quận 7, TP.HCM',
  'Thủ Đức, TP.HCM',
  'Cầu Giấy, Hà Nội',
  'Đống Đa, Hà Nội',
  'Hải Châu, Đà Nẵng',
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const requestOtp = async () => {
    if (name.trim().length < 2) return setError('Vui lòng nhập tên hiển thị (tối thiểu 2 ký tự).');
    if (region.trim().length < 2) return setError('Vui lòng nhập khu vực bạn thường chơi.');
    if (!/^0\d{9}$/.test(phone)) return setError('Số điện thoại phải là 10 chữ số, bắt đầu bằng 0.');
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<{ devOtp?: string }>('/auth/register', {
        phone,
        name: name.trim(),
        region: region.trim(),
      });
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep(2);
      let n = 60;
      setResendIn(n);
      const t = window.setInterval(() => {
        n -= 1;
        setResendIn(n);
        if (n <= 0) window.clearInterval(t);
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đăng ký được.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{3}$/.test(otp)) return setError('Mã OTP gồm đúng 3 chữ số.');
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<{ accessToken: string; refreshToken: string }>(
        '/auth/register/verify',
        {
          phone,
          otp,
          name: name.trim(),
          region: region.trim(),
          deviceId: `web-${Math.random().toString(36).slice(2, 8)}`,
        },
      );
      setTokens(res.accessToken, res.refreshToken);
      router.push('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mã OTP không hợp lệ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <header style={{ padding: '22px 0' }}>
        <Link href="/" style={{ fontWeight: 800, color: 'var(--text)' }}>
          ← CầuLông<span style={{ color: 'var(--lime)' }}>Pro</span>
        </Link>
      </header>

      <div className="card" style={{ marginTop: 40 }}>
        <div className="card-title" style={{ fontSize: 20, fontWeight: 800 }}>
          <span className="dot" /> Đăng ký tài khoản
        </div>
        <p className="muted small" style={{ marginBottom: 20 }}>
          {step === 1
            ? 'Tạo tài khoản mới — bạn sẽ nhận mã OTP để xác thực số điện thoại.'
            : `Nhập mã OTP 3 chữ số vừa gửi tới ${phone}.`}
        </p>

        {error && <div className="error-box">{error}</div>}
        {devOtp && (
          <div className="success-box">
            <b>DEV:</b> mã OTP là <b className="mono">{devOtp}</b> (SMS mock — chỉ trong môi trường phát triển)
          </div>
        )}

        {step === 1 ? (
          <>
            <div className="field">
              <label htmlFor="name">Họ và tên</label>
              <input
                id="name"
                className="input"
                placeholder="VD: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="region">Khu vực thường chơi</label>
              <input
                id="region"
                className="input"
                list="region-presets"
                placeholder="VD: Quận 7, TP.HCM"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              <datalist id="region-presets">
                {REGION_PRESETS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                className="input"
                inputMode="numeric"
                maxLength={10}
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={requestOtp} disabled={busy}>
              {busy ? <span className="spin" /> : 'Tiếp tục — gửi mã OTP'}
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="otp">Mã OTP</label>
              <input
                id="otp"
                className="input mono"
                inputMode="numeric"
                maxLength={3}
                placeholder="•••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={verifyOtp} disabled={busy}>
              {busy ? <span className="spin" /> : 'Hoàn tất đăng ký'}
            </button>
            <button
              className="btn btn-ghost btn-block"
              style={{ marginTop: 10 }}
              onClick={requestOtp}
              disabled={resendIn > 0}
            >
              {resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
            </button>
          </>
        )}
      </div>

      <p className="faint small" style={{ textAlign: 'center', marginTop: 24 }}>
        Đã có tài khoản?{' '}
        <Link href="/login" style={{ color: 'var(--lime)' }}>
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}

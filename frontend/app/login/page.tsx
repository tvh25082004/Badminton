'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { publicApi, setTokens } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const requestOtp = async () => {
    if (!/^0\d{9}$/.test(phone)) {
      setError('Số điện thoại phải là 10 chữ số, bắt đầu bằng 0 (VD: 0912345678).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<{ devOtp?: string; expiresInSeconds: string | number }>(
        '/auth/otp/request',
        { phone },
      );
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
      setError(e instanceof Error ? e.message : 'Không gửi được mã OTP.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Mã OTP gồm đúng 6 chữ số.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<{ accessToken: string; refreshToken: string }>(
        '/auth/otp/verify',
        { phone, otp, deviceId: `web-${Math.random().toString(36).slice(2, 8)}` },
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
          <span className="dot" /> Đăng nhập bằng số điện thoại
        </div>
        <p className="muted small" style={{ marginBottom: 20 }}>
          {step === 1
            ? 'Nhập số điện thoại để nhận mã OTP. Tài khoản mới sẽ được tạo tự động.'
            : `Nhập mã OTP 6 chữ số vừa gửi tới ${phone}.`}
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
              {busy ? <span className="spin" /> : 'Gửi mã OTP'}
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
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={verifyOtp} disabled={busy}>
              {busy ? <span className="spin" /> : 'Xác nhận & vào ứng dụng'}
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
        Số demo: 0901000001 · 0901000002 · 0901000005 (đã seed)
      </p>
    </div>
  );
}

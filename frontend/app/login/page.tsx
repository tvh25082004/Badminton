'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { publicApi, setTokens } from '@/lib/api';
import { IS_DEV } from '@/lib/config';

type Mode = 'login' | 'register';
type Step = 1 | 2;

const QUICK_ACCOUNTS = [
  { label: 'ADMIN', phone: '0900000000' },
  { label: 'MODERATOR', phone: '0900000001' },
  { label: 'PLAYER', phone: '0901000001' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>(1);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');

  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const isRegister = mode === 'register';

  const requestOtp = async () => {
    if (!/^0\d{9}$/.test(phone)) {
      setError('Số điện thoại phải là 10 chữ số, bắt đầu bằng 0 (VD: 0912345678).');
      return;
    }
    if (isRegister) {
      if (name.trim().length < 2) {
        setError('Vui lòng nhập tên hiển thị (ít nhất 2 ký tự).');
        return;
      }
      if (region.trim().length < 2) {
        setError('Vui lòng nhập khu vực bạn thường chơi (VD: Quận 7, TP.HCM).');
        return;
      }
    }
    setError(null);
    setBusy(true);
    try {
      const res = await publicApi<{ devOtp?: string; expiresInSeconds: string | number }>(
        isRegister ? '/auth/register' : '/auth/otp/request',
        isRegister ? { phone, name: name.trim(), region: region.trim() } : { phone },
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
    if (!/^\d{3,6}$/.test(otp)) {
      setError('Mã OTP gồm 3–6 chữ số.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body = isRegister
        ? { phone, otp, name: name.trim(), region: region.trim(), deviceId: `web-${Math.random().toString(36).slice(2, 8)}` }
        : { phone, otp, deviceId: `web-${Math.random().toString(36).slice(2, 8)}` };
      const res = await publicApi<{ accessToken: string; refreshToken: string }>(
        isRegister ? '/auth/register/verify' : '/auth/otp/verify',
        body,
      );
      setTokens(res.accessToken, res.refreshToken);
      router.push('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mã OTP không hợp lệ.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep(1);
    setError(null);
    setDevOtp(null);
    setOtp('');
  };

  // Dev-only: login 1 chạm theo vai trò (bỏ qua gõ OTP)
  const quickLogin = async (phone: string) => {
    setError(null);
    setBusy(true);
    try {
      const req = await publicApi<{ devOtp?: string }>('/auth/otp/request', { phone });
      const otp = req.devOtp ?? '333';
      const res = await publicApi<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        phone,
        otp,
        deviceId: `quick-${Math.random().toString(36).slice(2, 8)}`,
      });
      setTokens(res.accessToken, res.refreshToken);
      router.push('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập nhanh thất bại.');
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
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'var(--bg-soft)', borderRadius: 10, padding: 4 }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: 14,
                background: mode === m ? 'var(--lime)' : 'transparent',
                color: mode === m ? '#0a0e13' : 'var(--text-dim)',
              }}
            >
              {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        <div className="card-title" style={{ fontSize: 18, fontWeight: 800 }}>
          <span className="dot" />
          {step === 1
            ? isRegister
              ? 'Tạo tài khoản mới'
              : 'Đăng nhập bằng số điện thoại'
            : `Nhập mã OTP gửi tới ${phone}`}
        </div>
        <p className="muted small" style={{ marginBottom: 18 }}>
          {step === 1
            ? isRegister
              ? 'Đăng ký bằng số điện thoại — tài khoản được tạo sau khi xác thực OTP.'
              : 'Nhập số điện thoại để nhận mã OTP. Tài khoản mới được tạo tự động.'
            : 'Nhập mã OTP gồm 3–6 chữ số.'}
        </p>

        {error && <div className="error-box">{error}</div>}
        {devOtp && (
          <div className="success-box">
            Mã OTP của bạn là <b className="mono">{devOtp}</b> (SMS mock — hiển thị để dùng thử)
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
            {isRegister && (
              <>
                <div className="field">
                  <label htmlFor="name">Tên hiển thị</label>
                  <input
                    id="name"
                    className="input"
                    maxLength={50}
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="region">Khu vực thường chơi</label>
                  <input
                    id="region"
                    className="input"
                    maxLength={120}
                    placeholder="Quận 7, TP.HCM"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
              </>
            )}
            <button className="btn btn-primary btn-block btn-lg" onClick={requestOtp} disabled={busy}>
              {busy ? <span className="spin" /> : isRegister ? 'Đăng ký & nhận mã OTP' : 'Gửi mã OTP'}
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
              {busy ? <span className="spin" /> : isRegister ? 'Xác nhận & tạo tài khoản' : 'Xác nhận & vào ứng dụng'}
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

      {IS_DEV && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="faint small" style={{ marginBottom: 10, textAlign: 'center' }}>
            Đăng nhập nhanh theo vai trò (dev — bấm là vào, không cần OTP)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {QUICK_ACCOUNTS.map((a) => (
              <button
                key={a.phone}
                className="btn"
                style={{ padding: '8px 0', fontSize: 13 }}
                onClick={() => quickLogin(a.phone)}
                disabled={busy}
              >
                {busy ? <span className="spin" /> : a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {IS_DEV && (
        <div className="faint small" style={{ textAlign: 'center', marginTop: 24 }}>
          <div>OTP cố định theo role: ADMIN=111 · MODERATOR=222 · PLAYER=333</div>
          <div style={{ marginTop: 4 }}>Admin: 0900000000 · Mod: 0900000001 · Player: 0901000001</div>
        </div>
      )}
    </div>
  );
}

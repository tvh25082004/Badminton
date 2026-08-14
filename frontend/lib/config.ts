// Module thuần — dùng được cả ở server component lẫn client component.
// KHÔNG đặt 'use client' ở đây, nếu không value sẽ không available khi
// server component (vd. trang landing) fetch dữ liệu.

// Trên Vercel phải set NEXT_PUBLIC_API_URL = URL public của backend
// (vd. https://badminton-api.onrender.com/api/v1). Mặc định localhost chỉ để chạy local.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// Chế độ dev = API trỏ về máy local. Khi production (API trỏ domain thật),
// frontend KHÔNG hiển thị mã OTP dev / bảng role để tránh lộ mã admin.
export const IS_DEV =
  !process.env.NEXT_PUBLIC_API_URL ||
  /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(API_BASE);

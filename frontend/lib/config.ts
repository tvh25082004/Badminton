// Module thuần — dùng được cả ở server component lẫn client component.
// KHÔNG đặt 'use client' ở đây, nếu không value sẽ không available khi
// server component (vd. trang landing) fetch dữ liệu.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

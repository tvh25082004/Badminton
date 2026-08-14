# ADRs — Badminton Platform

## ADR-001: Modular monolith thay vì microservices

- **Context:** Requirement yêu cầu "shared backend", MVP phải ship nhanh, một team nhỏ, môi trường chỉ có PostgreSQL + Redis. Microservices ngay từ đầu tạo distributed monolith + overhead vận hành lớn.
- **Decision:** Một NestJS app, module tách theo bounded context (Identity, Player, Venue, Session, Match, QuickMatch, Notification, Moderation). Domain logic thuần (không import Nest) trong `domain/` và service layer.
- **Alternatives:** Full microservices + RabbitMQ (từ chối vì độ phức tạp vận hành > lợi ích ở MVP); Monolith 1 file lớn (từ chối vì khó maintain).
- **Trade-offs:** Không scale riêng từng context; deploy nguyên khối. **Consequence:** giữ rule "module không import module khác trực tiếp qua domain entity", mọi cross-context qua service facade + events, đảm bảo tách được microservice sau này.

## ADR-002: Multi-tenancy — shared DB + owner-scoping

- **Context:** Hệ thống cộng đồng mở, không có tenant hợp đồng rõ ràng ở MVP.
- **Decision:** Shared PostgreSQL schema; isolation theo owner/participant + region. Kiểm tra quyền tại service sở hữu resource.
- **Trade-offs:** Rẻ, linh hoạt; yêu cầu kỷ luật query đúng scoping. Bổ sung `tenantId` cho entity khi có khách hàng tổ chức.

## ADR-003: OTP + JWT access/refresh

- **Context:** Requirement cấm password, bắt buộc phone + OTP.
- **Decision:** OTP 6 số, TTL 5 phút, single-use, rate-limit. Access JWT 15m + Refresh rotation (hash lưu DB, revoke-all).
- **Trade-offs:** OTP cần SMS provider (mock ở dev); refresh rotation phức tạp hơn refresh tĩnh nhưng chống theft.

## ADR-004: In-process domain events, outbox-ready

- **Context:** Notification cần persist cùng nghiệp vụ; khi tách service cần đảm bảo không mất event.
- **Decision:** MVP dùng `@nestjs/event-emitter`; event có đủ envelope (eventId, type, version, correlationId). Khi tách: thêm bảng outbox + publisher tới RabbitMQ, consumer idempotent.

## ADR-005: Elo engine là pure module

- **Context:** Elo là nghiệp vụ cốt lõi, cần audit, test kỹ, không phụ thuộc framework.
- **Decision:** `src/domain/elo/*` pure TS, unit test đầy đủ; service layer chỉ orchestrate + persist RatingTransaction.

## ADR-006: Database ownership theo bounded context

- **Context:** Tránh nhầm lẫn ai sửa entity nào.
- **Decision:** Mỗi entity thuộc đúng một module; module khác không query trực tiếp, gọi qua facade/service.

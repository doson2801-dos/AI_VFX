# Accessibility requirements (mẫu)

Chép file này thành `Docs/UI/accessibility-requirements.md` và chọn **một** mức để cam kết. Khi file đó có, skill `/team-ui` dùng nó làm tiêu chí chặn ở Phase 4; khi chưa có, mọi lần chạy báo `Accessibility: NOT ASSESSED`.

- Mức cam kết: <Basic | Standard | Comprehensive>
- Ngày chốt / người chốt:

## Basic
- Chữ thân ≥ 16 px, chữ phụ ≥ 13 px ở khung 540×960.
- Tương phản chữ ≥ 4.5:1 (chữ ≥ 24 px hoặc đậm ≥ 19 px: ≥ 3:1).
- Vùng chạm ≥ 44×44 px, cách nhau ≥ 8 px.
- Trạng thái không chỉ báo bằng màu (thêm chữ, icon hoặc hình).
- Mọi thao tác có phím và chạm.

## Standard (thêm vào Basic)
- Không có thông tin chỉ hiện trong < 1 giây mà không xem lại được.
- Chế độ nhanh / bỏ qua cho animation dài > 1 giây.
- Không nhấp nháy > 3 lần / giây.

## Comprehensive (thêm vào Standard)
- Tuỳ chọn cỡ chữ lớn, chế độ tương phản cao, giảm chuyển động.
- Hỗ trợ gamepad và điều hướng focus bằng phím mũi tên.

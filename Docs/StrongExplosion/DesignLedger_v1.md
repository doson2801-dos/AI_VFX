# Vụ nổ mạnh — decision ledger v1

Ngày: 2026-10-17. Phạm vi: thiết kế và concept; chưa sản xuất tài nguyên runtime.

## Nguồn và lựa chọn đã xác nhận

Brief văn bản: “vụ nổ mạnh, gồm khói, impact, ánh sáng tại tâm, các mảnh đá vụn và nứt vỡ địa hình”.

Người dùng gửi bảng chọn trong chat này, với generate_concept=true.

| ID | Giá trị | Trạng thái | Nguồn |
|---|---|---|---|
| D01 | Stylized 3D | approved | Bảng chọn đã gửi |
| D02 | Vàng–cam nóng, khói sẫm | approved | Bảng chọn đã gửi |
| D03 | Khối vòm bung tròn quanh tâm | approved | Bảng chọn đã gửi |
| D04 | Khói cuộn thành khối lớn rồi tan quanh tâm | approved | Bảng chọn đã gửi |
| D05 | Khói, impact, ánh sáng tại tâm, đá vụn, nứt nền | approved | Brief và bảng chọn |
| D06 | Vết nứt lan từ tâm, chỉ là hình ảnh trên nền | approved | Bảng chọn đã gửi |
| D07 | Tất cả tan hết sau hiệu ứng | approved | Bảng chọn đã gửi |
| D08 | Tạo concept màu v1 | approved — quyền tạo ảnh | Bảng chọn đã gửi |
| A01 | Camera ba phần tư từ trên xuống để đọc vòm và vết nứt | assumed | Lựa chọn trình bày concept |
| G01 | Concept v1 | pending | Chờ người dùng xem ảnh |
| G02 | Blueprint, shape kit và silhouette production | pending | Chưa trình bày |
| G03 | Timing, kích thước và spec | pending | Chưa trình bày |
| G04 | Asset plan | pending | Chưa khảo sát/lập |
| G05 | Prompt kỹ thuật cuối | pending | Cần duyệt spec và quyền xuất prompt |

## Tiếp tục thiết kế sau concept v1

Người dùng nói “tiếp tục” sau khi xem ảnh. Phạm vi được hiểu là tiếp tục thiết kế, chưa phải chọn concept hoặc duyệt spec.

- Concept v1 đã mở xem và lưu tại `References/StrongExplosion_Concept_v1_Draft.png`; trạng thái draft.
- BP-01 v1 và preview S01/S02A/S02B/S03/S04/S05 v1 đã chuẩn bị để hiển thị trong chat; chờ duyệt.
- `ShapeSpecification_v1_Draft.md` chứa layer, shape, motion/timing/kích thước đề xuất và phương án kỹ thuật sơ bộ. Số liệu vẫn proposed.
- Asset plan chưa khảo sát và chưa duyệt. Chưa tạo tài nguyên runtime hoặc xuất prompt kỹ thuật cuối.

## Lần tiếp tục sau Shape Specification

Người dùng tiếp tục nói “tiếp tục”, chưa chỉ rõ phạm vi phê duyệt. Đã khảo sát Assets/Packages hiện tại, đọc shader/material/prefab, inspect 4 texture và alpha, cùng báo cáo Unity cũ của task Cannon. AssetPlan_v1_Pending.md đã lập với A01–A07, tất cả pending. Thiết kế/spec vẫn draft; không runtime assets hoặc prompt cuối được tạo.

## Phê duyệt gộp và xuất prompt

Người dùng trả lời “tiếp tục” ngay sau câu hỏi xác nhận cụ thể cấu trúc, shape, spec v1, A01–A07 và quyền xuất prompt tiếng Anh. Trạng thái mới thay G02/G03/G04 pending thành approved cho nội dung đã trình; quyền xuất prompt approved. Đây là căn cứ theo ngữ cảnh câu hỏi, không áp dụng ngược cho hai lệnh tiếp tục trước đó.

- BP-01 v1 và S01/S02A/S02B/S03/S04/S05 v1 approved; bản portable tại References/StrongExplosion_Blueprint_ShapeKit_v1.html.
- Spec v1 gồm timing và kích thước ở mục 5 approved.
- Asset Plan v1 A01–A07 approved. Giữ tên file Pending và Draft để bảo toàn link; trạng thái mới ở đầu file.
- Concept v1 vẫn là ảnh tham khảo draft, không thay blueprint/spec bằng mọi chi tiết ảnh.
- Lượt này xuất ImplementationPrompt_v1.md; chưa tạo runtime hoặc xác nhận playback/mobile.

## Yêu cầu triển khai và runtime v1

Sau bàn giao prompt, người dùng yêu cầu “triển khai promp”. Đã triển khai A01–A07 trong Assets/StrongExplosion_v1 bằng 5 PNG imagegen, 2 mesh, 8 material và prefab/demo native; không shader mới. Quyền mới thay trạng thái chỉ xuất tài liệu, không thay phê duyệt mỹ thuật.

RuntimeDelivery_v1.md và Validation/PlayReport.json lưu kết quả kỹ thuật và giới hạn. Đã capture playback Unity và xem keyframe; mỹ thuật runtime chưa được người dùng xác nhận, mobile chưa đo. Những tuning/sửa kỹ thuật trong quá trình dựng không trở thành ưu tiên toàn cục.

## Giới hạn

- Đây là brief mới, không tiếp tục LargeExplosion đang dừng hoặc SmallExplosion.
- Không thay đổi terrain/collision thật. Không thêm damage, rung camera hoặc vòng xung kích.
- Mọi nhịp khối, số mảnh, contour và tỷ lệ cụ thể trong concept chỉ là đề xuất đến khi người dùng chọn.
- Ảnh tĩnh không chứng minh chuyển động, timing, chất lượng runtime hoặc hiệu năng mobile.
- Chưa tạo/sửa shader, material, texture runtime, mesh hoặc prefab.

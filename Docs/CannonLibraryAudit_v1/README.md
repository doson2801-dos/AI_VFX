# Catalog VFX và đề xuất cho khẩu pháo — v1

Nguồn được giao: `D:/Projects/animlibrary/Assets/VFX_Library/VFX`.
Output: `D:/Game_prj/VFX_LIb/Docs/CannonLibraryAudit_v1`.
Ngày: 2026-10-17. Nhánh người dùng chọn: **pháo thuốc súng stylized**.

Cập nhật triển khai: người dùng đã duyệt **Asset Plan v2 C01–C07** và **Delta1 D01–D04** cho **VFX_LIb — Built-in**, tổng 37 file nguồn. Đã dựng demo và ghi playback Play mode trong bản sao kiểm chứng. [Báo cáo bàn giao và playback](RuntimeValidation/ValidationReport.md) ghi kết quả kỹ thuật cùng giới hạn hình ảnh; art runtime chưa được duyệt. V1 giữ lại làm snapshot ban đầu.

## Mở tài liệu

- [Catalog tra cứu/lọc 827 prefab](Catalog.html)
- [Bảng CSV để lọc/sắp xếp](Prefabs.csv)
- [Đề xuất VFX và timeline v1](CannonProposal_v1.md)
- [Báo cáo runtime và cách chạy demo](RuntimeValidation/ValidationReport.md)
- [Asset Plan v2 — ĐÃ DUYỆT](AssetPlan_v2_Pending.md)
- [Delta1 — 4 Sub Graph ĐÃ DUYỆT](AssetPlan_v2_Delta1_Pending.md)
- [Danh mục 33 source asset/GUID/hash/output](AssetInventory_v2_Pending.md)
- [Bảng ứng viên v1 lưu lịch sử](AssetPlan_v1_Pending.md)
- [Dữ kiện kỹ thuật shortlist](CandidateTechnicalFacts.md)
- [Ảnh so sánh chuỗi preview](CandidateContactSheet.png)
- [Ảnh từng kênh texture](TextureChannels.png)
- [Ảnh từng kênh texture RPG bổ sung](TextureChannels_RPG.png)
- [Trạng thái audit và giới hạn](AuditStatus.json)

## Kết quả khảo sát

Quét file hoàn tất trong root được giao: **78.129 file kể cả meta**, gồm 827 prefab, 828 unitypackage, 36.961 JPEG preview, 39.512 meta, 1 manifest JSON. Lỗi đọc file trong lượt quét cuối: 0. Catalog gồm mọi prefab, không chỉ những tên liên quan khẩu pháo. Nhãn được suy từ tên chỉ là candidate.

| Pack | Prefab | Pack | Prefab |
|---|---:|---|---:|
| RPG | 155 | Cartoon FX | 121 |
| Hyper Casual FX Vol.2 | 100 | Sword Trails | 86 |
| Piloto Studio | 79 | AAA Projectiles Vol 1 | 78 |
| Fireworks | 42 | Texts | 22 |
| BusDash | 19 | Elemental Mesh FX | 19 |
| JellyCat | 19 | Magic_Rock | 19 |
| FairShot | 17 | SheepOut | 16 |
| Hun0FX | 14 | Tycoon | 12 |
| VFX Epic Trio | 6 | Human | 3 |

Unity audit **chưa hoàn tất**. Đã thêm riêng tool Editor `Assets/PersonalVfxLibrary/Editor/VfxLibraryAudit.cs` vào project nguồn theo quyền được cấp và thử Unity batch 2022.3.62f3. Unity dừng vì lỗi compile framework UI Particle có sẵn trước khi chạy audit; vì vậy không có UnityCatalog.json hay Unity dependencyHash để tuyên bố đã kiểm chứng Unity. Không sửa framework hoặc tự cài các dependency thiếu. Xem `UnityAudit.log` để biết lỗi thực.

Nguồn là URP 14.0.12; workspace hiện tại VFX_LIb là Built-in theo GraphicsSettings/manifest. Runtime đích chưa chốt. Không mặc định shader/material nguồn dùng được ở project đích.

## Đề xuất chính

1. **Muzzle:** ưu tiên `RPG/VFX_Cannon_Shoot.prefab` làm nguồn khảo sát flash, blast smoke và embers. `Cannon_Shoot_Scrab` là lựa chọn so sánh cho bản gọn hơn, chưa gọi rẻ hơn trên mobile.
2. **Hit gọn:** ưu tiên khảo sát `RPG/VFX_Cannon_Impact_InUse.prefab`; preview chủ yếu chớp/glow cam, không tự gọi là khối nổ thể tích.
3. **Hit đất:** dùng `RPG/VFX_Cannon_Impact.prefab` thay hit gọn nếu muốn crack nóng/vòng lan. Không chồng mặc định hai impact.
4. **Flight trail:** chưa thêm vào bộ cơ bản; `SheepOut/VFX_Trail_Missile.prefab` chỉ là tùy chọn theo loại đạn.

Đây là shortlist ban đầu dựa trên file và preview nguồn. Cập nhật: C01–C07 và D01–D04 đã được duyệt, asset đã nhập vào project đích và demo đã tạo; chưa có concept riêng/model pháo hoặc duyệt mỹ thuật runtime.

## Dữ liệu và mức bằng chứng

`Inventory.json`: danh sách file đầy đủ + các component YAML chọn lọc cho 827 prefab; `Summary.json`: phạm vi/số lượng/lỗi; `GuidIndex.json`: GUID → path trong Assets, bỏ qua meta của folder Preview để giảm đọc file; không audit toàn project ngoài root.

`CannonCandidates.json`: 7 ứng viên với GUID, source SHA256, references, PS/module flags và renderer stream bytes. Các giá trị serialized không tự chứng minh object active, module được gọi, packing đúng hoặc nhánh shader thực thi. Các prefab có nested link chưa được resolve như Unity LoadPrefabContents; số component trong YAML không phải toàn bộ hierarchy đã resolve. Source SHA256 không thay Unity dependencyHash và không bao phủ dependency thay đổi.

`CandidateDependencies.json`: lần theo 69 GUID của shortlist ở mức source, có material references, source hashes, shader source lines khi có và pixel extrema khi đọc được. References ngoài root được lần theo để hiểu ứng viên; không gọi đã audit mọi asset trong các folder dependency. GUID không giải được có thể là package/editor metadata, cần phân loại trước khi kết luận missing runtime asset.

`PreviewMetadata.json`: nguồn frame và số frame. GIF `*_preview.gif` dùng 50 ms/frame giả định để tiện xem, không phải timing nguồn đã xác nhận. Contact sheet và ảnh allframes đã dùng để quan sát hình ảnh; chưa có playback mới trong Unity hoặc render/mobile validation.

828 unitypackage đã được liệt kê như file, chưa import hoặc phân tích toàn bộ nội dung archive. 36.961 JPEG là preview, không coi đó là texture gốc của effect. Manifest cũ là tham khảo; filesystem scan mới là inventory hiện tại.

Không đo mobile GPU, overdraw, draw calls, peak particle count, texture runtime memory hay FPS. Không coi PS count, build/compile hoặc chuỗi preview cũ là chứng minh mỹ thuật/hiệu năng đạt.

## Tiếp tục từ đây

Đọc đề xuất và chọn nguồn phù hợp với ảnh/model/góc camera thực; chốt project runtime đích. Hoàn tất Unity audit sau khi blocker compile được giải quyết trong phạm vi được cho phép, kiểm tra shader/channel/stream và playback tiêu biểu. Sau đó hoàn thiện bảng asset có output cụ thể và xin duyệt đúng version trước runtime creation/modification. Không tiếp tục các effect cũ đang dừng.

Script tái tạo dữ liệu: `scan_library.py`, rồi `inspect_candidates.py`, rồi `finalize_catalog.py`. Các script ghi vào folder báo cáo này, không sửa source assets. Tool Editor audit đã cài riêng trong project nguồn; không có Builder/Runtime controller được cài trong lượt khảo sát.

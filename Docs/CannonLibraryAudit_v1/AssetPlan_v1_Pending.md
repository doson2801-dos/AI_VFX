# Bảng ứng viên asset — Cannon — v1

Status: PENDING TECHNICAL VERIFICATION / CHƯA DUYỆT. Đây là bảng cụ thể để thảo luận scope, chưa phải plan đủ điều kiện build. Concept/model, runtime project đích và shader behavior chưa chốt. Các nguồn được kiểm tra bằng file/YAML/preview, không gọi đã xác minh Unity runtime.

Snapshot: `Inventory.json`, `CannonCandidates.json`, `CandidateDependencies.json`; source-only SHA256 không thay Unity dependencyHash. Root nguồn `D:/Projects/animlibrary/Assets/VFX_Library/VFX`. Chỉ đọc nguồn; chưa copy asset sang project đích.

| ID | Layer / vai trò | Operation dự kiến | Nguồn + GUID | Carrier/kỹ thuật / channel-stream-keyword | Lý do | Output/phạm vi dự kiến |
|---|---|---|---|---|---|---|
| C01 | Muzzle flash + smoke + embers | reuse nếu phù hợp pipeline, variant nếu cần scale/tint/mật độ | Gameplay/RPG/VFX_Cannon_Shoot.prefab — cbb041f394e578149af8ac2c397ee661 | Native PS; billboard và mesh; UVModule/CustomData ở một số lớp; streams bytes trong JSON; channel/packing shader còn chưa xác minh | Nhóm dành cho pháo, preview thấy chớp hướng + smoke/embers | Dự kiến Assets/CannonVFX_v1/Muzzle.prefab tại project đích sau khi chốt; chỉ override trên bản mới, không sửa shared |
| C02 | Hit gọn | reuse/variant tương tự C01 | Gameplay/RPG/VFX_Cannon_Impact_InUse.prefab — 6b14662d8c2f77743baf269dae218b6a | 7 PS; Custom Data/UV cần giữ đúng packing; shader built-in ID và graph chưa xác minh đầy đủ | Preview gọn, ít dấu nền thấy được; chưa kết luận mọi layer đều cần | Assets/CannonVFX_v1/Impact.prefab; không tắt layer chỉ vì tên hoặc ảnh tối |
| C03 | Hit đất thay C02, tùy chọn | reuse/variant; CHƯA CHỌN | Gameplay/RPG/VFX_Cannon_Impact.prefab — 8bf2ceb38b8f7884d9144cb396c81fe7 | 8 PS; ground/crack và ring; GroundCracks_Radial.mat dùng UberFXSG.shadergraph; shader wiring/channels chưa verified | Khi người dùng muốn dấu va chạm rõ trên đất | Assets/CannonVFX_v1/GroundImpact.prefab nếu chọn; không tự thêm vào base |
| C04 | Muzzle nhẹ thay C01 | reuse/variant; CHƯA CHỌN | Gameplay/RPG/VFX_Cannon_Shoot_Scrab.prefab — 76b908a0a985964489379e02d64a1643 | 6 PS; nhiều moveWithTransform=1 theo YAML; không gọi tối ưu chỉ vì ít 1 PS | So sánh cảm giác phát bắn nhỏ hơn | MuzzleLight.prefab nếu chọn; không dùng song song mặc định |
| C05 | Trail đạn | reuse/variant; TÙY CHỌN CHƯA CHỌN | Gameplay/SheepOut/VFX_Trail_Missile.prefab — 71d51c205eb4ee94e96a79b458bea5e8 | 2 PS; movement/World Space phải thử; không bake quỹ đạo từ preview | Chỉ khi viên đạn cần trail | ProjectileTrail.prefab nếu chọn; stop emission riêng với cleanup tail |
| C06 | Material tương thích pipeline đích | variant có điều kiện; CHƯA XÁC ĐỊNH output cụ thể | Material paths/GUID/hash trong CandidateDependencies.json; ví dụ cannon_impact.mat fa0c866a48770b64987a7aca4fc1eedf, Smoke_Harsh_Disolve 1.mat 02dff015a09f31840a185f6d8d320780 | Các property/keyword lưu có thể stale; chỉ đổi sang shader particle sẵn khi đã chứng minh không mất channel/Custom Data/feature | Không mặc định shader built-in hoạt động đúng trên URP | Phải trình danh sách material và thay đổi cụ thể trong plan tiếp theo nếu phát sinh; chưa cho phép mass conversion hoặc shader mới |

Paths ở cột nguồn tương đối `Assets/VFX_Library/VFX/`, trừ material nằm ở đường dẫn đầy đủ trong JSON. Full SHA256 từng prefab trong CannonCandidates.json; dependency source hashes trong CandidateDependencies.json.

Không có texture/mesh/shader mới được đề nghị mặc định. Asset nguồn/read-only và shared material giữ nguyên. Không cài package/pipeline. Nếu hình khối không đủ, đề xuất riêng texture thành phần, carrier và material với GUID/output cụ thể; không tự biến thiếu dữ liệu thành quyền tạo mới.

Chưa tạo build manifest vì chưa có runtime approval và Unity dependencyHash hợp lệ. Không đặt approved=true. Phần đã chốt chỉ là loại pháo thuốc súng stylized, không phải C01–C06 hoặc thông số tuning.

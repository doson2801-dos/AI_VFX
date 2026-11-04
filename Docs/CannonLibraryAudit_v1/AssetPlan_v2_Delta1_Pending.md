# Asset Plan v2 — bổ sung dependency 1

**ĐÃ DUYỆT D01–D04.** Người dùng chọn rõ “Duyệt bổ sung D01–D04” ngày 2026-10-17. C01–C07 và 33 file đã được duyệt vẫn giữ hiệu lực. Unity import thực phát hiện 4 Shader Sub Graph bị thiếu do lượt quét đầu bỏ sót GUID nằm trong chuỗi JSON lồng. Đây là dependency của graph có sẵn, không phải thêm chức năng VFX. Không coi shader supported/ShaderUtil không báo lỗi là graph hợp lệ.

Phạm vi xin bổ sung: **reuse 4 file dưới đây**, nguyên chức năng, GUID mới và remap reference trong bản `UberFXSG.shadergraph` đã copy. Không sửa nguồn, không đổi màu/timing/module/shape, không thêm package hoặc shader mới. Tổng nguồn từ 33 thành 37 file.

Nguồn root `D:/Projects/animlibrary/Assets/VFX_Library/Shaders/`; output root `D:/Game_prj/VFX_LIb/Assets/CannonVFX_LibraryReuse_v1/Sources/Shaders/`.

| ID | Reuse source → output filename | GUID nguồn | Carrier/kỹ thuật | Vai trò |
|---|---|---|---|---|
| D01 | Channel Picker.shadersubgraph | 763409a3f98108848a0e1befe8dc39d0 | Shader Sub Graph, không emitter riêng | Chọn kênh texture theo graph nguồn |
| D02 | Channel Picker Add.shadersubgraph | 9f912318b83cca744a9998b6c38e5836 | Shader Sub Graph, không emitter riêng | Kết hợp kênh theo graph nguồn |
| D03 | Channel Picker Clamped.shadersubgraph | db634c633afe3eb478fcc401198693ed | Shader Sub Graph, không emitter riêng | Chọn/kẹp dữ liệu kênh, opacity/noise theo graph nguồn |
| D04 | Soft Particle.shadersubgraph | 18a1e76f4c37a2a49a324c434cb8c171 | Shader Sub Graph, không emitter riêng | Nhánh soft particle sẵn có; không tự bật keyword/module |

Nguồn, destination và SHA256 từng file trong `AssetPlan_v2_Delta1_Pending.json`. Đã truy tiếp JSON lồng của cả 4 file; không còn GUID asset chưa giải trong nhóm dependency graph này. Chưa copy 4 file vào runtime.

Sau phê duyệt phần bổ sung: import 4 subgraphs, remap graph copy, import/audit lại graph và xem playback mới. Preview trong RuntimeValidation trước bổ sung chỉ dùng chẩn đoán vì graph đang thiếu dependency; không gọi đó là bản đạt. Source animlibrary vẫn chỉ đọc.

Approval evidence: người dùng chọn “Duyệt bổ sung D01–D04” ngày 2026-10-17. Giữ phê duyệt C01–C07; chưa phải duyệt mỹ thuật runtime.

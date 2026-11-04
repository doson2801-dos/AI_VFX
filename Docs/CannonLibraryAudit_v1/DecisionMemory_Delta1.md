
<!-- cannon-library-delta1-approved-2026-10-17 -->
## Phê duyệt riêng: 4 Sub Graph bổ sung cho khẩu pháo

- Ngày 2026-10-17, người dùng chọn rõ “Duyệt bổ sung D01–D04”: reuse Channel Picker, Channel Picker Add, Channel Picker Clamped và Soft Particle `.shadersubgraph` từ thư viện animlibrary để hoàn tất dependency của UberFXSG tại VFX_LIb Built-in. Bổ sung này tăng danh mục nguồn đã duyệt từ 33 lên 37 file; giữ C01–C07 đã duyệt.
- Lượt quét đầu bỏ sót GUID asset trong chuỗi JSON lồng; Unity import xác nhận thiếu Sub Graph dù shader có thể vẫn supported. Đây là nguyên nhân kỹ thuật đã kiểm chứng của task, không phải kết quả mỹ thuật được duyệt. Kiểm tra dependency graph lồng và import log thực trước khi gọi shader graph hợp lệ.
- Bảng bổ sung: `D:/Game_prj/VFX_LIb/Docs/CannonLibraryAudit_v1/AssetPlan_v2_Delta1_Pending.md` / JSON (giữ tên nhưng nội dung ĐÃ DUYỆT). Chỉ remap bản copy; không sửa nguồn hoặc tự đổi hình/timing/package. Không xin duyệt lại D01–D04; chưa có xác nhận mỹ thuật runtime/mobile.
<!-- /cannon-library-delta1-approved-2026-10-17 -->

# StrongExplosion v1 — bàn giao runtime

Ngày 2026-10-17. Người dùng đã yêu cầu triển khai prompt sau khi duyệt spec/shape/asset plan. Đây là bản dựng để xem playback, chưa phải phê duyệt mỹ thuật runtime.

## Mở và chạy

1. Dùng Unity 2022.3.62f3, Built-in trong project hiện tại.
2. Mở `Assets/StrongExplosion_v1/Scenes/StrongExplosion_Demo.unity`, bấm Play. Dùng Replay hoặc Stop / clear trong demo.
3. Prefab dùng riêng: `Assets/StrongExplosion_v1/Prefabs/VFX_StrongExplosion.prefab`.

Prefab chỉ gồm native Particle Systems; không có runtime controller. Demo/trigger ở ngoài prefab. Khi tích hợp hệ thống khác, caller sở hữu trigger, stop/clear và pool release; không thêm damage hoặc terrain collision.

```csharp
foreach (var system in instance.GetComponentsInChildren<ParticleSystem>(true))
    system.Play(false);

// Cancel or return to pool:
foreach (var system in instance.GetComponentsInChildren<ParticleSystem>(true))
    system.Stop(false, ParticleSystemStopBehavior.StopEmittingAndClear);
```

## Assets thực tế

Tất cả file runtime mới nằm trong `Assets/StrongExplosion_v1/`:

- 5 PNG: puff khói, impact body/tip hai biến thể, flash và nhánh nứt.
- 2 mesh đá `.asset`, mỗi mesh 24 đỉnh, 8 tam giác, màu mặt qua Color32.
- 8 material mới dùng Particles/Standard Unlit và Mobile/Particles/Additive sẵn có.
- 1 prefab, 1 scene, 1 script demo và 1 editor builder. Không tạo shader hoặc package mới.
- 5 nhóm layer: Smoke, Impact, Center, Debris, Cracks. Tổng 50 Particle Systems, tối đa 62 hạt trong lần kiểm chứng. Nhiều emitter dùng chung material; 50 renderer không tự là số draw call đo được.

`TextureProduction_v1.md` lưu nguồn ảnh và brief. Built-in imagegen tạo artwork thật; Unity importer giới hạn kích thước dùng trong engine. PNG gốc lớn hơn kích thước yêu cầu và không bị resize bằng code. Bộ kiểm chứng desktop dùng texture uncompressed để đánh giá nét trước khi chốt format mobile.

## Bằng chứng kiểm chứng

- `Validation/PlayReport.json`: kết quả chạy Play Mode thực bằng Unity batch trên project đích, không phải chỉ simulate từ spec.
- `Validation/Frames/`: 97 frame camera.Render thực, lấy mỗi 2 tick ở captureFramerate=60.
- `Validation/StrongExplosion_Playback.gif`: playback đóng gói từ các frame Unity, khoảng 15 fps.
- `Validation/StrongExplosion_ContactSheet.png`: các keyframe onset, impact, khói và fade.
- `Validation/DebrisOnly.png`: kiểm tra riêng mesh đá sau sửa màu.
- `Validation/UnityBuildPlay.log`: log import/build/Play.

Các số giây trong samples/contact sheet là mốc tick danh nghĩa; coroutine bắt đầu và camera capture có sai lệch một vài simulation tick đầu. Không dùng nhãn này để suy duration chính xác hơn cấu hình. Lifetime/start delay thực trong prefab giữ spec: flash 0,12 s; impact 0,45 s; khói từ 0,03 đến 3 s; đá 1,6 s; nứt kết thúc 2,4 s.

Kiểm tra đã chạy: natural end, cancel sớm và muộn, replay, disable trực tiếp, re-enable/pool replay, giữ World Space khi di chuyển root, pause theo timeScale. Kết quả cuối đọc từ PlayReport.json; mẫu tại 3 s và 3,2 s không còn hạt. Không có lỗi C# hoặc runtime exception được ghi trong lần chạy cuối của effect.

Build/render không chứng minh mỹ thuật đạt. Đã xem keyframe tổng hợp và diagnostic đá; người dùng xem GIF/scene để đánh giá bản dựng. Hình khói và shading là bản giản lược từ blueprint, không mô phỏng thể tích ánh sáng. Static puff không có animation bề mặt bên trong; cảm giác cuộn đến từ module và overlap.

## Giới hạn cần giữ rõ

- Chưa đo CPU/GPU, draw calls, overdraw, VRAM hoặc FPS trên mobile. 50 hệ particle là chi phí CPU/renderer cần profile trước khi chốt budget; chưa tuyên bố đạt hiệu năng mobile.
- Demo nền phẳng; nhánh nứt là card có pivot gốc và native length growth, không chiếu lên địa hình dốc và không làm hỏng terrain thật.
- Billboard phù hợp góc demo; chưa xác nhận giữ khối từ mọi góc camera.
- Asset/shape approval trước đó không đồng nghĩa người dùng đã duyệt bản runtime này. Không tự đổi timing hoặc scale để che sai khác hình ảnh.

## Tái tạo

Trong Unity: menu `VFX/Strong Explosion/Build approved v1`. Builder chỉ tạo/cập nhật assets StrongExplosion của chính task. Nó mở scene demo mới trong quá trình build; chỉ chạy khi không có scene chưa lưu cần giữ.

Lệnh batch kiểm chứng dùng executable Unity 2022.3.62f3 với `-batchmode -projectPath D:/Game_prj/VFX_LIb -executeMethod StrongExplosionV1.StrongExplosionBuild.BuildAndValidate -strongValidate -logFile D:/Game_prj/VFX_LIb/Docs/StrongExplosion/Validation/UnityBuildPlay.log`. Không thêm `-quit` vì coroutine Play Mode tự ghi report rồi thoát. Chạy khi project không mở trong một Unity khác; không điều khiển giao diện.

Đóng gói evidence: chạy `Docs/StrongExplosion/BuildEvidence.py` bằng Python có Pillow. Script này chỉ xử lý frame capture trong Docs, không chỉnh texture runtime.

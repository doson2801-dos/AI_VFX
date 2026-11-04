# Cannon library reuse — báo cáo kiểm chứng

Ngày 2026-10-17; Unity **2022.3.62f3**, **Built-in**, Windows Editor, desktop graphics. Phạm vi được duyệt: **Asset Plan v2 C01–C07 + Delta1 D01–D04**, tổng 37 file nguồn. Không có shader/texture/mesh VFX mới. Source animlibrary chỉ đọc.

## Kết quả bàn giao

- Scene: `D:/Game_prj/VFX_LIb/Assets/CannonVFX_LibraryReuse_v1/Scenes/CannonLibraryReuse_Demo.unity`.
- Muzzle prefab: `Assets/CannonVFX_LibraryReuse_v1/Sources/VFX/Gameplay/RPG/VFX_Cannon_Shoot.prefab`.
- Impact prefab: `Assets/CannonVFX_LibraryReuse_v1/Sources/VFX/Gameplay/RPG/VFX_Cannon_Impact_InUse.prefab`.
- Script demo nằm trên DemoDriver của scene, không thêm controller vào prefab. Hai prefab có tổng 14 Particle Systems và không có MonoBehaviour runtime/missing script theo Unity audit.
- Đã thêm Shader Graph 14.0.12, Core RP 14.0.12, Searcher 4.9.2 và importer CFXR. Không thêm URP/HDRP pipeline. Graph giữ các node/backend gốc; không cần dùng ngoại lệ thu hẹp active target.

## Bằng chứng thực

Project đích đang mở trong Unity. Build và actual Play mode chạy trong bản sao `Docs/CannonLibraryAudit_v1/UnityValidation` với asset byte-identical, cùng project settings/package manifest; sau đó scene đã kiểm chứng được copy về đích. Không đóng hoặc đổi scene đang mở của người dùng. Các kết quả dưới đây là của bản sao kiểm chứng, không giả nhận đã Play trong cửa sổ Unity đích.

| Kiểm tra | Kết quả thực | Bằng chứng / giới hạn |
|---|---|---|
| Script compile / import / shader | PASS trên Windows Editor | `BuildValidation_Delta1.log`, `UnityTechnicalReport.json`; source shaders được resolve đúng: Legacy Particles, Mobile Particles, Standard Unlit, CFXR, scroll shader và UberFXSG |
| Dependency Graph | PASS trong phạm vi source nhập | `UnityImportedCatalog.json`: complete=true, 36 main asset paths dưới Sources; Editor importer là file nguồn thứ 37 ngoài root Sources. Có dependencyHash của Unity |
| Missing script / prefab controllers | PASS | Audit thực 2 prefab: không missing scripts và không runtime MonoBehaviour. Demo script ngoài prefab |
| Streams / module / material references | Ghi nhận thực | 14 PS trong `UnityTechnicalReport.json`; giữ UV, UV2, Custom1/2 và renderer disabled gốc. Không suy keyword/property lưu thành shader branch đang chạy |
| Play / replay | PASS | `PlayReport.json`: replayEmits=true; ghi Play mode thật, không phải ghép JPEG preview cũ |
| Demo loop / tail native | PASS | loopRepeats=true, muzzleEnds=true, impactEnds=true; hai vòng chờ IsAlive trả false thực, không hard-clear để giả tail kết thúc |
| Stop / clear | PASS | stopClears=true, số hạt về 0, IsAlive false |
| Scene reload | Đã thực hiện trong bản sao | Scene được tạo/save, mở lại ở process Unity mới trước Play/capture; report runtime và frame mới sau reload |
| Source integrity | PASS | `IntegrityReport.json`: 37 source hashes không đổi; hai prefab bằng source sau đảo GUID remap. Assets copy giữa target và bản kiểm chứng byte-identical |
| Pipeline settings | PASS | GraphicsSettings.asset và QualitySettings.asset target bằng backup trước triển khai |
| Visual review | CÓ GIỚI HẠN / chưa duyệt art | Đã xem storyboard từ frame Play mode và ảnh peak; xem quan sát bên dưới. Chưa có concept riêng/model/camera gameplay để duyệt sản phẩm |
| Mobile GPU / overdraw / memory / FPS | CHƯA ĐO | Không có thiết bị/budget mục tiêu; PS count và compile không chứng minh mobile budget |

Audit log đầu `BuildValidation.log` phát hiện 4 subgraphs bị thiếu dù shader vẫn supported. Preview/lifecycle trước bổ sung nằm trong `Diagnostic_BeforeDelta1`, không dùng làm minh chứng hình ảnh đã đủ dependency. Delta1 được người dùng duyệt trước khi nhập bổ sung. Lượt `BuildValidation_Delta1.log` không còn lỗi graph dependency. Các preview khung quá rộng được giữ ở thư mục `Diagnostic_WideCamera_*`; bản bàn giao dùng `PlayValidation_Final.log`.

## Playback bàn giao

- [Muzzle — Play mode](Muzzle_PlayMode.gif)
- [Impact — Play mode](Impact_PlayMode.gif)
- [Sequence — Play mode](Sequence_PlayMode.gif)
- [Contact sheet theo thời gian](PlaybackContactSheet.png)
- [Mọi frame muzzle](Muzzle_AllFrames.png), [mọi frame impact](Impact_AllFrames.png), [mọi frame sequence](Sequence_AllFrames.png)

Mỗi clip có 120 frame tại 30 fps = 4 giây simulation, PNG gốc 384×384. GIF sử dụng nhịp 30/30/40 ms để tổng thời gian bám 30 fps trong giới hạn GIF. Nền tối, góc nhìn orthographic của demo, không bloom/post-processing mới; camera được căn lại để đọc rõ burst. Background ground có trong scene nhưng tắt ở bản demo cuối. Không phóng hoặc thay scale/timing prefab để làm đẹp preview.

Trong kịch bản kiểm tra: peak quan sát **52 hạt muzzle**, **10 hạt impact**. Đây là thống kê trong kịch bản này, không phải worst case hoặc budget GPU. Demo phát hit sau **0,7 s** để xem hai effect theo thứ tự; đó là offset demo, không phải thời gian bay/gameplay đã duyệt.

## Quan sát hình ảnh cần giữ rõ trạng thái

Muzzle hiện chớp đỏ–cam dạng quạt/shard, embers và khói cụm xám của thư viện. Impact hiện mũi/chớp, crack nóng và glow. Bản này tái hiện **dữ liệu nguồn**, chưa phải VFX được thiết kế/tuning riêng theo model pháo.

**Impact có mảng nâu đặc dạng thành cong** trong khoảng đầu–giữa. Source `Alpha_Blended.mat` hiện tham chiếu Particles/Standard Unlit với `_Mode=0`, `_SrcBlend=1`, `_DstBlend=0`, `_ZWrite=1`; đây là trạng thái opaque đã có trong source. Mesh renderer dùng material này có một bản disabled và một bản enabled theo nguồn. Đây là dữ kiện giúp khoanh vùng, chưa thay thế kiểm tra layer riêng để kết luận mọi nguyên nhân hình ảnh. Không tự đổi blend hoặc tắt layer vì C03 chỉ cho remap/metadata, và không coi render này đạt mỹ thuật.

Khói giữ nhịp cụm của nguồn; có thể cần tuning khác để hợp camera/gameplay và ưu tiên tránh chuỗi bóng của người dùng. Không tự đổi tint, density, timing hoặc shader để sửa ngoài plan. Chọn/tuning mỹ thuật tiếp theo cần phạm vi cụ thể; phê duyệt nhập asset không phải phê duyệt render hiện tại.

## Cách chạy

1. Trong Unity project `D:/Game_prj/VFX_LIb`, để Package Manager resolve các dependency đã ghi trong manifest/lock nếu editor chưa refresh.
2. Mở `Assets/CannonVFX_LibraryReuse_v1/Scenes/CannonLibraryReuse_Demo.unity` và vào Play.
3. Dùng **Sequence / Replay**, **Stop / clear**, **Loop demo**, **Muzzle only**, **Impact only** trên overlay.
4. Native source playOnAwake vẫn giữ nguyên; demo gọi Play(true) để trigger. Game caller cần tự gọi trigger và quản lý pooling/release sau tail. Không dùng demo hit delay làm gameplay.

Không có model pháo trong đầu vào; scene dùng MuzzleAnchor và HitAnchor tại vị trí demo. Chưa tích hợp animation recoil, projectile, damage, âm thanh hoặc gameplay.

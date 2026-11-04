# Asset Plan v2 — Cannon library reuse — Built-in

**ĐÃ DUYỆT C01–C07** — người dùng trả lời “ok tiếp đi” ngày 2026-10-17 sau yêu cầu duyệt Asset Plan v2. Tên file giữ nguyên để bảo toàn link. Thay bảng ứng viên v1 cho bước thử tái sử dụng tại project `D:/Game_prj/VFX_LIb`, Unity 2022.3.62f3, Built-in — đích được người dùng chọn rõ trong chat ngày 2026-10-17. Phạm vi đề nghị: dựng bản tham chiếu từ **hai prefab nguồn**, giữ hình/timing nguồn trước khi đề xuất chỉnh mỹ thuật. Không áp timeline tuning v1 vào bản nguồn.

Ảnh tham chiếu cho bước này là các chuỗi preview `VFX_Cannon_Shoot` và `VFX_Cannon_Impact_InUse` đã xem; đây là đề nghị baseline thư viện để kiểm tra trong project đích, chưa phải concept khẩu pháo riêng đã duyệt. Chưa có model/ảnh pháo để đo anchor. Dùng hai anchor đánh dấu trong scene demo thay vì tự dựng hoặc nhập model pháo.

## Phạm vi tài nguyên để duyệt

Nguồn mọi path Assets dưới đây: `D:/Projects/animlibrary/`. Root đích mới: `D:/Game_prj/VFX_LIb/Assets/CannonVFX_LibraryReuse_v1/`. Mỗi file nguồn, GUID, SHA256 và đường dẫn output cụ thể có trong [AssetInventory_v2_Pending.md](AssetInventory_v2_Pending.md) / JSON cùng tên. Danh mục gồm **33 file nguồn**: 2 prefab, 9 material, 12 PNG, 2 FBX, 1 graph, 1 cfxrshader, 4 cginc, 1 shader và 1 Editor importer. Không kèm preview JPEG hoặc 828 unitypackage.

| ID | Thành phần / operation | Nguồn đã kiểm tra + GUID | Kỹ thuật, channel/streams/keyword | Output và giới hạn thay đổi |
|---|---|---|---|---|
| C01 | Muzzle, reuse trên bản mới | `VFX/Gameplay/RPG/VFX_Cannon_Shoot.prefab` — cbb041f394e578149af8ac2c397ee661 | 7 PS, flash/mesh và smoke/embers; giữ Custom Data/UV/stream order, curve, burst và active states nguồn | `Sources/VFX/Gameplay/RPG/VFX_Cannon_Shoot.prefab`; chỉ remap GUID/reference sang bản nhập mới; không retime, không đổi tint/mật độ |
| C02 | Hit gọn, reuse trên bản mới | `VFX/Gameplay/RPG/VFX_Cannon_Impact_InUse.prefab` — 6b14662d8c2f77743baf269dae218b6a | 7 PS; có ground/crack, glow và mesh; một renderer nguồn disabled vẫn giữ disabled | `Sources/VFX/Gameplay/RPG/VFX_Cannon_Impact_InUse.prefab`; không tự lược ground chỉ vì preview gọn; giữ built-in material references cần thiết |
| C03 | Texture/mesh/material, reuse | 12 texture, 2 FBX, 9 material có GUID/hash trong inventory; ví dụ Muzzle b7eebc70ebd407343a4bbac1abfe7ede; Smoke_Harsh material 02dff015a09f31840a185f6d8d320780; GroundCracks material 65e3e121dfb073c4eaeac6e921dd5ff1 | Muzzle và SmokeHarsh có hình trong A; crack/impact có RGB mask và alpha đặc. Giữ channel vector đúng material gốc, không chuyển tất cả sang R/A. Giữ UV/mesh nguồn | Giữ cấu trúc tương đối trong `Sources/`; GUID mới và remap, không sửa importer Read/Write hoặc đổi compression. Material chỉ remap references và xử lý metadata Editor thiếu package như ghi bên dưới |
| C04 | Shader scroll và CFXR, reuse | `Dependencies/RPG/_Game/Resources_moved/Shaders/scroll_XY_Base.shader` — 40a204680032ebb4db2ede7f5a6cfd07; `Shaders/CFXR Particle Ubershader.cfxrshader` — 1a29b4d27eb8b04479ef89c00dea533d; 4 include trong inventory | Scroll đọc TEXCOORD1.xy offset/z opacity/w progress. CFXR dissolve nhánh trong include đọc R và Custom Data khi được cấp; keyword lưu chưa chứng minh stream runtime đủ | Copy nguyên shader/include vào cấu trúc nguồn tương đối. Không viết/sửa shader. CFXR importer chọn Built-in/Auto theo project. Không bật thêm feature để “hoàn thiện” effect |
| C05 | Shader Graph, reuse, cho phép variant chỉ ở danh sách backend nếu cần | `Shaders/UberFXSG.shadergraph` — 7f11fe28133f1a74594785107b98f2fe; đã lần `m_ActiveTargets` ra BuiltInTarget, HDTarget, UniversalTarget | Giữ property reference names, node wiring, opacity channels và Custom Data. Có Built-in target không tự chứng minh compile/playback | `Sources/Shaders/UberFXSG.shadergraph`. Nếu importer không đọc được target URP/HDRP vắng package, chỉ cho phép chọn Built-in active target trên bản copy; không đổi node/function/property/material values. Nguồn vẫn giữ đầy đủ backend. Nếu vẫn lỗi, dừng báo lỗi, không cài thêm render pipeline hoặc viết shader mới |
| C06 | Tool/import dependency, reuse + package dependency mới | `Editor/CFXR_ShaderImporter.cs` — fe56ec25963759b49955809beeb4324b; package ShaderGraph 14.0.12 từ manifest đã đọc | ScriptedImporter tạo shader từ .cfxrshader, chạy Editor. ShaderGraph phụ thuộc Core RP 14.0.12 và Searcher 4.9.2; các module Unity/UGUI mà Core cần đã có trong target | Importer tại `Editor/CFXR_ShaderImporter.cs`; thêm `com.unity.shadergraph:14.0.12` vào manifest và để UPM giải lock. Không thêm URP/HDRP pipeline, không đổi GraphicsSettings/Quality pipeline. Không copy source CFXR Editor.asmdef vì nó tham chiếu Spine; không nhập toàn Editor folder |
| C07 | Scene/demo và tooling kiểm chứng, new | Không có nguồn model pháo được cung cấp; dùng marker muzzle/hit | Demo script ở object riêng; gọi Play(true), Stop/Replay/Loop và preview layer; prefab effect không thêm runtime controller | `Scenes/CannonLibraryReuse_Demo.unity`, `Demo/CannonLibraryReuseDemo.cs`, Editor audit/build job trong `Editor/`. Scene mới nền trung tính, hai anchor. Không sửa SampleScene, không giả lập gameplay/hit time thật |

Đường dẫn trong inventory đã gồm root `Assets/CannonVFX_LibraryReuse_v1/`. Root output mới không được overwrite folder đã tồn tại. Copy đúng nguồn trong inventory, remap GUID, không nhập toàn pack hoặc tự lấy asset ngoài danh mục. Không dùng bộ Builder one-shot nguyên trạng nếu nó buộc đổi playOnAwake/stopAction ngoài bảng này; dùng tooling tạo demo đúng contract thay vì âm thầm đổi prefab nguồn.

## Metadata và thông số giữ nguyên

- Material có serialized Editor version subassets: GUID `639247ca83abc874e893eb93af2b5e44` đã đối chiếu là ShaderGraph Built-in AssetVersion; `d0353a89b1f911e48b9e16bdc9f2e058` là URP Editor AssetVersion. GUID `da692e001514ec24dbc4cca1949ff7e8` chưa resolve trong package được kiểm tra. Chúng không phải MonoBehaviour gameplay trên hai prefab. Chỉ cho phép bỏ subasset metadata Editor không có GameObject và không resolve trên **bản material copy**, không bỏ component runtime hoặc property dùng để render.
- Giữ source timing, size, color, simulation space, emission, custom curves và streams. Không áp các mốc 0,10/0,70 s hoặc tỷ lệ theo D trong đề xuất cũ vì chưa duyệt và chưa biết model.
- Không sao chép metadata cache `shaderSourceCode` dài đã lưu của ScriptedImporter như bằng chứng compiled shader hiện tại. Để importer đích generate theo Built-in và kiểm tra lỗi thực.
- Không tạo texture/mesh mới, không thêm shader mới, không sửa source/shared assets. Không tự tối ưu bằng cách tắt lớp hoặc thay tất cả shader thành Mobile/Particles khi chưa chứng minh tương đương.

## Tiêu chí thực hiện sau khi duyệt

1. Kiểm tra lại hash 33 file trước copy. Nếu source thay đổi, ghi snapshot mới và trình phần đổi nếu ảnh hưởng scope. Giữ bản nguồn chỉ đọc.
2. Project đích đang có UnityLockfile: dùng editor/job hợp lệ khi sẵn có, không chạy batch thứ hai vào project đang mở, không buộc đóng editor hoặc lưu/đóng scene người dùng đang sửa. Nếu không có job đang dùng được, cần người dùng đóng Unity để batch.
3. Compile/import shader, importer, packages; resolve graph và material thực; audit Unity hai prefab đích gồm missing references/scripts, active hierarchy, renderer flags, streams, keywords và dependencyHash. Source animlibrary lỗi UI Particle không bị sửa trong plan này.
4. Playback riêng muzzle/hit và sequence demo, replay, stop, loop, tail tự kết thúc; không hard-clear sớm để che lifetime lỗi. Đối chiếu frame tham chiếu nhưng không suy FPS nguồn; scene demo ghi rõ hit time là giá trị demo.
5. Kiểm tra channel/stream qua render thực trên Built-in. Nếu graph/source shader không tái hiện đúng, báo sai lệch; không đổi mỹ thuật hoặc thêm package ngoài phạm vi để làm pass.
6. Báo mobile chưa đo nếu không có thiết bị/budget. 14 PS tổng trong hai prefab không phải chứng minh budget mobile.

## Ranh giới phê duyệt

Duyệt v2 nghĩa cho phép C01–C07: tạo bản reuse trong target Built-in, cài ShaderGraph và dependencies đã liệt kê, thêm importer/tooling/scene demo, kiểm chứng bản nguồn. Không phải duyệt chất lượng cuối, timing mới, concept mới, model khẩu pháo hoặc thêm trail/impact đất riêng.

Approval evidence: người dùng trả lời **“ok tiếp đi”** sau yêu cầu duyệt Asset Plan v2, ngày 2026-10-17. Thay trạng thái chưa duyệt trước đó; không phê duyệt mỹ thuật runtime hoặc thay đổi ngoài C01–C07.

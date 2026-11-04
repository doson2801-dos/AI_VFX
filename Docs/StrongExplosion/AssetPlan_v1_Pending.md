# StrongExplosion — Asset Plan v1

Trạng thái hiện tại: ĐÃ DUYỆT A01–A07. Ngày 2026-10-17. Giữ tên file để bảo toàn link; các nhãn chờ duyệt trong nội dung cũ là lịch sử bản trình.

Căn cứ: người dùng trả lời “tiếp tục” ngay sau câu hỏi duyệt gộp cấu trúc/shape/spec v1, A01–A07 và quyền xuất prompt tiếng Anh. Phê duyệt giữ nguyên phạm vi 5 PNG, 2 mesh, 8 material, prefab/demo và tối đa 2 script hỗ trợ. Lượt này chỉ xuất prompt; chưa được coi là yêu cầu bắt đầu runtime ngay trong chat hiện tại.

## Căn cứ thiết kế

Brief và lựa chọn D01–D08 đã xác nhận trong DesignLedger_v1.md. BP-01, shape kit và ShapeSpecification_v1_Draft.md vẫn là đề xuất. Hai lệnh “tiếp tục” cho phép tiếp tục công việc thiết kế/khảo sát, chưa được ghi thành xác nhận cụ thể cho timing hoặc silhouette. Concept v1 vẫn draft.

## Môi trường và phạm vi khảo sát

- Project hiện tại: Unity 2022.3.62f3 theo ProjectVersion.txt; GraphicsSettings m_CustomRenderPipeline=0, phù hợp Built-in. Không đổi pipeline.
- Đã liệt kê toàn Assets và Packages hiện tại: 12 PNG, 2 FBX, 9 material, 2 prefab; shader nguồn gồm 1 .shader, 1 .cfxrshader cùng include, 1 .shadergraph và 4 subgraph. Assets chủ yếu gồm CannonVFX_LibraryReuse_v1 và Scenes. Không có thêm AGENTS.md được tìm thấy bằng rg trong phạm vi project đã tìm.
- Packages manifest có ShaderGraph 14.0.12. Không cần cài thêm package cho plan này. Không mở rộng khảo sát sang ổ máy hoặc copy nguồn animlibrary/RPG ngoài workspace.
- Đã đọc shader scroll_XY_Base, material khói/Alpha_Blended/GroundCracks, module/renderer của prefab Cannon_Impact; mở trực tiếp 4 PNG ứng viên và tạo ảnh inspection alpha trong Docs.
- Báo cáo sẵn có RuntimeValidation/UnityTechnicalReport.json và UnityImportedCatalog.json của task Cannon được dùng làm bằng chứng lịch sử, không phải test mới cho StrongExplosion.

Các path nguồn dưới đây tính từ `Assets/CannonVFX_LibraryReuse_v1/Sources/`.

## Kết quả reuse có bằng chứng

| Ứng viên | Đã kiểm chứng | Kết luận cho thiết kế hiện tại |
|---|---|---|
| Textures/SmokeHarsh.png | 256², 2x2 puff nhìn thấy trong alpha; sample alpha 0–233. Alpha không phẳng dù RGB preview gần trắng | Có thể học bố trí và chi tiết alpha; contour mờ/rách và value chưa chứng minh đạt mảng khói lớn S01. Không tuyên bố đã đạt chỉ từ PNG |
| Textures/cfxr smoke cloud x4.png | 512², alpha 2x2 puff liền, sample 0–255; RGB chủ yếu trắng/xám sáng | Là atlas 4 biến thể, không tự là animation. Có thể reuse nếu chấp nhận shape cánh tròn; chưa đủ xác nhận shading khối như concept. Plan hiện đề xuất puff S01 riêng để tránh ép shape đã thiết kế vào nguồn |
| Textures/Tx_Burst_directional_03.png | PNG lớn 3630x4096, alpha chứa nhiều cụm mũi; RGB có gradient | Học taper/value; không dùng nguyên sheet nhiều cụm như một particle hoặc gọi đó là flipbook. Contour hiện có khác S02A/B; không mặc định đổi shape để reuse |
| Dependencies/RPG/RPG_VFX/texture/GroundCracks_Radial.png | 512²; alpha sample luôn 255, R có vùng 0–255. Silhouette là cả mạng tròn với tâm trắng | Không gắn nguyên ảnh vào shader đọc alpha: sẽ ra cả quad. Không dùng whole-layout mask thay nhánh S05 mà chưa duyệt delta |
| Dependencies/RPG/_Game/Resources_moved/Shaders/scroll_XY_Base.shader | Đọc custom TEXCOORD1.xy offset, z opacity, w progress; alpha nhân texture alpha, vertex alpha hai lần; luôn áp brightness dissolve và edge fade | Có tính năng nhưng không chọn cho nhu cầu fade đơn giản. Không chỉnh shared shader để phục vụ effect này |
| Shaders/CFXR_PASSES.cginc và material cfxr smoke cloud x4 ab | Main RGBA dùng alpha; _SingleChannel>0 đổi R thành alpha. Source material bật _CFXR_DISSOLVE, shader có branch thực thi | Có thể cấu hình variant nếu cần, nhưng plan hiện không cần shader này hoặc dissolve. Không clone nguyên material rồi vô tình giữ keyword |
| Alpha_Blended.mat / sub_arrow.mat | Báo cáo Unity của task Cannon xác định shader Particles/Standard Unlit và Mobile/Particles/Additive, supported=true tại lần đo đó; GUID builtin. Source Alpha_Blended hiện có opaque blend/ZWrite, không dùng nguyên setting làm alpha | Reuse shader có sẵn bằng material mới cấu hình đúng. Cần xác nhận lại shader và blend trong lần production tương lai |
| Ant_M_1.fbx / Tornado_vertical.fbx | Báo cáo import cũ: 512 đỉnh và 35 đỉnh; bounds có đọc được. Chưa inspect geometry trực tiếp | Không xác nhận chúng là mesh đá từ tên/bounds. Không reuse mù; plan giới hạn 2 mesh đá mới nhỏ, có kiểm tra lại trước sản xuất |
| VFX_Cannon_Impact_InUse.prefab | ground bật CustomData vec4, custom streams serialized 000103042223; UVModule tắt. Child impact bật UVModule; source có cả mesh renderer dùng Tornado | Học cách tách layer; không clone effect nguyên trạng hoặc suy cùng module bật trên mọi child. Không kế thừa timing/hình pháo |

Inspection alpha lấy mẫu 240x240 mỗi ảnh, không phải thống kê toàn bộ texel: `References/ReuseCandidates_AlphaInspection.png`. Chưa đo mip/compression/render hoặc performance StrongExplosion.

## Bảng assets xin duyệt

Mọi file mới dự kiến nằm dưới `Assets/StrongExplosion_v1/`; tuyệt đối không sửa Sources hoặc shared asset. Tất cả dòng hiện CHỜ DUYỆT. Kích thước texture là đề xuất thiết kế, được giảm chỉ khi render vẫn giữ hình đã duyệt.

| ID / layer | Phương án và file cụ thể | Silhouette / kỹ thuật / carrier | Lý do và phạm vi | QA trước nghiệm thu |
|---|---|---|---|---|
| A01 / L01 S01 | NEW `Textures/T_SmokePuff.png`, 512² RGBA; grayscale shading trong RGB, coverage trong alpha | Một puff mảng lớn lệch, không bake vòm. Billboard native particles phân bố 3D; cố định sprite, không flipbook | Hai nguồn khói đã inspect chưa khớp contour/value S01. Chỉ 1 texture mới, phối module và lớp nóng/lạnh bằng cùng material | Xem alpha/RGB riêng, render tint nóng tới than; kiểm tra chùm bóng, tâm bị che, sorting và góc nhìn |
| A02 / L02 S02A/B | NEW `Textures/T_ImpactBody_2Variants.png` và `T_ImpactTip_2Variants.png`, mỗi ảnh 1024x512 RGBA, 2 ô ngang | Hai shape cục bộ khác contour; body cam và tip vàng dùng UV/pivot khớp; card định hướng. Hai ô là variants, KHÔNG chạy animation giữa ô | Nguồn burst nhiều cụm khác shape; texture mới giữ vai cong/eo/chóp. Hai file để điều khiển màu theo không gian, không giả một tint tạo hai màu | Preview khớp kit, body/tip đăng ký UV, seam/mip/bleed; không chóp trắng phẳng hoặc mũi cong mất lực |
| A03 / L03 S03 | NEW `Textures/T_CenterFlash.png`, 256² RGBA | Mask sáng cục bộ có biên mềm; dùng chung cho lõi nhỏ và halo lớn, tint riêng; billboard/ground card chọn theo camera | Chưa tìm thấy nguồn đủ phù hợp trong 12 PNG; không dùng texture full explosion hoặc real-time Light | Lõi còn contour khi additive; halo không làm trắng toàn vòm; kiểm tra vùng alpha đen/viền |
| A04 / L04 S04 | NEW `Meshes/M_Debris_A.asset`, `M_Debris_B.asset`; 24–60 vertices/mesh dự kiến, facet và vertex color | Hai khối đá nhỏ có thể tích thật; mesh particles, gravity/rotation; fade cuối | Cần quay và đọc mặt; hai FBX hiện có chưa chứng minh là đá. Không thêm physics/collider; không copy model tham chiếu | Facet/vertex color đọc được trong shader particle; không thành shard phát sáng; cân đối size/mật độ |
| A05 / L05 S05 | NEW `Textures/T_CrackBranch.png`, 512x256 RGBA, RGB trắng, alpha nhánh | Một nhánh cục bộ, gốc dày/chóp thu nhỏ; ground-aligned particle cards ghép có chủ đích. Emission delay + scale theo chiều dài từ pivot gốc để mở nhánh; fade cuối | Existing GroundCracks là cả mạng với alpha kín. Tách nhánh tránh bake toàn bố cục; không shader reveal mới | Kiểm tra cảm giác lan, không kéo giãn ngang; nếu native scale làm bật hình sai cần trình delta, không âm thầm đổi kỹ thuật. Demo nền phẳng; dốc/projection chưa thuộc plan |
| A06 / tất cả | REUSE shader builtin; NEW 8 material: `M_Smoke`, `M_ImpactBody`, `M_ImpactTip`, `M_CenterCore`, `M_CenterHalo`, `M_Debris`, `M_CrackDark`, `M_CrackHot` trong Materials/ | Alpha: Particles/Standard Unlit cấu hình transparent, ZWrite off. Additive: Mobile/Particles/Additive cho impact/tâm/crack nóng. Dùng alpha thực, RGB×tint×particle color; không custom streams nếu không cần | Shader có bằng chứng lịch sử trong project; không shader mới, không package mới. M_CrackDark và M_CrackHot dùng cùng mask; ánh nóng giảm sớm, nhánh tối còn rồi fade | Xác minh Shader.Find/material shader/import, keywords và blend runtime. Không giữ setting opaque từ Alpha_Blended.mat. Kiểm tra vertex color đá và alpha |
| A07 / tổng | NEW `Prefabs/VFX_StrongExplosion.prefab`, `Scenes/StrongExplosion_Demo.unity`; nếu cần, `Demo/StrongExplosionDemo.cs` và `Editor/StrongExplosionBuild.cs` | Native Particle Systems; nhóm Khói/Impact/Tâm/Đá/Nứt. Script demo/trigger ngoài prefab, không runtime controller trong prefab | Chỉ effect này, nguồn thư viện giữ nguyên. Không gameplay/damage/terrain collision, không sửa demo pháo. Editor script chỉ cần khi làm qua file/job | So peak và toàn playback với BP/kit/concept ở trạng thái được duyệt; cancel/disable/replay/pool không tích particle/vết nứt; báo số draw/hạt/texture, mobile chưa đo |

Tổng phạm vi đề xuất: 5 PNG mới, 2 mesh mới, 8 material mới dùng shader sẵn có, 1 prefab, 1 demo scene, tối đa 2 script hỗ trợ ngoài prefab. Không texture animation/flipbook, shader mới, sửa shared asset hoặc đổi pipeline. Các PNG/mesh chỉ sản xuất sau approval, không lấy preview trong Docs nhập thẳng làm runtime.

## Phê duyệt và giới hạn

Có thể duyệt gộp **BP-01 + shape kit + spec v1 + Asset Plan v1 A01–A07** sau khi xem đầy đủ. Nếu chỉ duyệt plan, shape/spec chưa được chốt vẫn phải được giải quyết trước phần sản xuất phụ thuộc. Quyền xuất prompt kỹ thuật cuối là riêng; chưa có yêu cầu xuất prompt trong lượt này. Duyệt plan không được báo là runtime đã đạt mỹ thuật.

Gate bắt buộc từ dynamic-vfx-prompt-builder/references/asset-review-and-approval.md: “Liệt kê asset thành phần cụ thể để user duyệt trước khi thực hiện assets/prefab runtime.” Vì vậy lượt này dừng ở bảng review, chưa ghi file vào Assets.

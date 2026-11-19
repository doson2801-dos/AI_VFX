# Kiểm tra kỹ thuật Cannon — v2

Project đích người dùng đã chọn: `D:/Game_prj/VFX_LIb`, Built-in.

Đọc source và reflection enum từ DLL Unity 2022.3.62f3; chưa load prefab trong Unity. Không chạy batch thứ hai vì target có UnityLockfile.

## VFX_Cannon_Shoot

| Object | Active / renderer | Mode | Streams serialized | Material |
|---|---|---|---|---|
| smoke | 1 / 1 | 0 | Position, Normal, Color, UV | Assets/VFX_Library/Materials/Instances/Textures/cfxr smoke cloud x4 ab.mat |
| impact2 | 1 / 1 | 4 | Position, Normal, Color, UV, UV2, Custom1XYZW | Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/cannon_impact.mat |
| smoke3 | 1 / 1 | 0 | Position, Normal, Color, UV, Custom1XYZW, Custom2X | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Smoke_Harsh_Disolve 1.mat |
| VFX_Cannon_Shoot | 1 / 1 | 0 | Position, Normal, Color, UV | Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/ember.mat |
| impact | 1 / 1 | 0 | Position, Normal, Color, UV, Custom1XYZW | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Davy_jone1.mat |
| smoke3 (1) | 1 / 1 | 0 | Position, Normal, Color, UV, Custom1XYZW, Custom2X | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Smoke_Harsh_Disolve 1.mat |
| smoke2 | 1 / 1 | 0 | Position, Normal, Color, UV | Assets/VFX_Library/Materials/Instances/Textures/cfxr smoke cloud x4 ab.mat |
## VFX_Cannon_Impact_InUse

| Object | Active / renderer | Mode | Streams serialized | Material |
|---|---|---|---|---|
| ground | 1 / 1 | 0 | Position, Normal, Color, UV, Custom1XYZW, Custom2X | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/GroundCracks_Radial.mat |
| VFX_Cannon_Impact_InUse | 1 / 0 | 4 | Position, Normal, Color, UV, UV2 | Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/Alpha_Blended.mat |
| impact | 1 / 1 | 0 | Position, Normal, Color, UV, Custom1XYZW | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Davy_jone1.mat |
| impact_main | 1 / 1 | 0 | Position, Normal, Color, UV | Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/cannon_impact2.mat |
| glow | 1 / 1 | 0 | Position, Normal, Color, UV | Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/sub_arrow.mat |
| VFX_Cannon_Impact_InUse | 1 / 1 | 4 | Position, Normal, Color, UV, UV2 | Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/Alpha_Blended.mat |
| glow_black | 1 / 1 | 0 | Position, Normal, Color, UV | None |

## ShaderGraph active targets

- UnityEditor.Rendering.BuiltIn.ShaderGraph.BuiltInTarget
- UnityEditor.Rendering.HighDefinition.ShaderGraph.HDTarget
- UnityEditor.Rendering.Universal.ShaderGraph.UniversalTarget

Không chỉ thấy tên type trong file: các target trên được lần từ m_ActiveTargets của GraphData. Có Built-in target vẫn cần package Shader Graph, không đồng nghĩa project đích hiện import được.

## Material và shader đang tham chiếu

| Material GUID / path | Shader source | Các giá trị có liên quan |
|---|---|---|
| 02dff015a09f31840a185f6d8d320780 / Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Smoke_Harsh_Disolve 1.mat | {'fileID': '-6465566751694194690', 'guid': '7f11fe28133f1a74594785107b98f2fe', 'path': 'Assets/VFX_Library/Shaders/UberFXSG.shadergraph'} | _MainAlphaChannel={r: 0, g: 0, b: 0, a: 1}; _DetailDisolveChannel={r: 1, g: 0, b: 0, a: 0}; _UseAlphaOverride=0; _UseUVOffset=0; _DisableErosion=0; _SrcBlend=5; _DstBlend=10 |
| 1cbee8a584db1294fad660637d33ab41 / Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/cannon_impact2.mat | {'fileID': '203', 'guid': '0000000000000000f000000000000000', 'path': None} | _SrcBlend=5; _DstBlend=10 |
| 34ece577e916c944c9fb4f68acf252ba / Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/ember.mat | {'fileID': '200', 'guid': '0000000000000000f000000000000000', 'path': None} | _SrcBlend=5; _DstBlend=1 |
| 65e3e121dfb073c4eaeac6e921dd5ff1 / Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/GroundCracks_Radial.mat | {'fileID': '-6465566751694194690', 'guid': '7f11fe28133f1a74594785107b98f2fe', 'path': 'Assets/VFX_Library/Shaders/UberFXSG.shadergraph'} | _MainAlphaChannel={r: 0, g: 0, b: 0, a: 1}; _DetailDisolveChannel={r: 1, g: 0, b: 0, a: 0}; _UseAlphaOverride=0; _UseUVOffset=0; _DisableErosion=0; _SrcBlend=5; _DstBlend=1 |
| 6c39e9872d916f541a4bd95ab6fc9e00 / Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/Alpha_Blended.mat | {'fileID': '211', 'guid': '0000000000000000f000000000000000', 'path': None} | _SrcBlend=1; _DstBlend=0 |
| 6c86eb342b6ccc042805af51fa303ff0 / Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/sub_arrow.mat | {'fileID': '10720', 'guid': '0000000000000000f000000000000000', 'path': None} | _SrcBlend=5; _DstBlend=1 |
| 7840d900dc0a4ed4dbcd26e23f064dd8 / Assets/VFX_Library/Materials/Instances/Textures/cfxr smoke cloud x4 ab.mat | {'fileID': '-6465566751694194690', 'guid': '1a29b4d27eb8b04479ef89c00dea533d', 'path': 'Assets/VFX_Library/Shaders/CFXR Particle Ubershader.cfxrshader'} | _SrcBlend=5; _DstBlend=10; _UseDissolve=1; _UseSP=1 |
| 83d3011c365ea854d91e6466a97ae80f / Assets/VFX_Library/Dependencies/RPG/RPG_VFX/materials/Davy_jone1.mat | {'fileID': '203', 'guid': '0000000000000000f000000000000000', 'path': None} | _SrcBlend=1; _DstBlend=0 |
| fa0c866a48770b64987a7aca4fc1eedf / Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Materials/cannon_impact.mat | {'fileID': '4800000', 'guid': '40a204680032ebb4db2ede7f5a6cfd07', 'path': 'Assets/VFX_Library/Dependencies/RPG/_Game/Resources_moved/Shaders/scroll_XY_Base.shader'} | _SrcBlend=3; _DstBlend=1; _CustomOpacityStrength=1; _CustomOffsetCenter=0; _UseDissolve=0; _UseSP=0 |

## Packing cần giữ

- `UV, UV2, Custom1XYZW`: UV + UV2 chiếm TEXCOORD0.xyzw; Custom1 đi TEXCOORD1.xyzw. Cần đối chiếu thứ tự thực sau import.
- `UV, Custom1XYZW, Custom2X`: thứ tự compact dự kiến UV ở TEXCOORD0.xy, Custom1.xy ở TEXCOORD0.zw, Custom1.zw và Custom2.x ở TEXCOORD1.xyz. Chỉ tương ứng khi renderer thực giữ các streams đó.
- Shader scroll_XY_Base đọc offset XY, opacity Z, progress W từ TEXCOORD1. Shader còn nhân vertex alpha hai lần và lấy brightness từ RGB; đây là hành vi source cần giữ/đánh giá, không tự sửa shader dùng chung.
- UberFX.shader đọc UV0.z để boost màu, UV0.w để erosion; TEXCOORD1 phục vụ offset và các nhánh khác. Không thay UV2/Custom Data tùy tiện.
- CFXR .cfxrshader cần ScriptedImporter và include cginc. Catalog v1 chỉ lần GUID đã bỏ sót dependency đường dẫn #include; v2 bổ sung rõ trong asset plan.
- CFXR Editor.asmdef nguồn tham chiếu Spine; không nhập nguyên folder Editor/asmdef cho một shader. Importer standalone dùng UnityEditor/UnityEngine, nhưng vẫn phải compile/test trong project đích sau duyệt plan.

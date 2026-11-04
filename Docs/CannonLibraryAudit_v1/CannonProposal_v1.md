# Đề xuất VFX khẩu pháo thuốc súng stylized — v1

Trạng thái: ĐỀ XUẤT, chưa duyệt concept/spec/asset plan. Người dùng đã chọn rõ nhánh “Pháo thuốc súng stylized” ngày 2026-10-17. Phạm vi lượt này là catalog và đề xuất; không dựng runtime. Đây là task riêng với LargeExplosion/SmallExplosion.

## Căn cứ và giới hạn

Nguồn: `D:/Projects/animlibrary/Assets/VFX_Library/VFX`. Đã quét file đủ 827 prefab/18 pack, xem contact sheet tổng hợp 7 ứng viên và toàn bộ 60 frame preview của Cannon_Shoot, Cannon_Impact, Cannon_Impact_InUse. File GIF kèm theo được ghép từ chuỗi JPEG có sẵn với 50 ms/frame để tiện xem; FPS capture gốc chưa xác định, vì vậy không dùng GIF để đo timing gốc. Không phải render mới hoặc playback Unity mới.

Đã đọc serialized Particle Systems/modules/streams, lần theo 69 GUID dependency của shortlist, xem tách RGB/R/G/B/A 27 texture trong hai sheet. Không gọi đó là kiểm chứng channel shader đầy đủ: các shader built-in theo fileID và Shader Graph còn cần Unity/compiled-graph inspection. Không coi texture tên smoke là hình ảnh đã xác nhận ngoài các nguồn đã xem.

Unity nguồn: 2022.3.62f3, package URP 14.0.12, GraphicsSettings và các quality pipeline được cấu hình asset URP. Audit batch đã thử nhưng dừng trước executeMethod vì lỗi compile có sẵn ở `Assets/_FrameWork/Scripts/UIHelper/UI Particle/Runtime/UIParticle.cs`: thiếu Coffee.UIParticleExtensions, Cysharp, UniTaskVoid, UIParticleRenderer, AnimatableProperty. Không tự sửa framework/cài package để vượt lỗi. Log: `UnityAudit.log`.

Workspace hiện tại `D:/Game_prj/VFX_LIb` cũng dùng Unity 2022.3.62f3 nhưng GraphicsSettings đặt pipeline null (Built-in), manifest không có URP. Đây là khác biệt cần kiểm tra nếu chọn workspace này làm đích; không tự import URP hay đổi pipeline để khớp thư viện nguồn.

Chưa có ảnh/model của khẩu pháo, camera gameplay, kích cỡ nòng, loại đạn, bề mặt trúng, project runtime đích được chốt hoặc budget mobile. Chưa có concept được duyệt. Các đặc điểm dưới đây là phương án sử dụng thư viện để chọn tiếp, không phải yêu cầu mỹ thuật đã duyệt.

## Bộ đề xuất ưu tiên

| Action | VFX / mức ưu tiên | Nguồn và bằng chứng | Anchor / hướng / space | Trigger và kết thúc |
|---|---|---|---|---|
| Fire | Chớp đầu nòng + blast smoke + embers; cần cho bộ cơ bản | RPG/VFX_Cannon_Shoot.prefab; 7 PS trong YAML, 0 MonoBehaviour, 0 nested prefab; preview frame 1–12 có chớp hướng, khói cụm và embers | Muzzle, trục bắn của nòng; chưa đo anchor; giữ flash sát nòng, smoke tách khỏi recoil khi cần | Fire tại t=0; play one-shot, để tail hết rồi release; tất cả PS nguồn playOnAwake=0 nên caller phải Play(true) |
| Hit | Chớp/glow impact gọn; cần nếu đạn có va chạm hữu hình | RPG/VFX_Cannon_Impact_InUse.prefab; 7 PS, 0 MonoBehaviour, 0 nested prefab; preview frame 1–12 đọc như điểm nóng cam gọn | Hit position; world space; hướng theo normal sau khi kiểm tra định hướng nguồn | OnImpact, không hardcode theo thời gian từ Fire; release khi mọi PS/tail kết thúc |
| Hit ground | Vòng lan + vệt nóng/nứt đất; tùy chọn thay thế hit gọn | RPG/VFX_Cannon_Impact.prefab; 8 PS; preview frame 2–17 có crack nóng và vòng; khác hẳn bản InUse | Ground normal, world space; không dùng cho mọi bề mặt | OnImpact trên đất, chỉ khi chọn scope này; không chồng mặc định cả hai impact |
| Projectile flight | Chưa thêm cho đạn pháo thường; tùy chọn nếu cần dễ đọc đường đạn | SheepOut/VFX_Trail_Missile.prefab, 2 PS; preview có đốm khói/hot puff rải dọc chuyển động | Theo projectile, hạt World Space khi cần lưu đuôi | Start khi spawn; StopEmitting lúc hit và để hạt cũ tan; không Destroy ngay |
| Recovery | Khói sau bắn; dùng tail sẵn có trước khi thêm effect | Cannon_Shoot đã có nhiều lớp smoke và UVModule hoạt động trong YAML | Tại muzzle; kiểm tra recoil/rotation | Không phát thêm một smoke burst trùng tail nếu chưa thấy thiếu khi playback |
| Recoil contact | Bụi ở bệ/bánh; tùy chọn, chưa shortlist mỹ thuật | Có dust candidates trong catalog, chưa xác nhận phù hợp model/camera | Chỗ bệ chạm đất | Chỉ khi có recoil tiếp xúc; không mặc định phát khi bắn |
| Idle / charge | Chưa đưa vào bộ cơ bản | Pháo thuốc súng không tự suy có charge/idle smoke | — | Chỉ bổ sung khi gameplay/concept yêu cầu |

Tên ngắn ở bảng nằm dưới `Assets/VFX_Library/VFX/Gameplay/`. GUID/hash và module theo từng object nằm trong `CannonCandidates.json` và `CandidateTechnicalFacts.md`.

## Ngôn ngữ hình ảnh đề xuất

Chớp đầu nòng: một khối chính kéo theo trục bắn, gốc bám miệng nòng, phần trước thu nhọn; khối lớn và ít chi tiết vụn. Lõi sáng ngắn, mép cam/đỏ mỏng, khoảng tối ngăn flash thành mảng trắng phẳng. Preview Cannon_Shoot có khối quạt đỏ và chóp sáng ở frame đầu: cần kiểm tra hướng với camera/model trước khi giữ nguyên; không khẳng định sẵn hợp góc bắn.

Khói: bung thành vài mảng lớn không đều, giữ lỗ nhìn xuyên hợp lý quanh miệng nòng. Preview nguồn có nhịp cụm tròn tương đối rõ; nếu camera thực đọc thành chuỗi bóng, cần variant có giảm lặp và chỉnh size/spread/rotation. Phần sát nguồn nóng có cam/đỏ sẫm phù hợp, chuyển sang nâu/than rồi tan. Đây là chỉnh màu/mật độ đề xuất, không tự cho phép sửa shared material hoặc nguyên bản. Ưu tiên texture đơn mềm + modules nếu đủ, không tự tạo flipbook mới.

Tia lửa: một số ít chấm/streak ngắn đi theo lực nổ phía trước, độ dài/tốc độ không đều. Chỉ hỗ trợ flash; không biến phát bắn thành pháo hoa hoặc thêm debris khi chưa chọn.

Impact cơ bản: một điểm sáng nóng rất ngắn và khối nổ gọn; ưu tiên InUse vì preview ít dấu nền hơn. Không tuyên bố đây là nổ thể tích: chuỗi nguồn chủ yếu thể hiện glow/chớp. Nếu concept yêu cầu khối nổ có silhouette, phải khảo sát/chọn asset khác hoặc đề xuất layer riêng; không dùng glow thay khối nổ rồi coi đã đủ.

Impact đất tùy chọn: bản Cannon_Impact có crack cam/vòng. Chỉ dùng khi muốn dấu nóng trên mặt đất. Không coi vết nứt là scorch/decal đã được yêu cầu hoặc áp lên gỗ/kim loại/nhân vật.

## Timeline và quy mô — toàn bộ là tuning đề xuất chưa duyệt

Đặt D = đường kính miệng nòng đã đo trong project. Kích thước tham khảo để thử trên camera gameplay: flash dài khoảng 1,5–2,5D, rộng khoảng 0,8–1,4D; smoke nở tới khoảng 2–3D. Không suy D từ preview render vì camera và scale capture chưa xác định.

| Lớp | Mốc đề xuất tương đối trigger riêng | Vai trò |
|---|---|---|
| Muzzle flash | Fire + 0 đến 0,10 s | Điểm nhấn sáng đầu sequence |
| Blast smoke | Fire + 0,02 đến 0,70 s | Nở nhanh rồi chậm, để nòng đọc rõ |
| Embers | Fire + 0 đến 0,35 s | Vài điểm hướng lực |
| Recovery smoke | Fire + 0,20 đến 1,10 s, chỉ khi cần | Ưu tiên tail nguồn, không mặc định thêm lớp |
| Impact flash | Hit + 0 đến 0,08 s | Xác nhận chạm |
| Compact impact / dust | Hit + 0 đến 0,45 s | Khối gọn; tùy bề mặt |
| Ground ring | Hit + 0 đến 0,30 s, tùy chọn | Đọc lực lan trên đất |

Các mốc này không mô tả chính xác lifetime nguồn. `lengthInSec` của ParticleSystem không bằng thời gian hết hạt; phải tính startDelay, emission, lifetime, sub-emitter và tail. Không retime nguồn theo bảng khi chưa được duyệt.

## Đánh giá shortlist

| Candidate | Đề nghị | Điều cần kiểm tra trước reuse |
|---|---|---|
| Cannon_Shoot | Ưu tiên muzzle tiêu chuẩn | 7 PS; có mesh renderer + Custom Data/UV; giữ streams, không thay shader mù quáng; khói có thể nhiều cho mobile |
| Cannon_Shoot_Scrab | So sánh cho pháo nhẹ/ít khói | 6 PS không tự chứng minh rẻ hơn; nhiều moveWithTransform=1 trong YAML, cần thử khi nòng giật/xoay |
| Cannon_Impact_InUse | Ưu tiên hit gọn | Còn tham chiếu ground/crack và nhiều lớp dù preview chủ yếu glow; kiểm tra active state/opacity/render thực trước khi tắt hay lược |
| Cannon_Impact | Hit đất tùy chọn | Có 8 PS, Custom Data, Shader Graph và crack; không gọi bản tương thích mọi pipeline |
| FairShot/Impact_Bomb | Chưa chọn | Preview lấy mẫu khá mờ/tối, chưa đủ để chọn làm khối nổ chính |
| SheepOut/Trail_Missile | Chỉ khi chọn loại đạn cần trail | Tính liên tục phụ thuộc chuyển động và emission; không dùng nguyên demo trajectory làm quỹ đạo gameplay |
| HCFX_Explosion_01 | Không ưu tiên cho nhánh này | Preview tím, sparkle và bụi hướng magic; đổi tint đơn lẻ chưa chứng minh thành gunpowder |

Không mặc định chọn texture/channel packing của HCFX cho nhóm RPG. Ảnh channel cho thấy một số atlas HCFX lưu dữ liệu khác nhau trong RGB và A; một số texture glow/ring có alpha trắng đặc, còn smoke có hình trong alpha. Phải gắn đúng shader chứ không chuyển hàng loạt sang R hoặc A.

Quan sát source RPG cụ thể: `Muzzle.png` RGB trắng đặc, silhouette chớp nằm trong alpha; `SmokeHarsh.png` cũng có RGB trắng và hình khói trong alpha. `GroundCracks_Radial.png` và `Tx_Impact_radial_01.png` có mask trong RGB nhưng alpha đặc. Đây là bằng chứng pixel, chưa xác nhận shader đang lấy đúng channel ở runtime. Thay toàn bộ material bằng một phép lấy R sẽ làm mất hình của Muzzle/SmokeHarsh; lấy alpha cho mọi texture cũng sẽ làm mất mask của các ảnh alpha đặc.

## Điều kiện để chuyển sang dựng

Chốt project đích/camera/model hoặc ảnh pháo để đo muzzle/hit scale và chọn hình ảnh. Xử lý riêng blocker compile nếu muốn audit Unity tại project nguồn; không coi sửa framework là phạm vi đã duyệt. Hoàn tất shader/channel/streams và playback trên pipeline đích, rồi chốt bảng assets cụ thể ở `AssetPlan_v1_Pending.md`. Chỉ sau phê duyệt đúng plan/version mới tạo/sửa runtime assets. Không cần xin duyệt lại nhánh “pháo thuốc súng stylized”.

Mobile: ưu tiên thử bộ muzzle + một impact, giữ transparent area nhỏ, tránh chồng nhiều glow/smoke. Chưa đo overdraw, texture memory, batches hoặc GPU trên thiết bị mục tiêu; không có cam kết FPS và không đánh giá chi phí chỉ từ số PS.

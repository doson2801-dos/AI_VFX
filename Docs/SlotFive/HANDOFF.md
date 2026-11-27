# Slot Five: bàn giao để làm lại bằng Unity (2026-11-27)

Người dùng quyết định làm lại prototype **Slot Five** bằng Unity, trong dự án này (máy Linux, nhánh `master` có đủ asset). Bản Phaser ở repo cùng tên, nhánh `game-ai-prototype` (thư mục `I:\Game_AI` trên máy Windows `DESKTOP-MUUEIFA`), được **giữ làm bản tham chiếu** và không phát triển tiếp.

Thư mục này nằm trên nhánh `unity-slot-five`, tách từ `main`. Đọc hết các file trong thư mục trước khi bắt đầu.

| File | Nội dung |
|---|---|
| `brief.md` | Brief bản 5, là nguồn sự thật về luật chơi, tiêu chí và câu hỏi mở. Phần "Thay đổi bản 4/5" ở cuối mục 6 tóm tắt lịch sử thiết kế. |
| `production.md` | Bảng tiến độ của bản Phaser: cơ chế nào đã đạt, quyết định của người dùng theo ngày. |
| `research_icon_rates.md` | Nghiên cứu thị trường về tỉ lệ icon trong game slot chiến đấu. Đây là lý do demo chỉ có một hệ. |
| `reference/slotFiveLogic.ts.txt` | Logic thuần đã qua QA (RNG, rút lưới, chấm chuỗi, trận, mô phỏng). Port sang C# theo file này. |
| `reference/config.ts.txt` | `TUNING` và `TUNING_RANGES` hiện hành (khóa `sf*`). |
| `reference/slotFiveVfx.ts.txt` | Manifest 16 VFX flipbook của bản Phaser, chỉ để biết danh sách hiệu ứng. |

## Game là gì (tóm tắt, chi tiết ở `brief.md`)
- Slot đối kháng, màn hình **dọc** 540x960. Khung quay **4x4** ở trên. Hai nhân vật ở hai bên phía dưới. Panel dưới cùng có nút QUAY hình bầu dục, nút Nhanh, nút "?" (chú giải) và nút Trận mới. Giữa khung quay và nhân vật để khoảng trống cho chiêu bay xuống.
- Hai bên **luân phiên quay**. Người chơi chỉ bấm quay, không có lựa chọn nào khác. Hết máu thì thua.
- Chuỗi là 3 hoặc 4 icon giống nhau liên tiếp theo ngang, dọc hoặc chéo (14 đường). Chuỗi dài 4 có hệ số x2. Mỗi chuỗi có hiệu quả riêng.
- **Demo chỉ có một hệ là Sét.** Lưới có 5 loại icon: Sét, Kiếm, Hồi máu, Khiên, May mắn (chưa có tác dụng, buff làm sau). Về sau hệ sẽ đi theo trang bị: Băng, Sét, Lửa, Nước, Đất.
- Mỗi chuỗi bắn một viên (cast) từ lưới bay tới nhân vật. Thanh máu chỉ đổi khi viên trúng.
- Có chế độ **quay nhanh** (hệ số thời gian 0,35), không có autoplay.
- Mục tiêu cân bằng: trận trung vị **5–7 phút**, ≥ 60% lượt có sát thương, ≥ 15% lượt có chuỗi Sét, người chơi thắng 50–60%, lật ngược 15–40%.

## Trạng thái của bản tham chiếu
- **Đã qua QA (Phaser), verify 559/559:** C1–C12 trên lưới 4x4 với 8 icon, gồm cast chiêu, tune 5–7 phút (`sfBHeal` 50, `sfFoeMaxHp` 440), quay nhanh và VFX.
- **Đang dở khi chuyển sang Unity:** C13 (bộ icon theo hệ, chỉ Sét) và C14 (tune lại cho 5 icon). `config.ts.txt` đã có giá trị đầu bản 5 (`sfElement` 1, `sfWElement` 22, Kiếm 36, Hồi 15, Khiên 15, May mắn 12), nhưng **chưa được QA kiểm**.
- Producer mô phỏng 200.000 lưới với bộ trọng số đó và đo được: Sét có chuỗi 19,4% lượt, lượt có sát thương 63,7%, lượt trắng 27,5%. Chưa mô phỏng cả trận.

## Việc khi port sang Unity
1. **Logic tách khỏi MonoBehaviour**, giống `slotFiveLogic.ts`: RNG mulberry32 có seed, tách luồng `init`/`spin`. Mỗi lượt rút 16 ô theo cột trước. Chấm chuỗi theo đúng thứ tự trong brief. Trận theo thứ tự 7 bước ở mục 4.5. Có mô phỏng nhiều trận. Port đúng thuật toán để cùng seed thì cùng kết quả như bản Phaser, vì các fixture F0–F13 trong brief dùng được làm test EditMode.
2. **Thông số** đặt trong một ScriptableObject hoặc class cấu hình, đủ các khóa `sf*` và khoảng tune. Không để số trong code.
3. **Test** dùng Unity Test Framework thay cho Playwright: fixture F0–F13, mô phỏng C10/C14. Test PlayMode dùng cho nhịp và lịch cast. Tiêu chí đo được giữ như brief.
4. **VFX** làm theo `/vfx-shader` hoặc `/vfx-code` và luật art lead của dự án này, không chép flipbook của bản Phaser. Danh sách 16 hiệu ứng cần có:
   - đạn cast cho 7 loại;
   - va chạm cho 7 loại;
   - khiên chặn đòn;
   - lóe chuỗi.

   Demo chỉ cần những hiệu ứng thuộc 5 icon đang dùng.
5. **Thứ tự đề xuất:** logic và test → scene layout dọc, điều khiển (phím và chạm) → diễn hoạt quay và cast → tune (C14) → quay nhanh → VFX.

## Câu hỏi còn mở (từ brief)
- Q1: khắc hệ.
- Q3: trần lượt hoặc hòa.
- Q4: chỉ số riêng cho đối thủ.
- Q5: layout ngang.
- Q7: một nhân vật mang một hệ hay nhiều hệ khi có trang bị.

## Chưa quyết, cần người dùng chốt khi bắt đầu bên Unity
- **Code game C# để ở đâu.** Luật git của dự án này là `main` chỉ có kiến thức, còn code và asset của `Assets/` ở `master` trên máy và không push. Nhánh `unity-slot-five` hiện chỉ chứa thư mục `Docs/SlotFive/` này.
- **Đội agent:** đội Phaser (Producer, Game Designer, Gameplay Programmer, QA, Balance Tuner) dùng skill riêng cho Phaser và Playwright. Bên Unity cần quy trình tương ứng hoặc dùng agent sẵn có của dự án (`vfx-artist`, `vfx-director`).

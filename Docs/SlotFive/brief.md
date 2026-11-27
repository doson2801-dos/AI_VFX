# Game Brief: Slot Five (tên tạm)

> **Bản 4 (hiện hành): lưới 4x4, trận dài 5 đến 7 phút.** Người dùng thấy 5 cột khó chơi và ít ra đòn tấn công. Bản này đổi sang lưới 4 cột x 4 hàng, đặt mục tiêu trung vị một trận 5 đến 7 phút, hạ sát thương mỗi chuỗi và tăng máu. Phần việc mới là C9 (chuyển sang 4x4) và C10 (tune thời lượng trận). Mọi thay đổi so với bản 3 được liệt kê ở mục "Thay đổi bản 4" cuối mục 6. Luật lượt, máu, khiên, thứ tự xử lý, layout dọc và cast chiêu giữ nguyên.
>
> **Bản 4.1:** người dùng trả lời Q6 là "Thêm quay nhanh". Thêm cơ chế C11, làm sau C10, xem mục 4.11. Đây là luật đề xuất do Producer chọn mặc định.
>
> **Bản 5 (hiện hành, chưa làm): bộ icon theo hệ.** Người dùng chốt sau khi đọc phương án C trong `reports/Tỉ lệ icon game slot chiến đấu.md`.
> - Hệ của chiêu nguyên tố sau này sẽ đến từ trang bị. Các hệ dự kiến: Băng, Sét, Lửa, Nước, Đất.
> - Bản demo chỉ dùng **một hệ là Sét**. Lưới chỉ có 5 loại icon: Sét, Kiếm, Hồi máu, Khiên, May mắn. Đối thủ dùng cùng bộ icon này.
> - Phần việc mới: C13 (bộ icon theo hệ) và C14 (tune lại, thay C10). Danh sách thay đổi ở mục "Thay đổi bản 5" cuối mục 6.
> - Luật chuỗi, lượt, máu, khiên, layout, cast, quay nhanh và VFX giữ nguyên.
>
> **Bản 4.2, VFX (chưa làm):** theo yêu cầu người dùng, thêm cơ chế C12 VFX gồm đạn cast theo loại, va chạm trên nhân vật, hiệu ứng chặn, và lóe sáng chuỗi thắng. Mọi VFX là flipbook sinh bằng code qua skill `phaser-vfx`. VFX chỉ là hình ảnh, không đổi lịch thời gian, logic hay RNG. Đặc tả ở mục 4.12, tiêu chí ở C12.
>
> **Trạng thái nghiệm thu bản 4.1 (theo kết luận QA):**
> - C1 đến C7 bản 4 đạt. C8 đạt 9/9. C9 đạt 6/6. C10 đạt 8/8, C10.9 đã ghi số. C11 đạt 11/11, C11.12 đã ghi số.
> - Còn chờ người dùng duyệt ảnh C8.10 (C6.8 đã được thay bằng tiêu chí này).
> - `npm run verify` đạt, 542/542 test.
> - Giá trị sau tune và số đo ở mục 5.5. Điểm còn tồn ở cuối mục 6.
> - Mục 9 và Q1, Q3, Q4, Q5 vẫn để người dùng trả lời.
>
> **Lịch sử:**
> - Bản 1: slot credit/RTP, đã bỏ.
> - Bản 2: slot đối kháng trên lưới 5x4, màn ngang. QA đã nghiệm thu C1 đến C6.7.
> - Bản 3: layout dọc 540x960 và cast chiêu (C7, C8). Đang làm C8 trên lưới 5x4.
> - Các tiêu chí có số liệu phụ thuộc lưới 5x4 được mở lại hoặc thay ở bản 4. Từng chỗ có ghi chú.

## 1. Câu hỏi cần trả lời
Lưới 4x4 biến chuỗi 3+ icon thành sát thương, hồi máu hoặc khiên. Hai bên luân phiên quay cho tới khi một bên hết máu. Câu hỏi:

- Ít nhất 60% số lượt có gây sát thương không?
- Trung vị một trận có dài 5 đến 7 phút không?
- Trận có còn kịch tính không? Nghĩa là 15% đến 40% số trận bị lật ngược theo định nghĩa ở C10, và người chơi đi trước thắng 50% đến 60% trước một đối thủ dùng cùng luật.
- Nếu đạt, một trận dài như vậy mà người chơi chỉ bấm quay có giữ được người chơi tới cuối và khiến họ muốn đấu tiếp không?

Phần đo được nằm ở C10, chạy bằng mô phỏng. Câu hỏi về sự hấp dẫn do người chơi thật đánh giá ở mục 9.

## 2. Core loop
Tới lượt mình thì bấm quay → 4 cột dừng lần lượt → chuỗi thắng sáng lên, mỗi chuỗi bắn một viên xuống nhân vật: gây sát thương lên đối thủ, hoặc hồi máu và dựng khiên cho mình → đối thủ tự quay đánh lại → lặp cho tới khi một bên hết máu → bắt đầu trận mới.

## 3. Điều khiển
Trò chơi theo lượt. Người chơi chỉ điều khiển lượt của mình, lượt của đối thủ tự chạy. Ba nút `#btn-left`, `#btn-right`, `#btn-jump` bị ẩn trong Slot Five. Các nút `#sf-*` hiện trên mọi thiết bị.

| Hành động | Bàn phím | Cảm ứng / chuột |
|---|---|---|
| Quay (lượt của người chơi) | Space hoặc Enter | Nút `#sf-spin` hình bầu dục, ở giữa panel dưới |
| Trận mới | R, dùng được mọi lúc trừ khi đang `spinning`. Sau khi trận kết thúc, Enter cũng dùng được | Nút nhỏ `#sf-new` bên phải nút quay, luôn hiện, được làm nổi bật khi trận kết thúc |
| Mở hoặc đóng bảng chú giải icon | H hoặc `?` để bật/tắt, Esc để đóng | Nút `#sf-help` ("?") ở mép trái panel để bật/tắt, nút `#sf-help-close` trong bảng để đóng |
| Bật hoặc tắt quay nhanh (bản 4.1) | F | Nút công tắc `#sf-fast` ("Nhanh") nằm giữa nút "?" và nút quay, có `aria-pressed` theo trạng thái |

- Công tắc Nhanh dùng được ở mọi `phase`, kể cả `ended`. Nó không phải lệnh quay nên không bao giờ bị từ chối và không đổi `rejectedSpins`. Quy tắc áp dụng ở mục 4.11.

- Lệnh quay chỉ được nhận khi `turn === 'player'`, `phase === 'idle'` và `status === 'playing'`. Các trường hợp khác bị bỏ, không xếp hàng, và ghi `lastReject`.
- Giữ phím không lặp lại lệnh. Tự động lặp của hệ điều hành bị lọc.
- Nút `#sf-spin` mờ đi khi không tới lượt người chơi.
- Bảng chú giải đóng sẵn khi vào trận. Bảng không chặn lệnh nào, và **tự đóng khi một lượt quay bắt đầu**, dù là lượt của bên nào.
- Các nút `#sf-*` chỉ hiện trong Slot Five.

## 4. Luật chơi
- Điều kiện thắng: máu đối thủ về 0 sau một lượt quay của người chơi.
- Điều kiện thua: máu người chơi về 0 sau một lượt quay của đối thủ.
- Không có hòa. Mỗi lượt chỉ gây sát thương lên bên kia và không bên nào tự gây sát thương cho mình, nên trận dừng ngay ở lượt có một bên về 0.
- Không có điểm, credit hay mức cược. Kết quả là thắng hoặc thua.

### 4.1. Lưới, icon và hệ tọa độ
- Lưới **`4` cột x `4` hàng** (bản 2 và 3 là 5x4), cố định, không tune. `x` tăng sang phải từ 0 đến 3, `y` tăng xuống dưới từ 0 đến 3. `grid[y][x]` là chỉ số icon.
- Thứ tự quét chuẩn: `y` tăng dần, trong cùng hàng thì `x` tăng dần.
- Có 8 icon, đều là hình học placeholder tự đặt. Mỗi icon có hình riêng để không phụ thuộc màu.

| Chỉ số | Khóa | Tên hiển thị | Loại hiệu ứng | Hình placeholder gợi ý |
|---:|---|---|---|---|
| 0 | `fire` | Lửa | `damage` | Tam giác đỏ |
| 1 | `volt` | Điện | `damage` | Tia gấp khúc vàng |
| 2 | `frost` | Băng | `damage` | Lục giác xanh nhạt |
| 3 | `earth` | Đất | `damage` | Vuông nâu |
| 4 | `blade` | Kiếm | `damage` | Thanh chéo xám |
| 5 | `heal` | Hồi máu | `heal` | Dấu cộng xanh lá |
| 6 | `shield` | Khiên | `shield` | Nửa hình tròn xanh dương |
| 7 | `lucky` | May mắn | `none` | Ngôi sao trắng |

- **Không khắc hệ.** Bốn hệ và Kiếm đều chỉ gây sát thương thẳng, khác nhau ở trọng số và sát thương gốc. Xem Q1.
- **May mắn chưa có hiệu ứng.** Icon vẫn tạo chuỗi, được highlight và ghi vào `lastChains` với `kind: 'none'`, `value: 0`. Không bắn viên cast. Buff chỉ số đặc biệt làm sau. Bản 5 giữ nguyên vai trò này và **không** biến May mắn thành wild (phương án A2 của báo cáo).

#### 4.1.1. Bộ icon theo hệ (bản 5)
- **Ô nguyên tố.** Bốn icon 0 đến 3 (Lửa, Sét, Băng, Đất) là các hệ có thể chiếm "ô nguyên tố" trên lưới. Mỗi trận chỉ có **một** hệ được dùng, chọn bằng khóa `sfElement`: 0 là Lửa, 1 là Sét, 2 là Băng, 3 là Đất. Bản demo dùng `sfElement = 1` (Sét). Icon 1 có khóa `volt`, tên hiển thị đổi từ "Điện" thành "Sét".
- **Bộ icon đang dùng** là `activeIcons = [sfElement, 4, 5, 6, 7]`, xếp theo chỉ số tăng dần. Với bản demo, bộ này là `[1, 4, 5, 6, 7]`. Ba hệ còn lại **không bao giờ** được RNG sinh ra.
- **Giữ nguyên cho các hệ chưa dùng:** chỉ số icon, code hiệu ứng, sheet VFX (`sf_proj_*`, `sf_hit_*`) và giá trị gốc `sfB<Tên>`. Đổi hệ chỉ cần đổi `sfElement`, không phải sửa code.
- **Trọng số ô nguyên tố** là một khóa chung `sfWElement`, áp cho hệ đang dùng. Bốn khóa `sfWFire`, `sfWVolt`, `sfWFrost`, `sfWEarth` bị bỏ. Nhờ vậy, đổi hệ không làm đổi phân bố lưới, chỉ đổi giá trị đòn.
- **Đối thủ** dùng cùng `activeIcons` và cùng hệ với người chơi, vì hai bên dùng chung luồng RNG và chung bảng rút.
- **Nước** là hệ tương lai. Bản 5 chỉ ghi lại, chưa có chỉ số icon, khóa hay sheet. Khi làm Nước, cần thêm icon mới vào bảng 4.1 bằng một brief sau.
- `evaluate` vẫn nhận đủ 8 icon 0 đến 7, nên fixture có Lửa, Băng, Đất vẫn dùng được để kiểm logic. `forceNextGrid` và `BattleSetup.grids` (chỉ có ở bản dev) cũng vẫn nhận đủ 8 icon.
- Hệ thống trang bị, việc chọn đồ, và việc gán hệ theo nhân vật hay kẻ địch để sau, xem mục 6 "Không làm".

### 4.2. Sinh lưới
- Mỗi ô được rút **độc lập** theo trọng số `sfW<Tên>` (số nguyên). Không dùng dải cuộn.
- Rút **16 ô theo cột trước** (bản 2 và 3 là 20 ô): `x` từ 0 đến 3, trong mỗi cột `y` từ 0 đến 3. Với mỗi ô, lấy `r = rng.int(tổng trọng số)`, rồi duyệt icon từ 0 đến 7 và chọn icon đầu tiên có tổng trọng số cộng dồn lớn hơn `r`.
  - **Bản 5:** bảng rút chỉ gồm `activeIcons`, theo thứ tự chỉ số tăng dần, với trọng số `[sfWElement, sfWBlade, sfWHeal, sfWShield, sfWLucky]`. Tổng trọng số là tổng 5 giá trị này. Hệ không dùng bị loại khỏi bảng rút, không chỉ là trọng số 0.
  - Ô nguyên tố luôn đứng đầu bảng vì chỉ số hệ (0 đến 3) nhỏ hơn 4. Vì vậy, với cùng seed, đổi `sfElement` chỉ đổi icon tại đúng những ô nguyên tố, các ô khác giữ nguyên.
  - `sfElement` được chụp lại khi bắt đầu trận, cùng với `TUNING`.
- PRNG là `mulberry32`, trạng thái `uint32`. `next()` trả về số trong `[0, 1)`, và `int(n) = floor(next() * n)`.
- Có hai luồng: `init = 0` cho lưới hiển thị lúc vào trận, `spin = 1` cho mọi lượt quay. Hạt của luồng `k` là `(seed + Math.imul(k + 1, 0x9E3779B9)) >>> 0`.
- **Người chơi và đối thủ dùng chung luồng `spin`.** Lượt quay thứ `n` của trận lấy lưới thứ `n` của luồng. `spinIndex = n` đếm từ 0, gộp cả hai bên. `n` chẵn là lượt người chơi, `n` lẻ là lượt đối thủ.
- Lưới của lượt `n` chỉ phụ thuộc `seed`, trọng số và `n`. Logic không dùng `Math.random`. **Không có điều chỉnh kết quả theo máu hay chuỗi thua.**
- Kết quả do logic thuần quyết định ngay khi lệnh quay được nhận, trước mọi diễn hoạt.
- `forceNextGrid` và `BattleSetup.grids` vẫn rút rồi bỏ 16 số RNG cho mỗi lượt bị ép. Lưới ép không phải 4x4 thì ném lỗi.

### 4.3. Chuỗi
- **Đường** là dãy ô thẳng hàng dài ít nhất 3 ô. Trên lưới 4x4 có **14 đường**:

| `dir` | Bước | Số đường | Độ dài theo thứ tự ô đầu (thứ tự quét) |
|---|---|---:|---|
| `h` (ngang) | `(x+1, y)` | 4 | 4, 4, 4, 4 |
| `v` (dọc) | `(x, y+1)` | 4 | 4, 4, 4, 4 |
| `dr` (chéo xuống phải) | `(x+1, y+1)` | 3 | ô đầu `(0,0)` dài 4, `(1,0)` dài 3, `(0,1)` dài 3 |
| `ur` (chéo lên phải) | `(x+1, y-1)` | 3 | ô đầu `(0,2)` dài 3, `(0,3)` dài 4, `(1,3)` dài 3 |

  Tổng cộng có 10 đường dài 4 và 4 đường dài 3. Đường chéo dài 1 hoặc 2 ô bị bỏ.
- **Chuỗi** là đoạn liên tiếp **tối đa** gồm các ô cùng icon trên một đường, dài ít nhất 3. Đoạn dài 4 chỉ tính **một** chuỗi, không tính thêm đoạn con. Không còn chuỗi dài 5.
- Mỗi chuỗi được tính độc lập. Một ô nằm trong nhiều chuỗi thì góp vào **mỗi** chuỗi đó.
- Thứ tự chuỗi trong `lastChains`: xếp theo `dir` lần lượt `h`, `v`, `dr`, `ur`. Trong cùng hướng, xếp theo ô đầu của chuỗi theo thứ tự quét. Ô trong chuỗi liệt kê theo bước của hướng: `h`, `dr`, `ur` theo `x` tăng, còn `v` theo `y` tăng.

### 4.4. Hiệu ứng theo độ dài chuỗi
- Giá trị một chuỗi: `value = sfB<Tên> * mult(length)`, với `mult(3) = 1` và `mult(4) = sfLen4Mult`. **Khóa `sfLen5Mult` bị bỏ** khỏi `TUNING` và `TUNING_RANGES`, vì lưới 4x4 không có chuỗi dài 5. Mọi giá trị đều là số nguyên.
- Tổng hiệu ứng một lượt:
  - `damage`: tổng `value` các chuỗi Lửa, Điện, Băng, Đất và Kiếm.
  - `heal`: tổng `value` các chuỗi Hồi máu.
  - `shield`: tổng `value` các chuỗi Khiên.
- "Càng nhiều icon gần nhau càng mạnh" được thực hiện bằng đúng hai cách:
  1. Chuỗi dài 4 được nhân hệ số.
  2. Mỗi chuỗi được cộng riêng. Cụm hình chữ thập hoặc cụm chéo tự tạo ra nhiều chuỗi chồng ô.
- Không có thưởng combo và không có trần mỗi lượt.

### 4.5. Máu, khiên và thứ tự xử lý một lượt
Mỗi bên có `hp`, `maxHp` và `shield`. Khi vào trận, `hp = maxHp` và `shield = 0`. Gọi A là bên đang quay, B là bên kia.

1. **Kiểm tra.** Trận đã kết thúc thì từ chối với `lastReject = 'ended'`, không rút RNG.
2. **Khiên của A hết hạn:** `A.shield = 0`.
3. **Quay:** rút lưới, `evaluate`, lấy được `damage`, `heal`, `shield`. `spinIndex += 1`.
4. **Hồi máu cho A:** `A.hp = min(A.maxHp, A.hp + heal)`.
5. **Dựng khiên cho A:** `A.shield = shield`.
6. **Sát thương lên B:**
   - `absorbed = min(B.shield, damage)`
   - `B.shield -= absorbed`
   - `hpLoss = min(B.hp, damage - absorbed)`
   - `B.hp -= hpLoss`
7. **Kết lượt:** nếu `B.hp === 0` thì A thắng: `status` là `won` khi A là người chơi, `lost` khi A là đối thủ. Nếu chưa, quyền quay chuyển sang B.

Hệ quả:

- Hồi máu và khiên áp cho bên quay, sát thương áp cho bên kia. Vì vậy thứ tự các bước 4, 5, 6 chỉ quyết định thứ tự diễn hoạt, không đổi kết quả.
- Khiên chỉ chặn lượt tấn công kế tiếp của đối thủ và không cộng dồn qua các lượt.
- Khiên dựng trong một lượt không chặn sát thương của chính lượt đó.
- Lượt hạ đối thủ vẫn áp đủ hồi máu và khiên cho bên quay.

### 4.6. Kỳ vọng lý thuyết (bản 4)
Các ô độc lập. Với một icon, đặt `p = w / tổng trọng số` và `q = 1 - p`. Lưới 4x4 có 10 đường dài 4 và 4 đường dài 3:

```text
E3 = p^3 * (4 + 20q)      // 4 đường dài 3 cho 4p^3; 10 đường dài 4 cho 2p^3q mỗi đường
E4 = 10 * p^4
kỳ vọng value của icon = sfB * (E3 + sfLen4Mult * E4)
```

Kết quả tính tay với giá trị đầu ở mục 5.1, **chưa mô phỏng**:

| Icon | `p` | `E3 + E4` (chuỗi/lượt) | Kỳ vọng value/lượt |
|---|---:|---:|---:|
| Kiếm | 0,40 | 1,280 | 7,680 sát thương |
| Lửa, Đất (mỗi icon) | 0,08 | 0,0119 | 0,1229 sát thương |
| Điện, Băng (mỗi icon) | 0,06 | 0,0051 | 0,0778 sát thương |
| Hồi máu | 0,13 | 0,0499 | 1,0546 hồi máu |
| Khiên | 0,13 | 0,0499 | 1,0546 khiên |
| May mắn | 0,06 | 0,0051 | 0 |

- **Tổng mỗi lượt:** `damage ≈ 8,08`, `heal ≈ 1,05`, `shield ≈ 1,05`.
- **Số chuỗi sát thương kỳ vọng mỗi lượt ≈ 1,31.** Xấp xỉ Poisson cho tỉ lệ lượt có sát thương khoảng 73%. Thực tế sẽ thấp hơn vì chuỗi Kiếm chồng ô nhau, ước tính 60% đến 70%. Mô phỏng ở C10 quyết định.
- **Ước tính thô độ dài trận:**
  - Máu mất ròng khoảng 6,3 mỗi lượt sau khi trừ khiên và hồi máu.
  - Với 450 máu, mỗi bên cần khoảng 70 lượt, tổng khoảng 140 lượt.
  - Mỗi lượt khoảng 2,7 s, nên một trận khoảng 6,3 phút.
- Nếu `analyticEffects()` lệch các số trên quá 0,05, cần kiểm tra lại cả brief lẫn code.
- **Đánh đổi của bảng giá trị đầu:**
  - Để đạt tỉ lệ ra đòn cao trên lưới ít đường, trọng số dồn vào Kiếm.
  - Bốn hệ trở thành đòn hiếm, mỗi hệ có chuỗi ở khoảng 0,5% đến 1,2% số lượt.
  - Đây là điểm Balance Tuner được phép chỉnh, và cũng là điểm người chơi cần đánh giá ở mục 9.

#### 4.6.1. Kỳ vọng bản 5 (demo một hệ Sét)
Dùng cùng công thức, với `p` tính trên tổng trọng số của 5 icon đang dùng (100). Ba hệ không dùng có `p = 0`. Kết quả tính tay theo `BRIEF_TUNING` bản 5 (mục 5.6), **chưa mô phỏng trận**:

| Icon | `p` | `E3 + E4` (chuỗi/lượt) | Kỳ vọng value/lượt |
|---|---:|---:|---:|
| Sét (`sfWElement` 22, `sfBVolt` 15) | 0,22 | 0,2321 | 3,833 sát thương |
| Kiếm (36, 5) | 0,36 | 0,9518 | 5,599 sát thương |
| Hồi máu (15, 20) | 0,15 | 0,0759 | 1,620 hồi máu |
| Khiên (15, 20) | 0,15 | 0,0759 | 1,620 khiên |
| May mắn (12) | 0,12 | 0,0394 | 0 |

- Tổng mỗi lượt: `damage ≈ 9,43`, `heal ≈ 1,62`, `shield ≈ 1,62`.
- Producer mô phỏng 200.000 lưới và có các số sau:
  - lượt có chuỗi Sét: 19,4%;
  - lượt có chuỗi Kiếm: 51%;
  - lượt có sát thương: 63,7%;
  - lượt trắng: 27,5%.
- Hai phương án đã so và không chọn:
  - Sét 25, Kiếm 30: Sét ra ở 26% số lượt, nhưng lượt có sát thương chỉ 55%, dưới mục tiêu 0,60.
  - Sét 20, Kiếm 34: Sét 16%, lượt có sát thương 57%.

### 4.7. Phase, đối thủ và diễn hoạt
- Các `phase`:
  - `idle`: chờ người chơi bấm quay.
  - `spinning`: các cột đang quay.
  - `resolving`: highlight và cast.
  - `foeWait`: chờ trước khi đối thủ tự quay.
  - `ended`: trận đã kết thúc.
- Lượt người chơi: `idle` → `spinning` → `resolving` → `ended` nếu trận kết thúc, nếu không thì sang `foeWait`.
- Lượt đối thủ: `foeWait` kéo dài `sfFoeDelayMs` → `spinning` → `resolving` → `ended` nếu trận kết thúc, nếu không thì về `idle`.
- Trong `spinning`, cột `i` dừng sau `sfSpinBaseMs + i * sfReelStopGapMs`. Thời lượng quay là `lastSpinMs = sfSpinBaseMs + 3 * sfReelStopGapMs`. Bản 4 có 4 cột nên hệ số là 3; với giá trị đầu, `lastSpinMs` là 1240 ms (bản 3 là 1420 ms).
- `resolving` bắt đầu khi cột cuối dừng và kéo dài `lastResolveMs` theo mục 4.10. Thanh máu và khiên hiển thị chỉ đổi khi viên cast trúng.
- Highlight bị xóa khi lượt quay kế tiếp bắt đầu.
- Trong lúc quay, cột hiển thị icon chạy ngẫu nhiên chỉ để trang trí và không đọc RNG của logic. Khi dừng, cột hiện đúng icon trong `grid`.
- Hai nhân vật placeholder đứng dưới lưới, người chơi bên trái, đối thủ bên phải. Vị trí cụ thể ở mục 4.9.

### 4.8. Trận và seed
- Trận thứ `k` trong phiên (đếm từ 0) dùng `seed = sfSeed + k`. Trận mới đặt lại `hp`, `shield`, `spinIndex = 0`, `status = 'playing'`, `turn = 'player'`, `phase = 'idle'`.
- `TUNING` được chụp lại khi bắt đầu trận.

### 4.9. Layout dọc (bản 4, cho lưới 4x4)
- **Độ phân giải thiết kế là 540x960, màn dọc.** Tọa độ tính bằng pixel game, gốc ở góc trên trái.
- **Co giãn:** Phaser `Scale.FIT` với `autoCenter: CENTER_BOTH`. Trên màn ngang hoặc desktop, game hiện thành một cột dọc ở giữa, hai bên là letterbox. `layout.scale` là số pixel CSS ứng với 1 pixel game; ví dụ khoảng 0,722 ở viewport 390x844 và 0,75 ở 1280x720.
- Chỉ Slot Five dùng 540x960. Các game khác giữ 960x540.
- Khung quay bản 4 gần vuông và ô to hơn bản 3 (96 so với 88), gần với bản vẽ hơn. Để giữ khoảng trống cast từ 15% trở lên, chỉ báo lượt và khung quay dịch lên, còn nhân vật thấp đi 16 px.

| Vùng | Khóa trong `layout.boxes` | Hộp `x, y, w, h` | Ghi chú |
|---|---|---|---|
| Chỉ báo lượt | `turnBanner` | 120, 774, 300, 40 | **Unity bản 5.2 (2026-11-27, art lead chọn):** chuyển xuống mép trên panel để nhường chỗ khung vàng. Bản 4 là 120, 16, 300, 40 |
| Khung quay | `reelFrame` | 68, 4, 404, 505 | **Unity bản 5.3 (2026-11-27):** panel là `background.png` của bộ `fantasy-slot-assets` (1280x1600, có sẵn viền vàng) hiển thị tỉ lệ 404/1280; icon dọc 256x320 → ô ≈ 81x101, đặt đúng như `preview.png` (ô đầu ở (88, 115) px ảnh, bước cột 282, bước hàng 348). Bản 5.2: 76, 66, 388, 390 ô 80x80 + khung vàng riêng. Bản 4 là 57, 64, 426, 426 với ô 96x96; bản 3 là 26, 72, 488, 394 |
| Vùng số nổi người chơi | `playerFloat` | 16, 536, 160, 90 | Bản 4. Bản 3 có y = 520 |
| Vùng số nổi đối thủ | `foeFloat` | 364, 536, 160, 90 | Bản 4. Bản 3 có y = 520 |
| Nhân vật người chơi | `playerFighter` | 40, 636, 64, 88 | Bản 4. Bản 3 là 40, 620, 64, 104 |
| Nhân vật đối thủ | `foeFighter` | 436, 636, 64, 88 | Bản 4. Bản 3 là 436, 620, 64, 104 |
| HUD người chơi | `playerHud` | 16, 732, 200, 28 | Không đổi |
| HUD đối thủ | `foeHud` | 324, 732, 200, 28 | Không đổi |
| Panel dưới | `panel` | 0, 768, 540, 192 | Không đổi, bằng 1/5 chiều cao |
| Nút "?" | `helpBtn` | 20, 832, 64, 64 | Bản 4.1 dời sang trái; bản 3 và 4 là 60, 832, 64, 64 |
| Nút Nhanh | `fastBtn` | 96, 832, 64, 64 | Bản 4.1. `#sf-fast`, chữ "Nhanh". Trạng thái bật có nền khác hẳn trạng thái tắt |
| Nút quay | `spinBtn` | 170, 820, 200, 88 | Không đổi |
| Nút trận mới | `newBtn` | 400, 832, 96, 64 | Không đổi |
| Bảng chú giải (khi mở) | `legend` | 68, 4, 404, 505 (Unity 5.3, trùng panel quay; bản 4 là 57, 64, 426, 426) | Bản 4. Trùng `reelFrame`, nút đóng 64x64 ở góc trên phải |

- **Panel dưới, bản 4.1:** nút "?" ở x 20 đến 84, nút Nhanh ở x 96 đến 160, nút quay ở x 170 đến 370, nút trận mới ở x 400 đến 496. Các nút cách nhau ít nhất 10 px. Ở 390x844, các nút 64x64 có kích thước khoảng 46x46 px CSS, đủ mức 44 px.
- **Tâm ô `(x, y)`** ≈ `(136,2 + 89x, 90,8 + 109,8y)` từ Unity bản 5.3 (tính từ số đo ảnh × 404/1280). Bản 5.2 là `(138 + 88x, 128 + 88y)`, bản 4 là `(117 + 102x, 124 + 102y)`.
- **Khoảng trống cast** đi từ đáy `reelFrame` (y = 490) tới đỉnh nhân vật (y = 636), cao 146 px, bằng 15,2% chiều cao màn. **Unity bản 5.3:** từ đáy panel quay (y = 509) tới 636, cao 127 px = 13,2% (art lead chấp nhận dưới mức 15% từ bản 5.2). Trong khoảng này chỉ có viên cast và số nổi.
- Số nổi chỉ nằm trong vùng `*Float` của bên nhận, nên không đè lên lưới.
- Nút `#sf-*` là DOM. Vị trí nút là hộp tương ứng nhân `scale`, cộng độ lệch của canvas.
- **Chữ:** chữ HUD tối thiểu 17 px game. Số máu và chỉ báo lượt tối thiểu 22 px game. Tương phản tối thiểu 4,5:1 theo WCAG.

### 4.10. Cast chiêu
Logic không đổi. Cast là lớp hình ảnh phát lại `lastChains` và `lastEffects`, không phụ thuộc kích thước lưới ngoài tọa độ tâm ô.

- Mỗi chuỗi có `kind !== 'none'` bắn đúng một viên. Chuỗi May mắn không bắn.
- Viên `damage` bay tới nhân vật bên **không** quay. Viên `heal` và `shield` bay tới bên vừa quay.
- Bản 3 và 4 vẽ viên bằng Phaser Graphics, màu theo icon. Từ bản 4.2, viên dùng flipbook theo loại như mục 4.12. Đường bay, điểm đầu, điểm cuối và lịch bắn không đổi.
- Viên xuất phát ở trung bình tâm các ô của chuỗi và đích là tâm hộp `*Fighter` của bên nhận. Viên bay thẳng với tốc độ đều.
- Thứ tự bắn: hồi máu, rồi khiên, rồi sát thương. Trong cùng loại, giữ thứ tự của `lastChains`. `k` là thứ tự bắn tính từ 0, `n` là số viên.
- Viên `k` được bắn lúc `launchMs = sfCastDelayMs + k * sfCastStaggerMs`, tính từ lúc vào `resolving`, và trúng lúc `impactMs = launchMs + sfCastFlightMs`.
- Thời lượng `resolving`:

```text
lastChains rỗng:        sfBlankResolveMs
có chuỗi nhưng n === 0: sfResolveMs
n >= 1:                 max(sfResolveMs, sfCastDelayMs + (n - 1) * sfCastStaggerMs + sfCastFlightMs + sfCastTailMs)
```

- **Khi viên trúng:**
  - Hồi máu: `displayHp` của bên quay tăng `min(value, maxHp - displayHp)`.
  - Khiên: `displayShield` của bên quay tăng `value`.
  - Sát thương: trừ `displayShield` của bên nhận trước, phần còn lại trừ `displayHp`. Cả hai kẹp ở 0.
  - Mỗi viên trúng hiện số nổi trong vùng `*Float` của bên nhận.
- Sau viên cuối, giá trị hiển thị khớp logic. `displayShield` của bên quay về 0 ngay khi lượt quay bắt đầu. Kết quả trận chỉ hiện sau viên cuối.

### 4.11. Quay nhanh (bản 4.1, luật đề xuất)
- **Công tắc:** `fastMode` mặc định là `false`. Phím F hoặc nút `#sf-fast` đảo trạng thái.
  - Trạng thái được giữ khi sang trận mới (R, Enter, `#sf-new`, `loadMatch`).
  - Trạng thái không được lưu: tải lại trang thì về `false`.
  - Giữ phím F không lặp lệnh.
- **Hệ số thời gian:** khi một lượt dùng chế độ nhanh, `timeScale = sfFastFactor`; ngược lại `timeScale = 1`. Mỗi khóa thời gian được co thành `eff(k) = Math.round(k * timeScale)`. Các khóa bị co:
  - quay và dừng cột: `sfSpinBaseMs`, `sfReelStopGapMs`, `sfStopBounceMs`;
  - resolving: `sfResolveMs`, `sfBlankResolveMs`;
  - cast: `sfCastDelayMs`, `sfCastStaggerMs`, `sfCastFlightMs`, `sfCastTailMs`;
  - chờ đối thủ: `sfFoeDelayMs`.
  
  Mọi công thức ở mục 4.7 và 4.10 giữ nguyên, chỉ thay mỗi khóa bằng `eff(khóa)`. Ví dụ `lastSpinMs = eff(sfSpinBaseMs) + 3 * eff(sfReelStopGapMs)`.
- **Hình ảnh:** tốc độ cuộn hiển thị bằng `sfReelSpeed / timeScale`. Các tween phụ như nảy cột và số nổi cũng co theo `timeScale`. Phần này chỉ là hình ảnh, không có tiêu chí thời gian riêng.
- **Không đổi:** luật, RNG, lưới, kết quả, thứ tự cast, và việc thanh máu chỉ đổi khi viên trúng.
- **Không có autoplay.** Lượt của người chơi vẫn phải bấm quay.
- **Khi nào thay đổi có hiệu lực:** chế độ được chụp lại ở **đầu mỗi lượt** và dùng nguyên cho cả lượt đó.
  - Lượt người chơi bắt đầu khi vào `spinning`.
  - Lượt đối thủ bắt đầu khi vào `foeWait`, và hệ số đó áp cho cả `foeWait`, `spinning`, `resolving` của lượt.
  - Đổi công tắc giữa lượt chỉ cập nhật `fastMode`. `lastTimeScale` của lượt đang chạy không đổi, và thay đổi áp từ lượt sau.
  - Lựa chọn khác là áp ngay từ pha kế tiếp. Lựa chọn này không được dùng vì làm lịch cast của lượt đang chạy khó kiểm.
- **Thời lượng ước tính khi bật Nhanh:** dùng cùng công thức `estMatchMs` ở mục 5.3 với các khóa đã co. Thời gian bấm giả định 600 ms không co. Mục tiêu 5 đến 7 phút ở C10 vẫn đo ở tốc độ thường. Số đo khi bật Nhanh chỉ để ghi lại.
- Với `sfFastFactor = 0,35` và khoảng 140 lượt, ước tính mỗi lượt khoảng 1,1 s, tức một trận khoảng 2,5 phút. Con số này chưa mô phỏng.

### 4.12. VFX (bản 4.2, đề xuất của Producer)
**Nguyên tắc:**
- VFX chỉ là lớp hình ảnh, không đổi state đã có, lịch thời gian, logic hay RNG.
- Mọi mốc thời gian lấy từ lịch của mục 4.10, sau khi đã co theo `lastTimeScale`. Tốc độ phát flipbook nhân với `1 / lastTimeScale`, nên ở chế độ Nhanh hiệu ứng ngắn lại theo đúng hệ số.
- Flipbook sinh bằng code theo skill `phaser-vfx`. Sheet đặt ở `public/vfx/<thư mục>/` (gồm `T_*.png` và `.json`), cạnh dài mỗi sheet ≤ 1024 px.

**Danh sách key**, tên key trùng tên file `.json`. Thư mục dùng dấu gạch ngang, ví dụ `sf_proj_fire` nằm ở `public/vfx/sf-proj-fire/`.

| Key | Loại | Lặp | Khi phát | Kích thước hiển thị (px game) | Gợi ý hình |
|---|---|---|---|---|---|
| `sf_proj_fire` | đạn | có | từ `launchMs` tới `impactMs` của viên Lửa | 64x64, tối thiểu 56 | Cầu lửa có đuôi |
| `sf_proj_volt` | đạn | có | như trên, viên Điện | 64x64 | Quả cầu điện, tia nhỏ chớp quanh |
| `sf_proj_frost` | đạn | có | như trên, viên Băng | 64x64 | Mảnh băng nhọn, xoay theo hướng bay |
| `sf_proj_earth` | đạn | có | như trên, viên Đất | 64x64 | Khối đá xoay chậm |
| `sf_proj_blade` | đạn | có | như trên, viên Kiếm | 64x64 | Lưỡi chém hình cung xoay |
| `sf_proj_heal` | đạn | có | như trên, viên Hồi máu | 64x64 | Đốm sáng xanh lá có quầng |
| `sf_proj_shield` | đạn | có | như trên, viên Khiên | 64x64 | Vòng sáng xanh dương |
| `sf_hit_fire` | va chạm | không | tại `impactMs`, tâm `*Fighter` của đích | tối đa 120x104, tối thiểu 72 | Nổ lửa |
| `sf_hit_volt` | va chạm | không | như trên | như trên | Giật điện |
| `sf_hit_frost` | va chạm | không | như trên | như trên | Vỡ băng |
| `sf_hit_earth` | va chạm | không | như trên | như trên | Bụi đá |
| `sf_hit_blade` | va chạm | không | như trên | như trên | Vệt chém |
| `sf_hit_heal` | va chạm | không | như trên, ở bên quay | như trên | Hạt hồi máu bay lên |
| `sf_hit_shield` | va chạm | không | như trên, ở bên quay | như trên | Bong bóng khiên bật lên |
| `sf_block` | chặn | không | tại `impactMs` của viên sát thương có phần bị khiên hấp thụ lớn hơn 0, đè lên `sf_hit_*` | 96x96 | Mặt khiên lóe, có vết nứt |
| `sf_chain_flash` | lóe chuỗi | không | lúc vào `resolving`, mỗi ô khác nhau thuộc `lastChains` một lần, tô màu theo icon của ô | 96x96, trùng ô | Lóe sáng quét qua ô |

Tổng cộng 16 key.

**Luật phát:**
- Mỗi viên cast có đúng **một** đạn và đúng **một** va chạm `sf_hit_<icon>`. Đạn thay hoàn toàn chấm tròn cũ. Đạn bị hủy đúng lúc va chạm bắt đầu.
- `sf_block` là hiệu ứng phụ, không phải va chạm thứ hai. Nó phát khi phần sát thương của viên đó bị khiên hiển thị hấp thụ lớn hơn 0, tính theo cách áp lần lượt ở mục 4.10.
- Chuỗi May mắn vẫn có lóe chuỗi nhưng không có đạn hay va chạm.
- Va chạm `sf_hit_*` và `sf_block` kéo dài tối đa `eff(sfCastTailMs)`, tức 250 ms ở tốc độ thường. Lóe chuỗi kéo dài tối đa `eff(sfCastDelayMs + sfCastFlightMs)`, tức 500 ms. Mọi VFX của một lượt kết thúc trước khi `resolving` kết thúc.
- Hộp hiển thị của va chạm, tâm ở tâm `*Fighter` (y = 680), cao tối đa 104 px, nên không chạm `*Hud` (y ≥ 732). Bất kỳ VFX nào giao hộp `*Hud` thì phần giao chỉ được kéo dài tối đa 150 ms. Không VFX nào giao `turnBanner` hoặc `panel`.
- **Không gian cho VFX Artist:** nhân vật cao 88 px game. Theo quy ước của skill là 48 px ứng với 2 m, nhân vật khoảng 3,7 m. Kích thước hiển thị ở bảng trên được tính theo pixel game.

**Dung lượng và nhúng:**
- Tổng dung lượng các file `T_sf_*.png` và `sf_*.json` ≤ 1,5 MB (1.572.864 byte). Mã hóa base64 để nhúng vào HTML đơn sẽ tăng khoảng 33%.
- Mọi sheet được nạp qua **một manifest duy nhất** (key → đường dẫn sheet và json). Công cụ đóng gói HTML đơn có thể thay đường dẫn bằng data URI mà không phải sửa chỗ khác. Không tải asset từ origin khác.
- Bản HTML đơn để chơi thử được tạo bằng `npm run pack:single` (`tools/pack-single.mjs`), ra file `artifacts/slot-five-play.html`. Bản này mở được qua `file://` khi không có mạng. Tiêu chí ở C12.14.

## 5. Thông số cần tune
Toàn bộ nằm trong `TUNING` và `TUNING_RANGES` ở `src/config.ts`, tiền tố `sf`. Các số là ước tính tay theo mục 4.6. Balance Tuner chỉnh ở C10.

**Ghi chú cho test:** hằng `BRIEF_TUNING` trong test ghim bảng giá trị đầu của brief để tính fixture. Ở bản 4, `BRIEF_TUNING` **phải cập nhật theo các bảng 5.1 và 5.2 dưới đây**, đồng thời bỏ `sfLen5Mult`. Các số trong bảng fixture ở mục 8 đều tính theo `BRIEF_TUNING` bản 4.

**Bản 5:** `BRIEF_TUNING` phải cập nhật thêm theo mục 5.6:
- thêm `sfElement` và `sfWElement`;
- bỏ `sfWFire`, `sfWVolt`, `sfWFrost`, `sfWEarth`;
- đổi trọng số Kiếm, Hồi máu, Khiên, May mắn.

Giá trị gốc `sfB*`, `sfLen4Mult` và máu trong `BRIEF_TUNING` giữ như bản 4. Vì vậy mọi số của fixture F0 đến F13 không đổi.

### 5.1. Trọng số và giá trị gốc (bản 4)
| Chỉ số | Icon | `sfW<Tên>` | `sfB<Tên>` | Bản 3 (W / B) |
|---:|---|---:|---:|---|
| 0 | Fire (Lửa) | 8 | 10 | 14 / 30 |
| 1 | Volt (Điện) | 6 | 15 | 12 / 45 |
| 2 | Frost (Băng) | 6 | 15 | 12 / 45 |
| 3 | Earth (Đất) | 8 | 10 | 14 / 30 |
| 4 | Blade (Kiếm) | 40 | 5 | 18 / 20 (sau tune bản 2: 24 / 15) |
| 5 | Heal (Hồi máu) | 13 | 20 | 10 / 30 |
| 6 | Shield (Khiên) | 13 | 20 | 12 / 30 |
| 7 | Lucky (May mắn) | 6 | không có | 8 / không có |
| | **Tổng trọng số** | **100** | | |

| Nhóm khóa | Giá trị đầu | Khoảng thử | Bước |
|---|---:|---:|---:|
| `sfW<Tên>` | như bảng trên | 1 đến 60 | 1 |
| `sfB<Tên>` (trừ Lucky) | như bảng trên | 1 đến 120 | 1 |
| `sfLen4Mult` | 2 | 1 đến 6 | 1 |
| `sfLen5Mult` | **bỏ** | | |

Lý do chọn bảng giá trị đầu:

- Lưới 4x4 chỉ có 24 cửa sổ 3 ô, trong khi lưới 5x4 có 34. Xác suất ra chuỗi của một icon tăng theo lũy thừa bậc ba của tỉ lệ xuất hiện, nên trọng số được dồn vào Kiếm (đòn thường) để đạt mục tiêu tỉ lệ ra đòn.
- Bốn hệ thành đòn hiếm nhưng mạnh hơn. Hồi máu và Khiên được tăng trọng số để vẫn xuất hiện.
- Sát thương gốc hạ mạnh để kéo dài trận.
- Ràng buộc khi tune: giữ cặp Lửa bằng Đất và Điện bằng Băng cho tới khi có câu trả lời Q1. Có thể đổi phân bổ giữa Kiếm và các hệ nếu vẫn đạt C10.

### 5.2. Nhân vật và trận
| Tên | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `sfPlayerMaxHp` | 450 | 40 đến 2000 | 10 | Bản 2 và 3 là 100 |
| `sfFoeMaxHp` | 450 | 40 đến 2000 | 10 | Nút chỉnh chính cho tỉ lệ thắng |
| `sfSeed` | 777 | 1 đến 999 | 1 | |

### 5.3. Nhịp diễn hoạt
| Tên | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `sfSpinBaseMs` | 700 ms | 300 đến 1500 | 50 | |
| `sfReelStopGapMs` | 180 ms | 80 đến 400 | 10 | 4 cột, nên có 3 khoảng |
| `sfStopBounceMs` | 120 ms | 0 đến 250 | 10 | |
| `sfReelSpeed` | 2.4 px/ms | 1 đến 5 | 0.1 | |
| `sfResolveMs` | 900 ms | 300 đến 2000 | 100 | |
| `sfBlankResolveMs` | 300 ms | 0 đến 800 | 50 | |
| `sfFoeDelayMs` | 500 ms | 0 đến 1500 | 50 | |
| `sfCastDelayMs` | 150 ms | 0 đến 400 | 10 | |
| `sfCastStaggerMs` | 120 ms | 0 đến 300 | 10 | |
| `sfCastFlightMs` | 350 ms | 150 đến 800 | 10 | |
| `sfCastTailMs` | 250 ms | 0 đến 600 | 10 | |
| `sfFastFactor` | 0.35 | 0.1 đến 1 | 0.05 | Bản 4.1. Hệ số co thời gian khi bật Nhanh (mục 4.11). Giá trị 1 thì Nhanh giống tốc độ thường |

Ước tính thời lượng một trận (`estMatchMs`):

```text
tổng theo mỗi lượt của: lastSpinMs + lastResolveMs
+ số lượt của đối thủ * sfFoeDelayMs
+ số lượt của người chơi * 600   (giả định thời gian bấm)
```

**Từ 5 đến 7 phút suy ra số lượt** như sau:

- **Thời gian trung bình mỗi lượt khoảng 2,7 s**, cộng từ các thành phần:
  - `lastSpinMs` 1240 ms.
  - `lastResolveMs` trung bình khoảng 740 ms: khoảng 30% lượt trắng ở 300 ms, còn lại khoảng 920 ms.
  - Nửa số lượt có thêm 500 ms chờ đối thủ, nửa còn lại có 600 ms bấm.
- **Mục tiêu số lượt:** 300 đến 420 s tương ứng khoảng 110 đến 155 lượt mỗi trận, tính cả hai bên. Làm tròn mục tiêu là `turnsMedian` trong `[110, 160]`.
- **P90:** 540 s (9 phút), tương ứng khoảng 200 lượt. Làm tròn mục tiêu là `turnsP90 <= 225`.
- **Trần mô phỏng:** nâng từ 500 lên **2000 lượt**.
- Các ngưỡng số lượt được suy ra từ ngưỡng thời gian. Nếu sau khi tune, thời gian một lượt khác 2,7 s quá 15% và hai nhóm ngưỡng mâu thuẫn, **ngưỡng thời gian `estMatchMs` được ưu tiên**. Khi đó Producer tính lại khoảng số lượt theo `estMatchMs / thời gian trung bình mỗi lượt`.

### 5.4. Lịch sử tune
- **Bản 2 (lưới 5x4):** đổi `sfBBlade` từ 20 xuống 15 và `sfWBlade` từ 18 lên 24. Số đo trên tập 9001 đến 11000: thắng 0,544, trung vị 11 lượt, P90 20, lật ngược 0,3445 (người chơi 0,308, đối thủ 0,388), `estMatchMs` trung vị 28620, khi đối thủ đi trước người chơi thắng 0,456, `analyticEffects().damage` 15,11.
- Các số này **không còn áp dụng ở bản 4.** Giá trị đang chạy trong `TUNING` phải đặt về bảng bản 4 trước khi Balance Tuner bắt đầu C10.

### 5.5. Giá trị sau tune (bản 4, hiện hành)
Các bảng 5.1 đến 5.3, mục 4.6 và dải ở C2.5 **giữ nguyên giá trị đầu bản 4**, vì test ghim chúng làm `BRIEF_TUNING`. Giá trị mặc định đang chạy trong `TUNING` sau C10:

| Tên | Giá trị đầu (brief) | Sau tune | Lý do |
|---|---:|---:|---|
| `sfBHeal` | 20 | 50 | Đây là nút chỉnh tạo lật ngược: bên đang thua hồi được nhiều máu, nên máu dao động mạnh hơn và trận khó bị quyết định sớm. Đo trên tập tune 1–2000, `comebackRate` lần lượt là 0,103 (20), 0,20 (40), 0,24 (50) và 0,31 (60). Mức 60 có P90 thời lượng 529 s, quá sát trần 540 s, nên chọn 50. Hồi máu cũng kéo trận dài thêm khoảng 40 s, đưa trung vị từ khoảng 306 s ra xa sàn 300 s. Ba hướng khác đã thử nhưng không dùng: `sfBShield` 40 (`comebackRate` 0,102, gần như không đổi); tăng sát thương bốn hệ (chỉ được 0,12 và trận ngắn dưới 300 s); `sfLen4Mult` 4–6 (được 0,17–0,24 nhưng trận chỉ còn 170–220 s) |
| `sfFoeMaxHp` | 450 | 440 | Khi hai bên bằng máu, trận dài làm lợi thế đi trước gần như mất và người chơi chỉ thắng khoảng 0,50. Người dùng đã chấp nhận để đối thủ ít hơn 10 máu |

Các khóa khác giữ giá trị đầu bản 4. `sfFastFactor` giữ 0,35.

Số đo trên tập nghiệm thu 9001 đến 11000 (2000 trận), với giá trị sau tune:

| Chỉ số | Giá trị | Mục tiêu |
|---|---:|---|
| `estMatchMsMedian` / `estMatchMsP90` | 349 s / 471 s | `[300, 420]` s / `<= 540` s |
| `turnsMedian` / `turnsP90` | 136 / 185 | `[110, 160]` / `<= 225` |
| `attackTurnRate` | 0,653 | `>= 0.60` |
| `playerWinRate` (người chơi đi trước) | 0,5385 | `[0.50, 0.60]` |
| `comebackRate` | 0,236 | `[0.15, 0.40]` |
| Thời gian chạy `simulateMatches` | 0,6 s | `< 15` s |
| `playerWinRate` khi đối thủ đi trước | 0,5065 | ghi số |
| `estMatchMsMedianFast` / `estMatchMsP90Fast` (`sfFastFactor` 0,35) | 149 s / 202 s | ghi số |

### 5.6. Bộ icon và trọng số bản 5 (giá trị đầu, `BRIEF_TUNING` bản 5)
| Khóa | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `sfElement` | 1 (Sét) | 0 đến 3 | 1 | Mới. 0 Lửa, 1 Sét, 2 Băng, 3 Đất. Nước chưa có chỉ số |
| `sfWElement` | 22 | 1 đến 60 | 1 | Mới. Trọng số ô nguyên tố, thay cho `sfWFire`, `sfWVolt`, `sfWFrost`, `sfWEarth` (bị bỏ) |
| `sfWBlade` | 36 | 1 đến 60 | 1 | Bản 4 là 40 |
| `sfWHeal` | 15 | 1 đến 60 | 1 | Bản 4 là 13 |
| `sfWShield` | 15 | 1 đến 60 | 1 | Bản 4 là 13 |
| `sfWLucky` | 12 | 1 đến 60 | 1 | Bản 4 là 6 |
| `sfBFire`, `sfBVolt`, `sfBFrost`, `sfBEarth` | 10, 15, 15, 10 | 1 đến 120 | 1 | Giữ cả bốn khóa. Chỉ khóa của hệ đang dùng có tác dụng |
| Các khóa `sfB*` khác, `sfLen4Mult`, máu | như bản 4 | như bản 4 | | |

Tổng trọng số của bộ demo là 100.

**Điểm xuất phát của C14.** Giá trị đang chạy trong `TUNING` khi bắt đầu C14 gồm:
- trọng số bản 5 ở bảng trên;
- giá trị sau tune của bản 4 ở mục 5.5: `sfBHeal` 50, `sfFoeMaxHp` 440 (người dùng đã chấp nhận đối thủ ít hơn 10 máu);
- các khóa còn lại theo bản 4.

**Giá trị gốc của Sét.** Producer ghi "giá trị gốc của Sét giữ 45". Brief đặt **`sfBVolt` = 15** vì:
- 15 là giá trị đầu bản 4, nên đây mới là "giữ nguyên". 45 là giá trị của bản 2 và bản 3.
- Giữ 15 thì không phải đổi số trong các fixture F11, C8.8 và C12.5.
- Tính tay với Sét = 45, sát thương kỳ vọng lên khoảng 17,1 mỗi lượt, gần gấp đôi, nên trận sẽ ngắn còn khoảng 3 phút.

Balance Tuner được chỉnh `sfBVolt` trong khoảng 1 đến 120 ở C14.

## 6. Phạm vi
- Có làm:
  - Slot Five chạy ở `/?game=slot-five`, đồ họa placeholder, màn dọc 540x960 có letterbox.
  - Lưới 4x4, 8 icon có trọng số, quay có seed, chuỗi 3+ theo bốn hướng.
  - Hiệu ứng sát thương, hồi máu và khiên theo độ dài chuỗi.
  - Hai nhân vật, thanh máu, chỉ báo khiên. Hai bên quay luân phiên, đối thủ tự quay, có thắng thua và nút trận mới.
  - Cột dừng lần lượt, highlight chuỗi, cast chiêu đơn giản, số nổi trong vùng riêng, thanh máu chạy.
  - Panel dưới gồm nút quay, nút trận mới, nút "?" và, từ bản 4.1, công tắc Nhanh. Bảng chú giải chỉ mở bằng "?".
  - Bản 4.1: quay nhanh bằng cách co mọi thời gian diễn hoạt theo `sfFastFactor` (mục 4.11).
  - Bản 4.2: VFX flipbook gồm 7 loại đạn cast, 7 loại va chạm, hiệu ứng chặn và lóe chuỗi thắng (mục 4.12).
  - Bản 5: bộ icon theo hệ. Một hệ mỗi trận, chọn bằng `sfElement`. Demo dùng Sét, lưới có 5 loại icon, và bảng chú giải chỉ liệt kê icon đang dùng (mục 4.1.1).
  - Lõi logic thuần, công thức kỳ vọng và mô phỏng nhiều trận.
- Không làm:
  - Buff của icon May mắn. May mắn thành wild (phương án A2). Khắc hệ và kháng hệ. Hiệu ứng theo hệ.
  - Bản 5:
    - Hệ thống trang bị và màn chọn đồ.
    - Gán hệ theo nhân vật hoặc theo kẻ địch.
    - Nhiều hệ cùng lúc trên một lưới.
    - Hệ Nước: chưa có icon, khóa, sheet hay giá trị.
    - Giao diện cho người chơi tự đổi hệ. Hệ chỉ đổi qua `TUNING`.
  - Lựa chọn của người chơi trong lượt, AI đối thủ có chiến thuật, chỉ số nhân vật riêng ngoài máu tối đa.
  - Autoplay, tự quay lượt của người chơi, bỏ qua toàn bộ diễn hoạt, và lưu trạng thái Nhanh sang lần tải trang sau.
  - Credit, cược, RTP, tiền thật, cửa hàng.
  - Wild, scatter, free spin, jackpot, near-miss.
  - Nhiều đối thủ, tiến trình, lưu tiến trình, âm thanh, menu.
  - VFX ngoài danh sách 16 key ở mục 4.12: rung màn, hạt nền, VFX cho icon May mắn, VFX khi thắng hoặc thua trận, VFX khi cột dừng. Layout riêng cho màn ngang.
  - Điều chỉnh kết quả theo máu hay chuỗi thua.
- Coin Hop vẫn là game mặc định. Các route khác giữ nguyên.

### Yêu cầu kỹ thuật
- Logic lưới, chuỗi, hiệu ứng, trận và mô phỏng là module TypeScript thuần, không import Phaser, không đọc DOM.
- Scene Slot Five dùng key `game`. `getState()` của các game khác không đổi.
- Kích thước game chọn theo route: Slot Five 540x960, các game khác 960x540.
- Kích thước lưới (`cols`, `rows`) là hằng số trong logic. Layout tính tâm ô từ hằng số này và từ bảng ở mục 4.9, không viết cứng số 5 hay 20 ở chỗ khác.
- Debug API chỉ có trong bản dev, nằm trong nhóm `window.__game.slotFive`:

```ts
type Dir = 'h' | 'v' | 'dr' | 'ur';
type Kind = 'damage' | 'heal' | 'shield' | 'none';
type Side = 'player' | 'foe';
interface Chain { icon: number; dir: Dir; length: number; cells: [number, number][]; kind: Kind; value: number } // cells là [x, y]
interface Effects { damage: number; heal: number; shield: number }
interface Fighter { hp: number; maxHp: number; shield: number }

interface SlotFiveDebug {
  createSim(seed: number): GridSim;
  forceNextGrid(grid: number[][]): void;        // lưới 4x4; vẫn rút rồi bỏ 16 số RNG
  evaluate(grid: number[][]): { chains: Chain[]; effects: Effects };
  analyticEffects(): Effects;                   // công thức mục 4.6 với TUNING hiện tại
  createBattle(seed: number, setup?: BattleSetup): BattleSim;
  loadMatch(seed: number, setup?: BattleSetup): void;
  spin(): boolean;
  simulateMatches(opts: { seeds: number[]; setup?: BattleSetup }): MatchReport;
  setFastMode(on: boolean): void;               // bản 4.1, giống bấm F tới trạng thái đó
}

interface GridSim { spin(): { spinIndex: number; grid: number[][] } }

interface BattleSetup {
  player?: Partial<Fighter>; foe?: Partial<Fighter>;
  turn?: Side;
  grids?: number[][][];
}

interface BattleSim {
  getState(): { status: 'playing' | 'won' | 'lost'; turn: Side; spinIndex: number; player: Fighter; foe: Fighter };
  spin(): { accepted: boolean; side: Side; grid: number[][]; chains: Chain[]; effects: Effects;
            absorbed: number; hpLoss: number; healed: number };
}

interface MatchReport {
  matches: number;
  playerWinRate: number;
  turnsMedian: number; turnsP10: number; turnsP90: number; turnsMax: number;   // nearest-rank
  comebackRate: number;
  comebackRateByWinner: { player: number; foe: number };
  blankTurnRate: number;      // lượt không có chuỗi nào
  attackTurnRate: number;     // bản 4: lượt có damage > 0
  chainTurnRateByIcon: number[]; // bản 4: tỉ lệ lượt có ít nhất một chuỗi của icon i
  meanDamage: number; meanDamageStdErr: number;
  meanHeal: number; meanShield: number; meanAbsorbed: number;
  estMatchMsMedian: number;
  estMatchMsP90: number;      // bản 4
  meanTurnMs: number;         // bản 4: tổng estMatchMs / tổng số lượt
  estMatchMsMedianFast: number; estMatchMsP90Fast: number; // bản 4.1: cùng công thức, khóa thời gian co theo sfFastFactor
  unfinished: number;         // bản 4: số trận vượt 2000 lượt
}
```

- `healed` là lượng máu thực sự được hồi.
- `createBattle` và `simulateMatches` đọc `TUNING` tại thời điểm gọi.
- Cổng kỹ thuật ngoài mục 8: `npm run verify` đạt, test của các game khác vẫn đạt, không có lỗi console, debug API và bảng tune không lọt vào `dist/`.

### Thay đổi so với bản 1 ảnh hưởng tới C1
Lõi C1 giữ RNG, hai luồng và cách rút từng ô theo cột. Tên icon, khóa trọng số, `createSim` không còn tham số cược, và hai bên dùng chung luồng `spin`. Các điểm này đã làm ở bản 2.

### Thay đổi bản 4
**A. Đặc tả**
1. Lưới đổi từ 5x4 thành 4x4. Mỗi lượt rút 16 ô thay vì 20. Có 14 đường thay vì 17. Không còn chuỗi dài 5.
2. Bỏ `sfLen5Mult`.
3. Công thức `E3`, `E4` và các số kỳ vọng được tính lại (mục 4.6).
4. Bảng trọng số và giá trị gốc mới (5.1). Máu tăng lên 450 (5.2). Khoảng tune mở rộng: `sfW` 1 đến 60, `sfB` 1 đến 120 với bước 1, máu 40 đến 2000.
5. `lastSpinMs` dùng hệ số 3 thay vì 4.
6. Layout 4.9: khung quay 426x426, tâm ô mới, nhân vật cao 88 và đặt ở y = 636, vùng số nổi ở y = 536.
7. Thêm các trường `attackTurnRate`, `chainTurnRateByIcon`, `estMatchMsP90`, `meanTurnMs` vào `MatchReport`. Trần mô phỏng nâng lên 2000 lượt.
8. Fixture F0 đến F12 làm lại cho 4x4 (mục 8).
9. `BRIEF_TUNING` trong test phải cập nhật theo 5.1 và 5.2 bản 4.

**B. Tiêu chí cũ bị thay hoặc mở lại**

| Tiêu chí | Xử lý ở bản 4 |
|---|---|
| C1.2 | Mở lại: `cols === 4` |
| C2.1, C2.2, C2.4, C2.5 | Mở lại với fixture, thứ tự và số kỳ vọng mới |
| C3.3 đến C3.10 | Mở lại với số mới theo `BRIEF_TUNING` bản 4 và trần 2000 lượt |
| C4.1 đến C4.8 | Thay bằng C10. Giữ làm lịch sử bản 2 |
| C6.2 | Mở lại: 4 cột, nên `lastReelStopMs` có 4 phần tử |
| C6.7 | Mở lại: `viewCounts.icons === 16` |
| C7.1, C7.4 | Đổi số theo bảng 4.9 bản 4. Chưa nghiệm thu |
| C8.4, C8.8, C8.9 | Đổi số (tâm ô, giá trị F11, mốc thời lượng). Chưa nghiệm thu |
| C1.1, C1.3 đến C1.8, C2.3, C3.1, C3.2, C3.11, C5, C6.1, C6.3, C6.4, C6.6 | Nội dung không đổi, giữ `[x]`, nhưng phải chạy lại sau C9 |

**C. C8 trên lưới 4x4.** C8 có thể làm tiếp trên lưới 5x4 rồi chuyển sang 4x4 ở C9, vì cast chỉ phụ thuộc:
- tâm ô, lấy từ layout;
- `lastChains`;
- `lastEffects`.

Yêu cầu với Gameplay Programmer:
- Tính tâm ô từ `cols`, `rows` và hộp `reelFrame`, không viết cứng.
- Test C8 lấy số từ fixture và `BRIEF_TUNING`, không viết cứng giá trị bản 3.

Khi C9 xong, chạy lại toàn bộ C8 với số bản 4.

### Giả định đã chọn
- Không khắc hệ. Bốn hệ chỉ khác số liệu theo cặp.
- Đối thủ dùng cùng luật, chỉ khác máu tối đa. Người chơi luôn đi trước.
- Hai bên dùng chung luồng RNG theo `spinIndex`.
- Khiên hết hạn ở đầu lượt kế tiếp của chủ khiên. Hồi máu bị kẹp ở `maxHp`. Hiệu ứng cộng tuyến tính.
- Trận mới dùng seed kế tiếp.
- Không giới hạn số lượt mỗi trận. Mô phỏng cắt ở 2000 lượt chỉ để phát hiện lỗi.
- Bản 4: thời lượng 5 đến 7 phút đo bằng `estMatchMs`, gồm cả diễn hoạt và thời gian bấm giả định. Thời lượng đạt được bằng cách hạ sát thương và tăng máu, không làm chậm diễn hoạt.
- Bản 4: trọng số dồn vào Kiếm để tăng tỉ lệ ra đòn. Bốn hệ thành đòn hiếm.
- Bản 5 (Producer đề xuất):
  - Hệ không dùng bị loại khỏi bảng rút.
  - Một khóa trọng số chung `sfWElement` cho ô nguyên tố.
  - Chọn hệ bằng một khóa số `sfElement`, không dùng danh sách icon tự do. Như vậy luôn đúng 5 icon và `TUNING_RANGES` đơn giản.
  - Giữ `sfBVolt` = 15 theo mục 5.6.
- Cast bay thẳng, tốc độ đều, theo thứ tự hồi máu, khiên, sát thương.
- Bảng chú giải tự đóng khi một lượt quay bắt đầu.

### Quyết định đã chốt
- **Q2:** người chơi chỉ bấm quay.
- **Layout bản 3:** màn dọc, khung quay ở nửa trên, hai nhân vật sát mép, panel dưới chiếm 1/5 chiều cao, có khoảng trống cast. Cast làm ngay. Có nút trận mới nhỏ và nút "?".
- **Bản 4 (người dùng chốt):**
  - Lưới 4 cột x 4 hàng.
  - Trung vị một trận 5 đến 7 phút.
  - Tạm hạ sát thương.
  - Tăng tỉ lệ lượt ra đòn tấn công.
  - Giữ tỉ lệ thắng 0,50 đến 0,60 và tỉ lệ lật ngược 0,15 đến 0,40.
- **Q6 (bản 4.1, người dùng chốt "Thêm quay nhanh"):** có công tắc Nhanh, không có autoplay. Các chi tiết là mặc định Producer đề xuất:
  - nút `#sf-fast` và phím F;
  - trạng thái giữ trong phiên;
  - hệ số `sfFastFactor`;
  - áp dụng từ lượt sau.
- **Bản 5 (người dùng chốt):**
  - Hệ của chiêu nguyên tố sau này đến từ trang bị. Các hệ dự kiến là Băng, Sét, Lửa, Nước, Đất.
  - Demo chỉ dùng hệ Sét. Đối thủ dùng cùng bộ icon và cùng hệ.
  - May mắn giữ vai trò cũ, không thành wild.
  - Trọng số đầu do Producer đề xuất: Sét 22, Kiếm 36, Hồi máu 15, Khiên 15, May mắn 12.
  - Mục tiêu mới: tỉ lệ lượt có chuỗi Sét ≥ 0,15.

### Thay đổi bản 5
**A. Đặc tả**
1. Thêm mục 4.1.1 về bộ icon theo hệ, với `sfElement` và `activeIcons`. Icon 1 đổi tên hiển thị thành "Sét".
2. Bảng rút ở mục 4.2 chỉ gồm `activeIcons`.
3. Trọng số: bỏ bốn khóa `sfW` của các hệ, thêm `sfWElement`, và đổi trọng số Kiếm, Hồi máu, Khiên, May mắn (mục 5.6).
4. Thêm mục 4.6.1 với số kỳ vọng bản 5.
5. Thêm các trường `getState()`: `element`, `activeIcons`, `legendIcons`.
6. Bảng chú giải chỉ liệt kê icon đang dùng.
7. Cập nhật `BRIEF_TUNING` theo mục 5.6. Fixture F0 đến F13 không đổi.

**B. Tiêu chí cũ bị thay hoặc mở lại**

| Tiêu chí | Xử lý ở bản 5 |
|---|---|
| C1.6 | Mở lại: tần suất tính trên `activeIcons` và `sfWElement`. Hệ không dùng có tần suất 0 |
| C2.5 | Mở lại với số bản 5 |
| C7.11 | Mở lại: bảng chú giải liệt kê đúng 5 icon đang dùng thay vì 8 |
| C10.1 đến C10.9 | Thay bằng C14. Giữ làm lịch sử bản 4 |
| C11.12 | Đo lại trong C14.10 |
| C1.1 đến C1.5, C1.7, C1.8, C2.1 đến C2.4, C3, C5, C6, C7 (trừ C7.11), C8, C9, C11.1 đến C11.11, C12 | Nội dung không đổi, nhưng phải chạy lại sau C13. C12.4 vẫn dùng lưới ép có Lửa, Băng, Đất để kiểm VFX |

### Quyết định tạm đã dùng khi làm
QA đã nghiệm thu các điểm sau:

- Lý do từ chối xét theo thứ tự `ended` → `notYourTurn` → `busy`. Trong lúc diễn hoạt, lượt người chơi trả `busy`, lượt đối thủ trả `notYourTurn`.
- R hoặc `#sf-new` trong `foeWait` và `resolving` mở trận mới. Trong `spinning` thì bị chặn.
- Nút mờ vẫn nhận chạm, nhưng lệnh bị từ chối.
- `rejectedSpins` đặt về 0 ở mỗi trận.
- `loadMatch` không tăng `matchIndex`.
- Có bảng chú giải icon. Từ bản 3, bảng chỉ mở bằng nút "?".

### Điểm hiển thị còn tồn từ bản 2
- Số nổi đè lên lưới: xử lý bằng vùng `*Float`, kiểm ở C7.3.
- Chữ nhỏ trên màn dọc: kiểm ở C7.5.
- Tương phản thấp: kiểm ở C7.6.

### Điểm còn tồn sau nghiệm thu bản 4.1
Các điểm này không làm trượt tiêu chí nào ở mục 8. Người dùng xem kèm ảnh C8.10.

- Viên cast nhỏ và mờ. Bản 4.2 xử lý bằng C12, với kích thước đạn tối thiểu 56 px game.
- Trên điện thoại xoay ngang, nút nhỏ hơn 44 px CSS do letterbox. Xem Q5.
- Chữ "Nhanh" nằm sát mép nút `#sf-fast`.
- Bốn hệ rất hiếm: mỗi hệ chỉ ra chuỗi ở khoảng 0,5% đến 1,2% số lượt. Xem Q1 và mục 9.

## 7. Nền tảng đích
Web chung, nhắm điện thoại dọc. Khung thiết kế 540x960, kiểm ở viewport 390x844. Desktop và màn ngang dùng letterbox, xem Q5. Không có giới hạn dung lượng và không tải asset ngoài.

## 8. Tiêu chí hoàn thành (đo được)

### Trường trạng thái của Slot Five
| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `gameId` | `'slot-five'` | |
| `seed`, `matchIndex` | `number` | |
| `cols`, `rows`, `iconCount`, `luckyIcon` | `number` | Bản 4: `4`, `4`, `8`, `7` |
| `grid` | `number[][]` | `grid[y][x]`, 4 hàng x 4 cột |
| `spinIndex` | `number` | Số lượt đã quay trong trận, gộp hai bên |
| `turn` | `'player' \| 'foe'` | |
| `status` | `'playing' \| 'won' \| 'lost'` | |
| `player`, `foe` | `{ hp; maxHp; shield }` | Giá trị logic |
| `displayHp`, `displayShield` | `{ player; foe }` | Giá trị đang hiển thị |
| `lastSide` | `'player' \| 'foe' \| null` | |
| `lastChains` | `Chain[]` | |
| `lastEffects` | `{ damage; heal; shield; absorbed; hpLoss; healed }` | |
| `phase` | `'idle' \| 'spinning' \| 'resolving' \| 'foeWait' \| 'ended'` | |
| `rejectedSpins`, `lastReject` | `number`, `'notYourTurn' \| 'busy' \| 'ended' \| null` | |
| `reelsStopped` | `number` | Từ 0 đến `cols` |
| `lastSpinMs`, `lastResolveMs` | `number` | Theo mục 4.7 và 4.10 |
| `lastReelStopMs` | `number[]` | Có `cols` phần tử |
| `highlightedChainCount`, `highlightedCells` | `number` | |
| `viewCounts` | `{ icons; fighters }` | Bản 4: `icons === 16` |
| `legendOpen` | `boolean` | |
| `element` | `number` | Bản 5. Hệ của trận, bằng `sfElement` đã chụp lại khi bắt đầu trận |
| `activeIcons` | `number[]` | Bản 5. Bộ icon đang dùng, tăng dần. Demo là `[1, 4, 5, 6, 7]` |
| `legendIcons` | `number[]` | Bản 5. Icon đang được liệt kê trong bảng chú giải, theo thứ tự hiển thị. Rỗng khi bảng đóng |
| `fastMode` | `boolean` | Bản 4.1. Trạng thái công tắc Nhanh |
| `lastTimeScale` | `number` | Bản 4.1. Hệ số đã chụp cho lượt gần nhất, là `1` hoặc `sfFastFactor` |
| `lastFoeDelayMs` | `number` | Bản 4.1. Thời lượng `foeWait` dự kiến của lượt đối thủ gần nhất, bằng `eff(sfFoeDelayMs)` |
| `lastCasts` | `{ chainIndex; kind; target; from; to; value; launchMs; impactMs; launchedAtMs; impactedAtMs }[]` | Theo mục 4.10 |
| `castsInFlight` | `number` | |
| `floatTexts` | `{ side; text; box }[]` | |
| `layout` | `{ width; height; scale; canvasOffset; boxes; castGap; texts }` | Theo mục 4.9 |

### Fixture lưới dùng chung (bản 4, lưới 4x4)
**B** là `grid[y][x] = (x + 2y) % 4`, chỉ dùng icon 0 đến 3 và không có chuỗi nào. **C** là `grid[y][x] = 4 + (x + 2y) % 4`, chỉ dùng icon 4 đến 7 và cũng không có chuỗi nào.

```text
B:  y0: 0 1 2 3     C:  y0: 4 5 6 7
    y1: 2 3 0 1         y1: 6 7 4 5
    y2: 0 1 2 3         y2: 4 5 6 7
    y3: 2 3 0 1         y3: 6 7 4 5
```

Mỗi fixture là một lưới nền với một số ô ghi đè, dạng `(x, y) = icon`. Icon ghi đè không có trong lưới nền, nên chuỗi chỉ có thể tạo thành từ các ô ghi đè. Số trong ngoặc tính theo `BRIEF_TUNING` bản 4; test phải tự tính lại từ bảng này.

| Mã | Nền | Ô ghi đè | Kết quả mong đợi |
|---|---|---|---|
| F0 | B | không có | 0 chuỗi, mọi hiệu ứng bằng 0 |
| F1 | B | `(0,0) (1,0) (2,0) = 4` | 1 chuỗi `h`, Kiếm, dài 3, `damage = sfBBlade` (5) |
| F2 | B | `(0,2)` đến `(3,2) = 5` | Đúng 1 chuỗi `h`, Hồi máu, dài 4, không có chuỗi con dài 3, `heal = sfBHeal * sfLen4Mult` (40) |
| F3 | B | `(1,1) (2,1) (3,1) = 6` | 1 chuỗi `h`, Khiên, dài 3, `shield` (20) |
| F4 | B | `(2,0)` đến `(2,3) = 7` | 1 chuỗi `v`, May mắn, dài 4, `kind: 'none'`, `value: 0` |
| F5 | B | `(0,0) (1,1) (2,2) (3,3) = 4` | 1 chuỗi `dr`, Kiếm, dài 4, `damage` (10) |
| F6 | B | `(0,3) (1,2) (2,1) = 5` | 1 chuỗi `ur`, Hồi máu, dài 3, ô `[[0,3],[1,2],[2,1]]`, `heal` (20) |
| F7 | B | `(0,1) (1,1) (2,1) (1,0) (1,2) = 6` | 2 chuỗi Khiên dài 3, `h` trước `v`, cùng chứa `(1,1)`, 5 ô khác nhau, `shield` (40) |
| F8 | B | `(0,0) (1,0) = 4` | 0 chuỗi |
| F9 | B | `(0,3) (1,3) (3,3) = 4` | 0 chuỗi, đoạn bị ngăn bởi `(2,3)` |
| F10 | C | `(0,0) (1,0) (2,0) = 0` | 1 chuỗi Lửa dài 3, `damage` (10) |
| F11 | C | `(0,0) (1,0) (2,0) = 1`; `(0,3)` đến `(3,3) = 3` | Điện dài 3 rồi Đất dài 4, `damage = 15 + 20` (35) |
| F12 | B | `(0,0) (1,0) (2,0) = 4`; `(1,3) (2,3) (3,3) = 5`; `(3,0) (3,1) (3,2) = 6` | `damage` (5), `heal` (20), `shield` (20) |
| F13 | C | `(0,0) (1,0) (2,0) = 2` | Bản 4.2. 1 chuỗi Băng dài 3, `damage` (15). Dùng cho C12 |

### Danh sách cơ chế theo thứ tự phụ thuộc
C1 đến C8 được giữ, ghi chú theo bảng "Thay đổi bản 4". Sau C8 là C9 rồi C10. Tiêu chí đánh `[ ]` kèm chữ "Bản 4" là tiêu chí phải làm lại.

#### C1. Lõi lưới có seed
- [x] C1.1. Khi mở `/`, `/?game=khac`, `/?game=arc-relay`, `/?game=gatefall`, thì `getState()` của từng game giống hệt trước khi có Slot Five.
- [x] C1.2. **Bản 4.** Khi mở `/?game=slot-five`, thì `gameId === 'slot-five'`, `cols === 4`, `rows === 4`, `iconCount === 8`, `luckyIcon === 7`, `spinIndex === 0`, và `grid` có 4 hàng x 4 cột với mọi giá trị trong `[0, 8)`.
- [x] C1.3. Hai sim cùng seed quay 1000 lượt thì `grid` giống nhau ở từng lượt, trên seed 1 đến 50.
- [x] C1.4. Lưới thứ `n` chỉ phụ thuộc `seed` và `spinIndex`. Chèn các thao tác không phải quay vào giữa không làm đổi lưới.
- [x] C1.5. Hai sim seed 1 và 2 khác `grid` ở ít nhất 990 trong 1000 lượt đầu.
- [ ] C1.6. **Mở lại ở bản 5.** Trên 100.000 lượt `createSim` (seed 9001 đến 9010), tỉ lệ của từng icon trong `activeIcons` lệch trọng số của nó chia tổng (ô nguyên tố dùng `sfWElement`) không quá 0,003. Mọi icon ngoài `activeIcons` có tỉ lệ đúng bằng 0. Bản 4 đã đạt với 8 icon.
- [x] C1.7. Khi tạm đặt `sfWShield = 0`, thì 10.000 lượt không có icon 6. Test khôi phục giá trị sau đó.
- [x] C1.8. Khi `forceNextGrid(F1)` rồi quay, thì `grid` là F1, và lượt kế tiếp giống sim không bị ép.

#### C2. Chuỗi và hiệu ứng
- [x] C2.1. **Bản 4.** Khi `evaluate` từng fixture F0 đến F12 bản 4, thì số chuỗi, `icon`, `dir`, `length`, `cells`, `kind`, `value` và `effects` khớp bảng fixture.
- [x] C2.2. **Bản 4.** Khi `evaluate` lưới toàn icon 4, thì có 14 chuỗi theo thứ tự mục 4.3:
  - 4 chuỗi `h` dài 4;
  - 4 chuỗi `v` dài 4;
  - 3 chuỗi `dr` dài lần lượt 4, 3, 3 (ô đầu `(0,0)`, `(1,0)`, `(0,1)`);
  - 3 chuỗi `ur` dài lần lượt 3, 4, 3 (ô đầu `(0,2)`, `(0,3)`, `(1,3)`).

  `damage = sfBBlade * (10 * sfLen4Mult + 4)`, ra 120 với `BRIEF_TUNING` bản 4.
- [x] C2.3. `evaluate` 10.000 lưới từ sim seed 1 khớp bộ kiểm tra vét cạn, và `effects` bằng tổng `value` theo `kind`.
- [x] C2.4. **Bản 4.** Với mọi lưới ở C2.3, mọi giá trị đều là số nguyên không âm, mọi chuỗi có `length` thuộc `{3, 4}`, và chuỗi icon 7 có `kind === 'none'`, `value === 0`.
- [ ] C2.5. **Mở lại ở bản 5.** Với `BRIEF_TUNING` bản 5, `analyticEffects()` cho `damage` trong `[9.38, 9.48]`, `heal` trong `[1.57, 1.67]`, `shield` trong `[1.57, 1.67]`. Bản 4 đã đạt với `damage` trong `[8.03, 8.13]` và `heal`, `shield` trong `[1.00, 1.10]`.

#### C3. Trận đấu luân phiên, máu và khiên
Số dưới đây tính theo `BRIEF_TUNING` bản 4, test phải tính lại từ bảng đó.

- [x] C3.1. Khi vào trận, `status === 'playing'`, `turn === 'player'`, máu đầy, khiên bằng 0.
- [x] C3.2. `spinIndex` chẵn là người chơi, lẻ là đối thủ, và lưới lượt `n` khớp `createSim(seed)`.
- [x] C3.3. **Bản 4.** Khi `foe.shield = 3` và người chơi quay F1, thì `absorbed === 3`, `hpLoss === 2`, `foe.shield === 0`.
- [x] C3.4. **Bản 4.** Khi `foe.shield = 50` và người chơi quay F1, thì `foe.hp` không đổi và `foe.shield === 45`. Đối thủ quay F0 tiếp theo thì `foe.shield === 0`.
- [x] C3.5. **Bản 4.** Khi `player.hp = sfPlayerMaxHp - 10`, `player.shield = 25` và người chơi quay F12, thì `player.hp === sfPlayerMaxHp`, `healed === 10`, `player.shield === 20` (không phải 45), và `foe.hp` giảm 5.
- [x] C3.6. **Bản 4.** Khi người chơi quay F3 (khiên 20), rồi đối thủ quay F5 (sát thương 10), thì `absorbed === 10`, `player.hp` không đổi, `player.shield === 10`.
- [x] C3.7. **Bản 4.** Khi `foe.hp = 5` và người chơi quay F1, thì `status === 'won'`, `foe.hp === 0`. Lệnh quay sau đó bị từ chối và không rút RNG.
- [x] C3.8. **Bản 4.** Khi `foe.hp = 3`, `player.hp = 100` và người chơi quay F12, thì `status === 'won'`, `player.hp === 120`, `player.shield === 20`.
- [x] C3.9. **Bản 4.** Khi `player.hp = 4`, `player.shield = 0`, `turn = 'foe'` và đối thủ quay F1, thì `status === 'lost'`, `player.hp === 0`.
- [x] C3.10. **Bản 4.** Với 2000 trận sim (seed 1 đến 2000) dùng giá trị đầu bản 4, mọi trận kết thúc trước 2000 lượt. Luôn có `0 <= hp <= maxHp` và `shield >= 0`. Khi trận kết thúc, đúng một bên có `hp === 0`.
- [x] C3.11. Chạy cùng seed và cùng `BattleSetup` hai lần cho kết quả giống hệt nhau.

#### C4. Mô phỏng cân bằng (bản 2, lưới 5x4, đã thay bằng C10)
QA đã nghiệm thu C4.1 đến C4.8 trên lưới 5x4. Số đo nằm ở mục 5.4. Bản 4 **không** dùng các tiêu chí C4 nữa. Định nghĩa lật ngược và phân vị được chuyển nguyên sang C10.

#### C5. Điều khiển và lượt đối thủ trong scene
Nội dung không đổi. Chạy lại sau C9.

- [x] C5.1. Bấm Space ở lượt người chơi thì người chơi quay, đối thủ tự quay tiếp, rồi `phase` về `idle`.
- [x] C5.2. Enter cho kết quả giống C5.1.
- [x] C5.3. Quay trong `foeWait` bị từ chối với `lastReject === 'notYourTurn'`.
- [x] C5.4. Giữ Space 800 ms chỉ tạo một lượt.
- [x] C5.5. 10 lượt chơi qua scene khớp `createBattle(sfSeed)`.
- [x] C5.6. Hết trận thì `phase === 'ended'`. Enter hoặc R mở trận mới với `seed === sfSeed + matchIndex`.
- [x] C5.7. R giữa trận cho kết quả giống C5.6.
- [x] C5.8. Chạm `#sf-spin` và `#sf-new` cho kết quả giống phím tương ứng.
- [x] C5.9. Nút của game khác bị ẩn trong Slot Five, và nút `#sf-*` chỉ hiện trong Slot Five.
- [x] C5.10. Chơi bằng Space và chơi bằng chạm trên cùng seed cho cùng kết quả cuối.

#### C6. Diễn hoạt và HUD máu
- [x] C6.1. Ngay khi lượt quay bắt đầu, `phase === 'spinning'`, `reelsStopped === 0`, và kết quả logic đã có sẵn.
- [x] C6.2. **Bản 4.** `lastReelStopMs` có 4 phần tử tăng dần. Phần tử đầu trong `[sfSpinBaseMs - 30, sfSpinBaseMs + 60]`, các khoảng cách nằm trong `sfReelStopGapMs ± 40`.
- [x] C6.3. Lệnh quay trong `spinning` hoặc `resolving` bị từ chối với `busy` hoặc `notYourTurn`.
- [x] C6.4. Với F7, khi cột cuối dừng thì `highlightedChainCount === 2`, `highlightedCells === 5`. Với F0 thì `highlightedCells === 0`. F7 bản 4 vẫn có 5 ô.
- [x] C6.5. **Mở lại ở bản 3.** Trong `spinning`, `displayHp` bằng máu trước lượt. Không quá `lastResolveMs + 150` ms sau khi vào `resolving`, `displayHp` bằng giá trị logic.
- [x] C6.6. Từ lúc lượt người chơi kết thúc `resolving` tới lúc đối thủ quay mất `sfFoeDelayMs ± 60` ms.
- [x] C6.7. **Bản 4.** Sau mỗi lượt của một trận đầy đủ, `viewCounts.icons === 16`, `viewCounts.fighters === 2`, và không có lỗi console.
- [ ] C6.8. Thay bằng C8.10, không nghiệm thu riêng.

#### C7. Layout dọc, panel dưới và nút "?"
Hộp so theo tọa độ game, sai số ±1 px. Tiêu chí ghi "bản 4" dùng bảng mục 4.9 bản 4.

- [x] C7.1. **Bản 4.** `layout.width === 540`, `layout.height === 960`. Mọi khóa của bảng mục 4.9 (trừ `legend` khi đóng) có mặt và khớp hộp bản 4. Riêng `fastBtn` và vị trí mới của `helpBtn` thuộc bản 4.1 và được kiểm ở C11.11. Trước khi làm C11, `helpBtn` có thể vẫn ở `60, 832, 64, 64`. Các game khác vẫn 960x540.
- [x] C7.2. Không cặp hộp nào chồng nhau, trừ `legend` với `reelFrame` và các nút nằm trong `panel`. Mọi hộp nằm trong màn.
- [x] C7.3. Trong một trận có `loadMatch` ép F12 rồi F11 ở hai lượt đầu, mọi `floatTexts` tại mỗi lần lấy mẫu 50 ms nằm trọn trong `*Float` của bên tương ứng và không giao `reelFrame`.
- [x] C7.4. **Bản 4.** `castGap.top === 490`, `castGap.bottom === 636`, và `castGap.bottom - castGap.top >= 0.15 * layout.height`. Ngoài các hộp `*Float`, không hộp nào giao dải y này.
- [x] C7.5. Ở viewport 390x844, mọi chữ trong `layout.texts` có `fontPx * scale >= 12`. Số máu và chỉ báo lượt có `fontPx >= 22`.
- [x] C7.6. Mọi chữ trong `layout.texts` có tương phản WCAG ít nhất 4,5.
- [x] C7.7. Ở viewport 390x844, `#sf-spin`, `#sf-new`, `#sf-help`, `#sf-help-close` (khi mở) có kích thước ít nhất 44x44 px CSS, và khớp hộp ±2 px. Nút `#sf-fast` được kiểm ở C11.11.
- [x] C7.8. Ở 1280x720 và 844x390, canvas nằm giữa, tỉ lệ 540:960, không tràn ra ngoài viewport, và nút khớp hộp.
- [x] C7.9. Phím H, `?` và Esc mở và đóng bảng chú giải đúng như mục 3.
- [x] C7.10. Chạm `#sf-help` và `#sf-help-close` mở và đóng bảng chú giải đúng như mục 3.
- [ ] C7.11. **Mở lại ở bản 5.** Khi bảng đang mở mà bấm Space, lượt quay được nhận và `legendOpen === false` ngay khi `phase === 'spinning'`. Bảng liệt kê đúng các icon trong `activeIcons`, với demo là 5 icon, mỗi icon kèm loại hiệu ứng và giá trị gốc. Bản 4 đã đạt với 8 icon.
- [x] C7.12. Nút `#sf-help` và `#sf-help-close` không hiện ở các game khác.

#### C8. Cast chiêu
Đang làm trên lưới 5x4. Sau C9, chạy lại toàn bộ C8 với số bản 4. Tâm ô lấy từ layout, không viết cứng.

- [x] C8.1. Với F12 ở lượt người chơi, `lastCasts.length === 3` theo thứ tự `heal`, `shield`, `damage`, và mỗi `chainIndex` trỏ đúng chuỗi.
- [x] C8.2. Viên `heal` và `shield` có `target` là bên quay, viên `damage` có `target` là bên kia. Kiểm ở lượt của cả hai bên.
- [x] C8.3. Với F4: có 1 chuỗi, 0 viên, `lastResolveMs === sfResolveMs`. Với F0: 0 viên, `lastResolveMs === sfBlankResolveMs`.
- [x] C8.4. **Bản 4.** Với F7 có 2 viên `shield`. `from` của mỗi viên bằng trung bình tâm ô của chuỗi, sai số ±1 px, với tâm ô `(x, y)` là `(117 + 102x, 124 + 102y)`. Ở lưới 5x4 của bản 3, công thức là `(82 + 94x, 128 + 94y)`.
- [x] C8.5. `to` bằng tâm hộp `*Fighter` của `target`, sai số ±1 px.
- [x] C8.6. `launchMs` và `impactMs` khớp công thức. Thời điểm đo lệch không quá 40 ms. Thời gian `resolving` thật nằm trong `lastResolveMs ± 60` ms.
- [x] C8.7. Với F12 và `player.hp = 80`, `foe.shield = 0`, giá trị hiển thị chỉ đổi khi từng viên trúng, mỗi lần đúng phần của viên đó, và sau viên cuối khớp logic.
- [x] C8.8. **Bản 4.** Với `foe.shield = 20`, người chơi quay F11 (Điện 15, rồi Đất 20). Sau viên 1: `displayShield.foe === 5`, `displayHp.foe` không đổi. Sau viên 2: `displayShield.foe === 0`, `displayHp.foe` giảm 15. Kết quả cuối khớp `foe.hp` logic. Bản 3 dùng `foe.shield = 30` với Điện 45 và Đất 60.
- [x] C8.9. **Bản 4.** Trong một trận đầy đủ chơi bằng Space, `castsInFlight` về 0 trước khi rời `resolving`. Số viên bằng số chuỗi có `kind !== 'none'`. Kết quả trận hiện sau viên cuối. Không có lỗi console. Phần kiểm thời lượng trận chuyển sang C10.2.
- [ ] C8.10. **Chờ người dùng duyệt ảnh.** Ảnh cho người dùng duyệt, chụp ở 390x844: giữa lúc quay, F12 đang cast, số nổi, bảng chú giải, màn kết thúc, letterbox ở 1280x720. Bản 4 chụp trên lưới 4x4.

#### C9. Chuyển sang lưới 4x4 (bản 4)
Phụ thuộc: C8 (hoặc làm song song nếu C8 chưa xong, xem "Thay đổi bản 4", mục C).

Gồm:
- đổi logic lưới, chuỗi và `analyticEffects`;
- bỏ `sfLen5Mult`;
- cập nhật `TUNING` và `TUNING_RANGES` theo mục 5;
- cập nhật `BRIEF_TUNING` và fixture trong test;
- cập nhật layout theo mục 4.9.

Nghiệm thu C9 là đạt các tiêu chí sau, cộng các tiêu chí ghi "Bản 4" ở C1, C2, C3, C6, C7, C8, và chạy lại xanh mọi tiêu chí còn lại của C1 đến C8.

- [x] C9.1. `cols === 4` là hằng số logic. Mỗi lượt `createSim` rút đúng 16 số: sau một lượt, trạng thái RNG của luồng `spin` bằng trạng thái sau 16 lần gọi `next()` từ cùng hạt.
- [x] C9.2. `sfLen5Mult` không còn trong `TUNING` và `TUNING_RANGES`. Mọi khóa `sfW*`, `sfB*` và máu có giá trị đầu và khoảng thử đúng như mục 5.1 và 5.2.
- [x] C9.3. `BRIEF_TUNING` trong test bằng bảng 5.1 và 5.2 bản 4. Không test nào còn dùng số của bản 2 hay bản 3, ngoại trừ test lịch sử có ghi rõ.
- [x] C9.4. `forceNextGrid` và `BattleSetup.grids` ném lỗi khi lưới không phải 4x4.
- [x] C9.5. Trên 10.000 lưới từ sim seed 1, số chuỗi tối đa mỗi lượt không vượt 14, và không có chuỗi nào có ô ngoài `[0, 3] x [0, 3]`.
- [x] C9.6. Với các lượt ép F0 đến F12 qua scene, `highlightedCells` bằng số ô khác nhau trong `lastChains`, và mọi icon trên lưới hiển thị nằm trọn trong `reelFrame`.

#### C10. Tune thời lượng trận và tỉ lệ ra đòn (bản 4, đã thay bằng C14 ở bản 5)
QA đã nghiệm thu C10 trên bộ 8 icon của bản 4, số đo ở mục 5.5. Bản 5 đổi bộ icon và trọng số nên phải đo lại ở C14. Định nghĩa lật ngược và phân vị dưới đây vẫn dùng cho C14.
Phụ thuộc: C9. Thay thế C4. Balance Tuner chỉ đổi giá trị trong `TUNING`, trong `TUNING_RANGES`.

- **Tập seed nghiệm thu:** 9001 đến 11000, gồm 2000 trận. **Tập seed để tune:** 1 đến 2000. Không tune trên tập nghiệm thu.
- **Lật ngược**, giữ từ bản 2. Gọi W là bên thắng, L là bên thua. Trận có lật ngược khi có ít nhất một lượt, xét sau khi xử lý, thỏa cả hai điều kiện:
  - `spinIndex >= 2`;
  - `5 * (L.hp * W.maxHp - W.hp * L.maxHp) >= W.maxHp * L.maxHp`, tức W bị dẫn ít nhất 20 điểm phần trăm máu.

  `COMEBACK_GAP = 20` là hằng số đo, không nằm trong `TUNING`.
- **Phân vị:** dùng nearest-rank, lấy phần tử ở chỉ số `ceil(k / 100 * n) - 1` của mảng đã sắp xếp tăng.
- **Tỉ lệ ra đòn:** `attackTurnRate` là tỉ lệ lượt có `damage > 0`, tính trên mọi lượt của mọi trận, gộp cả hai bên.
- Mọi ngưỡng dưới đây là **giá trị đề xuất** và có thể đổi.

- [x] C10.1. Trên tập nghiệm thu, `|meanDamage - analyticEffects().damage| <= 3 * meanDamageStdErr`.
- [x] C10.2. **Thời lượng, phép thử chính.** Trên tập nghiệm thu, `estMatchMsMedian` nằm trong `[300000, 420000]` và `estMatchMsP90 <= 540000`.
- [x] C10.3. **Số lượt**, suy ra từ C10.2 theo mục 5.3. Trên tập nghiệm thu, `turnsMedian` nằm trong `[110, 160]` và `turnsP90 <= 225`. Nếu C10.2 đạt nhưng C10.3 trượt vì `meanTurnMs` lệch 2,7 s quá 15%, Producer tính lại khoảng theo mục 5.3 thay vì tune thêm.
- [x] C10.4. **Tỉ lệ ra đòn.** Trên tập nghiệm thu, `attackTurnRate >= 0.60`.
- [x] C10.5. **Tỉ lệ thắng.** Trên tập nghiệm thu, khi người chơi đi trước và hai bên cùng chỉ số, `playerWinRate` nằm trong `[0.50, 0.60]`. **Ghi chú nghiệm thu:** đạt 0,5385 với `sfFoeMaxHp` 440 và `sfPlayerMaxHp` 450, tức đối thủ ít hơn 10 máu, không còn đúng nghĩa "cùng chỉ số". Lý do: khi hai bên bằng máu, trận dài làm mất lợi thế đi trước và người chơi chỉ thắng khoảng 0,50. Người dùng đã chấp nhận chênh lệch này. Xem mục 5.5.
- [x] C10.6. **Kịch tính.** Trên tập nghiệm thu, `comebackRate` nằm trong `[0.15, 0.40]`.
- [x] C10.7. Trên tập nghiệm thu, `unfinished === 0` với trần 2000 lượt. Chạy `simulateMatches` hai lần cho hai `MatchReport` giống hệt nhau.
- [x] C10.8. `simulateMatches` trên 2000 trận chạy xong dưới 15 giây trong trình duyệt test. Bản 2 là 5 giây; nới ra vì trận dài hơn khoảng 12 lần.
- [x] C10.9. **Đã ghi số, xem mục 5.5.** Ghi số, không xét đạt:
  - `blankTurnRate`, `chainTurnRateByIcon`, `meanHeal`, `meanShield`, `meanAbsorbed`, `meanTurnMs`;
  - `turnsP10`, `turnsMax`, `comebackRateByWinner`;
  - `playerWinRate` khi `setup: { turn: 'foe' }`;
  - giá trị `TUNING` sau tune và lý do.

**Luật dừng:** nếu C10.2, C10.4, C10.5 và C10.6 không cùng đạt sau khi tune trên tập seed để tune, Producer dừng và báo người dùng. Không nới ngưỡng để qua test.

**Rủi ro đã biết:**
- Trận dài khoảng 70 lượt mỗi bên làm lợi thế đi trước gần như biến mất, nên `playerWinRate` có thể chỉ khoảng 0,50 đến 0,52, sát cận dưới. Nút chỉnh chính là `sfFoeMaxHp`.
- Tỉ lệ ra đòn cao và trận dài làm máu dao động nhiều lần, nên `comebackRate` có thể vượt 0,40.

#### C11. Quay nhanh (bản 4.1)
Phụ thuộc: C10. Luật theo mục 4.11, layout theo mục 4.9 bản 4.1. Thời gian đo bằng đồng hồ scene. Sai số giống C6 và C8.

- [x] C11.1. **Phím.** Khi vào trận, `fastMode === false`. Bấm F thì `fastMode === true`, bấm F lần nữa thì `false`. Giữ F 800 ms thì `fastMode` chỉ đổi một lần. Mỗi lần bấm F, `rejectedSpins` không đổi.
- [x] C11.2. **Chạm.** Ở viewport cảm ứng 390x844, chạm `#sf-fast` thì `fastMode` đảo trạng thái, và `aria-pressed` của nút bằng `String(fastMode)`. Chạm hai lần thì về trạng thái ban đầu.
- [x] C11.3. **Giữ trong phiên.** Khi `fastMode === true`, mở trận mới bằng R, bằng Enter sau khi trận kết thúc, bằng chạm `#sf-new` và bằng `loadMatch`, thì `fastMode` vẫn là `true`. Tải lại trang thì `fastMode === false`.
- [x] C11.4. **Quay và dừng cột.** Bật Nhanh trước lượt người chơi rồi quay. Khi đó:
  - `lastTimeScale === sfFastFactor`;
  - `lastSpinMs === eff(sfSpinBaseMs) + 3 * eff(sfReelStopGapMs)`;
  - `lastReelStopMs` có 4 phần tử tăng dần, phần tử đầu nằm trong `[eff(sfSpinBaseMs) - 30, eff(sfSpinBaseMs) + 60]`, mỗi khoảng cách nằm trong `eff(sfReelStopGapMs) ± 40`.
- [x] C11.5. **Resolving và cast.** Bật Nhanh, ép F12 ở lượt người chơi. Khi đó:
  - `lastResolveMs` khớp công thức ở mục 4.10 với các khóa `eff(...)`, và thời gian `resolving` thật nằm trong `lastResolveMs ± 60` ms;
  - có 3 viên, theo thứ tự `heal`, `shield`, `damage`;
  - `launchMs` và `impactMs` khớp lịch đã co, thời điểm đo lệch không quá 40 ms;
  - giá trị hiển thị chỉ đổi khi từng viên trúng, như C8.7.

  Ép F0 thì `lastResolveMs === eff(sfBlankResolveMs)`.
- [x] C11.6. **Chờ đối thủ.** Bật Nhanh trước khi lượt người chơi kết thúc. Khi đó `lastFoeDelayMs === eff(sfFoeDelayMs)`, và khoảng từ cuối `resolving` của người chơi tới lúc đối thủ bắt đầu quay nằm trong `eff(sfFoeDelayMs) ± 60` ms.
- [x] C11.7. **Kết quả không đổi.** Chơi hết một trận chỉ bằng Space với `fastMode === false`, rồi `loadMatch` cùng seed và chơi lại với `fastMode === true`. Sau mỗi lượt, `grid`, `lastChains`, `lastEffects`, `player`, `foe` giống nhau, và `status`, `spinIndex` cuối giống nhau. Kiểm trên seed `sfSeed` và hai seed khác.
- [x] C11.8. **Đổi giữa lượt áp từ lượt sau.**
  - Đang ở tốc độ thường, bấm F trong `spinning` của lượt người chơi: `fastMode === true`, nhưng lượt đó vẫn có `lastTimeScale === 1` và `lastReelStopMs` theo lịch thường. Lượt đối thủ kế tiếp, tính từ `foeWait`, có `lastTimeScale === sfFastFactor`.
  - Bấm F lần nữa trong `foeWait`: lượt đối thủ đó vẫn chạy nhanh hết lượt, và lượt người chơi kế tiếp có `lastTimeScale === 1`.
- [x] C11.9. **Luật nhập liệu không đổi.** Khi bật Nhanh, quay trong `spinning` hoặc `resolving` vẫn bị từ chối với `busy` hoặc `notYourTurn` như C6.3. Bấm F khi `phase === 'ended'` vẫn đổi `fastMode`. Không có lượt nào của người chơi tự chạy nếu không bấm quay: chờ 5 giây ở `idle` thì `spinIndex` không đổi.
- [x] C11.10. **Hệ số 1.** Khi `sfFastFactor = 1`, bật Nhanh thì `lastSpinMs`, `lastResolveMs` và `lastFoeDelayMs` bằng đúng giá trị ở tốc độ thường. Test khôi phục `TUNING` sau khi chạy.
- [x] C11.11. **Layout.**
  - `layout.boxes.fastBtn` bằng `96, 832, 64, 64`; `helpBtn` bằng `20, 832, 64, 64`.
  - C7.2 vẫn đạt với `fastBtn`: không chồng hộp nào khác ngoài `panel`.
  - Ở 390x844, `#sf-fast` có kích thước ít nhất 44x44 px CSS và khớp hộp ±2 px.
  - Chữ "Nhanh" đạt C7.5 và C7.6 ở cả trạng thái bật và tắt.
  - Ở `/`, `/?game=arc-relay`, `/?game=gatefall`, nút `#sf-fast` không hiện.
- [x] C11.12. **Đã ghi số: trung vị 149 s, P90 202 s ở `sfFastFactor` 0,35, xem mục 5.5.** Ghi số, không xét đạt. Trên tập nghiệm thu C10, ghi `estMatchMsMedianFast` và `estMatchMsP90Fast` cạnh `estMatchMsMedian` và `estMatchMsP90`, kèm giá trị `sfFastFactor` đang dùng.

#### C12. VFX (bản 4.2)
Phụ thuộc: C11. VFX Artist làm sheet. Gameplay Programmer nạp sheet và phát theo mục 4.12. Thời gian đo theo đồng hồ scene, tính từ lúc vào `resolving`, sai số giống C8.

Trường `getState()` thêm ở bản 4.2:

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `vfxLoaded` | `string[]` | Các key VFX đã nạp xong, sắp theo bảng chữ cái |
| `vfxPlaying` | `number` | Số sprite VFX đang hiện |
| `vfxLog` | `{ key; kind: 'proj' \| 'hit' \| 'block' \| 'flash'; castIndex: number \| null; cell: [x, y] \| null; pos: [x, y]; box: [x, y, w, h]; startedAtMs; endedAtMs: number \| null; timeScale }[]` | Mọi VFX của lượt gần nhất. Xóa khi lượt quay mới bắt đầu. `castIndex` trỏ vào `lastCasts`. `box` là hộp hiển thị lớn nhất trong suốt thời gian phát, theo tọa độ game |

Các tiêu chí:

- [ ] C12.1. **Nạp và dung lượng.**
  - Sau khi mở `/?game=slot-five`, `vfxLoaded` đúng bằng 16 key ở mục 4.12.
  - Mỗi file `public/vfx/sf-*/T_*.png` có cạnh dài ≤ 1024 px.
  - Tổng dung lượng các file `T_sf_*.png` và `sf_*.json` ≤ 1.572.864 byte.
  - Chỉ có một manifest VFX. Không có request nào ra ngoài origin.
- [ ] C12.2. **Đạn.** Với F12 ở lượt người chơi:
  - `vfxLog` có đúng 3 mục `kind === 'proj'`, theo thứ tự `sf_proj_heal`, `sf_proj_shield`, `sf_proj_blade`.
  - Mỗi `castIndex` xuất hiện đúng một lần.
  - `startedAtMs` lệch `launchMs` không quá 40 ms; `endedAtMs` lệch `impactMs` không quá 40 ms.
  - Không còn chấm tròn Graphics cũ.
- [ ] C12.3. **Đúng một va chạm mỗi viên.** Với mọi lượt của một trận đầy đủ chơi bằng Space:
  - Mỗi viên trong `lastCasts` có đúng một mục `kind === 'hit'` với key `sf_hit_<khóa icon>`.
  - Mục đó có `startedAtMs` lệch `impactMs` không quá 40 ms, và `pos` lệch `to` của viên không quá 2 px.
  - Số mục `hit` bằng `lastCasts.length`.
- [ ] C12.4. **Đúng key theo loại.** Với các lượt ép F10, F11, F13, F5, F2 và F3, key đạn và va chạm lần lượt là:
  - F10: `fire`;
  - F11: `volt` rồi `earth`;
  - F13: `frost`;
  - F5: `blade`;
  - F2: `heal`;
  - F3: `shield`.

  Va chạm của `heal` và `shield` nằm ở nhân vật bên quay; va chạm của sát thương nằm ở bên kia.
- [ ] C12.5. **Chặn.**
  - Với `foe.shield = 20`, người chơi quay F11: có 2 mục `block`, một cho viên Điện (bị chặn toàn bộ), một cho viên Đất (bị chặn 5). Mỗi mục bắt đầu cùng lúc với `hit` của viên đó, lệch không quá 40 ms.
  - Với `foe.shield = 0` và F1: không có mục `block`.
  - Viên `heal` và `shield` không bao giờ có `block`.
- [ ] C12.6. **Lóe chuỗi.** Mục `flash` bắt đầu trong 40 ms đầu của `resolving`, mỗi mục ứng với một `cell` khác nhau.
  - F7: 5 mục, đúng các ô của hai chuỗi.
  - F4: 4 mục và 0 mục `proj`.
  - F0: 0 mục.
  - Số mục `flash` luôn bằng `highlightedCells`.
- [ ] C12.7. **Kích thước.**
  - `proj`: `box` rộng và cao ít nhất 56.
  - `hit`: `box` từ 72 đến 120 chiều rộng, từ 72 đến 104 chiều cao.
  - `block`: `box` trong khoảng 80 đến 112 mỗi chiều.
  - `flash`: `box` lệch hộp ô (96x96, tâm ô theo mục 4.9) không quá 4 px.
- [ ] C12.8. **Không kéo dài lượt.**
  - Mọi mục `hit` và `block` có `endedAtMs - startedAtMs <= eff(sfCastTailMs) + 40`.
  - Mọi mục `flash` có thời lượng ≤ `eff(sfCastDelayMs + sfCastFlightMs) + 40`.
  - Mọi mục có `endedAtMs <= lastResolveMs + 40`.
  - `vfxPlaying === 0` trong vòng 50 ms sau khi rời `resolving`.
  - `lastResolveMs`, `lastSpinMs`, `lastFoeDelayMs` và lịch `lastCasts` không đổi so với công thức ở mục 4.10 và 4.11.
- [ ] C12.9. **Không che HUD.** Với mọi mục của `vfxLog` trong một trận đầy đủ, nếu `box` giao `playerHud` hoặc `foeHud` thì thời lượng mục đó ≤ 150 ms. Không mục nào giao `turnBanner` hoặc `panel`.
- [ ] C12.10. **Chế độ Nhanh.**
  - Khi bật Nhanh, mọi mục có `timeScale === sfFastFactor`.
  - C12.2, C12.3, C12.6 và C12.8 vẫn đạt khi dùng giá trị `eff(...)`.
  - Thời lượng mỗi mục `hit` ở chế độ Nhanh bằng thời lượng ở tốc độ thường nhân `sfFastFactor`, sai số 40 ms.
- [ ] C12.11. **Logic và state không đổi.**
  - Toàn bộ test từ C1 đến C11 vẫn xanh.
  - Trận đầy đủ chơi bằng Space với seed `sfSeed` có `grid`, `lastChains`, `lastEffects`, `player`, `foe` sau mỗi lượt khớp `createBattle(sfSeed)`.
  - Các trường `getState()` có trước bản 4.2 vẫn còn đủ, cùng kiểu.
  - Module logic thuần không import gì từ VFX.
- [ ] C12.12. **Không lỗi.** Trong một trận đầy đủ ở tốc độ thường và một trận ở chế độ Nhanh, không có lỗi console, không có cảnh báo thiếu texture hay animation, và `vfxPlaying` không bao giờ vượt 40.
- [ ] C12.13. **Ảnh cho người dùng duyệt**, không phải tiêu chí tự động. Chụp ở 390x844, lưu vào `artifacts/`:
  - một ảnh cho mỗi loại đạn khi đang bay qua khoảng trống cast (7 ảnh);
  - một ảnh cho mỗi loại va chạm ở khung giữa (7 ảnh);
  - một ảnh `sf_block`;
  - một ảnh lóe chuỗi trên F7;
  - một ảnh F12 có 3 đạn cùng lúc trên màn;
  - một ảnh ở chế độ Nhanh.
- [ ] C12.14. **Bản HTML đơn để chơi thử.**

  **Lệnh.** Gameplay Programmer đưa script đóng gói hiện có của Producer vào repo thành `tools/pack-single.mjs`, chạy bằng `npm run pack:single`. Script làm ba việc:
  - đọc `dist/index.html` và nhúng bundle JS vào trong file;
  - nhúng mọi sheet PNG/JSON có trong manifest VFX dưới dạng data URI;
  - đặt route mặc định là Slot Five khi URL không có `?game=`.

  Kết quả ghi ra `artifacts/slot-five-play.html`. Lệnh `npm run build` thường không đổi: route mặc định vẫn là Coin Hop.

  **Cờ DOM chỉ đọc.** Bản build không có `window.__game`, nên test kiểm qua các thuộc tính chỉ đọc trên phần tử `#game`. Các cờ này có cả ở bản dev lẫn bản build, chỉ phản chiếu state, không cho điều khiển gì và không phải debug API:
  - `data-sf-ready="true"` khi scene Slot Five đã vào trận;
  - `data-vfx-loaded="true"` khi đủ 16 key ở mục 4.12 đã nạp, ngược lại là `"false"`;
  - `data-sf-spin-index`, bằng `spinIndex`;
  - `data-sf-phase`, bằng `phase`;
  - `data-sf-last-casts`, bằng `lastCasts.length` của lượt gần nhất;
  - `data-sf-vfx-hits`, bằng tổng số mục `hit` đã phát trong trận.

  Ở bản dev, test so các cờ này với `getState()` để chắc chúng phản chiếu đúng.

  Tiêu chí:
  1. Chạy `npm run build` rồi `npm run pack:single` đều thoát với mã 0. Lệnh thứ hai tạo hoặc ghi đè đúng một file `artifacts/slot-five-play.html`, không kèm file JS, PNG hay JSON rời nào khác. Ghi lại dung lượng file.
  2. Mở file bằng Playwright qua URL `file://` không có `?game=`. Không chạy server nào. Context đặt `offline: true`. Trong 10 giây, `#game` có `data-sf-ready="true"` và `data-vfx-loaded="true"`.
  3. Bấm Space hoặc chạm `#sf-spin` khi tới lượt người chơi, chờ `data-sf-phase` về `idle` hoặc `ended` sau mỗi lần. Lặp tối đa 10 lượt người chơi cho tới khi gặp một lượt có `data-sf-last-casts` lớn hơn 0. Khi đó `data-sf-vfx-hits` tăng đúng bằng số viên của lượt đó và `data-sf-spin-index` tăng. Seed mặc định không đổi nên kết quả tái lập được.
  4. Trong suốt lần chạy ở bước 2 và 3, không có lỗi console và không có `pageerror`.
  5. Trong suốt lần chạy, mọi request Playwright ghi nhận chỉ có scheme `file:` trỏ đúng vào file HTML đó, hoặc scheme `data:` / `blob:`. Không có request `http:`, `https:` hay `ws:`, và không request nào thất bại.
  6. Nội dung file không chứa các chuỗi `__game`, `lil-gui` và `Tune gameplay`. So khớp phân biệt hoa thường.
  7. Lưu một ảnh 390x844 của file HTML đơn sau lượt có cast vào `artifacts/`, để người dùng duyệt.

#### C13. Bộ icon theo hệ (bản 5)
Phụ thuộc: C12. Gồm:
- logic bảng rút theo `activeIcons`;
- các khóa `sfElement`, `sfWElement` và cập nhật `TUNING_RANGES`;
- các trường `element`, `activeIcons`, `legendIcons`;
- bảng chú giải;
- cập nhật `BRIEF_TUNING`.

Nghiệm thu C13 gồm các tiêu chí dưới đây, cộng C1.6, C2.5, C7.11 bản 5, và chạy lại xanh mọi tiêu chí còn lại từ C1 đến C12.

- [ ] C13.1. **Khóa cấu hình.** `TUNING` và `TUNING_RANGES` có `sfElement` (giá trị đầu 1, khoảng 0 đến 3, bước 1) và `sfWElement` (22, khoảng 1 đến 60, bước 1). Không còn `sfWFire`, `sfWVolt`, `sfWFrost`, `sfWEarth`. Vẫn có đủ `sfBFire`, `sfBVolt`, `sfBFrost`, `sfBEarth` cùng khoảng thử. Mọi khóa trong `TUNING` có trong `TUNING_RANGES` và ngược lại.
- [ ] C13.2. **Chỉ 5 icon trên lưới.** Với cấu hình demo:
  - Mọi lưới do RNG sinh ra chỉ chứa icon thuộc `[1, 4, 5, 6, 7]`, kiểm trên 100.000 lượt `createSim` (seed 9001 đến 9010) và trên mọi lượt của 2000 trận `createBattle` (seed 1 đến 2000).
  - Lưới ban đầu từ luồng `init` cũng tuân theo điều này.
  - Không chuỗi nào trong các lượt đó có icon 0, 2 hoặc 3.
- [ ] C13.3. **Đổi hệ chỉ đổi ô nguyên tố.** Tạm đặt `sfElement` lần lượt là 0, 2, 3 rồi tạo sim cùng seed với cấu hình demo, so 1000 lượt.
  - Ở mỗi lượt, ô nào cấu hình demo ra icon 1 thì cấu hình mới ra đúng icon `sfElement`. Mọi ô còn lại giống hệt nhau.
  - `activeIcons` bằng `[sfElement, 4, 5, 6, 7]`.
  - Test khôi phục `TUNING` sau khi chạy.
- [ ] C13.4. **Trạng thái.** Ở `/?game=slot-five` với cấu hình demo, `element === 1` và `activeIcons` bằng `[1, 4, 5, 6, 7]`. Đổi `sfElement` giữa trận không đổi `element` của trận đang chạy. Mở trận mới thì `element` nhận giá trị mới.
- [ ] C13.5. **Đối thủ cùng bộ icon.** Trong 2000 trận ở C13.2, các lượt của đối thủ (`spinIndex` lẻ) cũng chỉ có icon thuộc `activeIcons`. Sát thương nguyên tố của cả hai bên đều lấy từ `sfBVolt`.
- [ ] C13.6. **`evaluate` vẫn nhận 8 icon.** C2.1 với F0 đến F13 vẫn đạt, kể cả F10, F11 và F13 có Lửa, Đất và Băng. `forceNextGrid` với F10 và F13 trong bản dev vẫn bắn đúng đạn và va chạm như C12.4.
- [ ] C13.7. **Bảng chú giải.** Khi mở bảng, `legendIcons` bằng `[1, 4, 5, 6, 7]`. Icon 1 hiện tên "Sét", loại `damage` và giá trị gốc lấy từ `sfBVolt`. Bảng không có dòng nào cho Lửa, Băng, Đất. Chữ trong bảng vẫn đạt C7.5 và C7.6. Khi tạm đặt `sfElement = 0` rồi mở trận mới, `legendIcons` bằng `[0, 4, 5, 6, 7]`.
- [ ] C13.8. **`analyticEffects` theo hệ.** Với cấu hình demo, `analyticEffects()` chỉ tính trên `activeIcons`, khớp C2.5 bản 5. Khi tạm đặt `sfElement = 0`, phần sát thương nguyên tố tính bằng `sfBFire` thay cho `sfBVolt`, với cùng `p`.
- [ ] C13.9. **Bản HTML đơn.** `artifacts/slot-five-play.html` dùng cấu hình demo. C12.14 vẫn đạt. Ảnh 390x844 của bảng chú giải được lưu vào `artifacts/` để người dùng duyệt.

#### C14. Tune lại cho bộ icon demo (bản 5)
Phụ thuộc: C13. Thay C10. Balance Tuner chỉ đổi giá trị trong `TUNING`, trong `TUNING_RANGES`, bắt đầu từ điểm xuất phát ở mục 5.6. Giữ cấu hình demo (`sfElement = 1`). Tập seed, định nghĩa lật ngược, phân vị và `attackTurnRate` giống C10. Mọi ngưỡng là đề xuất.

- [ ] C14.1. Trên tập nghiệm thu, `|meanDamage - analyticEffects().damage| <= 3 * meanDamageStdErr`.
- [ ] C14.2. **Thời lượng.** `estMatchMsMedian` nằm trong `[300000, 420000]`, `estMatchMsP90 <= 540000`.
- [ ] C14.3. **Số lượt.** `turnsMedian` nằm trong `[110, 160]`, `turnsP90 <= 225`. Nếu C14.2 đạt mà C14.3 trượt vì `meanTurnMs` lệch 2,7 s quá 15%, xử lý như C10.3.
- [ ] C14.4. **Tỉ lệ ra đòn.** `attackTurnRate >= 0.60`.
- [ ] C14.5. **Tỉ lệ ra Sét, mục tiêu mới.** `chainTurnRateByIcon[1] >= 0.15`, tức ít nhất 15% số lượt có một chuỗi Sét. Với mọi icon ngoài `activeIcons`, `chainTurnRateByIcon` bằng 0.
- [ ] C14.6. **Tỉ lệ thắng.** `playerWinRate` nằm trong `[0.50, 0.60]`. Máu đối thủ được phép thấp hơn máu người chơi, như ghi chú ở C10.5: hiện là 440 so với 450, người dùng đã chấp nhận. Nếu cần chênh lớn hơn 10 máu thì phải hỏi người dùng.
- [ ] C14.7. **Kịch tính.** `comebackRate` nằm trong `[0.15, 0.40]`.
- [ ] C14.8. `unfinished === 0` với trần 2000 lượt. Chạy hai lần cho `MatchReport` giống hệt nhau.
- [ ] C14.9. `simulateMatches` 2000 trận chạy dưới 15 giây.
- [ ] C14.10. **Ghi số, không xét đạt:**
  - `blankTurnRate` và `chainTurnRateByIcon` cho Kiếm, Hồi máu, Khiên, May mắn;
  - `meanHeal`, `meanShield`, `meanAbsorbed`, `meanTurnMs`, `turnsP10`, `turnsMax`;
  - `comebackRateByWinner`;
  - `playerWinRate` khi đối thủ đi trước;
  - `estMatchMsMedianFast` và `estMatchMsP90Fast` (đo lại thay C11.12);
  - giá trị `TUNING` sau tune và lý do của từng khóa đã đổi.

**Luật dừng:** nếu C14.2, C14.4, C14.5, C14.6 và C14.7 không cùng đạt sau khi tune trên tập seed để tune, Producer dừng lại và báo người dùng. Không nới ngưỡng để qua test. Theo báo cáo, chỉ một hệ mà không có wild có thể khó đạt cả C14.4 lẫn C14.5. Nếu xảy ra, báo người dùng kèm số đo, không tự thêm wild.

## 9. Người chơi cần tự đánh giá
Test tự động không kết luận được game có vui hay không. Mô phỏng chỉ đo độ dài trận, tỉ lệ ra đòn, tỉ lệ thắng và tần suất lật ngược. Người chơi thật cần đánh giá:

- **Rủi ro chính của bản 4:** một trận 5 đến 7 phút, khoảng 70 lần bấm quay, và người chơi không có lựa chọn nào (Q2). Có còn muốn chơi tới cuối trận không, hay thấy nhàm từ phút thứ mấy? Có muốn đấu trận tiếp theo không? Ghi lại thời điểm bắt đầu thấy chán.
- Lưới 4x4 có dễ chơi và dễ nhìn hơn 5x4 không? Cảm giác "ít ra đòn" đã hết chưa?
- Kiếm xuất hiện rất dày, còn bốn hệ thành đòn hiếm. Đòn hệ có tạo khoảnh khắc đáng nhớ không, hay người chơi gần như không thấy chúng? Q1 có trở nên cấp thiết hơn không?
- Sát thương nhỏ mỗi đòn, trên 450 máu, thanh máu chạy chậm. Có thấy tiến triển không, hay thấy lê thê?
- Hồi máu và khiên có đủ đáng kể không?
- Nhịp một lượt khoảng 2,7 s ở tốc độ thường có vừa không?
- Bản 4.1: ở chế độ Nhanh (hệ số 0,35, khoảng 1,1 s mỗi lượt), có còn đọc kịp chuỗi và cast không? Người chơi bật Nhanh ngay từ đầu hay chỉ bật khi thấy chán? Có còn muốn autoplay không?
- Bản 4.1: nút Nhanh nằm cạnh nút "?" có dễ bấm nhầm không? Trạng thái bật và tắt có dễ phân biệt không?
- Bản 4.2: nhìn đạn có nhận ra ngay loại đòn không, nhất là Lửa với Đất và Điện với Băng? Đạn có đủ to và rõ khi bay qua lưới không?
- Bản 4.2: va chạm có "đã tay" không? Hiệu ứng chặn có cho thấy rõ khiên vừa đỡ đòn không?
- Bản 4.2: lóe chuỗi có giúp thấy chuỗi nhanh hơn không, hay làm rối khi có nhiều chuỗi chồng nhau?
- Bản 4.2: ở chế độ Nhanh, VFX có còn đọc được không, hay thành chớp nháy khó chịu?
- Bản 4.2: phong cách VFX có hợp với icon và nhân vật placeholder không, và có gợi bản sắc riêng không?
- Có nhận ra ngay chuỗi nào gây ra hiệu ứng gì, và cho ai không, nhất là chuỗi chéo và các chuỗi chồng nhau?
- Cast có giúp dễ hiểu không? Nhịp cast có làm chậm lượt không?
- Khung quay 4x4 gần vuông có khớp với bản vẽ hơn không? Hai nhân vật nhỏ sát mép có đủ "có mặt" không?
- Cầm điện thoại dọc chơi một tay có thoải mái không? Nút "?" có dễ tìm không?
- Khi thua có thấy công bằng không?
- Icon May mắn chưa có tác dụng có gây hiểu nhầm không?
- 8 icon placeholder có dễ phân biệt không?
- Bản 5: lưới chỉ có 5 loại icon. Lưới có dễ đọc hơn không, hay trông đơn điệu?
- Bản 5: Sét ra khoảng 1 lần mỗi 5 lượt. Như vậy có đủ để cảm thấy "nhân vật mình dùng hệ Sét" không?
- Bản 5: May mắn chiếm 12% lưới mà chưa có tác dụng. Có gây cảm giác lưới bị "lãng phí" không?
- Bản 5: chỉ một hệ suốt trận 5 đến 7 phút. Có thấy thiếu đa dạng không? Có mong được đổi hệ hoặc có trang bị ngay không?
- Chủ đề và hình ảnh có gợi được bản sắc riêng không?

## Câu hỏi mở
- **Q1. Khắc hệ.** Hiện không khắc hệ. Bản 5 chỉ có một hệ mỗi trận, nên khắc hệ chỉ có nghĩa khi kẻ địch có hệ riêng (liên quan Q4) hoặc khi có trang bị. Câu hỏi để mở cho bản có trang bị, không chặn bản 5.
- **Q2. Đã chốt:** người chơi chỉ bấm quay.
- **Q3. Giới hạn lượt và hòa.** Hiện trận không có trần lượt. Trận 5 đến 7 phút làm câu hỏi này đáng cân nhắc hơn. Có nên có trần thời gian hay trần lượt, ai còn nhiều máu theo tỉ lệ thì thắng không? Lựa chọn này đổi điều kiện thắng thua.
- **Q4. Đối thủ.** Có cần đối thủ có trọng số, chỉ số hoặc hệ riêng không? Bản 5 cho đối thủ dùng cùng bộ icon và cùng hệ Sét. Q4 vẫn mở.
- **Q7. Trang bị nhiều hệ (bản 5, cho tương lai).** Khi có trang bị, một nhân vật chỉ mang một hệ hay có thể mang nhiều hệ cùng lúc trên lưới? Nếu nhiều hệ cùng lúc thì mỗi hệ sẽ hiếm lại như bản 4. Báo cáo cho thấy khi đó cần thêm wild hoặc cơ chế khác. Câu này không chặn bản 5.
- **Q5. Màn ngang.** Hiện chỉ nhắm điện thoại dọc, màn ngang dùng letterbox. Có cần layout ngang riêng không?
- **Q6. Đã chốt:** người dùng chọn "Thêm quay nhanh". Không có autoplay. Xem mục 4.11 và C11.

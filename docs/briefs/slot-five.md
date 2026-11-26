# Game Brief: Slot Five (tên tạm)

> **Bản 4 (hiện hành): lưới 4x4, trận dài 5 đến 7 phút.** Người dùng thấy 5 cột khó chơi và ít ra đòn tấn công. Bản này đổi sang lưới 4 cột x 4 hàng, đặt mục tiêu trung vị một trận 5 đến 7 phút, hạ sát thương mỗi chuỗi và tăng máu. Phần việc mới là C9 (chuyển sang 4x4) và C10 (tune thời lượng trận). Mọi thay đổi so với bản 3 được liệt kê ở mục "Thay đổi bản 4" cuối mục 6. Luật lượt, máu, khiên, thứ tự xử lý, layout dọc và cast chiêu giữ nguyên.
>
> **Bản 4.1:** người dùng trả lời Q6 là "Thêm quay nhanh". Thêm cơ chế C11, làm sau C10, xem mục 4.11. Đây là luật đề xuất do Producer chọn mặc định.
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
- **May mắn chưa có hiệu ứng.** Icon vẫn tạo chuỗi, được highlight và ghi vào `lastChains` với `kind: 'none'`, `value: 0`. Không bắn viên cast. Buff chỉ số đặc biệt làm sau.

### 4.2. Sinh lưới
- Mỗi ô được rút **độc lập** theo trọng số `sfW<Tên>` (số nguyên). Không dùng dải cuộn.
- Rút **16 ô theo cột trước** (bản 2 và 3 là 20 ô): `x` từ 0 đến 3, trong mỗi cột `y` từ 0 đến 3. Với mỗi ô, lấy `r = rng.int(tổng trọng số)`, rồi duyệt icon từ 0 đến 7 và chọn icon đầu tiên có tổng trọng số cộng dồn lớn hơn `r`.
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
| Chỉ báo lượt | `turnBanner` | 120, 16, 300, 40 | Không đổi |
| Khung quay | `reelFrame` | 57, 64, 426, 426 | Bản 4. Ô 96x96, khe 6, đệm 12. Bản 3 là 26, 72, 488, 394 |
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
| Bảng chú giải (khi mở) | `legend` | 57, 64, 426, 426 | Bản 4. Trùng `reelFrame`, nút đóng 64x64 ở góc trên phải |

- **Panel dưới, bản 4.1:** nút "?" ở x 20 đến 84, nút Nhanh ở x 96 đến 160, nút quay ở x 170 đến 370, nút trận mới ở x 400 đến 496. Các nút cách nhau ít nhất 10 px. Ở 390x844, các nút 64x64 có kích thước khoảng 46x46 px CSS, đủ mức 44 px.
- **Tâm ô `(x, y)`** là `(117 + 102x, 124 + 102y)`.
- **Khoảng trống cast** đi từ đáy `reelFrame` (y = 490) tới đỉnh nhân vật (y = 636), cao 146 px, bằng 15,2% chiều cao màn. Trong khoảng này chỉ có viên cast và số nổi.
- Số nổi chỉ nằm trong vùng `*Float` của bên nhận, nên không đè lên lưới.
- Nút `#sf-*` là DOM. Vị trí nút là hộp tương ứng nhân `scale`, cộng độ lệch của canvas.
- **Chữ:** chữ HUD tối thiểu 17 px game. Số máu và chỉ báo lượt tối thiểu 22 px game. Tương phản tối thiểu 4,5:1 theo WCAG.

### 4.10. Cast chiêu
Logic không đổi. Cast là lớp hình ảnh phát lại `lastChains` và `lastEffects`, không phụ thuộc kích thước lưới ngoài tọa độ tâm ô.

- Mỗi chuỗi có `kind !== 'none'` bắn đúng một viên. Chuỗi May mắn không bắn.
- Viên `damage` bay tới nhân vật bên **không** quay. Viên `heal` và `shield` bay tới bên vừa quay.
- Viên là hình học vẽ bằng Phaser Graphics, màu theo icon. VFX đẹp làm sau.
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

## 5. Thông số cần tune
Toàn bộ nằm trong `TUNING` và `TUNING_RANGES` ở `src/config.ts`, tiền tố `sf`. Các số là ước tính tay theo mục 4.6. Balance Tuner chỉnh ở C10.

**Ghi chú cho test:** hằng `BRIEF_TUNING` trong test ghim bảng giá trị đầu của brief để tính fixture. Ở bản 4, `BRIEF_TUNING` **phải cập nhật theo các bảng 5.1 và 5.2 dưới đây**, đồng thời bỏ `sfLen5Mult`. Các số trong bảng fixture ở mục 8 đều tính theo `BRIEF_TUNING` bản 4.

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

## 6. Phạm vi
- Có làm:
  - Slot Five chạy ở `/?game=slot-five`, đồ họa placeholder, màn dọc 540x960 có letterbox.
  - Lưới 4x4, 8 icon có trọng số, quay có seed, chuỗi 3+ theo bốn hướng.
  - Hiệu ứng sát thương, hồi máu và khiên theo độ dài chuỗi.
  - Hai nhân vật, thanh máu, chỉ báo khiên. Hai bên quay luân phiên, đối thủ tự quay, có thắng thua và nút trận mới.
  - Cột dừng lần lượt, highlight chuỗi, cast chiêu đơn giản, số nổi trong vùng riêng, thanh máu chạy.
  - Panel dưới gồm nút quay, nút trận mới, nút "?" và, từ bản 4.1, công tắc Nhanh. Bảng chú giải chỉ mở bằng "?".
  - Bản 4.1: quay nhanh bằng cách co mọi thời gian diễn hoạt theo `sfFastFactor` (mục 4.11).
  - Lõi logic thuần, công thức kỳ vọng và mô phỏng nhiều trận.
- Không làm:
  - Buff của icon May mắn. Khắc hệ và kháng hệ. Hiệu ứng theo hệ.
  - Lựa chọn của người chơi trong lượt, AI đối thủ có chiến thuật, chỉ số nhân vật riêng ngoài máu tối đa.
  - Autoplay, tự quay lượt của người chơi, bỏ qua toàn bộ diễn hoạt, và lưu trạng thái Nhanh sang lần tải trang sau.
  - Credit, cược, RTP, tiền thật, cửa hàng.
  - Wild, scatter, free spin, jackpot, near-miss.
  - Nhiều đối thủ, tiến trình, lưu tiến trình, âm thanh, menu.
  - VFX flipbook hay VFX đẹp cho cast. Layout riêng cho màn ngang.
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

### Danh sách cơ chế theo thứ tự phụ thuộc
C1 đến C8 được giữ, ghi chú theo bảng "Thay đổi bản 4". Sau C8 là C9 rồi C10. Tiêu chí đánh `[ ]` kèm chữ "Bản 4" là tiêu chí phải làm lại.

#### C1. Lõi lưới có seed
- [x] C1.1. Khi mở `/`, `/?game=khac`, `/?game=arc-relay`, `/?game=gatefall`, thì `getState()` của từng game giống hệt trước khi có Slot Five.
- [ ] C1.2. **Bản 4.** Khi mở `/?game=slot-five`, thì `gameId === 'slot-five'`, `cols === 4`, `rows === 4`, `iconCount === 8`, `luckyIcon === 7`, `spinIndex === 0`, và `grid` có 4 hàng x 4 cột với mọi giá trị trong `[0, 8)`.
- [x] C1.3. Hai sim cùng seed quay 1000 lượt thì `grid` giống nhau ở từng lượt, trên seed 1 đến 50.
- [x] C1.4. Lưới thứ `n` chỉ phụ thuộc `seed` và `spinIndex`. Chèn các thao tác không phải quay vào giữa không làm đổi lưới.
- [x] C1.5. Hai sim seed 1 và 2 khác `grid` ở ít nhất 990 trong 1000 lượt đầu.
- [x] C1.6. Trên 100.000 lượt `createSim` (seed 9001 đến 9010), tỉ lệ từng icon lệch `sfW<Tên> / tổng` không quá 0,003.
- [x] C1.7. Khi tạm đặt `sfWShield = 0`, thì 10.000 lượt không có icon 6. Test khôi phục giá trị sau đó.
- [x] C1.8. Khi `forceNextGrid(F1)` rồi quay, thì `grid` là F1, và lượt kế tiếp giống sim không bị ép.

#### C2. Chuỗi và hiệu ứng
- [ ] C2.1. **Bản 4.** Khi `evaluate` từng fixture F0 đến F12 bản 4, thì số chuỗi, `icon`, `dir`, `length`, `cells`, `kind`, `value` và `effects` khớp bảng fixture.
- [ ] C2.2. **Bản 4.** Khi `evaluate` lưới toàn icon 4, thì có 14 chuỗi theo thứ tự mục 4.3:
  - 4 chuỗi `h` dài 4;
  - 4 chuỗi `v` dài 4;
  - 3 chuỗi `dr` dài lần lượt 4, 3, 3 (ô đầu `(0,0)`, `(1,0)`, `(0,1)`);
  - 3 chuỗi `ur` dài lần lượt 3, 4, 3 (ô đầu `(0,2)`, `(0,3)`, `(1,3)`).

  `damage = sfBBlade * (10 * sfLen4Mult + 4)`, ra 120 với `BRIEF_TUNING` bản 4.
- [x] C2.3. `evaluate` 10.000 lưới từ sim seed 1 khớp bộ kiểm tra vét cạn, và `effects` bằng tổng `value` theo `kind`.
- [ ] C2.4. **Bản 4.** Với mọi lưới ở C2.3, mọi giá trị đều là số nguyên không âm, mọi chuỗi có `length` thuộc `{3, 4}`, và chuỗi icon 7 có `kind === 'none'`, `value === 0`.
- [ ] C2.5. **Bản 4.** Với `BRIEF_TUNING` bản 4, `analyticEffects()` cho `damage` trong `[8.03, 8.13]`, `heal` trong `[1.00, 1.10]`, `shield` trong `[1.00, 1.10]`.

#### C3. Trận đấu luân phiên, máu và khiên
Số dưới đây tính theo `BRIEF_TUNING` bản 4, test phải tính lại từ bảng đó.

- [x] C3.1. Khi vào trận, `status === 'playing'`, `turn === 'player'`, máu đầy, khiên bằng 0.
- [x] C3.2. `spinIndex` chẵn là người chơi, lẻ là đối thủ, và lưới lượt `n` khớp `createSim(seed)`.
- [ ] C3.3. **Bản 4.** Khi `foe.shield = 3` và người chơi quay F1, thì `absorbed === 3`, `hpLoss === 2`, `foe.shield === 0`.
- [ ] C3.4. **Bản 4.** Khi `foe.shield = 50` và người chơi quay F1, thì `foe.hp` không đổi và `foe.shield === 45`. Đối thủ quay F0 tiếp theo thì `foe.shield === 0`.
- [ ] C3.5. **Bản 4.** Khi `player.hp = sfPlayerMaxHp - 10`, `player.shield = 25` và người chơi quay F12, thì `player.hp === sfPlayerMaxHp`, `healed === 10`, `player.shield === 20` (không phải 45), và `foe.hp` giảm 5.
- [ ] C3.6. **Bản 4.** Khi người chơi quay F3 (khiên 20), rồi đối thủ quay F5 (sát thương 10), thì `absorbed === 10`, `player.hp` không đổi, `player.shield === 10`.
- [ ] C3.7. **Bản 4.** Khi `foe.hp = 5` và người chơi quay F1, thì `status === 'won'`, `foe.hp === 0`. Lệnh quay sau đó bị từ chối và không rút RNG.
- [ ] C3.8. **Bản 4.** Khi `foe.hp = 3`, `player.hp = 100` và người chơi quay F12, thì `status === 'won'`, `player.hp === 120`, `player.shield === 20`.
- [ ] C3.9. **Bản 4.** Khi `player.hp = 4`, `player.shield = 0`, `turn = 'foe'` và đối thủ quay F1, thì `status === 'lost'`, `player.hp === 0`.
- [ ] C3.10. **Bản 4.** Với 2000 trận sim (seed 1 đến 2000) dùng giá trị đầu bản 4, mọi trận kết thúc trước 2000 lượt. Luôn có `0 <= hp <= maxHp` và `shield >= 0`. Khi trận kết thúc, đúng một bên có `hp === 0`.
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
- [ ] C6.2. **Bản 4.** `lastReelStopMs` có 4 phần tử tăng dần. Phần tử đầu trong `[sfSpinBaseMs - 30, sfSpinBaseMs + 60]`, các khoảng cách nằm trong `sfReelStopGapMs ± 40`.
- [x] C6.3. Lệnh quay trong `spinning` hoặc `resolving` bị từ chối với `busy` hoặc `notYourTurn`.
- [x] C6.4. Với F7, khi cột cuối dừng thì `highlightedChainCount === 2`, `highlightedCells === 5`. Với F0 thì `highlightedCells === 0`. F7 bản 4 vẫn có 5 ô.
- [ ] C6.5. **Mở lại ở bản 3.** Trong `spinning`, `displayHp` bằng máu trước lượt. Không quá `lastResolveMs + 150` ms sau khi vào `resolving`, `displayHp` bằng giá trị logic.
- [x] C6.6. Từ lúc lượt người chơi kết thúc `resolving` tới lúc đối thủ quay mất `sfFoeDelayMs ± 60` ms.
- [ ] C6.7. **Bản 4.** Sau mỗi lượt của một trận đầy đủ, `viewCounts.icons === 16`, `viewCounts.fighters === 2`, và không có lỗi console.
- [ ] C6.8. Thay bằng C8.10.

#### C7. Layout dọc, panel dưới và nút "?"
Hộp so theo tọa độ game, sai số ±1 px. Tiêu chí ghi "bản 4" dùng bảng mục 4.9 bản 4.

- [ ] C7.1. **Bản 4.** `layout.width === 540`, `layout.height === 960`. Mọi khóa của bảng mục 4.9 (trừ `legend` khi đóng) có mặt và khớp hộp bản 4. Riêng `fastBtn` và vị trí mới của `helpBtn` thuộc bản 4.1 và được kiểm ở C11.11. Trước khi làm C11, `helpBtn` có thể vẫn ở `60, 832, 64, 64`. Các game khác vẫn 960x540.
- [ ] C7.2. Không cặp hộp nào chồng nhau, trừ `legend` với `reelFrame` và các nút nằm trong `panel`. Mọi hộp nằm trong màn.
- [ ] C7.3. Trong một trận có `loadMatch` ép F12 rồi F11 ở hai lượt đầu, mọi `floatTexts` tại mỗi lần lấy mẫu 50 ms nằm trọn trong `*Float` của bên tương ứng và không giao `reelFrame`.
- [ ] C7.4. **Bản 4.** `castGap.top === 490`, `castGap.bottom === 636`, và `castGap.bottom - castGap.top >= 0.15 * layout.height`. Ngoài các hộp `*Float`, không hộp nào giao dải y này.
- [ ] C7.5. Ở viewport 390x844, mọi chữ trong `layout.texts` có `fontPx * scale >= 12`. Số máu và chỉ báo lượt có `fontPx >= 22`.
- [ ] C7.6. Mọi chữ trong `layout.texts` có tương phản WCAG ít nhất 4,5.
- [ ] C7.7. Ở viewport 390x844, `#sf-spin`, `#sf-new`, `#sf-help`, `#sf-help-close` (khi mở) có kích thước ít nhất 44x44 px CSS, và khớp hộp ±2 px. Nút `#sf-fast` được kiểm ở C11.11.
- [ ] C7.8. Ở 1280x720 và 844x390, canvas nằm giữa, tỉ lệ 540:960, không tràn ra ngoài viewport, và nút khớp hộp.
- [ ] C7.9. Phím H, `?` và Esc mở và đóng bảng chú giải đúng như mục 3.
- [ ] C7.10. Chạm `#sf-help` và `#sf-help-close` mở và đóng bảng chú giải đúng như mục 3.
- [ ] C7.11. Khi bảng đang mở mà bấm Space, lượt quay được nhận và `legendOpen === false` ngay khi `phase === 'spinning'`. Bảng có đủ 8 icon kèm loại hiệu ứng và giá trị gốc.
- [ ] C7.12. Nút `#sf-help` và `#sf-help-close` không hiện ở các game khác.

#### C8. Cast chiêu
Đang làm trên lưới 5x4. Sau C9, chạy lại toàn bộ C8 với số bản 4. Tâm ô lấy từ layout, không viết cứng.

- [ ] C8.1. Với F12 ở lượt người chơi, `lastCasts.length === 3` theo thứ tự `heal`, `shield`, `damage`, và mỗi `chainIndex` trỏ đúng chuỗi.
- [ ] C8.2. Viên `heal` và `shield` có `target` là bên quay, viên `damage` có `target` là bên kia. Kiểm ở lượt của cả hai bên.
- [ ] C8.3. Với F4: có 1 chuỗi, 0 viên, `lastResolveMs === sfResolveMs`. Với F0: 0 viên, `lastResolveMs === sfBlankResolveMs`.
- [ ] C8.4. **Bản 4.** Với F7 có 2 viên `shield`. `from` của mỗi viên bằng trung bình tâm ô của chuỗi, sai số ±1 px, với tâm ô `(x, y)` là `(117 + 102x, 124 + 102y)`. Ở lưới 5x4 của bản 3, công thức là `(82 + 94x, 128 + 94y)`.
- [ ] C8.5. `to` bằng tâm hộp `*Fighter` của `target`, sai số ±1 px.
- [ ] C8.6. `launchMs` và `impactMs` khớp công thức. Thời điểm đo lệch không quá 40 ms. Thời gian `resolving` thật nằm trong `lastResolveMs ± 60` ms.
- [ ] C8.7. Với F12 và `player.hp = 80`, `foe.shield = 0`, giá trị hiển thị chỉ đổi khi từng viên trúng, mỗi lần đúng phần của viên đó, và sau viên cuối khớp logic.
- [ ] C8.8. **Bản 4.** Với `foe.shield = 20`, người chơi quay F11 (Điện 15, rồi Đất 20). Sau viên 1: `displayShield.foe === 5`, `displayHp.foe` không đổi. Sau viên 2: `displayShield.foe === 0`, `displayHp.foe` giảm 15. Kết quả cuối khớp `foe.hp` logic. Bản 3 dùng `foe.shield = 30` với Điện 45 và Đất 60.
- [ ] C8.9. **Bản 4.** Trong một trận đầy đủ chơi bằng Space, `castsInFlight` về 0 trước khi rời `resolving`. Số viên bằng số chuỗi có `kind !== 'none'`. Kết quả trận hiện sau viên cuối. Không có lỗi console. Phần kiểm thời lượng trận chuyển sang C10.2.
- [ ] C8.10. Ảnh cho người dùng duyệt, chụp ở 390x844: giữa lúc quay, F12 đang cast, số nổi, bảng chú giải, màn kết thúc, letterbox ở 1280x720. Bản 4 chụp trên lưới 4x4.

#### C9. Chuyển sang lưới 4x4 (bản 4)
Phụ thuộc: C8 (hoặc làm song song nếu C8 chưa xong, xem "Thay đổi bản 4", mục C).

Gồm:
- đổi logic lưới, chuỗi và `analyticEffects`;
- bỏ `sfLen5Mult`;
- cập nhật `TUNING` và `TUNING_RANGES` theo mục 5;
- cập nhật `BRIEF_TUNING` và fixture trong test;
- cập nhật layout theo mục 4.9.

Nghiệm thu C9 là đạt các tiêu chí sau, cộng các tiêu chí ghi "Bản 4" ở C1, C2, C3, C6, C7, C8, và chạy lại xanh mọi tiêu chí còn lại của C1 đến C8.

- [ ] C9.1. `cols === 4` là hằng số logic. Mỗi lượt `createSim` rút đúng 16 số: sau một lượt, trạng thái RNG của luồng `spin` bằng trạng thái sau 16 lần gọi `next()` từ cùng hạt.
- [ ] C9.2. `sfLen5Mult` không còn trong `TUNING` và `TUNING_RANGES`. Mọi khóa `sfW*`, `sfB*` và máu có giá trị đầu và khoảng thử đúng như mục 5.1 và 5.2.
- [ ] C9.3. `BRIEF_TUNING` trong test bằng bảng 5.1 và 5.2 bản 4. Không test nào còn dùng số của bản 2 hay bản 3, ngoại trừ test lịch sử có ghi rõ.
- [ ] C9.4. `forceNextGrid` và `BattleSetup.grids` ném lỗi khi lưới không phải 4x4.
- [ ] C9.5. Trên 10.000 lưới từ sim seed 1, số chuỗi tối đa mỗi lượt không vượt 14, và không có chuỗi nào có ô ngoài `[0, 3] x [0, 3]`.
- [ ] C9.6. Với các lượt ép F0 đến F12 qua scene, `highlightedCells` bằng số ô khác nhau trong `lastChains`, và mọi icon trên lưới hiển thị nằm trọn trong `reelFrame`.

#### C10. Tune thời lượng trận và tỉ lệ ra đòn (bản 4)
Phụ thuộc: C9. Thay thế C4. Balance Tuner chỉ đổi giá trị trong `TUNING`, trong `TUNING_RANGES`.

- **Tập seed nghiệm thu:** 9001 đến 11000, gồm 2000 trận. **Tập seed để tune:** 1 đến 2000. Không tune trên tập nghiệm thu.
- **Lật ngược**, giữ từ bản 2. Gọi W là bên thắng, L là bên thua. Trận có lật ngược khi có ít nhất một lượt, xét sau khi xử lý, thỏa cả hai điều kiện:
  - `spinIndex >= 2`;
  - `5 * (L.hp * W.maxHp - W.hp * L.maxHp) >= W.maxHp * L.maxHp`, tức W bị dẫn ít nhất 20 điểm phần trăm máu.

  `COMEBACK_GAP = 20` là hằng số đo, không nằm trong `TUNING`.
- **Phân vị:** dùng nearest-rank, lấy phần tử ở chỉ số `ceil(k / 100 * n) - 1` của mảng đã sắp xếp tăng.
- **Tỉ lệ ra đòn:** `attackTurnRate` là tỉ lệ lượt có `damage > 0`, tính trên mọi lượt của mọi trận, gộp cả hai bên.
- Mọi ngưỡng dưới đây là **giá trị đề xuất** và có thể đổi.

- [ ] C10.1. Trên tập nghiệm thu, `|meanDamage - analyticEffects().damage| <= 3 * meanDamageStdErr`.
- [ ] C10.2. **Thời lượng, phép thử chính.** Trên tập nghiệm thu, `estMatchMsMedian` nằm trong `[300000, 420000]` và `estMatchMsP90 <= 540000`.
- [ ] C10.3. **Số lượt**, suy ra từ C10.2 theo mục 5.3. Trên tập nghiệm thu, `turnsMedian` nằm trong `[110, 160]` và `turnsP90 <= 225`. Nếu C10.2 đạt nhưng C10.3 trượt vì `meanTurnMs` lệch 2,7 s quá 15%, Producer tính lại khoảng theo mục 5.3 thay vì tune thêm.
- [ ] C10.4. **Tỉ lệ ra đòn.** Trên tập nghiệm thu, `attackTurnRate >= 0.60`.
- [ ] C10.5. **Tỉ lệ thắng.** Trên tập nghiệm thu, khi người chơi đi trước và hai bên cùng chỉ số, `playerWinRate` nằm trong `[0.50, 0.60]`.
- [ ] C10.6. **Kịch tính.** Trên tập nghiệm thu, `comebackRate` nằm trong `[0.15, 0.40]`.
- [ ] C10.7. Trên tập nghiệm thu, `unfinished === 0` với trần 2000 lượt. Chạy `simulateMatches` hai lần cho hai `MatchReport` giống hệt nhau.
- [ ] C10.8. `simulateMatches` trên 2000 trận chạy xong dưới 15 giây trong trình duyệt test. Bản 2 là 5 giây; nới ra vì trận dài hơn khoảng 12 lần.
- [ ] C10.9. Ghi số, không xét đạt:
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

- [ ] C11.1. **Phím.** Khi vào trận, `fastMode === false`. Bấm F thì `fastMode === true`, bấm F lần nữa thì `false`. Giữ F 800 ms thì `fastMode` chỉ đổi một lần. Mỗi lần bấm F, `rejectedSpins` không đổi.
- [ ] C11.2. **Chạm.** Ở viewport cảm ứng 390x844, chạm `#sf-fast` thì `fastMode` đảo trạng thái, và `aria-pressed` của nút bằng `String(fastMode)`. Chạm hai lần thì về trạng thái ban đầu.
- [ ] C11.3. **Giữ trong phiên.** Khi `fastMode === true`, mở trận mới bằng R, bằng Enter sau khi trận kết thúc, bằng chạm `#sf-new` và bằng `loadMatch`, thì `fastMode` vẫn là `true`. Tải lại trang thì `fastMode === false`.
- [ ] C11.4. **Quay và dừng cột.** Bật Nhanh trước lượt người chơi rồi quay. Khi đó:
  - `lastTimeScale === sfFastFactor`;
  - `lastSpinMs === eff(sfSpinBaseMs) + 3 * eff(sfReelStopGapMs)`;
  - `lastReelStopMs` có 4 phần tử tăng dần, phần tử đầu nằm trong `[eff(sfSpinBaseMs) - 30, eff(sfSpinBaseMs) + 60]`, mỗi khoảng cách nằm trong `eff(sfReelStopGapMs) ± 40`.
- [ ] C11.5. **Resolving và cast.** Bật Nhanh, ép F12 ở lượt người chơi. Khi đó:
  - `lastResolveMs` khớp công thức ở mục 4.10 với các khóa `eff(...)`, và thời gian `resolving` thật nằm trong `lastResolveMs ± 60` ms;
  - có 3 viên, theo thứ tự `heal`, `shield`, `damage`;
  - `launchMs` và `impactMs` khớp lịch đã co, thời điểm đo lệch không quá 40 ms;
  - giá trị hiển thị chỉ đổi khi từng viên trúng, như C8.7.

  Ép F0 thì `lastResolveMs === eff(sfBlankResolveMs)`.
- [ ] C11.6. **Chờ đối thủ.** Bật Nhanh trước khi lượt người chơi kết thúc. Khi đó `lastFoeDelayMs === eff(sfFoeDelayMs)`, và khoảng từ cuối `resolving` của người chơi tới lúc đối thủ bắt đầu quay nằm trong `eff(sfFoeDelayMs) ± 60` ms.
- [ ] C11.7. **Kết quả không đổi.** Chơi hết một trận chỉ bằng Space với `fastMode === false`, rồi `loadMatch` cùng seed và chơi lại với `fastMode === true`. Sau mỗi lượt, `grid`, `lastChains`, `lastEffects`, `player`, `foe` giống nhau, và `status`, `spinIndex` cuối giống nhau. Kiểm trên seed `sfSeed` và hai seed khác.
- [ ] C11.8. **Đổi giữa lượt áp từ lượt sau.**
  - Đang ở tốc độ thường, bấm F trong `spinning` của lượt người chơi: `fastMode === true`, nhưng lượt đó vẫn có `lastTimeScale === 1` và `lastReelStopMs` theo lịch thường. Lượt đối thủ kế tiếp, tính từ `foeWait`, có `lastTimeScale === sfFastFactor`.
  - Bấm F lần nữa trong `foeWait`: lượt đối thủ đó vẫn chạy nhanh hết lượt, và lượt người chơi kế tiếp có `lastTimeScale === 1`.
- [ ] C11.9. **Luật nhập liệu không đổi.** Khi bật Nhanh, quay trong `spinning` hoặc `resolving` vẫn bị từ chối với `busy` hoặc `notYourTurn` như C6.3. Bấm F khi `phase === 'ended'` vẫn đổi `fastMode`. Không có lượt nào của người chơi tự chạy nếu không bấm quay: chờ 5 giây ở `idle` thì `spinIndex` không đổi.
- [ ] C11.10. **Hệ số 1.** Khi `sfFastFactor = 1`, bật Nhanh thì `lastSpinMs`, `lastResolveMs` và `lastFoeDelayMs` bằng đúng giá trị ở tốc độ thường. Test khôi phục `TUNING` sau khi chạy.
- [ ] C11.11. **Layout.**
  - `layout.boxes.fastBtn` bằng `96, 832, 64, 64`; `helpBtn` bằng `20, 832, 64, 64`.
  - C7.2 vẫn đạt với `fastBtn`: không chồng hộp nào khác ngoài `panel`.
  - Ở 390x844, `#sf-fast` có kích thước ít nhất 44x44 px CSS và khớp hộp ±2 px.
  - Chữ "Nhanh" đạt C7.5 và C7.6 ở cả trạng thái bật và tắt.
  - Ở `/`, `/?game=arc-relay`, `/?game=gatefall`, nút `#sf-fast` không hiện.
- [ ] C11.12. **Ghi số, không xét đạt.** Trên tập nghiệm thu C10, ghi `estMatchMsMedianFast` và `estMatchMsP90Fast` cạnh `estMatchMsMedian` và `estMatchMsP90`, kèm giá trị `sfFastFactor` đang dùng.

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
- Có nhận ra ngay chuỗi nào gây ra hiệu ứng gì, và cho ai không, nhất là chuỗi chéo và các chuỗi chồng nhau?
- Cast có giúp dễ hiểu không? Nhịp cast có làm chậm lượt không?
- Khung quay 4x4 gần vuông có khớp với bản vẽ hơn không? Hai nhân vật nhỏ sát mép có đủ "có mặt" không?
- Cầm điện thoại dọc chơi một tay có thoải mái không? Nút "?" có dễ tìm không?
- Khi thua có thấy công bằng không?
- Icon May mắn chưa có tác dụng có gây hiểu nhầm không?
- 8 icon placeholder có dễ phân biệt không?
- Chủ đề và hình ảnh có gợi được bản sắc riêng không?

## Câu hỏi mở
- **Q1. Khắc hệ.** Hiện không khắc hệ. Ở bản 4, các hệ còn hiếm, nên nếu muốn hệ có vai trò rõ hơn thì cần quyết định: khắc hệ, tăng tần suất hệ để giảm Kiếm, hay giữ nguyên. Lựa chọn này đổi công thức sát thương hoặc bảng trọng số.
- **Q2. Đã chốt:** người chơi chỉ bấm quay.
- **Q3. Giới hạn lượt và hòa.** Hiện trận không có trần lượt. Trận 5 đến 7 phút làm câu hỏi này đáng cân nhắc hơn. Có nên có trần thời gian hay trần lượt, ai còn nhiều máu theo tỉ lệ thì thắng không? Lựa chọn này đổi điều kiện thắng thua.
- **Q4. Đối thủ.** Có cần đối thủ có trọng số hay chỉ số riêng không?
- **Q5. Màn ngang.** Hiện chỉ nhắm điện thoại dọc, màn ngang dùng letterbox. Có cần layout ngang riêng không?
- **Q6. Đã chốt:** người dùng chọn "Thêm quay nhanh". Không có autoplay. Xem mục 4.11 và C11.

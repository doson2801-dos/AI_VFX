# Game Brief: Arc Relay

## 1. Câu hỏi cần trả lời
Cú phóng theo tia sét có tạo nhịp chơi đã tay trong một ván dưới 60 giây không?

## 2. Core loop
Chạy và nhảy tới gần cột điện → bấm nhảy lần nữa trên không để phóng theo tia sét và thắp cột → bật lên từ cột, canh cú phóng tới cột kế tiếp cho tới khi thắp đủ.

## 3. Điều khiển
Dùng lại đúng input `left`, `right`, `jump` hiện có. Không thêm nút.

- Bàn phím: mũi tên hoặc A/D để di chuyển; Space, mũi tên lên hoặc W để nhảy và phóng; R để chơi lại.
- Cảm ứng: `#btn-left`, `#btn-right`, `#btn-jump`. Màn cảm ứng không có phím R nên nút nhảy là nút chơi lại sau khi ván kết thúc.

Thứ tự xử lý một lần bấm nhảy:

1. Đang đứng trên đất hoặc còn trong `coyoteMs`: nhảy thường.
2. Đang trên không và có cột hợp lệ: phóng.
3. Đang trên không và chưa có cột hợp lệ: giữ lần bấm trong `jumpBufferMs`. Nếu trong thời gian đó vào bán kính cột thì phóng, chạm đất thì nhảy.
4. Đang phóng: bỏ qua lần bấm.

Giữ nguyên nút nhảy không tính là bấm mới.

## 4. Luật chơi
- Điều kiện thắng: `pylonsLit === pylonsTotal` trước khi hết giờ. Thắng ngay khi tới cột cuối, không cần tiếp đất.
- Điều kiện thua: rơi xuống hố, chạm bẫy hoặc hết giờ.
- Điểm và phần thưởng: không có. Kết quả là thắng hoặc thua và thời gian còn lại.

### Luật cú phóng
- Cột hợp lệ là cột chưa thắp, có tâm neo cách tâm nhân vật không quá `arcRadius`. Nếu có nhiều cột, chọn cột gần nhất; bằng khoảng cách thì chọn `id` nhỏ hơn.
- Không cần đường nhìn thẳng. Cột không phải vật rắn và không thể thắp bằng cách chạm vào.
- Khi phóng, nhân vật đi thẳng tới tâm neo với tốc độ `arcSpeed`, không chịu trọng lực, không va chạm với đất hay bẫy và không nhận input di chuyển.
- Khi tới nơi, cột được thắp. Nếu chưa thắng, nhân vật nhận `vy = -arcExitJumpVelocity` và `vx = moveSpeed` theo hướng vừa phóng. Nếu phóng thẳng đứng thì `vx = 0`.
- Sau khi phóng, xóa jump buffer và coyote. Nhả nút nhảy không cắt lực bật từ cột.
- Cột đã thắp giữ nguyên trạng thái tới hết ván. Được thắp theo thứ tự bất kỳ.
- Hết giờ trong lúc phóng thì thua ngay. Nếu tới cột và hết giờ trong cùng khung hình, xử lý thắp cột trước.
- Cột hợp lệ đổi màu bằng tint placeholder để người chơi biết sẽ phóng tới đâu. Đây không phải hiệu ứng VFX.

### Kết thúc và chơi lại
- R chơi lại ngay ở mọi lúc.
- Sau khi thắng hoặc thua, nút nhảy chỉ chơi lại khi hết `arcRestartLockMs`, để người chơi đang bấm liên tục không bỏ qua kết quả.
- Nút nhảy còn được giữ từ ván trước không tạo cú nhảy ở ván mới.

## 5. Thông số cần tune

### 5.1. Thông số mới
Thêm vào `TUNING` và `TUNING_RANGES` trong `src/config.ts`.

| Tên | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `arcRadius` | 220 px | 160 đến 300 | 10 | Giữ nhỏ hơn khoảng cách cột gần nhất (320 px) để không nối cột ngay khi vừa tới |
| `arcSpeed` | 1400 px/s | 800 đến 2400 | 50 | Phóng hết bán kính đầu mất khoảng 157 ms |
| `arcExitJumpVelocity` | 520 px/s | 300 đến 700 | 10 | Bật cao khoảng 97 px, bay khoảng 0,96 giây |
| `arcTimeLimitMs` | 25000 ms | 15000 đến 55000 | 1000 | Luôn giữ ván dưới 60 giây |
| `arcRestartLockMs` | 400 ms | 0 đến 1000 | 50 | Chỉ khóa nút nhảy, không khóa R |

### 5.2. Thông số di chuyển dùng lại
Giữ nguyên giá trị và khoảng hiện có vì Coin Hop dùng chung. Không tune các giá trị này cho Arc Relay.

| Tên | Giá trị | Khoảng hiện có |
|---|---:|---:|
| `moveSpeed` | 260 | 80 đến 600 |
| `acceleration` | 2400 | 200 đến 6000 |
| `airControl` | 0.7 | 0 đến 1 |
| `gravity` | 1400 | 200 đến 3000 |
| `jumpVelocity` | 620 | 200 đến 1200 |
| `jumpCutMultiplier` | 0.5 | 0.1 đến 1 |
| `coyoteMs` | 90 | 0 đến 250 |
| `jumpBufferMs` | 110 | 0 đến 250 |

Với các giá trị này, nhảy thường cao khoảng 137 px và xa khoảng 230 px, nên không qua được hố rộng từ 340 px nếu không phóng.

### 5.3. Màn chơi
Thêm `ARC_LEVEL` riêng trong `src/config.ts`, không sửa `LEVEL`. Khung nhìn 960x540, màn rộng 2400 px, điểm xuất phát `(80, 470)`. Tọa độ là tâm vật thể.

| Loại | Dữ liệu |
|---|---|
| Đất (`y=520`, `h=40`) | `x=210,w=420`; `x=940,w=360`; `x=1610,w=300`; `x=2270,w=260` |
| Hố | 420 đến 760; 1120 đến 1460; 1760 đến 2140 |
| Bẫy (`w=40`, `h=24`) | `(940, 488)`; `(1610, 488)` |
| Cột (`id`: tâm neo) | `0: (590, 330)`; `1: (940, 300)`; `2: (1290, 320)`; `3: (1610, 300)`; `4: (1950, 330)` |

Khoảng cách giữa các cột liên tiếp từ 320 đến 350 px. Theo tính tay, sau khi bật từ một cột và giữ hướng tới, nhân vật vào bán kính cột kế tiếp trước khi rơi hết đường bay. QA phải xác nhận bằng bot ở tiêu chí C3.3.

## 6. Phạm vi
- Có làm:
  - Một màn chơi Arc Relay, mở bằng `/?game=arc-relay`, đồ họa placeholder.
  - Nhân vật tia điện nhỏ, chạy, nhảy, phóng; 5 cột; 2 bẫy; đồng hồ đếm ngược.
  - HUD chữ placeholder hiển thị số cột đã thắp và thời gian còn lại.
  - Đúng 2 hiệu ứng flipbook: `arc-bolt` khi bắt đầu phóng và `pylon-spark` khi thắp cột.
- Không làm: âm thanh, menu, lưu tiến trình, điểm số, nhiều màn, kẻ địch, hiệu ứng VFX thứ ba.
- Coin Hop giữ nguyên và vẫn là game mặc định. Tham số `game` khác `arc-relay` đều mở Coin Hop.
- Cổng kỹ thuật ngoài mục 8: `npm run verify` đạt, test Coin Hop hiện có vẫn đạt, Arc Relay không có lỗi console, debug API và bảng tune không lọt vào bản build.

### Giả định đã chọn
- Thắng ngay khi thắp cột cuối, không có cờ đích.
- Thắp theo thứ tự tự do, chọn cột gần nhất.
- Không có checkpoint. Nếu thắp cột rồi quay về đoạn đất không còn đường đi tiếp, ván kết thúc khi hết giờ hoặc người chơi bấm R.
- Thời gian đầu 25 giây tạo áp lực nhưng vẫn cho phép thử lại nhiều lần trong một phút.

## 7. Nền tảng đích
Web chung, desktop và mobile, khung nhìn 960x540. Không có giới hạn dung lượng riêng. Mỗi sprite sheet VFX không quá 1024 px theo skill `phaser-vfx`.

## 8. Tiêu chí hoàn thành (đo được)

### Trường trạng thái của Arc Relay
Trạng thái dưới đây chỉ có ở `/?game=arc-relay`. `getState()` của Coin Hop không đổi.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `gameId` | `'arc-relay'` | Game đang chạy |
| `status` | `'playing' \| 'won' \| 'lost'` | Trạng thái ván |
| `x`, `y`, `vx`, `vy` | `number` | Vị trí và vận tốc nhân vật |
| `grounded` | `boolean` | Đang đứng trên đất |
| `elapsedMs` | `number` | Thời gian đã chơi trong ván |
| `timeLimitMs` | `number` | Giới hạn thời gian của ván |
| `timeLeftMs` | `number` | `max(0, timeLimitMs - elapsedMs)` |
| `pylonsLit` | `number` | Số cột đã thắp |
| `pylonsTotal` | `number` | Tổng số cột |
| `pylons` | `{ id: number; x: number; y: number; lit: boolean }[]` | Danh sách cột |
| `arcTargetableId` | `number \| null` | Cột sẽ được chọn nếu bấm nhảy lúc này; `null` khi đang trên đất, đang phóng hoặc không có cột hợp lệ |
| `arcing` | `boolean` | Đang phóng |
| `arcTargetId` | `number \| null` | Cột đang phóng tới |
| `arcCount` | `number` | Số cú phóng đã bắt đầu trong ván |
| `loseReason` | `'pit' \| 'trap' \| 'timeout' \| null` | Lý do thua |
| `restartLockLeftMs` | `number` | Thời gian còn khóa nút nhảy sau khi kết thúc ván |
| `vfxKeys` | `string[]` | Khóa animation VFX đã đăng ký |
| `vfxPlays` | `{ 'arc-bolt': number; 'pylon-spark': number }` | Số lần đã phát mỗi hiệu ứng trong ván |

### Danh sách cơ chế theo thứ tự phụ thuộc

#### C1. Vào game và cú phóng tia sét
Phụ thuộc: không. Gồm route, màn chơi, di chuyển dùng lại, cột, chọn mục tiêu, phóng và thắp.

- [x] C1.1. Khi mở `/`, thì `gameId` không tồn tại, `totalCoins === 3`, và `Object.keys(getState())` đúng 9 trường hiện có của Coin Hop.
- [x] C1.2. Khi mở `/?game=khac`, thì trạng thái giống C1.1.
- [x] C1.3. Khi mở `/?game=arc-relay`, thì `gameId === 'arc-relay'`, `status === 'playing'`, `pylonsTotal === 5`, `pylons.length === 5`, `pylonsLit === 0`, `arcCount === 0`.
- [x] C1.4. Khi đứng trên đất trong bán kính cột và bấm nhảy, thì `arcCount` vẫn là `0` và `vy < 0`.
- [x] C1.5. Khi trên không, `arcTargetableId === 0` và bấm nhảy, thì `arcing === true`, `arcTargetId === 0`, `arcCount === 1`.
- [x] C1.6. Khi cú phóng ở C1.5 kết thúc, thì `arcing === false`, `pylons[0].lit === true`, `pylonsLit === 1`.
- [x] C1.7. Khi trên không ngoài bán kính mọi cột chưa thắp và bấm nhảy, thì `arcTargetableId === null` và `arcCount` không đổi.
- [x] C1.8. Khi trên không ở vị trí có hai cột trong bán kính, thì `arcTargetableId` là `id` của cột gần hơn.
- [x] C1.9. Khi cột đã thắp là cột duy nhất trong bán kính, thì `arcTargetableId === null`.
- [x] C1.10. Khi giữ nút nhảy từ lúc rời đất qua bán kính cột mà không nhả, thì `arcCount === 0`.
- [x] C1.11. Khi nhân vật đi xuyên vị trí cột mà không phóng, thì `pylonsLit` không đổi.

#### C2. Nhịp nối cú phóng
Phụ thuộc: C1. Gồm lực bật sau khi tới cột và jump buffer cho cú phóng.

- [x] C2.1. Khi cú phóng tới cột chưa phải cột cuối kết thúc, thì ở lần đọc đầu tiên có `arcing === false`, `vy < 0` và `grounded === false`.
- [x] C2.2. Khi phóng sang phải và giữ phải sau khi tới cột, thì `vx > 0` cho tới khi `arcTargetableId` chuyển sang cột kế tiếp hoặc nhân vật tiếp đất.
- [x] C2.3. Khi nhả nút nhảy ngay sau khi tới cột, thì `vy` vẫn đi theo đường bật đầy đủ: độ cao đỉnh đo từ `y` lệch không quá 12 px so với `arcExitJumpVelocity² / (2 × gravity)`.
- [x] C2.4. Khi bấm nhảy trong lúc `arcing === true`, thì `arcCount` không tăng trong lúc phóng đó.
- [x] C2.5. Khi bấm nhảy trên không ngay trước lúc vào bán kính, trong `jumpBufferMs`, thì `arcCount` tăng 1 mà không cần bấm lại.
- [x] C2.6. Khi bot nối từ cột `0` sang cột `1` không chạm đất, thì `pylonsLit === 2` và `grounded` luôn `false` giữa hai cú phóng.

#### C3. Thắng, thua và đồng hồ
Phụ thuộc: C1, C2.

- [x] C3.1. Khi đang chơi, thì `timeLeftMs === max(0, timeLimitMs - elapsedMs)` và giảm theo thời gian.
- [x] C3.2. Khi thắp cột cuối, thì `pylonsLit === pylonsTotal`, `status === 'won'`, `loseReason === null`, `arcing === false`.
- [x] C3.3. Khi bot chơi từ đầu đến cuối với thông số mặc định, thì `status === 'won'`, `pylonsLit === 5` và `elapsedMs < 20000`.
- [x] C3.4. Khi giữ phải từ điểm xuất phát và rơi xuống hố đầu, thì `status === 'lost'` và `loseReason === 'pit'`.
- [x] C3.5. Khi teleport xuống bẫy tại `(940, 470)`, thì `status === 'lost'` và `loseReason === 'trap'`.
- [x] C3.6. Khi đặt `tuning.arcTimeLimitMs = 2000`, restart rồi đứng yên, thì `status === 'lost'`, `loseReason === 'timeout'`, `timeLeftMs === 0`.
- [x] C3.7. Khi `status` là `won` hoặc `lost`, thì `elapsedMs`, `pylonsLit` và `arcCount` không đổi qua 500 ms.
- [x] C3.8. Với mọi giá trị của `arcTimeLimitMs` trong `TUNING_RANGES`, `timeLimitMs < 60000`.

#### C4. Chơi lại và cảm ứng
Phụ thuộc: C3.

- [x] C4.1. Khi bấm R lúc đang chơi hoặc sau khi kết thúc, thì `status === 'playing'`, `pylonsLit === 0`, `arcCount === 0`, `loseReason === null`, `elapsedMs < 200`.
- [x] C4.2. Khi ván vừa kết thúc và `restartLockLeftMs > 0`, bấm nhảy thì `status` không đổi.
- [x] C4.3. Khi `restartLockLeftMs === 0` và bấm nhảy, thì trạng thái được đặt lại như C4.1.
- [x] C4.4. Khi nút nhảy dùng để chơi lại vẫn được giữ, thì sau 300 ms ở ván mới `grounded === true` và `arcCount === 0`.
- [x] C4.5. Khi dùng phím thật (phải và Space) để nhảy rồi bấm Space lần nữa trong bán kính cột, thì `arcCount === 1`.
- [x] C4.6. Ở viewport cảm ứng, khi dùng `#btn-right` và `#btn-jump` để nhảy rồi phóng, thì `arcCount === 1` và `pylonsLit === 1`.
- [x] C4.7. Ở viewport cảm ứng, sau khi thua và hết khóa, bấm `#btn-jump` thì `status === 'playing'` và `pylonsLit === 0`.

#### C5. Hai hiệu ứng flipbook
Phụ thuộc: C1 đến C4. Hiệu ứng không được đổi kết quả gameplay.

- [x] C5.1. Khi Arc Relay sẵn sàng, thì `vfxKeys` chứa đúng hai phần tử `arc-bolt` và `pylon-spark`.
- [x] C5.2. Sau mỗi cú phóng bắt đầu, thì `vfxPlays['arc-bolt'] === arcCount`.
- [x] C5.3. Sau mỗi cột được thắp, thì `vfxPlays['pylon-spark'] === pylonsLit`.
- [x] C5.4. Khi bot chạy lại kịch bản C3.3 có VFX, thì vẫn đạt `status === 'won'`, `pylonsLit === 5` và `elapsedMs < 20000`.

## 9. Người chơi cần tự đánh giá
Test tự động không kết luận được game có vui hay không. Người chơi cần tự đánh giá:

- Cú phóng có đã tay không, nhất là độ khựng, tốc độ và lực bật sau khi thắp cột.
- Nhịp nối nhiều cột có tạo được cảm giác dòng chảy, hay bị rời rạc.
- Bán kính phóng quá dễ hay quá khó, và tint có cho biết rõ cột sắp phóng tới không.
- 25 giây tạo áp lực vừa đủ hay gây ức chế.
- Sau một ván có muốn chơi lại ngay không.
- Hai hiệu ứng có làm cú phóng rõ và mạnh hơn, hay che mất nhân vật và đường đi.
- Điều khiển trên cảm ứng có kịp nhịp bấm hai lần không.

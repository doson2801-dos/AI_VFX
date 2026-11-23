# Game Brief: Gatefall (tên tạm)

## 1. Câu hỏi cần trả lời
Khi mỗi lần nghiêng bàn là lựa chọn giữa bốn đợt quân đã nhìn thấy trước, người chơi có đưa ra được quyết định thật sự làm tăng cơ hội thắng không?

Phần đo được bằng bot nằm ở C4.6: cùng một thuật toán, bot nhìn cửa nạp phải thắng nhiều hơn bot không nhìn cửa nạp. Việc quyết định đó có vui không do người chơi thật đánh giá ở mục 9.

## 2. Core loop
Đọc bàn và bốn cửa nạp → nghiêng bàn theo một hướng để kéo đợt quân của cửa đó vào → cụm 3+ nổ, cascade và tiến độ màu tăng → cửa vừa dùng hiện đợt mới → chọn hướng tiếp theo cho tới khi đủ mục tiêu hoặc hết lượt nghiêng.

## 3. Điều khiển
Trò chơi theo lượt, không có đồng hồ. Không dùng lại nút `#btn-left`, `#btn-right`, `#btn-jump`; các nút này bị ẩn trong Gatefall.

| Hành động | Bàn phím | Cảm ứng |
|---|---|---|
| Nghiêng lên, phải, xuống, trái | Phím mũi tên tương ứng | Vuốt theo hướng đó, bắt đầu ở bất kỳ đâu trên canvas |
| Thử lại ngay | R, dùng được mọi lúc | Nút `#gf-retry`, dùng được mọi lúc |
| Sang màn kế sau khi thắng | Enter | Nút `#gf-next`, chỉ hiện sau khi thắng |

- Một lần vuốt được nhận ngay khi quãng đường đạt `gfSwipeMinPx`, không cần nhấc tay. Trục dài phải lớn hơn trục ngắn ít nhất `gfSwipeAxisRatio` lần, nếu không thì bỏ qua.
- Mỗi lần chạm chỉ tạo tối đa một lần nghiêng. Muốn nghiêng tiếp phải nhấc tay rồi vuốt lại.
- Giữ phím không lặp lại lần nghiêng. Tự động lặp của hệ điều hành bị lọc.
- Bản đầu khóa nhập trong lúc diễn hoạt. Lệnh nghiêng nhận trong lúc này bị bỏ, không xếp hàng.
- `#gf-retry` và `#gf-next` chỉ hiện trong Gatefall. `#gf-retry` hiện trên thiết bị `pointer: coarse`.

## 4. Luật chơi
- Điều kiện thắng: khi kết thúc xử lý một lần nghiêng, mọi màu mục tiêu có `collected >= target`.
- Điều kiện thua: chưa thắng và `tiltsLeft === 0`. Lý do thua duy nhất là `outOfTilts`.
- Điểm và phần thưởng: không có điểm. Kết quả là thắng hoặc thua, kèm số lượt nghiêng còn lại.

### 4.1. Bàn và hệ tọa độ
- Bàn vuông `gfBoardSize` x `gfBoardSize`. `x` tăng sang phải, `y` tăng xuống dưới, ô `(0, 0)` ở góc trên trái.
- Mỗi ô trống hoặc chứa đúng một quân. Không có tường, blocker hay quân đặc biệt.
- Thứ tự quét chuẩn là `y` tăng dần, trong cùng hàng thì `x` tăng dần.
- Thứ tự hướng chuẩn là `up`, `right`, `down`, `left`.
- Mỗi màu có một hình riêng để không phụ thuộc vào khả năng phân biệt màu.

### 4.2. Bốn cửa nạp
Cửa mang tên hướng nghiêng và nằm ở **cạnh đối diện** với hướng đó, để quân đi vào cùng chiều trọng lực.

| Hướng nghiêng | Cạnh đặt cửa | Làn | Quân dồn về |
|---|---|---|---|
| `up` | Dưới | `x` | `y = 0` |
| `right` | Trái | `y` | `x = size - 1` |
| `down` | Trên | `x` | `y = size - 1` |
| `left` | Phải | `y` | `x = 0` |

- Mỗi cửa có `size` khe, mỗi khe ứng với một làn và chứa một quân hoặc `null`.
- Mỗi cửa luôn có đúng `gfWaveSize` quân nhìn thấy khi người chơi được nhập lệnh, trừ fixture của test.
- Chỉ cửa của hướng vừa nghiêng được dùng. Ba cửa còn lại giữ nguyên, nên người chơi có thể để dành một đợt tốt cho lượt sau.
- Không có quân ẩn đi vào trong lượt. Toàn bộ quân có thể vào ở lượt này đều đang hiển thị.

### 4.3. Thứ tự xử lý một lần nghiêng
1. **Kiểm tra.** Lần nghiêng hợp lệ khi có ít nhất một quân sẽ di chuyển, hoặc có ít nhất một quân trong cửa của hướng đó nằm ở làn còn ô trống.
2. **Từ chối nếu không hợp lệ.** Không trừ lượt, không đổi bàn, cửa, RNG hay hash. Chỉ tăng `rejectedTilts`, phát `tiltRejected` và kết thúc.
3. **Trừ lượt.** `tiltsUsed += 1`, `tiltsLeft -= 1`.
4. **Trượt.** Trong từng làn, các quân dồn về phía hướng nghiêng và giữ nguyên thứ tự tương đối.
5. **Nạp.** Duyệt khe theo làn tăng dần. Làn còn ô trống thì quân của khe vào ô trống gần đích nhất và khe thành `null`. Làn đầy thì quân ở lại khe. Mỗi làn nhận tối đa một quân.
6. **Giải cụm**, bắt đầu với `chain = 1`:
   1. Quét toàn bàn theo thứ tự chuẩn. Từ mỗi ô chưa thăm, loang 4 hướng qua các ô cùng màu để lấy thành phần liên thông.
   2. Thành phần có từ 3 ô trở lên là một cụm. Chỉ số cụm theo thứ tự ô đầu tiên của cụm trong phép quét. Ô trong cụm cũng liệt kê theo thứ tự quét.
   3. Nếu không có cụm thì sang bước 7.
   4. Xóa **đồng thời** mọi cụm. Mỗi ô chỉ thuộc một cụm và được tính đúng một lần. Cộng kích thước cụm vào `collected` của màu đó, kể cả khi đã vượt mục tiêu.
   5. Trượt lại theo cùng hướng. **Không nạp thêm quân trong cascade.**
   6. `chain += 1`, quay lại bước 6.1.
7. **Bổ sung cửa vừa dùng.** Trong khi cửa chưa đủ `gfWaveSize` quân: lấy danh sách khe trống theo làn tăng dần, chọn khe bằng `rng.int(số khe trống)`, rồi chọn màu bằng `rng.int(colorCount)` từ luồng RNG của cửa đó. Quân còn ở lại khe được giữ nguyên.
8. **Kết lượt**, theo đúng thứ tự:
   1. Đủ mọi mục tiêu thì `status = 'won'` và dừng.
   2. `tiltsLeft === 0` thì `status = 'lost'` và dừng.
   3. Bàn đầy thì **xả bàn** theo mục 4.4.
   4. Sau khi xả, nếu `tiltsLeft === 0` thì `status = 'lost'`.

Vì các cụm rời nhau và được xóa cùng lúc, kết quả không phụ thuộc thứ tự quét. Thứ tự quét chỉ quyết định thứ tự sự kiện.

### 4.4. Bế tắc và xả bàn
Sau bước 6, bàn không còn cụm. Khi đó bế tắc xảy ra **khi và chỉ khi bàn đầy**: bàn còn cả quân lẫn ô trống thì luôn có một cặp ô kề để nghiêng; bàn rỗng thì cửa nạp vẫn còn quân.

Khi bàn đầy:

- Xóa toàn bộ hàng hoặc cột sát cửa vừa dùng, tức `y = 0` với `down`, `y = size - 1` với `up`, `x = 0` với `right`, `x = size - 1` với `left`.
- Quân bị xả **không** cộng vào `collected`.
- `ventCount += 1`, `tiltsLeft = max(0, tiltsLeft - gfVentTiltCost)`.
- Không dùng RNG, không xáo bàn và không xét màu, nên xả bàn không phải trợ giúp ẩn.

### 4.5. Tính xác định
- PRNG là `mulberry32`, trạng thái `uint32`. `next()` trả về số trong `[0, 1)`; `int(n) = floor(next() * n)`.
- Có 5 luồng độc lập: `board = 0`, `up = 1`, `right = 2`, `down = 3`, `left = 4`. Hạt của luồng `k` là `(seed + Math.imul(k + 1, 0x9E3779B9)) >>> 0`.
- Logic không dùng `Math.random`, thời gian thực hay dữ liệu hiển thị.
- Quân sắp vào chỉ phụ thuộc seed, luồng của cửa và số quân cửa đó đã rút. Không đọc bàn, tiến độ hay số lần thua. **Không có refill thiên lệch.**

Khởi tạo màn:

1. Tạo danh sách chỉ số ô, xáo Fisher-Yates từ cuối về đầu bằng luồng `board` (`j = int(i + 1)`), lấy `gfInitialPieces` ô đầu làm ô có quân.
2. Duyệt các ô có quân theo thứ tự quét. Chọn `color = int(colorCount)`. Nếu đặt màu đó tạo thành phần từ 3 ô trở lên thì thử `(color + 1) % colorCount`. Mỗi ô khi đặt chỉ có tối đa hai láng giềng đã đặt (trái, trên), nên với `colorCount >= 3` luôn có màu hợp lệ.
3. Rút đợt đầu cho từng cửa bằng luật ở bước 7.

Bàn khởi tạo **không** được sinh lại khi thiếu nước tốt, để C4.4 đo đúng bộ sinh.

### 4.6. Hash trạng thái
`stateHash` là FNV-1a 32 bit, dạng 8 ký tự hex thường, tính trên chuỗi ASCII:

```text
v1|L<levelIndex>|S<seed>|<status>|T<tiltsUsed>/<tiltsLeft>|B<ô theo thứ tự quét>|G<up>/<right>/<down>/<left>|C<collected theo màu, nối bằng dấu phẩy>|V<ventCount>|R<5 trạng thái RNG, nối bằng dấu phẩy>
```

Ô hoặc khe trống ghi `.`, có quân ghi chữ số màu. Hash không gồm `rejectedTilts`, id quân và trạng thái diễn hoạt.

### 4.7. Danh sách sự kiện
Logic trả về một mảng sự kiện có thứ tự. Lớp hình ảnh chỉ phát lại mảng này và không tự tính luật. Mọi sự kiện có `seq` tăng liên tục từ 0 trong mỗi lần nghiêng.

| Thứ tự | `type` | Trường riêng |
|---|---|---|
| 1 | `tiltStart` | `dir`, `tiltsLeft` |
| 2 | `move` (`chain = 0`) | `pieceId`, `from`, `to`, `chain` |
| 3 | `enter` | `pieceId`, `dir`, `lane`, `to`, `color` |
| 4, lặp theo chain | `clusterClear` | `chain`, `clusterIndex`, `color`, `cells` |
| 5, lặp theo chain | `move` (`chain >= 1`) | `pieceId`, `from`, `to`, `chain` |
| 6 | `gateRefill` | `dir`, `lane`, `color`, `pieceId` |
| 7, nếu có | `vent` | `dir`, `cells`, `tiltCost` |
| 8 | `turnEnd` | `status`, `tiltsLeft`, `stateHash` |

Lần nghiêng bị từ chối chỉ có một sự kiện `tiltRejected` với `dir`. Sự kiện `move` trong cùng pha sắp theo thứ tự quét của ô `from`.

### 4.8. Màn chơi
Có 3 màn. Bàn sinh từ seed riêng của dự án. Màu mục tiêu là `gfL<n>GoalColors` màu đầu tiên, tính từ màu `0`, mỗi màu cần `gfL<n>GoalCount` quân.

- Thử lại dùng **cùng seed**, để người chơi quy được kết quả về quyết định của mình.
- Thắng màn 3 thì `campaignComplete = true`. Bấm sang màn kế sẽ về màn 1.
- Tham số `TUNING` được chụp lại khi bắt đầu hoặc thử lại màn. Đổi thanh tune giữa màn không ảnh hưởng tới màn đang chơi.

## 5. Thông số cần tune
Toàn bộ nằm trong `TUNING` và `TUNING_RANGES` ở `src/config.ts`. Số liệu màn là ước tính tay, **chưa được mô phỏng**. Balance Tuner chỉnh sau khi có bot ở C4.

### 5.1. Bàn và luật
| Tên | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `gfBoardSize` | 7 | 6 đến 8 | 1 | Số ô mỗi cạnh |
| `gfInitialPieces` | 24 | 16 đến 34 | 1 | Luôn nhỏ hơn số ô của bàn nhỏ nhất |
| `gfWaveSize` | 3 | 2 đến 5 | 1 | Số quân trong mỗi cửa |
| `gfVentTiltCost` | 2 | 1 đến 4 | 1 | Lượt bị trừ thêm khi xả bàn |

### 5.2. Màn chơi
| Tên | Màn 1 | Màn 2 | Màn 3 | Khoảng thử | Bước |
|---|---:|---:|---:|---:|---:|
| `gfL<n>Seed` | 101 | 202 | 303 | 1 đến 999 | 1 |
| `gfL<n>Colors` | 4 | 5 | 5 | 3 đến 6 | 1 |
| `gfL<n>TiltLimit` | 20 | 22 | 24 | 12 đến 32 | 1 |
| `gfL<n>GoalColors` | 2 | 3 | 3 | 1 đến 3 | 1 |
| `gfL<n>GoalCount` | 12 | 9 | 11 | 4 đến 24 | 1 |

Seed màn nằm ngoài tập seed đo ở C4 để tránh đo trên chính dữ liệu đã chọn.

### 5.3. Nhịp diễn hoạt và nhập liệu
| Tên | Giá trị đầu | Khoảng thử | Bước | Ghi chú |
|---|---:|---:|---:|---|
| `gfSlideMsPerCell` | 45 ms | 20 đến 90 | 5 | Thời gian trượt mỗi ô |
| `gfSlideMaxMs` | 220 ms | 120 đến 400 | 10 | Trần thời gian một pha trượt |
| `gfEnterMs` | 120 ms | 60 đến 240 | 10 | Quân từ cửa vào bàn |
| `gfClearPrepMs` | 60 ms | 0 đến 120 | 10 | Nhịp chuẩn bị trước khi nổ |
| `gfClearMs` | 180 ms | 100 đến 300 | 10 | Nổ cụm |
| `gfChainPauseMs` | 80 ms | 0 đến 160 | 10 | Nghỉ giữa hai bước cascade |
| `gfVentMs` | 300 ms | 150 đến 600 | 10 | Diễn hoạt xả bàn |
| `gfRejectShakeMs` | 80 ms | 0 đến 200 | 10 | Rung báo nghiêng không hợp lệ, không khóa nhập |
| `gfSwipeMinPx` | 28 px | 12 đến 64 | 2 | Quãng đường vuốt tối thiểu, tính theo tọa độ game |
| `gfSwipeAxisRatio` | 1.2 | 1 đến 2 | 0.1 | Độ lệch trục tối thiểu |
| `gfEndLockMs` | 300 ms | 0 đến 800 | 50 | Chỉ khóa sang màn kế, không khóa thử lại |

Thời lượng diễn hoạt của một lần nghiêng, trả về trong `animMs`:

```text
slide(n) = n === 0 ? 0 : min(gfSlideMaxMs, n * gfSlideMsPerCell)
animMs = slide(số ô xa nhất ở pha trượt đầu)
       + (có quân vào ? gfEnterMs : 0)
       + tổng theo mỗi chain có cụm [gfClearPrepMs + gfClearMs + slide(số ô xa nhất của chain) + gfChainPauseMs]
       + (có xả bàn ? gfVentMs : 0)
```

## 6. Phạm vi
- Có làm:
  - Gatefall mở bằng `/?game=gatefall`, đồ họa placeholder hình học.
  - Bàn lưới, nghiêng 4 hướng, bốn cửa nạp nhìn thấy trước, cụm 3+, cascade, xả bàn.
  - Mục tiêu thu thập theo màu, giới hạn số lần nghiêng, 3 màn, thử lại tức thì, màn hình thắng và thua rõ ràng.
  - HUD chữ placeholder: màn, số lượt còn lại, tiến độ từng màu.
  - Lõi logic thuần tách khỏi Phaser, phát danh sách sự kiện có thứ tự.
- Không làm: quân đặc biệt, combo, booster, blocker, meta, cửa hàng, lives, âm nhạc, âm thanh, refill thiên lệch, điểm số, menu, bản đồ màn, lưu tiến trình, gợi ý nước đi, hoàn tác, nhập đệm, VFX flipbook.
- Coin Hop vẫn là game mặc định. Arc Relay vẫn mở bằng `/?game=arc-relay`. Tham số `game` không hợp lệ mở Coin Hop.

### Yêu cầu kỹ thuật
- Logic bàn cờ là module TypeScript thuần, không import Phaser, không đọc DOM. Scene chỉ gọi logic và phát lại sự kiện.
- Scene Gatefall dùng key `game` để debug API hiện có đọc được.
- `getState()` của Coin Hop và Arc Relay không đổi.
- Debug API chỉ có trong bản dev, thêm nhóm `window.__game.gatefall`:

```ts
interface GatefallDebug {
  loadLevel(levelIndex: number, seed?: number): void;
  loadFixture(fixture: GatefallFixture): void;       // nạp vào scene đang chạy
  tilt(dir: Dir): boolean;                           // false nếu bị từ chối hoặc đang khóa nhập
  createSim(levelIndex: number, seed: number, fixture?: GatefallFixture): GatefallSim;
}

interface GatefallSim {
  getState(): GatefallLogicState;
  validTilts(): Dir[];
  tilt(dir: Dir): { accepted: boolean; events: GatefallEvent[]; animMs: number };
  preview(dir: Dir, options: { useGates: boolean }): {
    valid: boolean; useful: number; cleared: number; wouldVent: boolean;
  };
}

interface GatefallFixture {
  board: (number | null)[][];                        // board[y][x]
  gates: Record<Dir, (number | null)[]>;
  tiltsLeft?: number;
  collected?: number[];
}
```

- `preview` không đổi trạng thái. `useGates: false` bỏ bước nạp và bổ sung cửa. `useful` là tổng theo màu mục tiêu của `min(remaining, số quân màu đó được xóa)`. `wouldVent` là `true` khi lần nghiêng đó sẽ phát sự kiện `vent` theo đúng thứ tự kết lượt ở mục 4.3.
- Fixture bỏ qua bước khởi tạo bàn và cửa ở mục 4.5. Năm luồng RNG bắt đầu từ hạt của `seed`, chưa rút số nào. `tiltsLeft` mặc định là `tiltLimit`, `collected` mặc định toàn 0.
- Cổng kỹ thuật ngoài mục 8: `npm run verify` đạt, test Coin Hop và Arc Relay hiện có vẫn đạt, Gatefall không có lỗi console, debug API và bảng tune không lọt vào `dist/`.

### Giả định đã chọn
- Quân vào từ cạnh đối diện hướng nghiêng, vì khi đó mũi tên, chiều vuốt và chiều quân chạy trùng nhau.
- Quân chỉ vào một lần, trước lần giải cụm đầu. Nhờ vậy kết quả của mỗi nước tính được hoàn toàn từ thông tin đang hiển thị.
- Chỉ cửa vừa dùng được bổ sung, để đợt quân chưa dùng trở thành thứ có thể để dành.
- Nghiêng không làm bàn đổi thì không mất lượt.
- Cụm là thành phần liên thông 4 hướng, không yêu cầu thẳng hàng.
- Bế tắc được xử lý bằng xả bàn có phạt lượt, không xáo bàn và không xử thua ngay.
- Không dùng blocker: mục tiêu màu và bốn cửa đã đủ tạo lựa chọn, thêm blocker sẽ làm nhiễu phép đo ở C4.6.
- Thử lại giữ nguyên seed.
- Thời gian suy nghĩ giả định 3 giây mỗi nước, chỉ dùng để ước tính độ dài lần thử.

## 7. Nền tảng đích
Web chung, desktop và mobile ngang, khung nhìn 960x540. Không có giới hạn dung lượng riêng và không tải asset ngoài.

## 8. Tiêu chí hoàn thành (đo được)

### Trường trạng thái của Gatefall
Các trường dưới đây chỉ có ở `/?game=gatefall`.

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `gameId` | `'gatefall'` | Game đang chạy |
| `status` | `'playing' \| 'won' \| 'lost'` | Trạng thái logic, cập nhật ngay sau khi xử lý nước |
| `loseReason` | `'outOfTilts' \| null` | Lý do thua |
| `levelIndex`, `levelCount` | `number` | Màn hiện tại tính từ 0, tổng số màn |
| `campaignComplete` | `boolean` | Đã thắng màn cuối |
| `seed` | `number` | Seed màn |
| `boardSize`, `colorCount`, `waveSize` | `number` | Cấu hình màn |
| `board` | `(number \| null)[][]` | `board[y][x]` là màu hoặc `null` |
| `gates` | `Record<'up' \| 'right' \| 'down' \| 'left', (number \| null)[]>` | Khe của từng cửa |
| `goals` | `{ color: number; target: number; collected: number; remaining: number }[]` | Mục tiêu, `remaining = max(0, target - collected)` |
| `collected` | `number[]` | Tổng quân đã nổ theo màu |
| `tiltLimit`, `tiltsLeft`, `tiltsUsed` | `number` | Ngân sách và số lần nghiêng |
| `rejectedTilts` | `number` | Số lần nghiêng bị từ chối trong lần thử |
| `ventCount` | `number` | Số lần xả bàn |
| `validTilts` | `Dir[]` | Hướng hợp lệ, theo thứ tự chuẩn; rỗng khi ván đã kết thúc |
| `lastTiltDir` | `Dir \| null` | Hướng được chấp nhận gần nhất |
| `lastChain` | `number` | Số bước cascade có cụm của lần nghiêng gần nhất |
| `lastEvents` | `GatefallEvent[]` | Sự kiện của lần xử lý gần nhất |
| `lastAnimMs` | `number` | `animMs` của lần nghiêng gần nhất |
| `animating` | `boolean` | Lớp hình ảnh đang phát sự kiện và đang khóa nhập |
| `endLockLeftMs` | `number` | Thời gian còn khóa sang màn kế |
| `viewCounts` | `{ pieces: number; gatePieces: number }` | Số sprite quân trên bàn và trong cửa |
| `rejectFeedbacks` | `number` | Số lần đã phát phản hồi nghiêng không hợp lệ |
| `stateHash` | `string` | Hash theo mục 4.6 |

### Fixture dùng chung
Bàn 7x7, cửa rỗng nếu không nêu, dùng cấu hình màn 1. Ghi `(x, y) = màu`.

| Mã | Dữ liệu |
|---|---|
| F1 | `(2,1)=0`, `(2,4)=1` |
| F2 | `(0,5)=1`, `(1,6)=1`, `(2,5)=1`, `(4,5)=0`, `(5,6)=0`, `(6,5)=0` |
| F3 | `(2,5)=0`, `(3,3)=0`, `(3,4)=0`, `(4,5)=0` |
| F4 | `(0,4)=2`, `(0,5)=0`, `(1,4)=1`, `(1,5)=0`, `(2,4)=1`, `(2,5)=0`, `(3,5)=1` |
| F5 | `(2,5)=3`, `(2,6)=3`, `gates.down[2]=3` |
| F6 | Cột `x=2` đầy, màu `y % 2`; `(4,0)=2`; `gates.down[2]=2` |
| F7 | Mọi ô màu `(x + 2y) % 4`, riêng `(0,0)` trống; `gates.down[0]=0` |

### Danh sách cơ chế theo thứ tự phụ thuộc

#### C1. Lõi bàn cờ xác định
Phụ thuộc: không. Gồm route, scene tối thiểu, RNG, khởi tạo bàn, trượt, tìm cụm, cascade, sự kiện, hash, `createSim`. Cửa nạp để rỗng tới C2.

- [ ] C1.1. Khi mở `/`, thì `gameId` không tồn tại, `totalCoins === 3` và `Object.keys(getState())` đúng 9 trường của Coin Hop.
- [ ] C1.2. Khi mở `/?game=khac`, thì trạng thái giống C1.1; khi mở `/?game=arc-relay`, thì `gameId === 'arc-relay'`.
- [ ] C1.3. Khi mở `/?game=gatefall`, thì `gameId === 'gatefall'`, `status === 'playing'`, `levelIndex === 0`, `levelCount === 3`, `boardSize === 7`, `tiltsUsed === 0`, `stateHash` khớp `/^[0-9a-f]{8}$/`.
- [ ] C1.4. Khi tạo sim cho 3 màn với seed 1 đến 200, thì mỗi `board` có đúng `gfInitialPieces` quân, mọi màu nằm trong `[0, colorCount)` và không có thành phần cùng màu nào từ 3 ô.
- [ ] C1.5. Khi nghiêng `down` trên F1, thì `board[6][2] === 1`, `board[5][2] === 0` và bàn còn đúng 2 quân.
- [ ] C1.6. Khi nghiêng `down` trên F2, thì `lastChain === 1`, có 2 sự kiện `clusterClear`, cụm `clusterIndex === 0` có `color === 1`, `collected[0] === 3`, `collected[1] === 3` và bàn rỗng.
- [ ] C1.7. Khi nghiêng `down` trên F3, thì có đúng một cụm 4 ô, `collected[0] === 4` và bàn rỗng.
- [ ] C1.8. Khi nghiêng `down` trên F4, thì `lastChain === 2`, `collected[0] === 3`, `collected[1] === 3`, bàn chỉ còn `board[6][0] === 2`.
- [ ] C1.9. Khi nghiêng `down` trên bàn chỉ có `(0,6)=0` và cửa rỗng, thì `accepted === false`, `stateHash` và `tiltsLeft` không đổi, `rejectedTilts` tăng 1, sự kiện duy nhất là `tiltRejected`.
- [ ] C1.10. Khi chạy hai lần cùng seed và cùng chuỗi tối đa 30 nước hợp lệ, dừng sớm nếu ván kết thúc hoặc `validTilts` rỗng, trên 200 seed, thì `stateHash` và JSON của `lastEvents` giống nhau ở từng bước.
- [ ] C1.11. Khi hai fixture chỉ khác màu của một ô, thì `stateHash` khác nhau.
- [ ] C1.12. Với mọi lần nghiêng được chấp nhận ở C1.10, thì `seq` tăng liên tục từ 0, sự kiện đầu là `tiltStart`, sự kiện cuối là `turnEnd`, và `turnEnd.stateHash === stateHash`.

#### C2. Bốn cửa nạp
Phụ thuộc: C1. Đây là điểm khác biệt của prototype.

- [ ] C2.1. Khi tạo sim với seed 1 đến 200, thì mỗi cửa có `boardSize` khe, đúng `waveSize` quân, và mọi màu nằm trong `[0, colorCount)`.
- [ ] C2.2. Khi bàn rỗng và khe làn 3 của cửa có màu `c`, nghiêng `down`, `up`, `left`, `right` thì quân lần lượt tới `(3,6)`, `(3,0)`, `(0,3)`, `(6,3)`.
- [ ] C2.3. Khi nghiêng `down` trên F5, thì có một `enter` trước `clusterClear`, `collected[3] === 3` và cột `x=2` rỗng.
- [ ] C2.4. Khi nghiêng `down` trên F6, thì `gates.down[2] === 2`, cột `x=2` không đổi và cửa `down` có đúng `waveSize` quân.
- [ ] C2.5. Với mọi lần nghiêng trong 200 seed, thì số sự kiện `enter` không quá `waveSize` và không có `enter` nào sau `clusterClear` đầu tiên.
- [ ] C2.6. Sau mỗi lần nghiêng được chấp nhận, thì ba cửa không được dùng giống hệt trước đó và cửa được dùng có đúng `waveSize` quân.
- [ ] C2.7. Khi hai fixture có bàn khác nhau, cùng seed, cùng cửa rỗng, cùng nghiêng `down` 3 lần và mọi quân đều vào được, thì `gates.down` giống nhau sau mỗi lần. Đây là phép thử không có refill theo tình trạng bàn.
- [ ] C2.8. Khi chạy lại C1.10 với cửa nạp bật, thì `stateHash` và `lastEvents` vẫn giống nhau ở từng bước.

#### C3. Mục tiêu, thắng thua và xả bàn
Phụ thuộc: C1, C2.

- [ ] C3.1. Khi tạo từng màn, thì `colorCount`, `tiltLimit`, `seed`, số phần tử `goals` và `target` khớp các khóa `gfL<n>*` trong `window.__game.tuning`, và `goals[i].color === i`.
- [ ] C3.2. Khi `collected` của màu mục tiêu vượt `target`, thì `collected` giữ giá trị thật và `remaining === 0`.
- [ ] C3.3. Khi dùng F4 với `tiltsLeft = 1`, `collected[0] = target`, `collected[1] = target - 3`, thì sau khi nghiêng `down`, `status === 'won'`, `loseReason === null`, `tiltsLeft === 0`. Chiến thắng chỉ đạt nhờ cascade bước 2.
- [ ] C3.4. Khi dùng F1 với `tiltsLeft = 1` và nghiêng `down`, thì `status === 'lost'`, `loseReason === 'outOfTilts'`.
- [ ] C3.5. Khi nghiêng `down` trên F7 với `tiltsLeft = 10`, thì `ventCount === 1`, `tiltsLeft === 7`, hàng `y = 0` rỗng, bàn còn 42 quân và `collected` không đổi.
- [ ] C3.6. Khi nghiêng `down` trên F7 với `tiltsLeft = 2`, thì `ventCount === 1`, `tiltsLeft === 0`, `status === 'lost'`.
- [ ] C3.7. Khi chơi ngẫu nhiên hết ván trên 200 seed mỗi màn, thì ở mọi trạng thái `playing` có `validTilts.length >= 1`, và luôn có `tiltsLeft === max(0, tiltLimit - tiltsUsed - ventCount * gfVentTiltCost)`.
- [ ] C3.8. Khi `status` là `won` hoặc `lost` và gọi `tilt`, thì `accepted === false`, `stateHash` không đổi và `validTilts` rỗng.

#### C4. Phép đo bằng bot
Phụ thuộc: C1 đến C3. Làm **trước** phần hình ảnh để biết sớm điểm khác biệt có giá trị không. Gồm `preview`, `animMs` và bộ bot trong `tests/`, chạy qua `createSim`.

Định nghĩa đo:

- **Bot R (ngẫu nhiên):** chọn đều trong `validTilts`.
- **Bot B (tham lam, không nhìn cửa):** với mỗi hướng trong `validTilts`, gọi `preview(dir, { useGates: false })`.
- **Bot G (tham lam, nhìn cửa):** giống hệt bot B nhưng gọi `preview(dir, { useGates: true })`. Đây là bot có chiến lược.
- Điểm của một hướng: `10 * useful + cleared - 30 * (wouldVent ? 1 : 0)`. Bằng điểm thì chọn bằng RNG riêng của bot, hạt `(seed ^ 0x5bd1e995) >>> 0`.
- **Tập seed nghiệm thu:** 5000 đến 5399, 400 seed cho mỗi màn, các bot chơi cùng seed. **Tập seed để tune:** 1000 đến 1399. Không tune trên tập nghiệm thu.
- `winRate` là tỷ lệ ván có `status === 'won'`. Khoảng cách tính bằng điểm phần trăm.
- **Thời lượng ước tính** của một lần thử: tổng theo các nước của `3000 + animMs`, đơn vị ms.

Các ngưỡng dưới đây là giả định ban đầu.

- [ ] C4.1. Khi gọi `preview` trên mọi hướng ở 200 trạng thái ngẫu nhiên, thì `stateHash` không đổi; với `useGates: true`, `cleared` và `wouldVent` khớp kết quả `tilt` thật của hướng đó.
- [ ] C4.2. Khi hai trạng thái có cùng bàn và mục tiêu nhưng khác cửa, thì `preview(dir, { useGates: false })` trả về cùng `useful`, `cleared`, `wouldVent` ở những hướng có quân di chuyển.
- [ ] C4.3. Khi tạo 1000 bàn khởi tạo cho mỗi màn (seed 5000 đến 5999), thì tỷ lệ bàn có `validTilts.length === 0` dưới 5%.
- [ ] C4.4. Trên cùng tập bàn ở C4.3, tỷ lệ bàn mà cả 4 hướng đều có `preview(dir, { useGates: true }).cleared === 0` dưới 5%. Đây là thước đo chặt hơn, vì C4.3 gần như luôn đạt do bàn khởi tạo còn ô trống.
- [ ] C4.5. Trên tập nghiệm thu, `winRate(G) - winRate(R) >= 20` điểm phần trăm khi gộp 3 màn, và lớn hơn 0 ở từng màn.
- [ ] C4.6. **Phép thử chính.** Trên tập nghiệm thu, `winRate(G) - winRate(B) >= 10` điểm phần trăm khi gộp 3 màn, lớn hơn 0 ở từng màn, và cận dưới khoảng tin cậy 95% của chênh lệch theo cặp seed lớn hơn 0. Với mỗi seed, `d = thắng(G) - thắng(B)`; cận dưới là `mean(d) - 1.96 * sd(d) / sqrt(n)`.
- [ ] C4.7. Trên tập nghiệm thu, `winRate(G)` của từng màn nằm trong `[0.40, 0.95]`, để phép so sánh không bị bão hòa ở hai đầu.
- [ ] C4.8. Với bot G trên tập nghiệm thu, thời lượng ước tính của từng màn có P10 `>= 60000` ms và P90 `<= 180000` ms.
- [ ] C4.9. Khi bot G chơi từng màn với seed mặc định trong `TUNING`, thì `status === 'won'`.

**Luật dừng:** nếu C4.6 vẫn không đạt sau khi tune trong `TUNING_RANGES` trên tập seed để tune, Producer dừng làm phần hình ảnh và báo người dùng rằng điểm khác biệt chưa được chứng minh. Không hạ ngưỡng để qua test.

#### C5. Hiển thị và diễn hoạt theo sự kiện
Phụ thuộc: C4. Gồm vẽ bàn, bốn cửa, HUD và phát lại sự kiện.

- [ ] C5.1. Sau khi vào màn và sau mỗi lần nghiêng khi `animating === false`, thì `viewCounts.pieces` bằng số ô có quân và `viewCounts.gatePieces` bằng tổng số quân trong các cửa.
- [ ] C5.2. Khi nghiêng hợp lệ, thì `animating === true` ngay sau lệnh và về `false` trong khoảng `lastAnimMs` đến `lastAnimMs + 250` ms.
- [ ] C5.3. Khi gọi `window.__game.gatefall.tilt` trong lúc `animating === true`, thì kết quả là `false`, `tiltsUsed` và `stateHash` không đổi.
- [ ] C5.4. Khi chạy cùng seed và cùng chuỗi 10 nước qua scene và qua `createSim`, thì `stateHash` giống nhau ở từng bước.
- [ ] C5.5. Khi nghiêng không hợp lệ qua scene, thì `rejectedTilts` và `rejectFeedbacks` cùng tăng 1, `animating === false`, `stateHash` không đổi.

#### C6. Điều khiển, thử lại và chuỗi 3 màn
Phụ thuộc: C5.

- [ ] C6.1. Khi bấm từng phím mũi tên thật trên fixture có thể nghiêng cả 4 hướng, thì `lastTiltDir` lần lượt đúng hướng và `tiltsUsed` tăng 1 mỗi lần.
- [ ] C6.2. Khi giữ một phím mũi tên 800 ms, thì `tiltsUsed` chỉ tăng 1.
- [ ] C6.3. Ở viewport cảm ứng, khi vuốt thật theo từng hướng, thì `lastTiltDir` đúng hướng và `tiltsUsed` tăng 1 mỗi lần.
- [ ] C6.4. Khi vuốt ngắn hơn `gfSwipeMinPx`, hoặc vuốt chéo có tỷ lệ trục nhỏ hơn `gfSwipeAxisRatio`, thì `tiltsUsed` và `rejectedTilts` không đổi.
- [ ] C6.5. Khi một lần chạm kéo qua nhiều lần `gfSwipeMinPx` và đổi hướng trước khi nhấc tay, thì `tiltsUsed` chỉ tăng 1.
- [ ] C6.6. Khi bấm R lúc đang chơi hoặc sau khi kết thúc, thì `stateHash` bằng hash ban đầu của màn, `status === 'playing'`, `tiltsUsed === 0`, `animating === false` trong vòng 200 ms.
- [ ] C6.7. Ở viewport cảm ứng, khi bấm `#gf-retry`, thì trạng thái giống C6.6.
- [ ] C6.8. Khi vừa thắng và `endLockLeftMs > 0`, bấm Enter thì `levelIndex` không đổi; khi `endLockLeftMs === 0`, bấm Enter thì `levelIndex` tăng 1 và `status === 'playing'`.
- [ ] C6.9. Ở viewport cảm ứng, sau khi thắng và hết khóa, bấm `#gf-next` thì `levelIndex` tăng 1.
- [ ] C6.10. Khi thắng màn cuối, thì `campaignComplete === true`; bấm Enter sau khi hết khóa thì `levelIndex === 0` và `status === 'playing'`.
- [ ] C6.11. Ở viewport cảm ứng trong Gatefall, thì `#btn-left`, `#btn-right`, `#btn-jump` bị ẩn và `#gf-retry` hiện. Ở `/` và `/?game=arc-relay`, thì `#gf-retry` và `#gf-next` bị ẩn còn ba nút cũ vẫn hiện.
- [ ] C6.12. Khi bot chơi hết màn 1 chỉ bằng phím mũi tên thật, rồi chơi lại chỉ bằng vuốt thật, thì cả hai lần đều kết thúc với `status` là `won` hoặc `lost`, và cùng chuỗi hướng cho cùng `stateHash` cuối.

## 9. Người chơi cần tự đánh giá
Test tự động không kết luận được game có vui hay không. Bot chỉ cho biết thông tin cửa nạp có giá trị về mặt thắng thua. Người chơi thật cần đánh giá:

- Game có vui không, và sau một lần thua có muốn thử lại ngay không.
- Có thực sự nhìn bốn cửa trước khi nghiêng không, hay chỉ nghiêng theo cảm tính rồi chờ kết quả.
- Việc so sánh bốn đợt quân là quyết định thú vị hay gây quá tải.
- Có đoán được kết quả của một lần nghiêng không. Khi thua, cảm thấy do mình chọn sai hay do bàn may rủi.
- Để dành một cửa tốt cho lượt sau có trở thành chiến thuật tự nhiên không.
- Hướng quân đi vào từ cạnh đối diện có dễ hiểu ngay không.
- Xả bàn có công bằng và dễ hiểu không, hay giống một hình phạt bất ngờ.
- Nhịp trượt, nổ và cascade có đã tay không, có phải chờ lâu không. Khóa nhập có gây khó chịu không.
- Thời gian suy nghĩ thật có gần 3 giây mỗi nước không, và một lần thử có thật sự dài 60 đến 180 giây không.
- Độ khó của 3 màn có tăng hợp lý không.
- Màu và hình của quân có dễ phân biệt không, nhất là trong các ô cửa nhỏ.
- Vuốt trên điện thoại có chính xác không, có hay bị nhận nhầm hướng không.
- Chủ đề và hình ảnh placeholder có gợi được bản sắc riêng để đáng phát triển tiếp không.

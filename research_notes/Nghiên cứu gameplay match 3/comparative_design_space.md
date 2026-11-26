# So sánh thiết kế các game tile-matching hàng đầu và không gian thiết kế còn trống

Quy ước đọc: mục **Cited Findings** chỉ chứa thông tin có nguồn. Mục **Inferences** là suy luận của người nghiên cứu. Nhãn *(snippet)* nghĩa là chỉ đọc được đoạn trích trên trang tìm kiếm, chưa mở được toàn văn. Mọi ý tưởng thiết kế ở câu hỏi 5 đều là **suy luận**, dùng cơ chế chung và không sao chép tên, nhân vật, hình ảnh, âm nhạc hay màn chơi của game nào.

## 1. Mỗi game vận hành thế nào: thao tác, bàn chơi, luật ghép, giới hạn, điều kiện thắng, độ dài phiên, lõi khác biệt

### Takeaway
Bảy game thuộc bốn lõi: đổi chỗ (Candy Crush, Homescapes, Gardenscapes, Royal Match), chạm nổ cụm (Toon Blast), kéo tự do có giờ (Puzzle & Dragons) và ghép để chiến đấu (Empires & Puzzles, Puzzle & Dragons). Khác biệt lớn nhất nằm ở **thao tác** và **tài nguyên giới hạn** (lượt, giây, máu), còn số liệu độ dài màn công khai rất thiếu.

### Cited Findings

| Game | Thao tác | Bàn chơi | Luật ghép | Giới hạn | Thắng | Lõi khác biệt |
|---|---|---|---|---|---|---|
| Candy Crush Saga (2012) | Đổi 2 ô kề [gd1] | Theo màn, không rõ kích thước chung | Ghép 3+ [arxiv] | Lượt, có cả màn tính giờ [wiki][king-slides] | Mục tiêu theo màn, có màn đa mục tiêu [king-slides] | Màn giới hạn lượt, blocker và chế độ chơi [wiki][king-slides] |
| Toon Blast | Chạm cụm cùng màu [toon-fan] | Hình dạng màn thay đổi *(snippet)* [toon-wiki] | Cụm 2+ ô kề (nguồn fan) [toon-fan] | Chưa có nguồn chính thức | Mục tiêu và chướng ngại theo màn [toon-app] | Chạm nổ, power-up ghép khi chạm nhau [dof-time] |
| Royal Match | Đổi chỗ, power-up chạm để kích hoạt [dof-rm] | Một màn hình, quân lớn, màu và hình tách biệt [dof-rm][naavik-rm] | Ghép 3 kiểu cổ điển, power-up mạnh [naavik-rm] | Lượt, mua thêm 5 lượt [naavik-rm] | Xóa mục tiêu trước khi hết lượt [naavik-rm] | Nhanh, rõ, công bằng, meta nhẹ [dof-rm] |
| Homescapes | Đổi chỗ, power-up chạm để kích hoạt [dof-rm] | Đa dạng theo màn [dof-rm] | Match-3 truyền thống [gd1] | Không tìm được số liệu | Theo màn | Match-3 cộng trang trí và cốt truyện nhân vật [gd1] |
| Gardenscapes | Match-3 [pg-garden] | Không tìm được số liệu | Match-3 [pg-garden] | Có mua thêm lượt bằng xu *(snippet)* [pg-garden] | Theo màn | Trang trí dẫn dắt cốt truyện *(snippet)* [pg-garden] |
| Puzzle & Dragons (2012) | Giữ và kéo một viên qua nhiều ô [pad] | 6 cột x 5 hàng [pad] | 3+ viên thẳng hàng, 5+ đánh toàn bộ địch [pad] | 5 giây kéo mỗi lượt, kỹ năng có thể đổi [pad] | Qua hết tầng và boss trước khi hết máu [pad] | Xếp combo trong một lần kéo, đội 6 quái [pad] |
| Empires & Puzzles (2017) | Chưa xác minh | Lưới dưới hàng anh hùng [ep-about] | Ghép 3+ để tấn công và sạc kỹ năng [ep-about] | Chưa xác minh | Chiến đấu với địch [ep-app] | 5 anh hùng theo màu, mana theo màu, tự chọn lúc tung chiêu [ep-mana] |

- Candy Crush dùng 18 blocker và 6 chế độ để tạo khoảng 3000 màn (số liệu 2017) *(snippet)* — [King slides][king-slides]
- Empires & Puzzles: thanh mana bắt đầu rỗng, chỉ tăng khi ghép đúng màu của anh hùng; tốc độ mana từ 6,5 đến 13,5 ô (bản wiki cũ, có thể đã đổi) *(snippet)* — [Fandom][ep-mana]
- Puzzle & Dragons: bộ đếm của địch giảm sau mỗi lượt; lượt không ghép được vẫn làm bộ đếm giảm nhưng không giảm hồi chiêu — [Wikipedia][pad]
- Độ dài phiên có nguồn mâu thuẫn: 2-4 phút cho match-3 cổ điển — [Game Developer][gd1]; khoảng 28,97 phút trung bình năm 2024 *(snippet)* — [Adjust][adjust]

### Inferences
- Con số 2-4 phút và 29 phút nhiều khả năng đo hai thứ khác nhau: một nhịp chơi ngắn so với tổng thời lượng phiên theo ứng dụng. Prototype nên đặt mục tiêu theo **thời lượng một lần thử màn**, không theo "phiên".
- Puzzle & Dragons là game duy nhất trong nhóm biến **một lượt** thành một chuỗi thao tác liên tục. Đây là khác biệt thao tác lớn nhất trong bảy game.

### Gaps
- Không xác minh được kích thước bàn, cách di chuyển ô và giới hạn lượt của Empires & Puzzles từ nguồn chính thức.
- Không tìm được số liệu công khai về thời lượng trung bình một màn của từng game. Không nên điền bảng này bằng ước đoán.
- Trang Gardenscapes và Toon Blast chính yếu bị chặn (403), nên một số ô chỉ dựa vào snippet hoặc mô tả cửa hàng.

## 2. Thay đổi thiết kế nào tạo lợi thế cạnh tranh cho từng game

### Takeaway
Lợi thế thường đến từ **giảm ma sát hoặc đổi tài nguyên căng thẳng**, không chỉ từ luật mới. Royal Match là ca rõ nhất của thắng bằng thực thi, nhưng quảng cáo lớn khiến không thể quy thành công cho thiết kế một mình.

### Cited Findings
- **Candy Crush:** cùng Bubble Witch Saga đưa màn giới hạn lượt vào dòng chính — [Wikipedia][wiki]. King đo độ vui bằng "time to abandon", "time to pass" và kỹ năng, liên tục sửa 100 màn kém vui nhất — [MobileGamer][mg-king].
- **Candy Crush, màn 65:** màn chuyển đổi và doanh thu cao nhất nhưng cũng gây rời bỏ nhiều nhất; bản dễ hơn giữ người chơi lâu hơn — [MobileGamer][mg-king].
- **Blast:** chạm dễ hơn vuốt, cụm màu dễ nhìn hơn hàng thẳng, hỗ trợ nhịp "ăn vặt" 3-4 phút — [Game Developer][gd1]. Mỗi nước chỉ ảnh hưởng các quân bị nổ, nên chơi có tính xác định và dễ kẹt hơn — [Deconstructor of Fun][dof-time].
- **Puzzle & Dragons:** trò chơi di động đầu tiên đạt 1 tỷ USD, khoảng 7 tỷ USD tính đến 10/2018 — [Wikipedia][pad].
- **Empires & Puzzles:** nối ghép màu với sạc kỹ năng theo anh hùng và thời điểm tung chiêu do người chơi chọn — [trang chính thức][ep-about].
- **Gardenscapes:** chuyển từ hidden object sang match-3 trong soft launch; match-3 có trạng thái thua và kiếm tiền được từ lõi *(snippet)* — [PocketGamer.biz][pg-garden].
- **Royal Match:** cho ghép khi bàn còn chuyển động, animation ngắn, bỏ tải giữa các lần thử, power-up rộng rãi, vật cản tự đóng khi đủ — [Deconstructor of Fun][dof-rm]. Tác giả xem sức mạnh của game là tinh chỉnh cơ chế đã có, không phải đổi mới bước ngoặt — [Deconstructor of Fun][dof-rm].
- **Royal Match, thị trường:** vượt Candy Crush về doanh thu tháng từ 7/2023; AppMagic nêu chiến dịch người nổi tiếng, LiveOps và quảng cáo là các yếu tố có thể góp phần, không phải nguyên nhân đã chứng minh — [AppMagic][appmagic].
- **Mâu thuẫn nguồn về Royal Match:** Deconstructor of Fun nói game xáo bàn khi hết nước đi — [DoF][dof-rm]; Naavik nói bàn gần như không xáo trừ khi dùng booster — [Naavik][naavik-rm]. Hai nhận định có thể mô tả các tình huống khác nhau.

### Inferences
- Có ba kiểu lợi thế: **đổi thao tác** (blast, kéo tự do), **đổi cấu trúc áp lực** (lượt thay giờ, khay thay giờ) và **giảm ma sát** (Royal Match).
- Một đội nhỏ không thể thắng bằng kiểu thứ ba trước các hãng lớn về độ bóng, nhưng có thể áp dụng nguyên tắc của nó ngay từ prototype: thử lại tức thì, không chờ animation, trạng thái bàn dễ đọc.

### Gaps
- Không có dữ liệu nội bộ tách được tác động của thiết kế khỏi chi tiêu quảng cáo.
- Không tìm được phỏng vấn gốc của GungHo giải thích quyết định chọn cơ chế kéo 5 giây.

## 3. Phân loại nào mô tả tốt nhất các biến thể của thể loại

### Takeaway
Chưa tìm thấy taxonomy học thuật chuẩn. Cách phân loại hữu ích nhất là một **ma trận theo trục thiết kế** thay vì danh sách thể loại, vì các game lai cắt ngang nhiều nhãn.

### Cited Findings
- Tile-matching là trò chơi thao tác ô để chúng biến mất theo tiêu chí ghép; Juul xem đây là một cơ chế hơn là thể loại riêng — [Wikipedia][wiki].
- Dòng lịch sử: rơi khối (Tetris 1984), SameGame/Chain Shot (nguồn ghi cả 1985 và 1987), Shariki (1994), đổi ô Panel de Pon (1995), Bejeweled (2001), Puzzle Quest (2008), Puzzle & Dragons (2012) — [Wikipedia][wiki].
- Merge liên quan: Triple Town (2010), Threes và 2048 (2014) — [Wikipedia][wiki].
- Phân loại ngành năm 2020: swapping, collapse/blast, linking và bubble shooting — [Game Developer][gd1].
- Deconstructor of Fun tách tile-match (Triple Tile, Zen Match) khỏi 3D matching (Triple Match 3D, Match 3D) *(snippet)* — [DoF][dof-tile].
- Triple Match 3D đổi kéo thả thành chạm và đổi một ô ghép thành khay nhiều ô, chuyển áp lực từ tốc độ sang lập kế hoạch — [DoF][dof-3d].
- Học thuật: các bài toán tự nhiên trong game match-3 (như đạt điểm mục tiêu) là NP-hard — [Gualà và cộng sự][arxiv]; [Walsh][walsh].

### Inferences

Taxonomy đề xuất gồm sáu trục độc lập:

| Trục | Các giá trị | Ví dụ |
|---|---|---|
| Động từ nhập | đổi, chạm cụm, kéo đường, chọn vào khay, gộp, bắn | Candy Crush, Toon Blast, P&D, Triple Match 3D, 2048, Puzzle Bobble |
| Tiêu chí xóa | thẳng hàng 3+, cụm liền kề, bộ 3 bất kỳ, gộp cùng giá trị | Match-3, Blast, Tile-match, Merge |
| Phản ứng bàn | rơi và cascade, chỉ lấp chỗ nổ, không trọng lực, đẩy toàn bàn | Match-3, Blast, Tile-match, 2048 |
| Tài nguyên áp lực | lượt, giây, ô khay, máu, không gian | Candy Crush, P&D, Triple Match 3D, E&P, Tetris |
| Đối kháng | mục tiêu tĩnh, vật cản động, địch có bộ đếm, người chơi khác | Royal Match, Royal Kingdom, P&D, E&P |
| Lớp ngoài | không có, trang trí, cốt truyện, RPG, đội nhóm | Royal Match nhẹ, Homescapes, E&P |

- Khi tìm ý tưởng, đổi **hai trục cùng lúc** dễ tạo cảm giác mới hơn đổi chủ đề, nhưng đổi quá nhiều trục sẽ làm mất khả năng đọc của người chơi quen thể loại.

### Gaps
- Không tìm thấy khảo sát học thuật chuyên về phân loại tile-matching. Các bài độ phức tạp chỉ dùng nhãn không chính thức.

## 4. Thử nghiệm và game lai nào thành công hoặc thất bại, bài học là gì

### Takeaway
Game lai thắng khi **một thay đổi giải quyết đúng một điểm đau** và vẫn dễ đọc (khay của Triple Match 3D). Game lai yếu thường chỉ giống đàn anh, hoặc có lõi tạo trạng thái kẹt mà không có lối thoát.

### Cited Findings
- **Thành công, Triple Match 3D:** khoảng 5 triệu USD IAP/tháng sau sáu tháng, kỷ lục 15 triệu sau thêm sáu tháng; bản gốc Match 3D đỉnh gần 3 triệu — [DoF][dof-3d].
- **Thành công, Match Factory:** vượt Triple Match 3D trong chưa đầy sáu tháng nhờ thẩm mỹ, thiết kế màn và phễu tiến trình — [DoF][dof-3d].
- **Lai có tín hiệu tích cực, Time Blast:** đưa propeller và đổi chỗ power-up của match-3 vào blast để giảm kẹt; bài viết cảnh báo đổi quá nhiều có thể làm mất người chơi cũ — [DoF][dof-time].
- **Thị trường theo DoF (2024):** Merge lấy vị trí thứ hai từ Blast; Tile Match "có tiềm năng nhưng chưa đạt" — [DoF][dof-time].
- **Khó khăn, Hay Day Pop:** collapse không cascade dễ tạo bàn "bàn cờ" bế tắc; bài viết đánh giá thực thi tốt nhưng đường lên top khó — [DoF][dof-hay].
- **Yếu, Royal Kingdom (giai đoạn đầu):** quá gần Royal Match nên cạnh tranh quảng cáo với chính game anh em; ARPDAU Anh khoảng 0,14 USD so với 0,25+ của game tương đương. Bài viết gợi ý để thế giới tác động trực tiếp vào engine ghép — [DoF][dof-rk].
- **Thất bại, Spooky Pop:** Supercell hủy sau soft launch vì không đạt KPI; được mô tả là pha trộn Plants vs. Zombies và Puzzle & Dragons *(snippet)* — [DoF][dof-spooky].
- **Thất bại, Battle Buddies:** hủy trong soft launch 9/2012 *(snippet)* — [DoF][dof-spooky]; DoF gọi đây là game "fun and creative" nhưng cách thành công vài sai lầm — [DoF][dof-bb].
- **Wildscapes:** bỏ meta cốt truyện, báo cáo tác động xấu lên retention D1 *(snippet)* — [WN Hub][wn].
- **Bài học từ King:** màn càng khó thì độ dài tối đa nên càng ngắn; màn "đố" thiên kỹ năng cao bị xem là kém hấp dẫn nhất — [MobileGamer][mg-king].

### Inferences
- Mẫu lặp lại: **giữ một luật quen, đổi một ràng buộc, và thêm lối thoát cho trạng thái kẹt**.
- Bằng chứng thương mại ở đây phản ánh thị trường F2P di động. Một prototype trình duyệt không cần tối ưu IAP, nên chỉ nên kế thừa các bài học về độ rõ, nhịp và độ công bằng.
- Khó khăn của lõi blast cho thấy cần đo sớm tỷ lệ bàn bế tắc bằng bot.

### Gaps
- Không đọc được toàn văn lý do thất bại của Spooky Pop và Battle Buddies, nên không thể nêu chính xác các sai lầm.
- Dữ liệu thất bại thường không công khai, nên mẫu trên thiên lệch về các game đủ nổi để được phân tích.

## 5. Không gian thiết kế chưa khai thác cho đội nhỏ làm prototype 2D trên trình duyệt, chơi được bằng phím và cảm ứng

### Takeaway
**Toàn bộ mục này là suy luận.** Hướng đáng thử nhất là **đổi động từ nhập sang thao tác toàn bàn có bốn hướng**, vì nó khớp tự nhiên với phím mũi tên và vuốt, đồng thời cần ít nội dung hơn so với cạnh tranh bằng số lượng màn.

### Cited Findings
- 2048 và Threes là tiền lệ thành công của game xếp ô nhiều hướng — [Wikipedia][wiki].
- Panel de Pon dùng đổi hai ô kề từ 1995, cho thấy thao tác đổi ô có lịch sử trên hệ máy không cảm ứng — [Wikipedia][wiki].
- Chuyển áp lực từ thời gian sang không gian đã tạo một phân khúc mới — [DoF][dof-3d].
- Kẻ địch di chuyển từng bước trên bàn đã xuất hiện trong màn đặc biệt của Royal Kingdom (Golem) — [DoF][dof-rk].
- Cung cấp màn chơi đều đặn là áp lực lớn với đội nhỏ — [DoF][dof-hay].

### Inferences

**Xếp hạng năm hướng (suy luận, chưa kiểm chứng độ mới):**

| # | Hướng | Luật cốt lõi | Phím / cảm ứng | Rủi ro chính | Điều cần đo |
|---|---|---|---|---|---|
| 1 | **Nghiêng trọng lực** | Mỗi nước đổi hướng rơi của toàn bàn; cụm 3+ sau khi trượt sẽ nổ. Giới hạn bằng số lần nghiêng | Mũi tên / vuốt 4 hướng | Kết quả khó đoán, cảm giác may rủi | Bot tham lam phải thắng rõ hơn bot ngẫu nhiên |
| 2 | **Đường đi có ngân sách bước** | Giữ một ô và đi qua N ô, không tính giờ, xem trước kết quả rồi xác nhận | Mũi tên + Space / kéo và thả | Người chơi suy nghĩ quá lâu | Thời gian quyết định và tỷ lệ hoàn tác |
| 3 | **Blast có ô giữ** | Chạm cụm để nổ, hoặc cất một cụm vào 1-2 ô giữ rồi thả lại ở cột khác | Con trỏ + phím hành động / chạm và kéo vào khay | Hệ thống giữ làm game quá dễ | Tỷ lệ bàn bế tắc trước và sau khi thêm ô giữ |
| 4 | **Mối đe dọa đi trên bàn** | Địch hiện rõ đường đi của lượt sau; người chơi tạo ghép để chặn hoặc đẩy lùi | Con trỏ + xác nhận / chạm | Gần với cơ chế đã có, cần luật riêng | Tỷ lệ nước đi được chọn vì phản ứng với địch |
| 5 | **Luật theo chương** | Mỗi chương thêm đúng một luật làm đổi engine thay vì thêm hàng trăm màn | Giữ nguyên điều khiển | Tăng chi phí test tổ hợp luật | Số màn mới cần để luật hết mới |

**Khuyến nghị:** làm thử hướng 1 trước. Nếu bot cho thấy kết quả quá ngẫu nhiên, chuyển sang hướng 2. Hướng 3 phù hợp nhất nếu muốn lõi quen thuộc. Hướng 5 có thể kết hợp với bất kỳ lõi nào để giảm nhu cầu nội dung.

**Tiêu chí dừng đề xuất cho mỗi prototype (ngưỡng là giả định ban đầu, cần chỉnh theo dữ liệu):**
- Một lần thử màn dài 60-180 giây.
- Bot có chiến lược thắng nhiều hơn bot ngẫu nhiên ít nhất 20 điểm phần trăm, để chứng minh có quyết định thực sự.
- Dưới 5% bàn khởi tạo rơi vào trạng thái không còn nước đi.
- Toàn bộ thao tác dùng được bằng phím và cảm ứng, có xem trước hoặc phản hồi rõ cho mỗi nước.
- Test tự động không kết luận được game có vui hay không; người chơi thật phải đánh giá.

**Ranh giới độc đáo:** dùng tên, chủ đề, nhân vật, hình ảnh, âm thanh và bố cục màn của riêng dự án. Cơ chế chung có thể học hỏi, nhưng không sao chép màn chơi hay cách trình bày đặc trưng của game nào.

### Gaps
- Chưa rà soát có hệ thống các game indie và web, nên chưa thể khẳng định hướng nào **hoàn toàn chưa có**. Cần tìm tiền lệ cho từng hướng trước khi chốt brief.
- Không có dữ liệu về hành vi người chơi match-3 dùng bàn phím trên trình duyệt.
- Chưa có bằng chứng thực nghiệm rằng các hướng trên vui; đây là giả thuyết để thử.

[gd1]: https://www.gamedeveloper.com/business/how-to-crack-the-match-3-code---part-1
[arxiv]: https://arxiv.org/abs/1403.5830
[walsh]: https://arxiv.org/pdf/1403.1911
[wiki]: https://en.wikipedia.org/wiki/Match_3
[king-slides]: https://speakerdeck.com/wnconf/jeremy-kang-king
[toon-fan]: https://shapes.inc/fandom/toon-blast
[toon-wiki]: https://www.wikiwand.com/en/articles/Toon_Blast
[toon-app]: https://apps.apple.com/us/app/toon-blast/id1176027022
[dof-time]: https://deconstructoroffun.com/blog/2024/9/2/time-blast-will-it-revive-the-blast-subgenre
[dof-rm]: https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey
[naavik-rm]: https://naavik.co/deep-dives/royal-match/
[pg-garden]: https://www.pocketgamer.biz/comment-and-opinion/65810/deconstructing-gardenscapes-success/
[pad]: https://en.wikipedia.org/wiki/Puzzle_%26_Dragons
[ep-about]: https://www.empiresandpuzzles.com/about
[ep-app]: https://apps.apple.com/app/id1117841866
[ep-mana]: https://empiresandpuzzles.fandom.com/wiki/Mana?oldid=6051
[adjust]: https://adjust.com/blog/puzzle-games-trends-strategies
[mg-king]: https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/
[appmagic]: https://appmagic.rocks/blog/dream-games-3-billion
[dof-tile]: https://www.deconstructoroffun.com/blog/2023/9/30/tile-match-the-new-match-3-or-the-new-merge
[dof-3d]: https://www.deconstructoroffun.com/blog/the-making-of-match-3d
[dof-hay]: https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop
[dof-rk]: https://www.deconstructoroffun.com/blog/2024/07/01/royal-kingdom-will-it-outgrow-its-big-brothers-influence
[dof-spooky]: https://www.deconstructoroffun.com/blog//2015/01/supercells-spooky-pop-and-six-rules-of.html
[dof-bb]: https://www.deconstructoroffun.com/blog/tag/Battle+Buddies
[wn]: https://wnhub.io/news/analytics/item-2330

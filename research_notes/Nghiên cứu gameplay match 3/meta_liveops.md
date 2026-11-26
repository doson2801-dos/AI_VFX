# Meta progression và live-ops trong game match-3: tác động tới gameplay và retention

Ghi chú đọc số liệu (cập nhật 2026-11-23):
- Doanh thu từ AppMagic, Sensor Tower là **ước tính của bên thứ ba**, không phải số công ty công bố. AppMagic tính **net IAP** (đã trừ phí store, không gồm web shop và Android Trung Quốc) theo [GameDev Reports, 04/09/2025](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125?open=false).
- Nhãn **[snippet]** nghĩa là chỉ thấy trong kết quả tìm kiếm, chưa đọc được toàn văn. Các mục còn lại đã mở trang nguồn.
- Phần "Inferences" là suy luận của người nghiên cứu, không phải dữ kiện có nguồn.

## 1. Các mô hình meta chính hoạt động thế nào?

### Takeaway
Meta biến thắng màn thành tiến trình dài hạn. Nhánh casual (Scapes, Royal Match) giữ meta nhẹ và không đổi luật bàn cờ, còn nhánh RPG (Empires & Puzzles) đưa chỉ số nhân vật trực tiếp vào trận đấu. Bằng chứng công khai mạnh nhất là thử nghiệm của Royal Match: meta theo khu vực có nhiệm vụ thắng các phương án không meta hoặc meta episode.

### Cited Findings

**Saga map và tiến trình tuyến tính**
- Vòng lặp sao phổ biến ở game trang trí: sao từ màn chơi → xu → đồ trang trí → điểm trang trí → mở đất mới (mô tả Hay Day Pop, 05/2020) — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Chi phí nội dung là ràng buộc lớn: một màn mất 5–8 giờ sản xuất, trong khi người chơi hàng đầu có thể qua hơn 40 màn mỗi ngày (số trích từ một talk GDC, qua bài 05/2020) — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)

**Trang trí, cải tạo và câu chuyện**
- Katkoff lập luận rằng ở Gardenscapes/Homescapes, **câu chuyện** giữ chân người chơi, còn trang trí chủ yếu thể hiện tiến trình. Người chơi vượt màn khó và dùng booster một phần để xem chuyện gì xảy ra tiếp theo (ý kiến chuyên gia, không có % retention) — [Deconstructor of Fun, 05/2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Lily's Garden, cùng core với Hay Day Pop, đạt RPI hơn gấp đôi lúc ra mắt. Tác giả cho rằng câu chuyện là lý do chính (quan hệ nhân quả chưa được kiểm chứng) — [Deconstructor of Fun, 05/2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Trang trí tự do kiểu Fishdom có tỷ trọng doanh thu và RPI thấp hơn đáng kể so với dòng Scapes đơn giản hơn — [Deconstructor of Fun, 05/2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Royal Match ra mắt với meta đơn giản dựa trên sao, giữ meta nhẹ hơn phần lớn thị trường và ưu tiên core gameplay phong phú — [Naavik, 23/02/2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)
- Thử nghiệm A/B/C của Royal Match so sánh **không meta**, **meta episode** và **meta episode có thưởng**. Nhóm đối chứng dùng **meta khu vực có nhiệm vụ** cho kết quả tốt nhất — [Naavik, 23/02/2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)

**Đội, club và xã hội**
- Royal Match dùng Team Battle, Champion Clash và co-op Friends Train Journey. Team Gift Offer xuất hiện 3 ngày cuối của Train Journey và Culinary Collection, tặng xu, booster và mạng vô hạn cho cả đội — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)

**Bộ sưu tập**
- Trong live-ops casual, collections có ở 75% tựa game mẫu và albums ở 66% (AppMagic, 12/2024–11/2025; không công bố cỡ mẫu) — [GameDev Reports](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)
- Album Culinary Collection của Royal Match kéo dài 2 tháng. Album và pass là "xương sống" dài hạn để các sự kiện ngắn xoay quanh — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)

**RPG và tiến trình anh hùng**
- Empires & Puzzles: đội 5 anh hùng chiến đấu trên lưới match-3. Gem ghép được biến thành quân cùng màu tấn công, các màu khắc nhau, và ghép màu sẽ nạp thanh kỹ năng của anh hùng cùng màu. Trận thường có 3–4 đợt, khoảng 4 phút nếu chơi tay — [GameRefinery, 03/06/2019](https://www.gamerefinery.com/deconstructing-empires-puzzles/)
- Tiến trình gồm gộp anh hùng để lên cấp, thăng bậc, talent lớp và gacha. Thời điểm bài viết có 182 anh hùng, 5 độ hiếm, 10 lớp. Lượt triệu hồi đắt nhất có khoảng 25% ra epic và 2,5% ra legendary — [GameRefinery, 2019](https://www.gamerefinery.com/deconstructing-empires-puzzles/)
- Căn cứ có 34 ô, 10 loại nhà, khoảng 700 nâng cấp, thời gian chờ có thể trên 10 giờ. Liên minh có Titan (PvE) và War (PvP bất đồng bộ với đội AI của đối thủ) — [GameRefinery, 2019](https://www.gamerefinery.com/deconstructing-empires-puzzles/)
- Puzzle & Dragons được GungHo công bố vượt 1 tỷ USD doanh thu năm 2013 — [PocketGamer.biz](https://www.pocketgamer.biz/its-official-puzzle-and-dragons-is-the-first-mobile-game-to-1-billion-in-revenue/) [snippet]. Một bài sau đó ghi tổng khoảng 7 tỷ USD (số cũ, ước đoán khoảng 2017) — [PocketGamer.biz](https://www.pocketgamer.biz/monster-strike-puzzle-and-dragons-gross-7bn-usd-each) [snippet]

### Inferences
- Có thể chia meta theo mức can thiệp vào bàn cờ: **ngoài bàn** (bản đồ, trang trí, câu chuyện, album), **đầu màn** (booster, win streak), **trong luật trận** (chỉ số anh hùng, khắc màu, kỹ năng). Càng vào sâu thì càng khó đánh giá riêng độ vui của core.
- Thử nghiệm của Royal Match cho thấy "meta nhẹ" không có nghĩa là "không meta". Tuy nhiên kết quả chỉ áp dụng cho một game đã có core mạnh và nguồn không nêu rõ chỉ số thắng trong phần đã trích.

### Gaps
- Không tìm được nguồn tốt về thiết kế và lịch sử saga map của King, nên phần cơ chế bản đồ chưa có trích dẫn trực tiếp.
- Chưa xác minh được cơ chế chi tiết của Puzzle & Dragons (kéo orb, đội quái, gacha) từ nguồn đã đọc.
- Câu chuyện Gardenscapes soft launch năm 2015 dưới dạng hidden-object rồi chuyển sang match-3 chỉ thấy trong snippet. Trang nguồn mở ra không chứa nội dung này, nên **không nên dùng như dữ kiện** khi chưa kiểm tra lại.
- Không có số retention chính thức từ Playrix cho lớp câu chuyện hay trang trí.

## 2. Những sự kiện live-ops nào là tiêu chuẩn và chúng thay đổi phiên chơi ra sao?

### Takeaway
Bộ chuẩn hiện nay gồm win streak, đua hoặc giải đấu, đội, album và pass, xếp thành các nhịp ngày, tuần và tháng. Win streak tác động trực tiếp nhất lên bàn cờ vì nó đổi trạng thái đầu màn và tăng giá của việc thua.

### Cited Findings
- Mật độ sự kiện trung bình trên thị trường tăng từ 73 lên 89 sự kiện mỗi game mỗi tháng trong kỳ 12/2024–11/2025 (AppMagic) — [GameDev Reports](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)
- Số sự kiện trong các game F2P hàng đầu tăng khoảng 35% từ 05/2023 đến 01/2025 (GameRefinery) — [Global Games Forum](https://www.globalgamesforum.com/news/the-trends-shaping-the-world-of-liveops) [snippet]
- Casual: collections 75%, race 68%, albums 66%. Sự kiện cạnh tranh tăng 26% năm 2025. Casual thêm khoảng 0,7 sự kiện mới mỗi tháng — [GameDev Reports / AppMagic](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)
- Win streak có ở 48% tựa game mẫu. Mức sử dụng win streak và Lava Quest tăng hơn 50% năm 2025, gần như toàn bộ ở casual — [GameDev Reports / AppMagic](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)
- Cơ chế casino xuất hiện trong live-ops của 50% game casual hàng đầu năm 2025 — [Mobidictum / AppMagic, 24/02/2026](https://mobidictum.com/appmagic-casual-games-report-2025-summary/)
- Thang win streak của Deconstructor of Fun: (1) power-up tăng dần sau 3 hoặc 5 trận thắng; (2) track tiếp tục sau mốc 5 như Candy Crush Saga; (3) sự kiện cạnh tranh "không được thua x màn"; (4) Super Light Ball của Royal Match — [Deconstructor of Fun, 05/08/2024](https://www.deconstructoroffun.com/blog/2024/8/5/win-streak-the-gift-that-keeps-on-giving)
- Tác động lên phiên chơi: power-up được đặt sẵn đầu màn, giúp thắng nhanh hơn và đưa người chơi tới nhiều màn hard/super hard hơn, nơi tỷ lệ thất bại cao hơn — [Deconstructor of Fun, 2024](https://www.deconstructoroffun.com/blog/2024/8/5/win-streak-the-gift-that-keeps-on-giving)
- Lava Quest: thắng 7 màn liên tiếp, thua là mất tiến trình, tạo áp lực hằng ngày dựa trên tâm lý sợ mất — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)
- Lịch Royal Match gồm 3 lớp chồng nhau. **Ngắn hạn:** Lava Quest, Space Mission, Propeller Madness, Jungle Treasure. **Trung hạn:** Weekly Contest, Archery Arena, Team Battle, Champion Clash, Train Journey. **Dài hạn:** album 2 tháng và Easter Pass — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)
- Trong mẫu 12 game casual hàng đầu, trung bình mỗi game có 2,5 định dạng giải đấu tiêu chuẩn, còn Royal Match có 6. Baseline đề xuất cho game match-swap: từ 2 giải tiêu chuẩn, cộng ít nhất 1 sprint-goal và 1 sprint-time — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)
- Puzzle Pass của Hay Day Pop kéo dài khoảng 30–34 ngày. Tác giả đánh giá phần thưởng quá chóng qua để tạo thêm retention — [Deconstructor of Fun, 05/2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Candy Crush All Stars là giải đấu trực tiếp thường niên: hơn 15 triệu người tham gia, vượt 1,2 tỷ màn, 23,1 tỷ lượt đi (số của King, 2025) — [mobilegamer.biz, 27/05/2025](https://mobilegamer.biz/kings-all-stars-live-op-appears-to-be-firing-candy-crush-saga-to-near-record-earnings/)

### Inferences
- Win streak là sự kiện duy nhất trong nhóm cần được tính vào **cân bằng độ khó**, vì nó làm thay đổi trạng thái khởi đầu của màn. Nếu thêm sau khi đã tune, đường khó có thể bị lệch.
- Đua, giải đấu và album chủ yếu đổi **lý do chơi** chứ không đổi luật bàn cờ, nên có thể lùi lại sau khi core đã được xác nhận.

### Gaps
- Báo cáo PDF Casual LiveOps H1 2025 của AppMagic quá lớn nên không đọc được. Chưa có tỷ lệ sự kiện tách riêng cho match-3.
- Chưa có thời lượng chuẩn cho từng sự kiện ở Royal Match, trừ các mốc đã nêu.

## 3. Hiệu quả retention và engagement được công bố là gì?

### Takeaway
Có nhiều số về doanh thu và benchmark retention, nhưng **rất ít số đo tác động retention của từng tính năng meta**. Số nhân quả rõ nhất tìm được là Super Light Ball tăng doanh thu 1,5 lần, và đó là chỉ số doanh thu.

### Cited Findings

**Tác động của tính năng hoặc sự kiện**
- Super Light Ball (kích hoạt sau 10 trận thắng) làm doanh thu Royal Match tăng 1,5 lần theo phân tích của Naavik. Bài không cho thấy đây là số công ty công bố — [Naavik, 23/02/2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)
- Không phải biến thể nào cũng thành công: Super Duke (+3 lượt sau 5 trận thắng) không hiệu quả, có thể do ăn vào doanh số mua thêm lượt. Tính năng trả 500 xu để nhân 10 phần thưởng cũng thất bại — [Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)
- Tháng 04/2025 có All Stars, Candy Crush Saga đạt ước tính 108,25 triệu USD IAP, tháng cao thứ hai từ trước tới nay, sát kỷ lục 108,29 triệu của 10/2021 (cũng trong All Stars). King không xác nhận số này. King cho biết lượt cài tăng khoảng 14% ở Mỹ, 7% toàn cầu, và reactivation ở Mỹ tăng khoảng 10% — [mobilegamer.biz, 27/05/2025](https://mobilegamer.biz/kings-all-stars-live-op-appears-to-be-firing-candy-crush-saga-to-near-record-earnings/). Lưu ý: sự kiện đi kèm chiến dịch marketing lớn nhất của nó, nên không thể quy toàn bộ mức tăng cho live-op.
- Doanh thu IAP cuối tuần của Royal Match tăng vọt. Sensor Tower quy cho chuyển đổi do sự kiện, **không phải** tăng DAU, lượt tải hay thời gian chơi — [Sensor Tower, 05/2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)
- Sự kiện cạnh tranh được dùng chủ yếu để tăng độ dài phiên và retention ngắn hạn; khoảng 70% sự kiện trên thị trường nhắm vào người trả tiền (AppMagic, 2025) — [GameDev Reports](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)

**Benchmark retention**
- Toàn thị trường mobile 2025 (GameAnalytics): D1 trung vị khoảng 22%, top 10% khoảng 40%; D7 trung vị dưới 4%, top 10% khoảng 11–12%; D30 trung vị 0,69–0,79%, top 10% khoảng 4% — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) [snippet]
- Puzzle nằm trong nhóm thể loại giữ chân trung và dài hạn tốt nhất (GameAnalytics 2025) — [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) [snippet]
- D30 tại Mỹ năm 2025 (ước tính Sensor Tower qua Naavik): Screwdom khoảng 17%, nhóm Sort khoảng 8%, nhóm Block khoảng 4% — [Naavik, 22/02/2026](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/)
- Royal Match từng dẫn đầu D30 trong match-3 với 16,5% (mục tin 12/2021, đã cũ) — [PocketGamer.biz](https://www.pocketgamer.biz/tags/gardenscapes) [snippet]

**Quy mô thị trường**
- Match-3 năm 2025: 4,8 tỷ USD (đi ngang), 811 triệu lượt tải (-8%). Chỉ **4/367** game mới đạt 100 nghìn USD/tháng ít nhất một lần. Dream Games chiếm hơn 30% doanh thu (AppMagic) — [Mobidictum, 24/02/2026](https://mobidictum.com/appmagic-casual-games-report-2025-summary/)
- H1 2025 (AppMagic, net): match-3 2,7 tỷ USD (+7%), 394 triệu lượt cài (-17%); Royal Match 788 triệu USD (+15%); Candy Crush Saga 602 triệu USD (+11%) — [GameDev Reports, 04/09/2025](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125?open=false)
- Tháng 08/2025: Royal Match hơn 113 triệu USD IAP, Candy Crush Saga 81 triệu USD — [Statista](https://www.statista.com/statistics/1405596/top-grossing-match-3-gaming-titles) [snippet]
- Royal Match đạt 6 tỷ USD user spending (AppMagic, 05/2025). Cùng bài cũng ghi 3,6 tỷ USD mà không giải thích; rất có thể là gross so với net nhưng bài không xác nhận. Candy Crush Saga dẫn đầu lifetime với 8 tỷ USD — [mobilegamer.biz, 21/05/2025](https://mobilegamer.biz/data-digest-royal-match-hits-6bn-aprils-top-games-midcore-insights-plus-funding-and-financial-news/)

**Số liệu mâu thuẫn**
- Quy mô Match Swap năm 2025: khoảng 5,3 tỷ USD theo [Naavik/Sensor Tower](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/), so với 4,8 tỷ USD theo [AppMagic](https://mobidictum.com/appmagic-casual-games-report-2025-summary/). Khác nhà cung cấp và có thể khác định nghĩa.
- MAU Candy Crush: khoảng 81,5 triệu năm 2025 theo [Business of Apps](https://businessofapps.com/data/candy-crush-statistics) [snippet], so với 170–176 triệu đầu 2026 theo một ước tính khác trong [kết quả tổng hợp](https://prioridata.com/data/candy-crush-revenue/) [snippet]. King chỉ công bố số toàn danh mục, nên **không nên dùng MAU theo từng game**.

### Inferences
- AppMagic cho H1 2025 là 2,7 tỷ và cả năm là 4,8 tỷ, ngụ ý H2 chỉ khoảng 2,1 tỷ. Mức giảm này khá lớn và có thể đến từ điều chỉnh dữ liệu giữa hai báo cáo, nên không nên kết luận thị trường giảm mạnh trong H2 khi chưa đối chiếu.
- Với một prototype, các benchmark D30 không dùng được trực tiếp vì meta, nội dung và tệp người chơi đều khác.

### Gaps
- **Không tìm thấy** số retention uplift công khai, có nhóm đối chứng, cho decoration, teams, collections, Lava Quest hoặc battle pass trong match-3.
- Tiêu đề PocketGamer.biz nói Royal Match chiếm [51% doanh thu match-3 năm 2024](https://www.pocketgamer.biz/royal-match-earned-51-of-all-match-3-revenue-in-2024), nhưng trang chặn truy cập nên không xác minh được định nghĩa. Con số này khó khớp với mức hơn 30% của AppMagic cho năm 2025, nên không nên dùng.

## 4. Meta của thể loại tiến hóa thế nào từ 2012 đến 2026?

### Takeaway
Trọng tâm đã chuyển từ màn chơi và bản đồ, sang câu chuyện và trang trí, rồi sang "core phong phú, meta nhẹ, live-ops dày". Từ 2023–2026, sức ép mới đến từ Merge-2 và các format Block, Sort, Screw với chi phí thu hút người chơi thấp hơn.

### Cited Findings
- **2012–2013:** Puzzle & Dragons cho thấy RPG/gacha trên nền puzzle có thể đạt quy mô tỷ USD — [PocketGamer.biz](https://www.pocketgamer.biz/its-official-puzzle-and-dragons-is-the-first-mobile-game-to-1-billion-in-revenue/) [snippet]
- **Khoảng 2019:** Empires & Puzzles là ví dụ của mô hình match-3 RPG có gacha, căn cứ và liên minh — [GameRefinery, 2019](https://www.gamerefinery.com/deconstructing-empires-puzzles/)
- **2020:** Câu chuyện được xem là yếu tố giữ chân lớn, đến mức thiếu câu chuyện bị coi là điểm yếu chính của Hay Day Pop — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- **02/2021:** Royal Match phát hành toàn cầu với hướng meta nhẹ, khoảng 60 A/B test mỗi năm (số trình bày năm 2023) — [Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)
- **2022–2024:** Super booster ra mắt ở Homescapes năm 2022. Chín tháng sau, Royal Match đưa nó vào win streak, rồi chuyển sang Light Ball, và cơ chế này trở thành chuẩn của các game puzzle top-grossing — [Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/); Toon Blast, Homescapes và Matchington Mansion cũng theo — [Deconstructor of Fun, 2024](https://www.deconstructoroffun.com/blog/2024/8/5/win-streak-the-gift-that-keeps-on-giving)
- **01/2025:** Royal Match là game mobile có doanh thu cao thứ 2 toàn cầu — [Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)
- **2025:** Royal Kingdom là một trong hai game mới vào top 10 match-3 — [Mobidictum, 2026](https://mobidictum.com/appmagic-casual-games-report-2025-summary/). Doanh thu năm đầu được báo khoảng 301 triệu USD, vượt Royal Match cùng giai đoạn — [PocketGamer.biz](https://www.pocketgamer.biz/royal-kingdom-surpasses-300m-in-first-year-beating-royal-match) [snippet]
- **Cơ cấu puzzle 2025 (Sensor Tower/Naavik):** tổng khoảng 10 tỷ USD IAP (+14%). Match Swap khoảng 5,3 tỷ (+1%, 54%), Merge-2 khoảng 1,7 tỷ (+95%, 17%), Block/Sort/Screw khoảng 0,7 tỷ (+222%, 7%). Merge-2 đóng góp khoảng 60% phần tăng trưởng — [Naavik, 22/02/2026](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/)
- **Hybrid-casual:** Block chiếm 71% doanh thu puzzle trong top 10 hybrid-casual Q1 2025, Screw 20%, Sort tăng 5,6 lần so với cùng kỳ — [AppMagic](https://appmagic.rocks/blog/hybridcasual-q1-2025) [snippet]
- **Tiến hóa Sort:** Water Sort dưới 2 triệu USD/năm trước 2023 → Block Jam 3D đỉnh khoảng 2,5 triệu USD IAP/tháng → Hexa Sort đỉnh 4 triệu USD/tháng → Magic Sort hơn 40 triệu USD năm đầu với mô hình pure-IAP → Pixel Flow (10/2025) — [Deconstructor of Fun, 06/02/2026](https://www.deconstructoroffun.com/blog/2026/2/6/sort-puzzles-how-a-new-subgenre-is-born). Naavik ghi Magic Sort khoảng [50 triệu USD năm 2025](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/); hai số khác kỳ đo hoặc nguồn.
- Đổi mới gần đây của Sort là chuyển từ puzzle tĩnh sang động: tự sắp xếp và sinh vật phẩm mới giúp tăng độ phức tạp mà không thêm thao tác lặp — [Deconstructor of Fun, 2026](https://www.deconstructoroffun.com/blog/2026/2/6/sort-puzzles-how-a-new-subgenre-is-born)
- Mô hình kiếm tiền của Block và Screw dựa nhiều vào điểm kẹt có chủ đích (giới hạn thời gian, hết chỗ chứa) — [Naavik, 2026](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/)

### Inferences
- Bài học lớn từ Royal Match là **chất lượng core và tốc độ thử nghiệm** có thể quan trọng hơn độ sâu meta. Đây là suy luận từ một trường hợp thành công, có thiên lệch sống sót.
- Tỷ lệ 4/367 cho thấy sao chép match-swap kèm meta quen thuộc khó cạnh tranh. Một prototype nhỏ nên tìm điểm khác biệt ở **core**, vì meta và live-ops của các công ty lớn khó theo kịp.
- Retention D30 thấp ở Block và Sort gợi ý rằng core mới lạ có thể kéo người chơi nhanh nhưng vẫn cần chiều sâu dài hạn. Mẫu quá nhỏ để kết luận.

### Gaps
- Thiếu nguồn sơ cấp cho giai đoạn 2012–2018 về King, saga map và sự chuyển dịch sang trang trí.
- Chưa có dữ liệu đầy đủ về Block Blast năm 2025–2026 trong các nguồn đã đọc.
- Báo cáo công ty của King/Microsoft không cung cấp số theo từng game.

## 5. Yếu tố meta nào cần để xác nhận core fun, yếu tố nào nên loại khỏi prototype đầu?

### Takeaway
Lời khuyên của người làm nghề khá thống nhất: chứng minh core loop trước, chỉ thêm meta khi core phụ thuộc vào nó. Prototype đầu nên có chuỗi màn và mục tiêu tối thiểu; win streak là ứng viên thử nghiệm đầu tiên sau khi core đã ổn.

### Cited Findings
- Core loop phải "lặp lại được cao" và vui trước khi đầu tư giai đoạn sau, vì người chơi không thích core sẽ không chạm tới meta. Thứ tự đề xuất: ổn định → core loop → retention → meta/UA → monetization — [a16z, 17/10/2023](https://a16z.com/mobile-game-soft-launch/)
- Chỉ số giai đoạn core: hoàn thành FTUE, thời gian chơi D0, phiên lặp lại, retention D1–D7, số phiên và số phút mỗi ngày — [a16z, 2023](https://a16z.com/mobile-game-soft-launch/)
- Đo D30 đầy đủ cần ít nhất 60 ngày để quan sát 30 cohort; nếu không đủ thời gian có thể dùng tỷ lệ D1:D7:D30 làm proxy — [a16z, 2023](https://a16z.com/mobile-game-soft-launch/)
- "Prototype core loop và đảm bảo nó hoạt động trước khi thêm tính năng"; thêm tính năng hiếm khi cứu được core yếu — [Game Developer, 14/03/2017](https://www.gamedeveloper.com/design/4-prototypes-that-will-help-you-survive-the-road-towards-a-successful-game)
- Prototype chỉ cần trả lời game có vui và điều khiển tốt trên điện thoại không, không cần meta progression trừ khi core phụ thuộc vào nó — [Cursa](https://cursa.app/en/page/prototype-to-vertical-slice-mobile-gameplay-validation) [snippet, nguồn giáo trình, độ tin cậy trung bình]
- Dấu hiệu độ khó cần theo dõi: số lần thử mỗi màn tăng từ 1–2 lên 5–6 trở lên bị xem là rủi ro retention — [Deconstructor of Fun, 05/2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)
- Royal Match ưu tiên core phong phú hơn độ sâu meta, và thử nghiệm từng tính năng bằng A/B — [Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)

### Inferences

Đề xuất phân tầng cho prototype nhỏ (suy luận từ các nguồn trên, **chưa có nguồn nào đưa ra đúng bảng này**):

| Tầng | Yếu tố | Lý do |
|---|---|---|
| **Giữ trong prototype đầu** | Mục tiêu màn, giới hạn lượt, 10–20 màn có đường khó, kết quả thắng/thua, thử lại nhanh | Đây là phần tối thiểu để đánh giá core |
| **Giữ ở dạng rất nhẹ** | Danh sách màn hoặc bản đồ đơn giản, sao | Tạo cảm giác tiến trình nhưng không làm nhiễu đánh giá core |
| **Thử ở bước 2, sau khi core đạt** | Win streak 3 bậc, 1–2 booster | Tác động trực tiếp lên bàn cờ và độ khó, chi phí thấp, dễ bật/tắt để so sánh |
| **Thử ở bước 3** | Một lớp meta nhẹ (khu vực có nhiệm vụ hoặc một chuỗi câu chuyện ngắn) | Kiểm tra động lực quay lại, cần test nhiều phiên |
| **Loại khỏi prototype đầu** | Team/club, leaderboard thật, battle pass, album, sự kiện theo lịch, gacha, cửa hàng, IAP, năng lượng/mạng | Cần backend, nội dung hoặc lượng người chơi lớn; không trả lời được câu hỏi "core có vui không" |
| **Ngoại lệ** | Chỉ số anh hùng và kỹ năng | Chỉ đưa vào nếu ý tưởng là puzzle-RPG, vì khi đó chúng là một phần của core |

Cách kiểm tra đề xuất:
- Chơi core **không có meta** trước. Nếu người chơi không muốn chơi tiếp, chưa nên thêm meta.
- Khi thêm win streak, so sánh bật/tắt theo số màn mỗi phiên, tỷ lệ thử lại sau khi thua và tỷ lệ thắng.
- Test tự động chỉ đo được nhịp và độ khó. Độ vui vẫn cần người chơi thật đánh giá.

### Gaps
- Không tìm được talk GDC hoặc bài thực hành nói riêng về **prototype match-3** và thứ tự thêm meta. Lời khuyên hiện có mang tính chung cho game mobile.
- Không có ngưỡng công khai đáng tin cậy cho playtest quy mô rất nhỏ. Các benchmark D1/D7 cần lượng người dùng lớn hơn nhiều so với một prototype.

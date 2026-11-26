# Giải mã match-3 để dựng prototype nguyên bản

Match-3 kiểu Candy Crush Saga hoạt động như một vòng lặp ngắn: người chơi thực hiện một nước đi hợp lệ, bàn cờ tự giải quyết chuỗi xóa, rơi, lấp và cascade, rồi trò chơi đo tiến độ so với mục tiêu màn trong một ngân sách lượt hữu hạn. Chiều sâu thiết kế đến từ năm lớp chồng lên vòng lặp đó: quân đặc biệt và combo tạo mục tiêu trung hạn, blocker buộc người chơi ưu tiên, đường cong độ khó điều tiết căng thẳng, seed quyết định mức may rủi, còn meta và kinh tế thay đổi lý do chơi cũng như độ khó thực tế. Bằng chứng mạnh nhất nằm ở luật power-up chính thức của Royal Match và Homescapes, các bài báo về bot đo độ khó, và thử nghiệm A/B có công bố của EA về chọn seed; bằng chứng yếu nhất nằm ở thông số nội bộ, luật Candy Crush và Toon Blast lấy từ nguồn fan, cùng mọi tuyên bố rằng một game cụ thể thao túng refill hay độ khó theo mức chi tiêu. Báo cáo này **không khẳng định game có tên nào dùng refill thiên lệch hoặc tăng độ khó theo chi tiêu**, vì ghi chú nghiên cứu không có bằng chứng sơ cấp cho điều đó. Với một đội nhỏ, hướng hợp lý là xây lõi bàn cờ xác định bằng seed, đo bằng bot, rồi đổi đúng một ràng buộc của thể loại thay vì sao chép meta. Hướng thử đầu tiên được đề xuất là **nghiêng trọng lực toàn bàn**, nhưng đây là suy luận, tiền lệ vẫn cần rà soát, và test tự động không thể kết luận game có vui hay không: người chơi thật phải đánh giá.

**Cách đọc bằng chứng.** Nhãn **[Chính thức]** là trang của studio; **[Đo lường]** là bài báo hoặc thử nghiệm có dữ liệu; **[Studio nói]** là phát biểu của nhân sự công ty, chưa có dữ liệu độc lập; **[Báo ngành]** là phân tích của bên thứ ba; **[Tutorial]** là cách làm của một lập trình viên; **[Fan]** là wiki hoặc trang hướng dẫn chưa được studio xác nhận; **[Trích đoạn]** nghĩa là nhóm nghiên cứu chỉ đọc được đoạn trích trên kết quả tìm kiếm; **[Suy luận]** là phân tích của báo cáo, không phải dữ kiện có nguồn.

## Một lượt chơi là vòng lặp xóa, rơi, lấp cho tới khi bàn ổn định

### Luật swap, match và cascade có khung chung nhưng thiếu chi tiết thương mại

Mô hình hình thức của thể loại khá gọn: **một swap giữa hai ô kề chỉ hợp lệ khi tạo hàng ngang hoặc dọc từ 3 quân giống nhau trở lên**; các quân khớp biến mất cùng lúc, quân phía trên rơi xuống, quân mới xuất hiện từ trên, và cascade lặp lại đến khi hết khớp **[Đo lường]** ([Gualà, Leucci, Natale](https://ar5iv.labs.arxiv.org/html/1403.5830)). Một tutorial Phaser bổ sung phần vận hành: swap sai thì trả về, sau cascade thì kiểm tra còn nước đi không và xáo bàn nếu hết **[Tutorial]** ([Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)). Khảo sát của Jonathan Bailey cho thấy mỗi khâu đều là biến thiết kế: thao tác có thể là swap, xoay, vuốt hoặc chạm; refill có thể đổi cách chọn quân, vị trí vào, số lượng, thời điểm và hướng trọng lực **[Báo ngành]** ([Game Developer](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)).

Không studio tham chiếu nào công bố **thứ tự xử lý chính xác** khi nhiều nhóm khớp cùng lúc, cách phá thế hòa, hay vị trí sinh quân đặc biệt. Đây không phải chi tiết nhỏ: hai bài chứng minh độ phức tạp của match-3 bất đồng chính vì cách xử lý chuỗi đồng thời, nên quy tắc này thực sự làm đổi kết quả ([Gualà và cộng sự](https://ar5iv.labs.arxiv.org/html/1403.5830); [Walsh](https://arxiv.org/pdf/1403.1911)). Prototype phải tự chốt và ghi lại quy tắc của mình. Bảng dưới là đề xuất **[Suy luận]**, không phải luật của game thương mại nào.

| Pha | Việc bàn cờ làm | Lý do thiết kế |
|---|---|---|
| Nhận lệnh | Khóa nhập, diễn hoạt swap, kiểm tra khớp hoặc kích hoạt quân đặc biệt | Nước sai được trả về và không mất lượt |
| Xác nhận | Trừ một lượt, gom ô khớp thành hình, chọn quân đặc biệt sẽ sinh | Một ô thuộc cả hàng ngang và dọc chỉ tính một lần |
| Xóa | Xóa mọi nhóm trong cùng bước, gây sát thương blocker, xếp hàng quân đặc biệt bị kích hoạt | Kết quả không phụ thuộc thứ tự quét |
| Lấp | Áp dụng trọng lực, refill bằng RNG có seed | Cùng seed và cùng nước đi phải cho cùng trạng thái |
| Lặp | Quét lại, tăng bộ đếm cascade nếu còn khớp | Làm nền cho phản hồi leo thang |
| Kết lượt | Chạy hành vi blocker, xét thắng/thua, kiểm tra bế tắc, xáo bàn nếu cần, mở nhập | Cascade ở lượt cuối vẫn có thể mang lại chiến thắng |

Nguồn còn mâu thuẫn ở việc khóa nhập. Các tutorial thường khóa nhập đến khi animation xong **[Tutorial, Trích đoạn]** ([CS50 Games](https://cs50.harvard.edu/games/notes/3/)), trong khi Deconstructor of Fun mô tả Royal Match cho ghép khi bàn còn chuyển động và coi đó là một phần của cảm giác nhanh **[Báo ngành]** ([DoF, 2021](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)). **[Suy luận]** Prototype nên khóa nhập ở bản đầu để luật dễ kiểm chứng, nhưng tách logic bàn cờ khỏi hình ảnh bằng danh sách sự kiện có thứ tự để sau này có thể thử nhập đệm mà không viết lại lõi.

### Quân đặc biệt biến mỗi nước đi thành một lựa chọn về tương lai

Trang hỗ trợ của Playrix mô tả rõ bộ quân của Homescapes, còn các game khác chủ yếu dựa vào nguồn yếu hơn. Bốn chức năng lặp lại là **xóa theo đường, nổ theo vùng, bay tới mục tiêu, và xóa theo màu**. Bảng dưới giữ nguyên độ tin cậy khác nhau của từng cột; Gardenscapes không được xác minh riêng và không nên suy ra từ Homescapes.

| Chức năng | Homescapes **[Chính thức]** | Royal Match **[Fan, Trích đoạn]** | Candy Crush Saga **[Fan, Trích đoạn]** | Toon Blast **[Fan, Trích đoạn]** |
|---|---|---|---|---|
| Đường | 4 thẳng hàng: Rocket | Chưa có trong nguồn đã đọc | 4 thẳng hàng: striped | Cụm 5: Rocket |
| Vùng | 5 hoặc 6 hình L/T: Bomb | 5 hình L/T: TNT, nguồn lệch về bán kính | Hình T/L: wrapped | Cụm 6 hoặc 7, nguồn mâu thuẫn: Bomb |
| Bay | Khối 2x2: Paper Plane | Khối 2x2: Propeller | Hướng dẫn đã đọc không liệt kê | Chưa có trong nguồn đã đọc |
| Màu | 5 thẳng hàng: Rainbow Ball | 5 thẳng hàng: Light Ball | 5 thẳng hàng: color bomb | Cụm 9: Disco Ball |

Nguồn: [Playrix](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16313-power-ups-and-how-to-use-them); [Pocket Gamer về Royal Match](https://www.pocketgamer.com/royal-match/tips-and-tricks); [Gamer Tweak](https://gamertweak.com/get-use-tnt-royal-match); [GameRevolution](https://www.gamerevolution.com/guides/60253-candy-crush-saga-candy-combinations); [Candy Crush fan wiki](https://candycrush.fandom.com/wiki/Candy); [Gamezebo](https://www.gamezebo.com/walkthroughs/toon-blast-tips-cheats-and-strategies/); [Pocket Gamer về Toon Blast](https://www.pocketgamer.com/toon-blast/toon-blast-cheats-tips-and-tricks/).

Bảng combo chính thức của Royal Match và Homescapes gần như trùng nhau, và đây là phần luật đáng tin nhất trong toàn bộ nghiên cứu ([Royal Match Help](https://dreamgames.helpshift.com/hc/az/3-royal-match/faq/7-power-up-combinations); [Playrix Help](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16363-what-power-up-combinations-are-available-in-the-game)).

| Cặp ghép | Royal Match **[Chính thức]** | Homescapes **[Chính thức]** |
|---|---|---|
| Đường + Đường | Trọn hàng và cột | Một hàng và một cột |
| Đường + Vùng | 3 hàng và 3 cột | 3 hàng và 3 cột |
| Vùng + Vùng | Mọi vật trong bán kính 4 ô | Gấp đôi bán kính nổ |
| Bay + Bay | 3 Propeller, mỗi cái đánh một phần tử ngẫu nhiên | 3 máy bay tới 3 ô khác nhau |
| Bay + Đường/Vùng | Mang quân đó tới ô ngẫu nhiên, xóa ô kề khi cất cánh | Mang quân đó tới ô ngẫu nhiên |
| Màu + Đường/Vùng/Bay | Màu phổ biến nhất thành power-up đó | Loại quân phổ biến nhất thành power-up đó |
| Màu + Màu | Xóa mọi vật, gỡ một lớp ở mọi phần tử | Xóa mọi quân, gỡ một lớp chướng ngại |

Playrix cho biết Plane thường ưu tiên phần tử bị khóa hoặc mục tiêu, một chi tiết nhỏ nhưng quan trọng vì nó khiến quân ngẫu nhiên vẫn có vẻ phục vụ ý định của người chơi ([Playrix](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16313-power-ups-and-how-to-use-them)). Ghi chú còn lưu một đoạn trích nói một viên striped xóa cả hàng lẫn cột; thông tin này mâu thuẫn với hành vi của các quân tương đương, có thể đang mô tả striped + striped, và chưa được xác minh. **[Suy luận]** Bộ khởi đầu nguyên bản có thể gồm bốn chức năng trên với tên và hình ảnh riêng, ưu tiên hình theo thứ tự 5 thẳng, L/T, 2x2, 4 thẳng khi một nhóm đủ điều kiện cho nhiều loại; thứ tự này chưa có nguồn và phải được thử.

### Blocker, mục tiêu và lượt tạo ra quyết định

Theo một cuộc phỏng vấn sản phẩm của King, nhà thiết kế thường dùng blocker **đòi hỏi ưu tiên và ra quyết định** khi làm màn khó, đồng thời trộn blocker mới với blocker lâu đời **[Báo ngành, Trích đoạn]** ([PocketGamer.biz](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase)). King cũng có talk GDC về phân tích blocker như động lực độ khó, nhưng nhóm nghiên cứu không truy cập được nội dung ([GDC Vault](https://gdcvault.com/play/1026813/Blockers-Analyzing-Difficulty-Drivers-in)). Khảo sát của Bailey ghi nhận các dạng điều kiện thắng như xóa lưới, đủ số lần ghép, đạt điểm, ghép cụ thể hoặc xóa ô chỉ định **[Báo ngành]** ([Bailey](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)). Bảng phân họ sau là **[Suy luận]** để thiết kế, không phải phân loại chuẩn của ngành.

| Họ blocker hoặc mục tiêu | Mẫu luật | Quyết định tạo ra |
|---|---|---|
| Nhiều lớp | Cần N lần đánh | Dồn sát thương hay rải đều |
| Dưới ô | Xóa quân nằm trên nó | Xử lý vùng khó với tới |
| Khóa | Quân khớp được nhưng không swap được | Giải phóng hay chơi vòng qua |
| Tường tĩnh | Chặn trọng lực hoặc swap | Điều hướng dòng refill |
| Lan | Tăng nếu lượt đó không bị đánh | Chặn ngay hay theo mục tiêu |
| Rơi đáy | Phải đưa tới đáy hoặc lối ra | Dọn phía dưới, kiểm soát cột |
| Thu thập | Xóa N quân theo màu hoặc loại | Lấy màu ngay hay chuẩn bị combo |
| Di chuyển | Đổi vị trí mỗi lượt | Canh thời điểm tấn công |

Ngân sách lượt là cần gạt độ khó dễ đọc nhất. Một phân tích của Gamigion về 100 màn đầu Royal Match ghi nhận **30-38 lượt ở màn 1-20, 25-30 lượt ở màn 21-60, và 23-27 lượt ở màn 61-100**; 91 màn đầu giới thiệu 11 khối mới theo nhịp vài màn học, một màn khó, đôi khi một đỉnh siêu khó, rồi màn thưởng **[Báo ngành, số đo của bên thứ ba]** ([Gamigion](https://www.gamigion.com/royal-match-level-design-insights/)). Cuối màn, Candy Crush được nguồn fan mô tả là đổi lượt thừa thành quân đặc biệt rồi kích nổ **[Fan, Trích đoạn]** ([Candy Crush fan wiki](https://candycrush.fandom.com/wiki/Sugar_Crush)). **[Suy luận]** Prototype đầu nên giới hạn ở một blocker nhiều lớp, một blocker lan và một mục tiêu rơi đáy, vì ba thứ này kiểm tra ba loại quyết định khác nhau với phạm vi nhỏ. Phần thưởng cuối màn nên ngắn và cho phép bỏ qua.

## Độ khó là quan hệ giữa màn chơi, seed và người chơi

### Đường răng cưa hợp lý, nhưng không có bảng pass rate công khai đáng tin

Bài học rõ nhất đến từ King. Tại GDC 2024, công ty kể rằng **màn 65 của Candy Crush Saga có chuyển đổi và doanh thu cao nhất nhưng cũng gây rời bỏ nhiều nhất**; thử nghiệm A/B sau ra mắt cho thấy khó hơn làm tăng chuyển đổi ngắn hạn, còn dễ hơn giữ người chơi lâu hơn **[Studio nói]** ([Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)). King cũng khuyên màn càng khó thì càng phải ngắn, và theo dõi độ "đố" tách khỏi độ khó vì những màn khó thiên về giải đố lại kém hấp dẫn nhất trong dữ liệu của họ (cùng nguồn). Điều này tạo một căng thẳng đáng chú ý: blocker nên tạo quyết định, nhưng biến mỗi màn thành câu đố có một lời giải chưa chắc làm game hay hơn.

Dữ liệu từ một game match-3 của EA với hơn 200 màn cho thấy các đỉnh khó ở màn 21-80 tương quan mạnh với sụt giảm người chơi, còn dân số ở các màn sau bền hơn dù khó hơn **[Đo lường]** ([Xue và cộng sự, 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)). Nghiên cứu Royal Crush thấy độ khó không tăng tuyến tính theo mật độ quân đặc biệt, nhưng chỉ có **một người thử**, nên chỉ là tín hiệu yếu **[Đo lường, yếu]** ([Eckmann và cộng sự, 2024](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf)). Room 8 Studio khuyên màn hướng dẫn chỉ dùng 1-3 cơ chế và tránh lặp ý tưởng trong ít nhất 50 màn **[Báo ngành]** ([Room 8](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)).

Không có benchmark công khai đáng tin cho pass rate theo nhóm màn. King đã loại tỷ lệ thành công thật khỏi số liệu công bố. Các con số "độ khó" phần trăm của devtodev **không được dùng làm mục tiêu pass rate** vì nguồn không có tập dữ liệu và ngữ cảnh cho thấy chúng không mô tả tỷ lệ qua màn. Số lần thử trung bình của Gamigion cho Royal Match cũng là đo lường bên thứ ba và không nên chép thành mục tiêu cho game khác. **[Suy luận]** Prototype nên dùng chu kỳ ngắn dễ, vừa, khó, cho mỗi cơ chế mới xuất hiện một mình ở màn ít áp lực, rồi đo độ dài chu kỳ thay vì giả định.

### Hãy đo số lần thử và phân phối, đừng chỉ đo tỷ lệ thắng

King định nghĩa độ khó là số lần thành công chia tổng lần thử **[Đo lường]** ([Gudmundsson và cộng sự, 2018](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)); EA dùng nghịch đảo, tức số lần thử kỳ vọng để thắng ([Xue và cộng sự](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)). Nhưng pass rate bị nhiễu bởi việc ai còn ở lại chơi: người ít kiên trì và kém kỹ năng rời sớm hơn, làm dân số thay đổi qua từng màn **[Đo lường]** ([Roohi và cộng sự, 2020](https://doi.org/10.1145/3410404.3414235)). **[Suy luận]** Với nhóm playtest nhỏ, tỷ lệ rời bỏ quá nhiễu; nên ghi số lần thử tới trận thắng đầu, lượt còn lại khi thắng, mục tiêu còn lại khi thua, thời lượng, số lần xáo bàn và booster đã dùng, rồi báo cáo trung vị cùng phân phối.

### Seed là công cụ được ghi nhận, refill thiên lệch vẫn chưa được chứng minh ở game có tên

Bằng chứng tốt nhất về RNG đến từ EA. Trong một game match-3 không nêu tên, **tỷ lệ thắng của cùng một màn dao động từ 0,15 đến 0,75 tùy seed**, tức khoảng 6,7 so với 1,3 lần thử kỳ vọng. Hệ thống DDA của EA chọn trong 100 seed khởi tạo cho mỗi màn; A/B test triển khai 10%, 40%, rồi 70% người chơi tăng số vòng chơi và thời gian chơi tới khoảng **9%**, không có khác biệt doanh thu có ý nghĩa thống kê **[Đo lường, tác giả là công ty]** ([Xue và cộng sự, 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)). Đây là bằng chứng về **chọn seed khởi tạo trong một game của EA**, không phải bằng chứng về refill thiên lệch ở các game khác.

Refill có trọng số được một chuyên gia mô tả như kỹ thuật khả thi: giảm một màu 20-30% khó bị nhận ra khi bàn có 4-5 màu, dù tác động có thể nhỏ **[Báo ngành]** ([Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)). Khảo sát của Bailey có nêu Candy Crush Saga như ví dụ về chọn khối để điều chỉnh độ khó ([Bailey](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)), nhưng ghi chú không tìm được nguồn sơ cấp nào xác nhận hành vi của các bản Candy Crush, Royal Match hay Homescapes hiện tại, nên **báo cáo không coi đó là dữ kiện**. Năm 2014, một bài viết thuật lại lời Tommy Palm của King rằng trò chơi ngẫu nhiên và độ khó thay đổi như nhau cho mọi người; cùng bài ghi lại cáo buộc trái chiều của Ramin Shokrizade về độ khó dựa trên tiền. Cả hai đều là thông tin thứ cấp, cũ, và cáo buộc không có bằng chứng sơ cấp xác nhận ([GamesBrief](https://www.gamesbrief.com/2014/02/if-king-fixes-candy-crush-saga-to-make-you-pay-more-based-on-your-behaviour-they-are-going-to-prison)). Bằng sáng chế cũng không chứng minh sản phẩm đã triển khai.

### Bot xếp hạng màn tốt hơn là dự đoán chính xác trải nghiệm

Bot của King dự đoán tỷ lệ thành công trên 200 màn test với sai số tuyệt đối trung bình **4,0% (CNN, 1.000 lần thử mỗi màn)** và **5,4% (MCTS, 100 lần thử)** trên Candy Crush Saga sau hiệu chỉnh **[Đo lường]** ([Gudmundsson và cộng sự](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)). Trên Lily's Garden, số lượt của khoảng 5% lần chơi tốt nhất là đặc trưng dự đoán mạnh nhất, dù agent vẫn yếu hơn người ([Kristensen và cộng sự](https://arxiv.org/html/2306.14626v1)). Sinh màn bằng AI còn xa mới đáng tin: Avalon của EA chỉ đạt **33,33% độ chính xác về độ khó** ([Villanueva Aylagas và cộng sự](https://arxiv.org/html/2409.06349v2)). NP-hardness của match-3 áp dụng cho bàn tổng quát cỡ tùy ý ([Gualà và cộng sự](https://ar5iv.labs.arxiv.org/html/1403.5830)), nên **[Suy luận]** nó không ngăn mô phỏng bàn 8x8, nhưng cho thấy không nên cân bằng bằng cách tìm lời giải hoàn hảo.

**[Suy luận]** Quy trình phù hợp cho đội nhỏ là lõi xác định với PRNG có seed; bot ngẫu nhiên để tìm lỗi và bế tắc; bot tham lam làm mốc người chơi phổ thông; bot heuristic theo mục tiêu; và MCTS nông chỉ cho màn bị gắn cờ khó. Mỗi màn nên chạy 20-50 seed. Theo thống kê nhị thức, **400 lần chơi cho sai số khoảng ±5 điểm phần trăm** ở tỷ lệ thắng 50%, còn 1.000 lần cho khoảng ±3,1 điểm. Khoảng cách tỷ lệ thắng giữa bot mạnh và bot yếu trên cùng seed là thước đo đề xuất cho mức độ quyết định có ý nghĩa, nhưng chưa được kiểm chứng trong nguồn đã đọc.

## Game feel có số khởi điểm, nhưng không có thông số của studio

Không studio tham chiếu nào công bố timing, độ trễ gợi ý hay đường cao độ âm thanh của cascade. Những con số dùng được đến từ tutorial, nên chỉ là điểm bắt đầu: swap 180 ms, xóa 250 ms, rơi 90 ms mỗi hàng, refill 100 ms mỗi hàng, rung camera 80 ms khi đi sai **[Tutorial]** ([Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)). Một tutorial PixiJS bổ sung hiệu ứng xuất hiện từ tỷ lệ 0,8 lên 1,0 trong 300 ms và nhấn mạnh easing phi tuyến ([Roman Guivan](https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff)). Ngưỡng phản hồi "nhanh" dưới 100 ms đến từ hướng dẫn UI chung, không phải nghiên cứu game ([SAP Fiori](https://www.sap.com/design-system/fiori-design-web/v1-139/foundations/interaction/timing)). Tuyên bố âm thanh phải khớp trong khoảng 12-20 ms chỉ là ý kiến từ blog, không có dữ liệu liên kết ([EastonDev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)).

| Nhịp | Giá trị khởi điểm | Cơ sở |
|---|---|---|
| Xác nhận đầu vào | Dưới 100 ms | Dải UI chung |
| Swap | 150-180 ms | Tutorial |
| Trả nước sai + rung | Khoảng 180 ms + 80 ms | Tutorial |
| Chuẩn bị trước khi xóa | 40-80 ms | **Suy luận** |
| Xóa | 150-250 ms | Tutorial |
| Rơi | 60-90 ms mỗi hàng, có trần | Tutorial |
| Nén khi chạm đáy | 80-120 ms | **Suy luận** |
| Nghỉ giữa bước cascade | 50-120 ms | **Suy luận** |
| Gợi ý khi không thao tác | 4-6 giây | **Suy luận**, cần playtest |

**[Suy luận]** Phản hồi nên leo thang theo từng bước cascade bằng cao độ có trần, chữ điểm lớn dần và nhiều hạt hơn, đồng thời rút ngắn nhẹ thời gian ở chuỗi dài để người chơi không phải chờ. Rung màn hình nên dành cho quân đặc biệt và combo để giữ ý nghĩa. Mọi thời lượng phải nằm trong `TUNING` và có khoảng trong `TUNING_RANGES` của dự án. Test có thể xác minh timing và trạng thái, nhưng không thể cho biết cảm giác đó có hay hay không.

## Meta và kinh tế thay đổi độ khó thực tế của bàn cờ

### Meta casual ở ngoài bàn, meta RPG đi vào luật trận

Meta biến chiến thắng thành tiến trình dài hạn, nhưng nên phân biệt theo mức can thiệp. **[Suy luận]** Lớp ngoài bàn gồm bản đồ, trang trí, câu chuyện và album; lớp đầu màn gồm booster và win streak; lớp trong luật gồm chỉ số anh hùng, khắc màu và kỹ năng. Ghi chú **không tìm được nguồn tốt về thiết kế saga map của King**, nên báo cáo không suy diễn lịch sử hay công thức của nó.

Với trang trí, Michail Katkoff lập luận rằng ở Gardenscapes và Homescapes câu chuyện mới giữ chân người chơi, còn trang trí chủ yếu thể hiện tiến trình; đây là ý kiến chuyên gia, không có số retention **[Báo ngành]** ([Deconstructor of Fun, 2020](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)). Royal Match chọn meta nhẹ, và thử nghiệm A/B/C cho thấy phương án khu vực có nhiệm vụ tốt hơn không meta hoặc meta episode, dù phần được trích không nêu rõ chỉ số thắng **[Báo ngành]** ([Naavik, 2025](https://naavik.co/digest/royal-match-finding-success-through-iteration/)). Ở nhánh RPG, Empires & Puzzles dùng đội 5 anh hùng, gem ghép thành đòn tấn công, màu khắc nhau và nạp kỹ năng, cùng gacha, căn cứ và liên minh **[Báo ngành, 2019]** ([GameRefinery](https://www.gamerefinery.com/deconstructing-empires-puzzles/)).

### Win streak là live-op cần tính vào cân bằng

AppMagic ghi nhận collections ở 75%, race ở 68%, album ở 66% tựa casual trong mẫu và win streak ở 48%, nhưng không công bố cỡ mẫu **[Báo ngành]** ([GameDev Reports](https://gamedevreports.substack.com/p/appmagic-mobile-live-ops-in-2025)). Sensor Tower mô tả lịch Royal Match gồm các lớp sự kiện ngắn, trung và dài hạn, với đội, giải đấu, album và pass ([Sensor Tower, 2026](https://sensortower.com/blog/what-royal-matchs-calendar-teaches-about-live-ops-in-2026)). Win streak đặt power-up sẵn đầu màn, nên trực tiếp đổi trạng thái khởi đầu ([Deconstructor of Fun, 2024](https://www.deconstructoroffun.com/blog/2024/8/5/win-streak-the-gift-that-keeps-on-giving)). Naavik phân tích Super Light Ball làm doanh thu Royal Match tăng **1,5 lần**, nhưng đó là chỉ số doanh thu và bài không cho thấy số do công ty công bố; biến thể +3 lượt sau 5 trận thắng lại không hiệu quả ([Naavik](https://naavik.co/digest/royal-match-finding-success-through-iteration/)). Ghi chú **không tìm thấy số uplift retention có nhóm đối chứng** cho trang trí, đội, album, Lava Quest hoặc battle pass trong match-3. Vì vậy **[Suy luận]** chỉ nên thử win streak sau khi core đã ổn và phải cân bằng lại khi bật tính năng này.

### Booster và lives làm dịch đường khó, còn near-miss mới có một nghiên cứu nhỏ

Candy Crush Saga cho thấy mô hình lives chờ theo thời gian thực **[Trích đoạn]** ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)). Các hướng dẫn phát triển thường mô tả booster đầu màn, công cụ trong màn và đề nghị mua thêm lượt sau khi thua; một số khẳng định thua khi còn thiếu 1-2 lượt bán tốt hơn, nhưng **không đưa dữ liệu** ([Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/why-match-3-games-are-still-one-of-the-most-profitable-mobile-genres); [Innovecs](https://www.innovecsgames.com/blog/match-3-game-development/)). **[Suy luận]** Vì vậy, mọi thay đổi về lượt, booster hoặc tiền miễn phí đều làm dịch đường khó, và phải đo pass rate có hỗ trợ tách khỏi pass rate không hỗ trợ.

Bằng chứng trực tiếp về near-miss trong match-3 chỉ là **một nghiên cứu nhỏ**. Larche và cộng sự theo dõi 57 người chơi Candy Crush, chủ yếu là nữ sinh viên, trong khoảng 30 phút. Near-miss, tức thiếu từ ba lượt trở xuống, đi kèm nhịp tim, kích thích tự đánh giá, thất vọng và thôi thúc chơi tiếp cao hơn thua thường (p từ 0,03 đến 0,05), nhưng độ dẫn da (p = 0,83) và thời gian dừng sau kết quả (p = 0,60) không khác biệt **[Đo lường]** ([PMC5445157](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)). Nghiên cứu không kiểm soát thứ tự kết quả và không đo chi tiêu. Do đó không thể nói near-miss gây ra chi tiêu, cũng không thể nói một game có tên cố ý tạo near-miss. Bằng chứng về sunk cost, loss aversion và phần thưởng biến thiên trong match-3 hiện chỉ là gián tiếp hoặc chưa có.

Về rủi ro pháp lý, các nguyên tắc CPC của EU tháng 3/2025 nhấn mạnh hiển thị giá tiền thật, tránh làm mờ chi phí bằng nhiều loại tiền, và bảo vệ người dễ bị tổn thương như trẻ em ([Reed Smith](https://www.reedsmith.com/articles/qas-on-the-eu-consumer-protection-authorities-joint-guidance-paper/)). FTC công bố đề xuất dàn xếp 20 triệu USD với nhà phát hành Genshin Impact về tiền ảo, tỷ lệ và trẻ vị thành niên ([FTC](https://ftc.gov/business-guidance/blog/2025/01/level-tips-businesses-ftcs-settlement-genshin-impact-developer-hoyoverse)). Ghi chú không tìm thấy hành động của cơ quan quản lý nhắm vào một game match-3, nên việc áp dụng cho thể loại này là suy luận, và phần này không phải tư vấn pháp lý.

## Bảy game chia thành bốn lõi, khác nhau ở thao tác và áp lực

| Game | Thao tác | Tài nguyên áp lực | Lớp ngoài | Điểm khác biệt và độ tin cậy |
|---|---|---|---|---|
| Candy Crush Saga | Swap ô kề | Lượt, có màn tính giờ | Saga map, chưa có nguồn tốt về thiết kế | Đa dạng blocker và chế độ; khoảng 18 blocker, 6 chế độ, 3.000 màn năm 2017 **[Trích đoạn]** ([King slides](https://speakerdeck.com/wnconf/jeremy-kang-king)) |
| Toon Blast | Chạm cụm cùng màu | Chưa có nguồn chính thức | Đội và tiến trình chưa xác minh ở đây | Chạm dễ, power-up ghép khi chạm nhau; luật cụm từ nguồn fan ([DoF](https://deconstructoroffun.com/blog/2024/9/2/time-blast-will-it-revive-the-blast-subgenre)) |
| Royal Match | Swap, chạm power-up | Lượt, mua thêm 5 lượt | Meta nhẹ theo khu vực | Nhanh, rõ, ít ma sát ([DoF](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey); [Naavik](https://naavik.co/deep-dives/royal-match/)) |
| Homescapes | Swap, chạm power-up | Không tìm được số liệu lượt | Trang trí và câu chuyện | Luật power-up chính thức rõ nhất ([Playrix](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16313-power-ups-and-how-to-use-them)) |
| Gardenscapes | Match-3 | Có mua thêm lượt **[Trích đoạn]** | Trang trí dẫn câu chuyện **[Trích đoạn]** | Luật chưa xác minh riêng ([PocketGamer.biz](https://www.pocketgamer.biz/comment-and-opinion/65810/deconstructing-gardenscapes-success/)) |
| Puzzle & Dragons | Kéo một viên qua nhiều ô | 5 giây kéo mỗi lượt, máu | RPG, đội 6 quái | Bàn 6x5, xếp nhiều combo trong một lần kéo ([Wikipedia](https://en.wikipedia.org/wiki/Puzzle_%26_Dragons)) |
| Empires & Puzzles | Chưa xác minh | Máu đội, chi tiết lượt chưa xác minh | RPG, gacha, căn cứ, liên minh | Ghép màu để tấn công và sạc kỹ năng ([trang chính thức](https://www.empiresandpuzzles.com/about); [GameRefinery](https://www.gamerefinery.com/deconstructing-empires-puzzles/)) |

Bốn lõi là đổi chỗ, chạm nổ cụm, kéo tự do có giờ, và ghép để chiến đấu; Puzzle & Dragons nằm ở cả hai lõi sau. Lợi thế của các game này thường đến từ **giảm ma sát hoặc đổi tài nguyên căng thẳng**, không chỉ từ luật mới. Deconstructor of Fun xem sức mạnh của Royal Match là tinh chỉnh cơ chế sẵn có; AppMagic chỉ nêu chiến dịch người nổi tiếng, LiveOps và quảng cáo như các yếu tố có thể góp phần vào việc vượt Candy Crush về doanh thu tháng từ 7/2023, nên thành công đó không thể quy riêng cho thiết kế ([DoF](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey); [AppMagic](https://appmagic.rocks/blog/dream-games-3-billion)).

Nhiều chi tiết so sánh vẫn phải giữ ở trạng thái mở. DoF nói Royal Match xáo bàn khi hết nước đi, còn Naavik nói bàn gần như không xáo trừ khi dùng booster. Độ dài phiên được ghi là 2-4 phút ở một nguồn và khoảng 29 phút ở nguồn khác **[Trích đoạn]**, nhiều khả năng do đo hai khái niệm khác nhau ([Game Developer](https://www.gamedeveloper.com/business/how-to-crack-the-match-3-code---part-1); [Adjust](https://adjust.com/blog/puzzle-games-trends-strategies)). Câu chuyện Gardenscapes chuyển từ hidden object sang match-3 trong soft launch chỉ xuất hiện ở trích đoạn và **chưa được dùng như dữ kiện**. Quy mô Match Swap năm 2025 cũng khác nhau giữa khoảng 5,3 tỷ USD của Sensor Tower/Naavik và 4,8 tỷ USD của AppMagic; cả hai là ước tính của bên thứ ba ([Naavik](https://naavik.co/digest/how-niche-subgenres-are-reshaping-the-mobile-puzzle-market/); [Mobidictum](https://mobidictum.com/appmagic-casual-games-report-2025-summary/)). Báo cáo không dùng MAU theo từng game và không dùng con số thị phần Royal Match năm 2024 mà ghi chú đã gắn cờ là không xác minh được.

Tín hiệu thị trường quan trọng hơn với người làm prototype là theo AppMagic, chỉ **4 trong 367** game match-3 mới đạt 100 nghìn USD/tháng ít nhất một lần trong năm 2025 ([Mobidictum](https://mobidictum.com/appmagic-casual-games-report-2025-summary/)). Các ca lai cũng gợi ý một mẫu: Triple Match 3D đổi thao tác và thêm khay chứa, chuyển áp lực từ tốc độ sang lập kế hoạch ([DoF](https://www.deconstructoroffun.com/blog/the-making-of-match-3d)), còn Hay Day Pop gặp vấn đề bàn bế tắc ở lõi collapse không cascade ([DoF](https://www.deconstructoroffun.com/blog/2020/5/17/hay-day-pop-or-drop)). **[Suy luận]** Công thức đáng thử là giữ một luật quen, đổi một ràng buộc, và luôn có lối thoát khỏi trạng thái kẹt.

## Tám nguyên tắc để biến nghiên cứu thành prototype

Các nguyên tắc dưới đây là **[Suy luận]** tổng hợp từ bằng chứng ở trên. Ngưỡng và cách kiểm tra là giả định ban đầu, cần chỉnh theo dữ liệu của chính prototype.

| Nguyên tắc | Căn cứ chính | Cách kiểm tra trong prototype |
|---|---|---|
| Tách logic bàn cờ khỏi hình ảnh | Luật đồng thời làm đổi kết quả | Cùng seed và cùng nước đi cho cùng hash trạng thái qua `getState()` |
| Mỗi nước phải có một quyết định đọc được | King nhấn mạnh blocker tạo ưu tiên | Bot có chiến lược thắng rõ hơn bot ngẫu nhiên |
| Đo màn trên một tập seed | Chênh lệch 0,15-0,75 trong dữ liệu EA | Báo cáo P10, P50, P90 thay vì một seed |
| Khó nhưng ngắn | Khuyến nghị của King về màn khó | Theo dõi thời lượng và số lần thử theo độ khó |
| Không dùng near-miss ẩn | Bằng chứng còn hạn chế, rủi ro niềm tin cao | Không có logic refill theo tình trạng thua; mọi trợ giúp đều được hiển thị |
| Mọi màn thắng được không cần trả phí | Rủi ro xung đột giữa độ khó và kinh tế | Bot mạnh và người thử qua được khi không dùng booster |
| Phản hồi nhanh, leo thang có trần | Chỉ có số tutorial, chưa có số studio | Thông số nằm trong `TUNING`, người chơi đánh giá nhịp |
| Thêm meta sau khi core đã giữ được người chơi | a16z và Game Developer khuyên chứng minh core trước | So sánh bật/tắt từng lớp, bắt đầu từ win streak nếu cần |

Lời khuyên core trước meta có nguồn từ [a16z](https://a16z.com/mobile-game-soft-launch/) và [Game Developer](https://www.gamedeveloper.com/design/4-prototypes-that-will-help-you-survive-the-road-towards-a-successful-game), nhưng đó là lời khuyên chung cho game mobile. EA lập luận cần giữ cần gạt độ khó vô hình để bảo toàn cảm giác thành tựu ([Xue và cộng sự](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)); báo cáo chọn hướng ngược lại cho prototype, tức curate seed theo màn và công khai mọi trợ giúp, vì mục tiêu ở đây là đánh giá công bằng thay vì tối ưu vận hành. Phạm vi bản đầu nên gồm mục tiêu màn, giới hạn lượt, 10-20 màn, thử lại tức thì, bản đồ hoặc danh sách màn rất nhẹ; loại team, leaderboard thật, pass, album, gacha, cửa hàng, IAP và lives.

## Năm hướng nguyên bản, bắt đầu từ nghiêng trọng lực

**Toàn bộ phần này là [Suy luận].** Ghi chú chưa rà soát có hệ thống game indie và game web, nên **chưa thể khẳng định hướng nào là mới**; phải tìm tiền lệ cho từng hướng trước khi chốt brief. Mọi hướng phải dùng tên, chủ đề, nhân vật, hình ảnh, âm nhạc và bố cục màn của riêng dự án, không tái tạo bất kỳ game nào đã nêu.

| Thứ tự thử | Hướng | Luật cốt lõi | Phím / cảm ứng | Rủi ro chính | Điều cần đo |
|---|---|---|---|---|---|
| 1 | **Nghiêng trọng lực** | Mỗi nước đổi hướng rơi của toàn bàn; cụm 3+ sau khi trượt sẽ nổ; giới hạn số lần nghiêng | Mũi tên / vuốt 4 hướng | Khó đoán, cảm giác may rủi | Bot tham lam thắng rõ hơn bot ngẫu nhiên |
| 2 | **Đường đi có ngân sách bước** | Giữ một ô, đi qua N ô, xem trước kết quả rồi xác nhận, không tính giờ | Mũi tên + Space / kéo và thả | Người chơi nghĩ quá lâu | Thời gian quyết định, tỷ lệ hoàn tác |
| 3 | **Blast có ô giữ** | Chạm cụm để nổ, hoặc cất một cụm vào 1-2 ô giữ rồi thả ở cột khác | Con trỏ + phím hành động / chạm và kéo | Hệ thống giữ làm game quá dễ | Tỷ lệ bế tắc trước và sau khi thêm ô giữ |
| 4 | **Mối đe dọa đi trên bàn** | Địch hiện đường đi của lượt sau; người chơi tạo ghép để chặn hoặc đẩy lùi | Con trỏ + xác nhận / chạm | Gần cơ chế đã có, cần luật riêng | Tỷ lệ nước đi phản ứng với địch |
| 5 | **Luật theo chương** | Mỗi chương thêm đúng một luật làm đổi engine thay vì thêm hàng trăm màn | Giữ nguyên điều khiển | Chi phí test tổ hợp luật | Số màn cần để một luật hết mới |

Nghiêng trọng lực đứng đầu vì động từ bốn hướng khớp tự nhiên với cả phím mũi tên và vuốt, đồng thời đổi đúng một trục lớn của thể loại. 2048 và Threes là tiền lệ thành công của thao tác nhiều hướng ([Wikipedia](https://en.wikipedia.org/wiki/Match_3)), nên hướng này **không được xem là hoàn toàn mới** và cần có luật đủ khác. Cổng dừng đề xuất là một lần thử màn dài 60-180 giây, bot có chiến lược thắng hơn bot ngẫu nhiên ít nhất 20 điểm phần trăm, và dưới 5% bàn khởi tạo không còn nước đi. Đây là các ngưỡng giả định. Nếu bot cho thấy kết quả quá ngẫu nhiên, hãy thêm xem trước hoặc chuyển sang hướng 2; nếu muốn lõi quen thuộc hơn, chọn hướng 3; hướng 5 có thể kết hợp với lõi nào đã đạt để giảm nhu cầu nội dung.

## Kết luận

Câu hỏi thiết kế quan trọng của match-3 không phải "thêm bao nhiêu quân đặc biệt và blocker", mà là **phần nào của kết quả do người chơi quyết định và phần nào do bàn cờ quyết định**. Seed, bot và luật xác định giúp đội nhỏ đo được ranh giới đó từ ngày đầu, trong khi các game lớn che giấu phần lớn công thức nội bộ. Vì thế, một prototype nguyên bản nên cạnh tranh bằng một ràng buộc mới, dễ đọc và công bằng, chứ không bằng cách đoán rồi sao chép những thông số không ai công bố.

Bước tiếp theo là rà soát tiền lệ cho hướng nghiêng trọng lực, viết brief với tiêu chí đo được, rồi dựng một lát cắt nhỏ để bot kiểm tra quyết định và bế tắc. Kết quả tự động chỉ cho biết luật chạy đúng và độ khó nằm ở đâu. **Test tự động không thể xác định game có vui hay không; người chơi thật phải chơi và đánh giá nhịp, sự công bằng và mong muốn chơi tiếp.**

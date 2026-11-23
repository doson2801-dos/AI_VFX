---
name: playwright-interactive
description: QA tương tác cho game Phaser, gồm lập danh sách kiểm tra, thử bằng input thật, soát hình ảnh riêng, kiểm tra vừa khung hình trên desktop và điện thoại. Dùng khi debug giao diện lặp nhanh, soát HUD và nút cảm ứng, hoặc trước khi QA kết luận đạt.
---

# QA tương tác

Bổ sung cho `qa-acceptance`, không thay thế. Kết luận đạt vẫn do `qa-tester` đưa ra, dựa trên test và `window.__game`.

## Chọn công cụ
| Ai | Dùng |
|---|---|
| Phiên chính | Browser pane (`mcp__Claude_Browser__*`), giữ nguyên tab giữa các lần sửa |
| `qa-tester` | Spec Playwright trong `tests/`, chạy riêng bằng `npx playwright test tests/<file>.spec.ts`, ảnh lưu vào `artifacts/` |

Không chạy song song hai tiến trình Playwright vì chúng dùng chung cổng 5173. Dùng `http://127.0.0.1:5173`.

## Quy trình
1. **Lập danh sách kiểm tra** từ ba nguồn: tiêu chí trong brief, tính năng đã cài, và những điều định khẳng định trong báo cáo. Mỗi mục phải có ít nhất một phép kiểm.
2. Với mỗi điều khiển, ghi trạng thái nó làm đổi, cách kiểm chức năng, trạng thái cần xem hình và bằng chứng.
3. Thêm ít nhất 2 kịch bản ngoài đường chính, ví dụ bấm liên tục, giữ hai hướng, chơi lại ngay lúc thua.
4. Kiểm chức năng.
5. Soát hình ảnh như một lượt riêng.
6. Kiểm tra vừa khung hình.
7. Sau mỗi lần sửa, tải lại và lặp lại phần bị ảnh hưởng. Cập nhật danh sách nếu phát hiện trạng thái mới.

## Kiểm chức năng
- Đọc kết quả qua `window.__game.getState()`, không suy đoán từ hình ảnh.
- `teleport`, `setInput`, `setBot` dùng để dựng tình huống và test lặp lại. **Chúng không chứng minh phím hay nút cảm ứng hoạt động.**
- Mỗi điều khiển phải được thử ít nhất một lần bằng `page.keyboard` và một lần bằng cảm ứng trong context `hasTouch`.
- Với công tắc hoặc trạng thái đảo được, thử đủ vòng: ban đầu, đổi, trở lại.
- Sau khi script đạt, chơi tự do 30 đến 90 giây bằng input thường, không đi theo đường dự kiến.

## Soát hình ảnh
Kiểm tra ở: bắt đầu màn, đang chơi, lúc đông đối tượng nhất, đang chuyển cảnh hoặc có hiệu ứng, thắng, thua.

- Chữ HUD đọc được, không bị cắt hoặc che.
- Nút cảm ứng không che nhân vật hay vùng chơi chính.
- Lớp hiển thị đúng thứ tự, nhãn bám đúng đối tượng sau khi trạng thái đổi.
- Có mà khó nhìn cũng là lỗi: tương phản yếu, bị che, nhấp nháy.
- Với chuyển động, xem nhiều ảnh liên tiếp, không kết luận từ một ảnh.
- Trước khi kết thúc, tự hỏi: phần nào chưa nhìn kỹ, và lỗi nào dễ lộ nhất nếu người chơi nhìn gần?

Chỉ báo lỗi hình ảnh quan sát được. Đẹp hay vui do người dùng đánh giá.

## Kiểm tra vừa khung hình
Thử tối thiểu desktop `1600x900` và điện thoại `390x844` với `isMobile`, `hasTouch`. Ảnh là bằng chứng chính, số liệu chỉ hỗ trợ. Thấy bị cắt trong ảnh là lỗi, kể cả khi số liệu đẹp.

```ts
const fit = await page.evaluate(() => {
  const c = document.querySelector('canvas')!.getBoundingClientRect();
  const d = document.documentElement;
  return {
    canvasInside: c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
    scrollX: d.scrollWidth > d.clientWidth,
    scrollY: d.scrollHeight > d.clientHeight,
  };
});
expect(fit).toEqual({ canvasInside: true, scrollX: false, scrollY: false });
```

## Điều kiện kết luận
Ba phần phải đạt độc lập: chức năng, vừa khung hình, hình ảnh.

Báo cáo gồm: mục đã phủ, mục cố ý bỏ qua, nội dung lượt chơi tự do, các loại lỗi đã tìm mà không thấy. Không coi giả lập là đã thử trên điện thoại thật.

Chuyển thể từ `playwright-interactive` của openai/skills, xem `NOTICE.md`.

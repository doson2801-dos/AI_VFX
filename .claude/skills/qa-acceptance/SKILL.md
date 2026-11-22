---
name: qa-acceptance
description: Nghiệm thu cơ chế game bằng test Playwright, bot và ảnh chụp theo tiêu chí trong brief. Dùng khi cần viết test, kiểm tra cơ chế vừa làm hoặc chạy kiểm tra cuối.
---

# Nghiệm thu

## API kiểm thử
`window.__game` chỉ có ở bản dev:

| Hàm | Dùng để |
|---|---|
| `getState()` | Đọc trạng thái, trả `null` khi scene chưa sẵn sàng |
| `setInput({ left, right, jump })` | Giữ một input cố định, `null` để bỏ |
| `setBot((state) => input)` | Quyết định input theo từng khung hình, `null` để bỏ |
| `teleport(x, y)` | Đưa nhân vật tới tình huống cần test |
| `restart()` | Chơi lại |
| `tuning` | Đọc hoặc đổi thông số lúc chạy |

## Khuôn test
```ts
test('chạm bẫy thì thua', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__game?.getState()?.status === 'playing');
  await page.evaluate(() => window.__game!.teleport(920, 470));
  await page.waitForFunction(() => window.__game?.getState()?.status === 'lost', null, { timeout: 5_000 });
});
```

- Chờ bằng `waitForFunction` theo trạng thái. Chỉ dùng `waitForTimeout` khi cần chứng minh một việc **không** xảy ra.
- Hàm truyền vào `evaluate` và `setBot` chạy trong trình duyệt, không dùng được biến của test.
- Test cảm ứng dùng `viewport` điện thoại, `hasTouch`, `isMobile`, rồi gửi `pointerdown` và `pointerup` tới nút.
- Ảnh chụp lưu vào `artifacts/`.

## Ma trận cho mỗi cơ chế
- Đường chính: làm đúng thì đạt.
- Đường sai: thiếu điều kiện thì chưa đạt.
- Thua và chơi lại: trạng thái mới được reset.
- Biên: mép nền, giữ nút, bấm liên tục.
- Cảm ứng: thao tác dùng được không cần phím.
- Console: không có lỗi.

## Soát ảnh
Mở ảnh trong `artifacts/` và kiểm tra HUD đọc được, chữ không bị che, nút cảm ứng không che nhân vật hoặc vùng chơi chính.

## Mẫu báo cáo
| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| | Đạt / Không đạt / Chưa kiểm được | Tên test hoặc ảnh |

Mỗi lỗi ghi: bước tái hiện, mong đợi, thực tế, `getState()` lúc lỗi, và mức độ chặn hay không chặn.

Không kết luận game có vui hay không, và không coi test giả lập là đã thử trên điện thoại thật.

# Cấu hình Routine "Video tin AI hằng ngày"

Tạo tại https://claude.ai/code/routines → **New routine**.

## 1. Tên
`Video tin AI hằng ngày`

## 2. Prompt (dán nguyên văn)

```
Làm 1 video tin AI cho hôm nay theo đúng quy trình trong CLAUDE.md của repo này.
Đọc kỹ CLAUDE.md và docs/SPEC.md trước khi bắt đầu, xem examples/anthropic-ipo/spec.json làm mẫu.

Đây là lần chạy tự động lúc 8 giờ sáng giờ Việt Nam, không có ai trả lời câu hỏi:
tự quyết định hợp lý và làm đến cùng.

Yêu cầu kết quả:
- Chủ đề: tin hoặc công cụ AI nổi bật trong 24–48 giờ qua, không trùng runs/history.md, số liệu đã đối chiếu ít nhất 2 nguồn.
- Video dọc 9:16 khoảng 60 giây, motion graphics + three.js, voice Gemini TTS (gọi TTS đúng 1 lần, chỉ gọi lại khi đã sửa lời thoại), phụ đề và dòng nguồn trên từng cảnh.
- Trước khi render thật phải chạy --preview, mở qa.jpg kiểm tra bố cục và sửa đến khi ổn.
- Giao bằng: bash scripts/deliver.sh runs/<id> "<tiêu đề>"
- Kết thúc bằng báo cáo ngắn: chủ đề, lý do chọn, link video, nguồn đã dùng, điều chưa kiểm chứng, lỗi nếu có.

Nếu không gọi được Gemini (thiếu khoá hoặc bị chặn mạng) hoặc không có Chromium: dừng ở bước đó,
vẫn giao spec.json + qa.jpg lên nhánh claude/videos và ghi rõ lỗi. Không tìm cách vòng qua chặn mạng.
```

Model: nên chọn model mạnh nhất có trong danh sách (viết lời và chọn cảnh tốt hơn).

## 3. Repository
Repo GitHub chứa thư mục này (ví dụ `<tài-khoản>/video-tin-ai`).

## 4. Environment (tạo môi trường riêng, ví dụ tên `Video tin AI`)

**Network access** — chọn một:
- **Full** (khuyên dùng): chụp được màn hình trang nguồn và tải ảnh Wikimedia cho video.
- **Custom**: tick **Also include default list of common package managers**, rồi thêm vào **Allowed domains**:
  ```
  cdn.playwright.dev
  playwright.download.prss.microsoft.com
  upload.wikimedia.org
  ```
  (Gemini `*.googleapis.com` đã có sẵn trong danh sách mặc định. Ở chế độ này video không có ảnh chụp màn hình trang báo, cảnh cuối dùng thẻ chữ thay thế.)

**Environment variables** (dán nguyên):
```
BASH_DEFAULT_TIMEOUT_MS=1800000
BASH_MAX_TIMEOUT_MS=3600000
```

**Khoá Gemini** — chọn một:
- Gói Pro/Max: mục **API credentials** → **Add credential**: Name `Gemini`, Allowed websites `generativelanguage.googleapis.com`, Custom headers: Name `x-goog-api-key`, xoá Prefix, Value = khoá Gemini. (Khoá không bao giờ lộ ra trong phiên chạy.)
- Gói Team/Enterprise: thêm dòng `GEMINI_API_KEY=<khoá>` vào Environment variables (ai dùng môi trường này cũng đọc được).

**Setup script** (chạy 1 lần rồi được lưu cache):
```
apt-get update -qq && apt-get install -y -qq ffmpeg
npx -y playwright@1.56.0 install --with-deps chromium || true
```

## 5. Trigger
**Schedule** → **Daily** → **8:07** (nhập theo giờ máy anh, tức giờ Việt Nam; chọn lệch vài phút sau giờ tròn để chạy đúng giờ hơn).

## 6. Connectors
Bỏ hết, quy trình này không cần.

## 7. Chạy thử
Bấm **Create**, rồi vào trang routine bấm **Run now**. Một lần chạy mất khoảng 25–40 phút. Mở phiên chạy để xem Claude làm gì; xong thì vào GitHub → **Releases** của repo để tải video.

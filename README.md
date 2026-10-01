# video-tin-ai

Mỗi sáng tự tìm 1 tin AI nóng, kiểm chứng nguồn, viết kịch bản, tạo voice bằng Gemini TTS, dựng video dọc 9:16 (~60 giây) bằng motion graphics + three.js, rồi đưa video lên GitHub. Chạy bằng **Routine** của Claude Code.

## Cài đặt (làm 1 lần, ~15 phút)

1. **Tạo repo GitHub riêng tư**, ví dụ `video-tin-ai`, rồi đưa toàn bộ thư mục này lên:
   ```bash
   cd video-tin-ai
   git init && git add . && git commit -m "Khoi tao" && git branch -M main
   git remote add origin https://github.com/<tai-khoan>/video-tin-ai.git
   git push -u origin main
   ```
   (Hoặc trên web GitHub: **Add file → Upload files**, kéo cả nội dung thư mục vào.)
2. **Cho Claude truy cập GitHub**: tại https://claude.ai/code, kết nối GitHub và cấp quyền cho repo vừa tạo.
3. **Tạo Routine** theo hướng dẫn trong [`ROUTINE.md`](ROUTINE.md): dán prompt, chọn repo, tạo môi trường (mạng, khoá Gemini, setup script), đặt lịch hằng ngày 8:07.
4. Bấm **Run now** để chạy thử lần đầu.

## Lấy video
GitHub → repo → **Releases**: mỗi ngày một bản `video-<ngày>-<chủ-đề>`, có file `.mp4` và phần mô tả kèm nguồn (dán được khi đăng TikTok/Reels). Ảnh xem nhanh các cảnh (`qa.jpg`) và kịch bản (`spec.json`) nằm ở nhánh `claude/videos`, thư mục `runs/`.

## Cấu trúc
| Đường dẫn | Việc |
|---|---|
| `CLAUDE.md` | Quy trình Claude làm mỗi lần chạy |
| `docs/SPEC.md` | Định dạng kịch bản `spec.json` và 12 loại cảnh |
| `examples/anthropic-ipo/` | Kịch bản mẫu (video Anthropic IPO 30/09/2026) |
| `engine/` | Trang dựng hình (HTML + three.js), vẽ từng khung theo thời gian |
| `pipeline/` | TTS Gemini, căn chỉnh voice, ghép voice, âm thanh, render, QA |
| `scripts/setup.sh` | Cài ffmpeg, numpy, thư viện Node, Chromium |
| `scripts/deliver.sh` | Đưa video lên GitHub Releases + nhánh `claude/videos` |
| `config.json` | Mặc định: giọng đọc, màu nhấn, âm lượng nhạc |

## Đổi cài đặt
- **Giọng đọc**: sửa `config.json` → `voice.voice` (ví dụ `Charon` trầm hơn, `Puck` vui hơn), `voice.style` (cách đọc, viết tiếng Anh).
- **Tốc độ đọc**: `voice.rate` (âm tiết/giây, mặc định 5.3), `voice.max_tempo` (tăng tốc tối đa 1.35).
- **Màu nhấn**: `accent`.
- **Giờ chạy**: sửa trigger của Routine.

## Chạy tay trên máy (tuỳ chọn)
Cần Node 20+, Python 3, ffmpeg. `bash scripts/setup.sh`, đặt `GEMINI_API_KEY`, viết `runs/<id>/spec.json` rồi:
```bash
python3 pipeline/run.py runs/<id> --preview   # xem trước bố cục, không tốn TTS -> runs/<id>/qa.jpg
python3 pipeline/run.py runs/<id>             # chạy đầy đủ -> runs/<id>/video.mp4
```

## Lưu ý
- Mỗi lần chạy dùng hạn mức gói Claude của anh (một phiên dài ~25–40 phút) và 2 lượt gọi Gemini (1 TTS + 1 nghe lại để căn chỉnh).
- Voice được căn với lời thoại bằng phân tích khoảng lặng + nhịp âm tiết, có Gemini nghe lại làm gợi ý. Thỉnh thoảng phụ đề có thể lệch nhẹ; nên xem video trước khi đăng.
- Video là bản nháp để duyệt: kiểm tra số liệu và nguồn trong phần mô tả trước khi đăng.

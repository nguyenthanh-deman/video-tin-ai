# Bài học chung (nhật ký quy tắc)

Mỗi dòng: ngày · điều rút ra · cách áp dụng. Routine tuần thêm ở cuối; mục nào đã thành quy tắc cố định thì chuyển lên [[Doi-tuong-va-giong-viet]] hoặc `CLAUDE.md`.

- 2026-10-01 · Lỗi 401 hồi đầu KHÔNG do trường `source` (đã kiểm lại: gửi kèm `source` vẫn qua xác thực). Nguyên nhân là máy chủ chưa nhận khoá mới sau khi đổi trên Vercel, có lúc 401 xen kẽ giữa các lần gọi · gặp 401 thì chạy `--ping`, đợi redeploy, đừng đoán nội dung bài sai.
- 2026-10-01 · Gửi lại cùng `external_id` không ghi đè bài cũ · muốn sửa bài thì đổi `external_id` và xoá nháp cũ trên website.
- 2026-10-01 · Website chỉ hiện ảnh từ vài tên miền (chính nó, supabase, `images.pexels.com`, `lh3.googleusercontent.com`) · ưu tiên ảnh Pexels.
- 2026-10-01 · Bài blog tiêu chuẩn 1.800–3.000 từ (người sở hữu yêu cầu), có ảnh bìa và ảnh minh hoạ miễn phí · kiểm bằng `scripts/post_blog.py --check`.
- 2026-10-01 · Số sao GitHub lệch giữa các nguồn · không nêu số cụ thể.
- 2026-10-01 · Màu video theo thương hiệu demanlab.ai: `--brand:#0077b6` trên website; video dùng accent sáng hơn `#29a3e6` cho chữ dễ đọc trên nền tối, nền navy `#0a0f1c` · đặt trong `config.json` (`accent`, `bg`).
- 2026-10-01 · Chạy pipeline trên Windows: đặt `CHROME_PATH` tới chrome.exe, dùng `python` thay `python3`; `.env` có BOM thì phải bỏ BOM trước khi đọc khoá · không in khoá ra.
- 2026-10-01 · Chữ "nhất" nằm trong cả từ ghép (thống nhất, duy nhất, thứ nhất) · viết lại bằng "liền một khối", "chỉ có một", "Một là".
- 2026-10-01 · Gemini TTS có lúc đọc to luôn câu chỉ dẫn phong cách ở đầu video (bản onetake lần 1 mất ~6 giây tiếng Anh) · đổi prompt TTS sang dạng DIRECTOR'S NOTES / TRANSCRIPT; `align.py` nay báo lỗi mã 7 nếu thấy lời thừa ở đầu, khi đó chạy `--from tts --retts` một lần; luôn nghe lại video thật bằng Gemini trước khi giao.

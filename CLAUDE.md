# Video tin AI hằng ngày — hướng dẫn cho Claude

Repo này tạo video dọc 9:16 (~60 giây) về một tin/công cụ AI nổi bật: motion graphics HTML + three.js, voice Gemini TTS, phụ đề, dòng nguồn trên từng cảnh. Mỗi lần chạy Routine = làm **1 video**. Đây là lần chạy tự động, không có ai trả lời câu hỏi: tự quyết định hợp lý và làm đến cùng; chỗ nào phải dừng thì ghi rõ lý do trong báo cáo.

## 0. Chuẩn bị
```bash
git fetch origin
git checkout -B claude/videos origin/claude/videos 2>/dev/null || git checkout -b claude/videos
git merge --no-edit origin/main || true      # lấy code mới nhất
bash scripts/setup.sh
```
Đọc `runs/history.md` để không làm lại chủ đề đã có.

## 1. Chọn chủ đề (tin trong 24–48 giờ qua)
- Dùng WebSearch tìm tin AI nổi bật: mô hình/tính năng mới, công cụ hoặc repo GitHub đang hot, số liệu đáng chú ý của các công ty AI. Ưu tiên chủ đề người làm nội dung, bán hàng, doanh nghiệp Việt quan tâm và **có số liệu hoặc thao tác để minh hoạ**.
- Không trùng chủ đề trong `runs/history.md` (cùng sản phẩm, cùng sự kiện trong 7 ngày).

## 2. Kiểm chứng
- Đọc nguồn gốc bằng WebFetch (trang chính thức, README, bài báo gốc). Số liệu quan trọng phải khớp **ít nhất 2 nguồn**; lệch nhau thì bỏ con số hoặc ghi rõ nguồn và ngày.
- Chỉ đưa vào `sources` những link đã thực sự đọc được. Trang nào WebFetch bị chặn thì không tìm cách khác để vào; dùng nguồn khác.
- Không bịa lệnh, kết quả chạy thử, trích dẫn. Điều chưa chắc ghi vào `notes` và không đưa lên hình.

## 3. Viết `runs/<YYYY-MM-DD-slug>/spec.json`
Theo `docs/SPEC.md`, xem mẫu `examples/anthropic-ipo/spec.json`.
- 7–10 cảnh: `hook` → (`sources`) → các cảnh số liệu/ý chính phù hợp (`bars`, `compare`, `donut`, `towers`, `gauge`, `warning`, `bignum`, `list`, `terminal`) → `cta`. Chọn loại cảnh hợp với dữ liệu, không ép.
- Lời thoại 10–14 câu, ~220–270 âm tiết; 3 giây đầu phải có điểm nóng nhất. Câu ngắn, tiếng Việt tự nhiên kiểu đọc bản tin công nghệ.
- Phần đọc (TTS) viết số thành chữ, không ký hiệu; phần hiện dùng chữ số và `*nhấn*`.
- Không dùng từ tuyệt đối ("tốt nhất", "số một", "hàng đầu", "đảm bảo"). Có ngày của thông tin.
- Ảnh: không dùng ảnh chụp của báo làm hình nền. Được dùng: ảnh có giấy phép tự do (Wikimedia Commons, ghi `credit`), ảnh chụp màn hình trang nguồn để dẫn chứng (`screenshots`, nên chụp trang nguồn chính cho cảnh `cta`).
- `post.caption`: 2–3 câu tóm tắt + câu dẫn tới nguồn; `hashtags` 4–6 cái.

## 4. Chạy
```bash
python3 pipeline/run.py runs/<id> --preview     # xem trước bố cục, KHÔNG tốn lượt TTS -> runs/<id>/qa.jpg
```
Mở `runs/<id>/qa.jpg` (Read) kiểm tra: chữ không tràn/đè, số liệu đúng, cảnh hợp nội dung. Sửa spec rồi chạy lại preview đến khi ổn. Sau đó:
```bash
python3 pipeline/run.py runs/<id>               # assets → TTS → căn chỉnh → voice → timeline → âm thanh → QA → render → mô tả
```
- TTS chỉ gọi **1 lần/video**. Nếu sau đó chỉ sửa hình: `--from timeline` (không tạo lại voice). Chỉ thêm `--retts` khi đã sửa lời thoại.
- Xem log bước align: câu nào bị đánh dấu "đáng ngờ" (tốc độ đọc bất thường) thì đối chiếu `work/listen.json` (Gemini nghe lại) nếu có; nếu voice đọc sai hoặc thiếu câu thì chạy lại với `--retts` đúng một lần.
- Cả quy trình mất 10–20 phút (render là lâu nhất): chạy nền và theo dõi, ví dụ `mkdir -p runs/<id>/work && nohup python3 pipeline/run.py runs/<id> > runs/<id>/work/run.log 2>&1 &` rồi xem `tail -5 runs/<id>/work/run.log` vài phút một lần cho tới khi có dòng `HOAN TAT` (hoặc `LOI`).
- Kiểm tra lần cuối `runs/<id>/qa.jpg` và dung lượng `video.mp4` (≤ 20MB).
- Gemini từ chối (401/403, thiếu khoá) hoặc bị chặn mạng, hoặc không có Chromium: dừng, vẫn đẩy kịch bản lên để xem lại (`git add runs/<id>/spec.json runs/<id>/qa.jpg; git commit -m "Chua xong <id>: <loi>"; git push origin claude/videos`) và báo rõ lỗi. Không tìm cách vòng qua chặn mạng.

## 5. Giao
```bash
bash scripts/deliver.sh runs/<id> "<tiêu đề video>"
```
Script này commit `spec.json`, `qa.jpg`, `nguon-va-mo-ta.txt` và `runs/history.md` lên nhánh `claude/videos`, rồi tải `video.mp4` lên **GitHub Releases** (tag `video-<id>`) để repo không phình to. Nếu không tạo được Release, nó commit luôn file video vào nhánh. Không commit thư mục `work/`, `assets/`. Không ghi API key vào file nào.

## 6. Báo cáo ngắn
Chủ đề và lý do chọn · tiêu đề · link video (Release hoặc nhánh `claude/videos`) · độ dài · nguồn đã dùng · điều chưa kiểm chứng · lỗi (nếu có).

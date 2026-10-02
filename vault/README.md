# Kho nội dung Deman AI Lab (vault)

Thư mục này là **bộ nhớ nội dung** dùng chung cho người và AI. Mở nó bằng **Obsidian** (Open folder as vault → chọn thư mục `vault/`) để xem như một mạng ghi chú có liên kết, đồ thị (Graph view), tìm kiếm, backlinks. Mọi thứ là file Markdown thường nên AI (Claude, Routine) đọc/ghi trực tiếp, và Git lưu lịch sử.

## Cấu trúc

| Thư mục | Chứa gì | Ai sửa |
|---|---|---|
| `00-Chien-luoc/` | Đối tượng, giọng viết, quy tắc chất lượng chung | Người (AI chỉ đề xuất) |
| `01-Tuyen/` | Mỗi **tuyến nội dung** một file: mục tiêu, góc nhìn, kiểu bài, thế nào là đạt/rác | Người duyệt; Routine tuần có thể đề xuất sửa |
| `02-Tuan/` | Mỗi tuần một file `YYYY-Www.md`: tuyến chính, lịch 7 ngày, chủ đề dự kiến, tổng kết | Routine thứ 2 tạo; người chỉnh được |
| `03-Bai/` | Mỗi bài (1 chủ đề = 1 blog + 1 video) một file: nguồn, slug, link video, bài học | Routine hằng ngày tạo |
| `04-Bai-hoc/` | Nhật ký rút kinh nghiệm: cái gì chạy, cái gì hỏng, quy tắc mới | Routine tuần + người |
| `_templates/` | Mẫu cho tuyến, tuần, bài | — |
| `Index.md` | Bảng điều khiển **sinh tự động** (tuyến, tuần, bài, trạng thái) | Không sửa tay |

## Quy ước (AI bắt buộc theo)

1. Mỗi ghi chú có **frontmatter** (khối `---` đầu file) với `type: tuyen | tuan | bai`. Trường bắt buộc xem `_templates/`.
2. Liên kết bằng `[[Ten-file]]` (không đuôi `.md`). Bài trỏ về tuyến và tuần; tuần trỏ về tuyến chính. Không có liên kết mồ côi.
3. Tên file dùng chữ không dấu, gạch nối: `Tuyen-1-Cong-cu.md`, `2026-W41.md`, `2026-10-01-hyperframes.md`.
4. Không đưa khoá, mật khẩu, token vào đây. Không dán nguyên văn bài báo; chỉ ghi tóm tắt và link.
5. Sau khi sửa vault chạy `python3 scripts/vault_sync.py`: nó kiểm tra lỗi (thiếu trường, liên kết gãy, bài thuộc tuyến tạm dừng) và dựng lại `Index.md`. **Còn lỗi thì chưa được commit.**

## Vòng chạy

- **Sáng thứ 2 (Routine tuần):** đọc `Index.md`, tổng kết tuần trước vào `02-Tuan/`, rút bài học vào `04-Bai-hoc/`, rồi chốt tuần mới: tuyến chính + lịch 7 ngày. Xem `docs/WEEKLY.md`.
- **Mỗi sáng (Routine ngày):** đọc ghi chú tuần hiện tại, chọn chủ đề **đúng tuyến của ngày đó**, làm 1 blog + 1 video, tạo ghi chú ở `03-Bai/`. Xem `CLAUDE.md`.
- **Người:** mở Obsidian, đọc `Index.md`, duyệt bài nháp, đổi `trang_thai` của bài (`da-duyet`, `da-dang`, `bo`), chỉnh tuyến hoặc lịch tuần khi cần. Việc người sửa luôn thắng việc AI đề xuất.

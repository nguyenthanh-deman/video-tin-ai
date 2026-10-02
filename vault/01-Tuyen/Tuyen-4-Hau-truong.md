---
type: tuyen
id: t4-hau-truong
ten: Hậu trường Deman AI Lab
trang_thai: tam-dung
muc_tieu: Kể lại việc Deman AI Lab thật sự đã làm, bài học và kết quả đo được
tan_suat: do người nạp tư liệu
tag_blog: Quy trình
---

# Tuyến 4 — Hậu trường Deman AI Lab (tạm dừng)

**Tạm dừng vì AI không có tư liệu thật.** Tuyến này chỉ chạy khi người của Deman nạp tư liệu thật vào `vault/05-Tu-lieu-noi-bo/` (case, số liệu, ảnh, trích lời khách đã được đồng ý). AI **không được bịa** case, khách hàng, số liệu.

## Cách bật
1. Người tạo ghi chú tư liệu trong `05-Tu-lieu-noi-bo/` (thư mục này chưa có; tạo khi cần).
2. Đổi `trang_thai` của tuyến này thành `dang-chay`.
3. Routine tuần mới xếp bài vào tuyến này và chỉ dùng đúng tư liệu có trong thư mục đó.

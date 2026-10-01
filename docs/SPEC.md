# spec.json — định dạng kịch bản video

Mỗi video là một thư mục `runs/<YYYY-MM-DD-slug>/` chứa `spec.json`. Engine đọc spec và tự dựng hình. Ví dụ đầy đủ: `examples/anthropic-ipo/spec.json`.

## Trường cấp ngoài

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `id` | có | `YYYY-MM-DD-slug`, trùng tên thư mục |
| `title` | có | Tiêu đề video (dùng trong file mô tả) |
| `date` | có | Hiện góc trên phải, dạng `01.10.2026` |
| `badge` | có | Chữ trong nhãn góc trên trái, ≤ 28 ký tự (vd `Tin AI · OpenAI`) |
| `accent` | không | Màu nhấn, mặc định `#ffb23f` |
| `voice` | không | `{ "model": "gemini-3.8-flash-tts", "voice": "Kore", "style": "...", "rate": 5.3, "max_tempo": 1.35 }` |
| `post` | có | `{ "caption": "...", "hashtags": ["AI", ...] }` — mô tả đăng kèm video |
| `sources` | có | `[{ "outlet", "title", "date", "url" }]` — chỉ link đã thực sự đọc |
| `images` | không | `[{ "key", "url", "credit", "page" }]` — ảnh tải về `assets/<key>.*`, chỉ ảnh có giấy phép rõ (Wikimedia CC, ảnh báo chí chính thức của hãng) |
| `screenshots` | không | `[{ "key", "url", "height" }]` — chụp màn hình trang web (giao diện điện thoại) |
| `notes` | không | Ghi chú kiểm chứng (điều chưa xác nhận, nguồn lệch nhau) |
| `scenes` | có | 6–12 cảnh, cảnh đầu `hook`, cảnh cuối `cta` |

## Lời thoại: `lines` trong mỗi cảnh

Mỗi cảnh có `lines` (1–2 câu). Mỗi câu gồm các **chunk** = đoạn phụ đề:

```json
"lines": [
  { "tone": "red", "chunks": [ ["Kết quả: *lỗ hơn 8 tỷ USD*", "Kết quả: lỗ hơn tám tỷ đô."] ] }
]
```

- Chunk là cặp `[hiện_trên_màn_hình, đọc_cho_TTS]`.
  - Phần **hiện**: dùng chữ số, `*...*` để tô màu nhấn, ≤ 40 ký tự.
  - Phần **đọc**: viết số thành chữ ("bốn phẩy sáu tỷ đô"), không ký hiệu `% $ / + &`, không chữ số. Dấu câu giữ nguyên để giọng ngắt đúng.
- `tone`: `red` (tin xấu/lỗ/rủi ro), `grn` (tăng trưởng) — đổi màu chữ nhấn của phụ đề.
- Cả video: 10–14 câu, khoảng 220–270 âm tiết, ra ~60 giây.

## Đồng bộ hình với lời

Nhiều trường nhận một "thời điểm" dạng: `{ "line": 1, "frac": 0.3 }` (câu thứ 2 của cảnh, 30% thời lượng câu) hoặc `{ "word": "Broadcom" }` (lúc đọc tới từ đó). `line` đếm từ 0 trong cảnh.

## Danh mục cảnh (`type`)

### `hook` — mở đầu (bắt buộc là cảnh 1)
`tag`, `title: [dòng trắng, dòng màu nhấn]` (≤ 16 ký tự/dòng là đẹp), `sub`, `doc: { kicker, title, sub, stamp? }` (tài liệu 3D bay vào), `stats: [{ v, l, c }]` tối đa 3 ô số (`c`: amb/grn/red/ink).

### `sources` — nguồn tin
`tag`, `title[2]`, `sub`, `cards: [{ h: "TÊN BÁO · NGÀY", t: "tiêu đề bài", img?: key ảnh chụp }]` (tối đa 6).

### `bars` — cột 3D + số đếm lớn
`tag`, `tagColor`, `counter: { label, from, to, dec, unit, color, prefix? }`, `chip?: { html, line, frac }`, `second?: { label, text, line, color }` (con số thứ 2 hiện ở câu sau), `bars: [{ label, value, text, color, line? }]` tối đa 5. Cột có `line` hiện muộn và camera lùi ra để lộ cột cao.

### `compare` — cột A vs cột B nhiều lớp + khoảng chênh
`tag`, `counter`, `chip?`, `a: { label, value, text, color }`, `b: { label, text, segs: [{ label, value, text, color }] }` (≤ 3 lớp, `color: "grey"` cho phần phụ), `gap?: { label, big, short, color, line }` — khối ma đỏ lấp phần chênh, tiêu đề đổi sang `big`. Hợp với: doanh thu vs chi phí → lỗ, trước vs sau.

### `donut` — vòng tròn chia phần
`tag`, `tagColor`, `title` (HTML, dùng `<span class="red">`), `sub`, `center: { big, small }`, `parts: [{ value, color, label, text }]` (2–3 phần, phần 0 là phần chính).

### `towers` — nhiều cột theo hạng mục, sáng lên khi đọc tên
`tag`, `counter: { to, unit, dec }`, `chip?`, `items: [{ label, value, text?, word }]` (≤ 7, `word` = từ trong lời thoại để cột sáng đúng lúc), `panel?: { big, label, note, fill, line, color, dim: [chỉ số cột giữ màu xám], icon?: "none" }`.

### `gauge` — đồng xu 3D + đồng hồ %
`tag`, `title[2]`, `sub`, `symbol` (1–2 ký tự trên đồng xu), `percent`, `percentLabel`, `dots` (số chấm hội tụ), `photo?: { img: key, name, role, credit }`, `info?: { kicker, html, note }`.

### `warning` — cảnh báo, rủi ro
`tag`, `title[2]`, `quotes: ["…", "…", "…"]` (≤ 3, ≤ 34 ký tự mỗi câu, gõ chữ dần), mỗi quote có thể là `{ text, line, frac }`.

### `bignum` — một con số rất lớn + mốc thời gian
`tag`, `prefix` (vd `>`), `value`, `dec`, `suffix?`, `unit`, `rows: [{ k: "MỐC", v: "việc", note }]` (≤ 3).

### `list` — ý chính / các bước
`tag`, `title[2]`, `items: [{ title, desc, word? | line/frac? }]` (≤ 4).

### `terminal` — cửa sổ lệnh (công cụ, repo GitHub)
`tag`, `title[2]`, `window`, `commands: [{ cmd, out: ["dòng kết quả"], word? | line/frac? }]` (≤ 6). Chỉ ghi lệnh/kết quả đã thấy thật trong tài liệu hoặc khi chạy thử.

### `cta` — kết (bắt buộc là cảnh cuối)
`tag`, `title[2]`, `screenshot` (key trong `screenshots`, điện thoại cuộn trang), `url` (chữ hiện dưới điện thoại), `fallback: { kicker, title }` khi không chụp được.

## Mọi cảnh
- `src`: dòng nguồn nhỏ ở đáy cảnh (bắt buộc với cảnh có số liệu).
- Chữ to tự co cho vừa khung, nhưng câu ngắn vẫn đẹp hơn.

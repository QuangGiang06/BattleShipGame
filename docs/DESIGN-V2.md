# Design V2

## Snapshot an toàn

Bản thiết kế trước khi nâng cấp được giữ tại:

`BattleShipGame-Complete-design-v1-original`

Snapshot chứa toàn bộ source, tài liệu và `dist`; chỉ loại `node_modules` vì có thể cài lại bằng `npm.cmd install`.

## Thay đổi chính

- Nền hải chiến cinematic thay cho nền radar đơn điệu.
- Tàu trên bàn cờ có thân, boong, tháp chỉ huy, pháo, đường băng và hình dáng riêng.
- Màn hình bố trí tàu hiển thị trực tiếp silhouette theo vị trí và hướng đặt.
- Danh sách hạm đội dùng hình tàu thu nhỏ thay cho các chấm trạng thái.
- Chuẩn hóa giao diện tiếng Việt bằng `Be Vietnam Pro`, tránh tình trạng ký tự có dấu bị đổi kích thước do font fallback.
- Giữ nguyên protocol Socket.IO, state game, luật bắn và animation chiến đấu.

## Tài nguyên nền

- Bản dùng trong giao diện: `src/assets/naval-battle-background-v2.jpg`
- Bản PNG chất lượng gốc: `src/assets/naval-battle-background-v2.png`

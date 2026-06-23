# Design V3

## Snapshot an toàn

Bản Design V2 đã được duyệt được giữ tại:

`BattleShipGame-Complete-design-v2-approved`

Snapshot chứa source, tài liệu và production build; chỉ loại `node_modules`.

## Thay đổi

- Thay `window.confirm()` bằng modal xác nhận cùng phong cách hải chiến.
- Có ba nội dung xác nhận riêng: đầu hàng, thoát trận và rời phòng.
- Sửa màn hình chiến thắng/thất bại bằng layout độc lập, line-height và khoảng cách cố định để chữ không chồng lên nhau.
- Màn hình vào phòng có nút quay lại phần giới thiệu và nút mở hướng dẫn trực tiếp.
- Tách hướng dẫn thành component dùng lại cho cả màn hình giới thiệu và màn hình vào phòng.
- Tháp chỉ huy trên tàu được đổi thành cấu trúc nhiều tầng, cửa sổ và cột ăng-ten ngắn; tàu sân bay và tàu ngầm có cấu trúc riêng.
- Không thay đổi luật chơi, protocol Socket.IO hoặc game state.

# Battleship Online

Đồ án game Bắn Tàu online dành cho hai người chơi, được hợp nhất từ phần frontend của Minh/Giang, core game của DGBao và server Socket.IO của TGBao.

## Tính năng

- Tạo phòng bằng mã 5 ký tự và tham gia bằng mã phòng.
- Ready room cho đúng hai người chơi.
- Xếp đội tàu chuẩn `[5, 4, 3, 3, 2]`, hỗ trợ xoay, hoàn tác, xếp lại và xếp ngẫu nhiên.
- Server tự xác định hit, miss, sunk, lượt chơi và người chiến thắng.
- Tàu được hiển thị bằng silhouette nối liền, có trạng thái hư hỏng và cháy khi chìm.
- Chuỗi hiệu ứng khóa mục tiêu, đạn bay, nổ, bắn nước và rung màn hình.
- Âm thanh pháo, trúng đạn và bắn trượt có thể bật/tắt.
- Không gửi vị trí tàu ẩn cho đối thủ.
- Đầu hàng, rời trận và tái đấu.
- Tự kết nối lại bằng token phiên khi mạng gián đoạn ngắn.
- Responsive desktop/mobile.
- Health check, CORS allowlist, giới hạn payload và rate limit Socket.IO.
- Build frontend và phục vụ cùng backend trong production.
- Unit test core game và integration test hai Socket.IO client.

## Yêu cầu

- Node.js 22 trở lên.
- npm 10 trở lên.

## Chạy development

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Sau đó mở:

- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/health

Mở hai cửa sổ trình duyệt hoặc một cửa sổ thường và một cửa sổ ẩn danh để chơi hai người.

Nếu không muốn chạy đồng thời:

```powershell
npm run dev:server
npm run dev:client
```

## Kiểm tra chất lượng

```powershell
npm run check
```

Lệnh này chạy lần lượt:

1. ESLint.
2. Unit test và integration test.
3. Production build.

## Chạy production cục bộ

```powershell
npm run build
$env:NODE_ENV = "production"
$env:CORS_ORIGIN = "http://localhost:3000"
npm start
```

Mở http://localhost:3000.

## Docker

```powershell
docker compose up --build
```

Mở http://localhost:3000.

## Biến môi trường

| Biến | Mặc định | Mục đích |
|---|---:|---|
| `PORT` | `3000` | Port backend/production web |
| `NODE_ENV` | `development` | Bật cấu hình production |
| `CORS_ORIGIN` | localhost Vite | Danh sách origin, phân cách dấu phẩy |
| `VITE_SERVER_URL` | origin hiện tại | URL Socket.IO cho frontend development |
| `RECONNECT_GRACE_MS` | `30000` | Thời gian chờ người chơi kết nối lại |
| `ROOM_IDLE_TTL_MS` | `3600000` | Thời gian dọn phòng không hoạt động |
| `RATE_LIMIT_WINDOW_MS` | `10000` | Cửa sổ rate limit |
| `RATE_LIMIT_MAX_EVENTS` | `80` | Số event tối đa mỗi cửa sổ |
| `EXPOSE_ROOMS` | `false` | Cho phép endpoint debug `/rooms` |

## Cấu trúc

```text
server/
  app.js                 Express + Socket.IO + room lifecycle
  index.js               Entry point và graceful shutdown
  placementPayload.js    Chuẩn hóa payload xếp tàu
src/
  components/            Giao diện từng màn
  game/                  Core game và helper frontend
  App.jsx                Điều phối room/match/socket
  socket.js              Socket.IO client và session token
tests/
  server.integration.test.js
```

Chi tiết contract Socket.IO nằm trong [docs/EVENTS.md](docs/EVENTS.md). Hướng dẫn triển khai nằm trong [docs/DEPLOY.md](docs/DEPLOY.md).

## Giới hạn chủ động

Room và trận đang chạy được lưu trong RAM. Đây là lựa chọn phù hợp cho game hai người và đồ án môn học. Khi server restart, trận đang diễn ra kết thúc. Nếu mở rộng sang tài khoản, lịch sử đấu, bảng xếp hạng hoặc nhiều server instance, cần bổ sung database và Redis adapter cho Socket.IO.

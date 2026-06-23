# Triển khai production

## Phương án đơn giản

Ứng dụng production chỉ cần một Node.js service:

1. Vite build frontend vào `dist/`.
2. Express phục vụ `dist/`.
3. Socket.IO dùng cùng domain và port.

Điều này tránh lỗi CORS và mixed-content giữa HTTPS/WSS.

## VPS với Docker

```bash
git clone <repository>
cd BattleShipGame-Complete
docker compose up -d --build
```

Đặt reverse proxy HTTPS ở trước port 3000. Ví dụ Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name battleship.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Đặt biến:

```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://battleship.example.com
EXPOSE_ROOMS=false
RECONNECT_GRACE_MS=30000
```

## Checklist trước khi public

- Domain đã trỏ đúng IP.
- HTTPS hợp lệ.
- Chỉ mở firewall port 80/443; không public trực tiếp port 3000.
- `CORS_ORIGIN` là domain thật, không dùng `*`.
- `/health` trả `{ ok: true }`.
- `/rooms` trả 404.
- Hai thiết bị khác mạng tạo/join room và chơi hết một trận.
- Restart policy đã bật.
- Có theo dõi CPU, RAM và log container.

## Khi cần scale

Một instance Node.js đủ cho bài báo cáo và lượng người chơi nhỏ. Khi chạy nhiều instance:

- Dùng sticky sessions tại load balancer.
- Dùng Redis adapter cho Socket.IO.
- Đưa room/game state ra Redis hoặc database.
- Dùng PostgreSQL nếu bổ sung tài khoản, lịch sử và bảng xếp hạng.

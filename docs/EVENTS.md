# Socket.IO contract

Mọi lỗi nghiệp vụ được trả qua:

```js
action_error { event, error, ...details }
```

## Client gửi

| Event | Payload |
|---|---|
| `create_room` | `{ playerName }` |
| `join_room` | `{ roomCode, playerName }` |
| `player_ready` | `{ ready }` |
| `submit_ships` | `{ placements }` hoặc `{ board }` |
| `fire_cell` | `{ index }` hoặc `{ row, col }` |
| `surrender` | Không cần payload |
| `request_rematch` | Không cần payload |
| `leave_room` | Không cần payload |

## Server gửi

| Event | Ý nghĩa |
|---|---|
| `server_ready` | Cấp `playerId`, `playerToken` và thông tin reconnect |
| `session_restored` | Khôi phục room/game sau khi client reconnect |
| `room_created` | Tạo phòng thành công |
| `room_joined` | Vào phòng thành công |
| `room_state_updated` | Snapshot public mới nhất của phòng |
| `placement_started` | Hai người đã ready, chuyển sang xếp tàu |
| `placement_submitted` | Server chấp nhận đội hình |
| `match_started` | Hai đội hình hợp lệ, trận bắt đầu |
| `game_state_updated` | Board view riêng, không lộ tàu đối thủ |
| `shot_result` | Kết quả phát bắn của chính người chơi |
| `opponent_shot` | Kết quả đối thủ bắn vào board của người chơi |
| `turn_changed` | `playerId` đang có lượt |
| `match_ended` | Winner và lý do kết thúc |
| `rematch_state_updated` | Số phiếu tái đấu |
| `rematch_started` | Cả hai đồng ý tái đấu |
| `opponent_disconnected` | Đối thủ mất kết nối, bắt đầu grace period |
| `opponent_reconnected` | Đối thủ quay lại |
| `opponent_left` | Đối thủ rời hẳn phòng |
| `room_left` | Xác nhận client đã rời phòng |

## Trạng thái phòng

```text
waiting -> ready -> placement -> playing -> ended
```

## Nguyên tắc bảo mật gameplay

- Client chỉ gửi tọa độ bắn, không gửi kết quả.
- Server kiểm tra lượt, ô đã bắn và winner.
- `gameView.opponentBoards` luôn ẩn `shipId` của ô chưa bị bắn.
- Server kiểm tra đúng 5 tàu với độ dài `5, 4, 3, 3, 2`.

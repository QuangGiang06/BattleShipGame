# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## NTGBao Backend Socket.IO

Day la phan backend cua NTGBao, tuong ung nguoi so 2 trong file phan cong. Thu muc `src/game/` la logic game copy tu phan nguoi 1 de server co the goi truc tiep khi xu ly placement, shot, winner.

Chay server:

```bash
npm install
npm run server
```

Server mac dinh chay o `http://localhost:3000`, khop voi frontend hien tai dang dung `io("http://localhost:3000")`.

Client emit:

- `create_room` `{ playerName }`
- `join_room` `{ roomCode, playerName }`
- `player_ready`
- `submit_ships` `{ board }` hoac `{ placements }`
- `fire_cell` `{ index }` hoac `{ row, col }`
- `request_rematch`

Server emit:

- `room_created`
- `room_joined`
- `room_state_updated`
- `placement_started`
- `match_started`
- `shot_result`
- `opponent_shot`
- `turn_changed`
- `match_ended`
- `opponent_disconnected`

Server co auto-room fallback: neu frontend chua lam man tao/join phong ma emit thang `submit_ships`, server se tu ghep 2 nguoi vao phong con trong.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

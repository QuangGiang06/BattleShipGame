import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TutorialModal from './TutorialModal';

function Home({ onJoinRoom, playerName, setPlayerName }) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center">
      <div className="absolute left-0 top-0 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur transition hover:border-cyan-400/60 hover:text-white"
        >
          ← Màn hình giới thiệu
        </button>
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 backdrop-blur transition hover:bg-cyan-500/20"
        >
          ? Xem hướng dẫn
        </button>
      </div>

      <h1 className="mb-10 mt-16 bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-center text-4xl font-black tracking-tighter text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] sm:mb-12 sm:text-6xl">
        BATTLESHIP
      </h1>

      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/55 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-400">
            Tên chỉ huy
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Nhập tên của bạn..."
            className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              if (playerName.trim()) {
                navigate('/create-room');
              }
            }}
            disabled={!playerName.trim()}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-1 hover:bg-indigo-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tạo phòng mới
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-700" />
            <span className="mx-4 flex-shrink-0 text-sm font-bold uppercase text-slate-500">Hoặc</span>
            <div className="flex-grow border-t border-slate-700" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="Mã phòng"
              className="w-2/3 rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-center font-bold tracking-widest text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              maxLength={5}
              aria-label="Mã phòng"
            />
            <button
              type="button"
              onClick={() => onJoinRoom(roomCode)}
              disabled={!playerName.trim() || !roomCode.trim()}
              className="w-1/3 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-1 hover:bg-emerald-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tham gia
            </button>
          </div>
        </div>
      </div>

      <TutorialModal
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}

export default Home;

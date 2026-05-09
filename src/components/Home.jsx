import React, { useState } from 'react';

function Home({ onCreateRoom, onJoinRoom, playerName, setPlayerName }) {
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
        BATTLESHIP
      </h1>

      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl">
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Tên Chỉ Huy</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nhập tên của bạn..."
            className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
          />
        </div>

        <div className="space-y-4">
          <button
            onClick={onCreateRoom}
            disabled={!playerName.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            Tạo Phòng Mới
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-bold uppercase">Hoặc</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Mã Phòng"
              className="w-2/3 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold tracking-widest text-center"
              maxLength={6}
            />
            <button
              onClick={() => onJoinRoom(roomCode)}
              disabled={!playerName.trim() || !roomCode.trim()}
              className="w-1/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
            >
              Tham Gia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

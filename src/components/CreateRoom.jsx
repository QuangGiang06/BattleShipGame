import React from 'react';
import { useNavigate } from 'react-router-dom';

function CreateRoom({ playerName, setPlayerName, onCreateRoom }) {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      onCreateRoom();
      // After room is created, navigate will happen via state change in App
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-6xl font-black mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
        TẠO PHÒNG MỚI
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
            onClick={handleCreateRoom}
            disabled={!playerName.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            Tạo Phòng
          </button>

          <button
            onClick={() => navigate('/home')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-slate-700/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            Quay Lại
          </button>
        </div>

        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          <p className="text-sm text-slate-300 text-center">
            💡 Nhập tên của bạn và tạo phòng chơi mới để chơi với bạn bè!
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateRoom;

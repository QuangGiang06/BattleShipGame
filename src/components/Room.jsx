import React from 'react';

function Room({ roomInfo, isReady, onToggleReady, onLeaveRoom }) {
  if (!roomInfo) return null;

  const { roomId, players } = roomInfo;
  const isFull = players.length === 2;
  const allReady = isFull && players.every(p => p.ready);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-3xl mx-auto">
      <div className="w-full bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative">
        
        <button 
          onClick={onLeaveRoom}
          className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Thoát
        </button>

        <div className="text-center mb-10 mt-4">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Mã Phòng Tác Chiến</p>
          <div className="inline-block bg-slate-900/80 border-2 border-cyan-500/50 px-8 py-3 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <span className="text-4xl font-black text-white tracking-[0.2em]">{roomId}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Player 1 */}
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center h-48 relative overflow-hidden">
            <div className={`absolute inset-0 opacity-10 ${players[0]?.ready ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
            {players[0] ? (
              <>
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{players[0].name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${players[0].ready ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-700 text-slate-300'}`}>
                  {players[0].ready ? 'Đã sẵn sàng' : 'Đang chuẩn bị'}
                </span>
              </>
            ) : (
              <div className="text-slate-500 animate-pulse flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Đang chờ...</span>
              </div>
            )}
          </div>

          {/* Player 2 */}
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center h-48 relative overflow-hidden">
             <div className={`absolute inset-0 opacity-10 ${players[1]?.ready ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
            {players[1] ? (
              <>
                <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{players[1].name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${players[1].ready ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-700 text-slate-300'}`}>
                  {players[1].ready ? 'Đã sẵn sàng' : 'Đang chuẩn bị'}
                </span>
              </>
            ) : (
              <div className="text-slate-500 animate-pulse flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Đang chờ đối thủ...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={onToggleReady}
            className={`px-12 py-4 rounded-full font-black text-lg transition-all transform shadow-xl uppercase tracking-widest ${
              isReady 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/30' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/30 hover:-translate-y-1'
            }`}
          >
            {isReady ? 'Hủy Sẵn Sàng' : 'Sẵn Sàng'}
          </button>
          
          {allReady && (
            <p className="mt-6 text-emerald-400 font-bold animate-pulse text-sm uppercase tracking-widest">
              Đang chuẩn bị khu vực triển khai...
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

export default Room;

import React from 'react';

function Endgame({ winner, isMe, onRematch, onQuit }) {
  const isVictory = isMe;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto">
      <div className={`w-full p-10 rounded-3xl border-2 shadow-2xl relative overflow-hidden flex flex-col items-center text-center ${
        isVictory 
          ? 'bg-emerald-900/20 border-emerald-500/30 shadow-emerald-900/20' 
          : 'bg-rose-900/20 border-rose-500/30 shadow-rose-900/20'
      }`}>
        
        {/* Background glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 blur-[100px] rounded-full pointer-events-none ${
          isVictory ? 'bg-emerald-500/10' : 'bg-rose-500/10'
        }`}></div>

        <div className="relative z-10">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center border-4 ${
            isVictory ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'
          }`}>
            {isVictory ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Kết quả Tác chiến</h2>
          <h1 className={`text-6xl font-black mb-4 tracking-tighter ${
            isVictory ? 'text-emerald-400' : 'text-rose-500'
          }`}>
            {isVictory ? 'CHIẾN THẮNG!' : 'THẤT BẠI'}
          </h1>
          
          <p className="text-xl text-slate-300 mb-12">
            {isVictory ? `Chúc mừng ${winner}! Hạm đội đối phương đã bị tiêu diệt hoàn toàn.` : `Rất tiếc. Hạm đội của ${winner} đã áp đảo bạn.`}
          </p>

          <div className="flex gap-4 justify-center w-full">
            <button 
              onClick={onRematch}
              className={`flex-1 py-4 rounded-xl font-bold transition-all shadow-lg text-white uppercase tracking-wider ${
                isVictory ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              Chơi Lại
            </button>
            <button 
              onClick={onQuit}
              className={`flex-1 py-4 rounded-xl font-bold transition-all shadow-lg text-white uppercase tracking-wider border-2 ${
                isVictory ? 'border-emerald-600/50 hover:bg-emerald-600/20' : 'border-rose-600/50 hover:bg-rose-600/20 text-rose-400'
              }`}
            >
              Rời Phòng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Endgame;

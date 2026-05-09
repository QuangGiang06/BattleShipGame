import React from 'react';

function Match({ isMyTurn, gameMessage, myBoard, opponentBoard, onAttack, onSurrender, onQuitMatch }) {
  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
      {/* HUD Message Box */}
      <div className={`w-full max-w-2xl mb-10 p-5 rounded-2xl border-2 transition-all duration-500 shadow-xl ${
        isMyTurn ? 'border-cyan-500 bg-cyan-900/30 backdrop-blur-sm' : 'border-rose-500/30 bg-slate-800/80'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Trạng thái Tác chiến</span>
            <h2 className={`text-2xl font-black ${isMyTurn ? 'text-cyan-400 animate-pulse' : 'text-slate-300'}`}>
              {gameMessage}
            </h2>
          </div>
          
          <div className="text-right">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1 block">Lượt chơi</span>
            <div className={`text-sm font-black px-4 py-2 rounded-full uppercase tracking-wider ${
              isMyTurn ? 'bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-slate-700 text-slate-400'
            }`}>
              {isMyTurn ? "Your Turn" : "Waiting"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 justify-center items-start w-full">
        {/* My Board */}
        <div className="flex flex-col items-center flex-1 bg-slate-900/50 p-6 rounded-3xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest">Hạm Đội Của Tôi</h2>
          </div>
          <div className="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded-xl border border-slate-700">
            {myBoard.map((cell, i) => (
              <div 
                key={i} 
                className={`w-7 h-7 sm:w-10 sm:h-10 lg:w-11 lg:h-11 border border-slate-700/50 rounded-sm transition-all flex items-center justify-center
                  ${cell === 'S' ? 'bg-cyan-500/80 border-cyan-400' : 
                    cell === 'X' ? 'bg-rose-600/80 border-rose-500' :
                    cell === 'O' ? 'bg-slate-600 border-slate-500' : 'bg-slate-800'}`}
              >
                {cell === 'X' && <span className="text-white font-bold opacity-80">X</span>}
                {cell === 'O' && <span className="text-slate-400 font-bold opacity-50">•</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Opponent Board */}
        <div className="flex flex-col items-center flex-1 bg-slate-900/80 p-6 rounded-3xl border border-rose-900/50 shadow-2xl relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDAsMCwwLjA1KSIvPjwvc3ZnPg==')] pointer-events-none z-10"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-20">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
            <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest">Radar Đối Thủ</h2>
          </div>
          <div className="grid grid-cols-10 gap-1 bg-slate-950 p-2 rounded-xl border-2 border-slate-800 relative z-20">
            {opponentBoard.map((cell, i) => (
              <div 
                key={i} 
                onClick={() => onAttack(i)} 
                className={`w-7 h-7 sm:w-10 sm:h-10 lg:w-11 lg:h-11 border border-slate-800/80 rounded-sm cursor-crosshair transition-all flex items-center justify-center relative overflow-hidden
                  ${cell === 'fire' ? 'bg-amber-500 animate-pulse' : 
                    cell === 'hit' ? 'bg-rose-600' : 
                    cell === 'miss' ? 'bg-slate-700' : 
                    isMyTurn ? 'bg-slate-900 hover:bg-slate-800 hover:border-rose-500/50' : 'bg-slate-900'}`}
              >
                {/* Crosshair on hover if my turn and not fired yet */}
                {!cell && isMyTurn && (
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 border border-rose-500/50 rounded-full"></div>
                    <div className="absolute w-1 h-1 bg-rose-500 rounded-full"></div>
                  </div>
                )}
                {cell === 'hit' && <span className="text-white font-bold">X</span>}
                {cell === 'miss' && <span className="text-slate-400 font-bold">•</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mt-12 w-full max-w-2xl">
        <button 
          onClick={onSurrender}
          className="px-6 py-3 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/50 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-900/50"
        >
          Đầu Hàng
        </button>
        <button 
          onClick={onQuitMatch}
          className="px-6 py-3 bg-rose-600/20 hover:bg-rose-600/40 text-rose-500 border border-rose-600/50 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-rose-900/50"
        >
          Thoát Trận
        </button>
      </div>
    </div>
  );
}

export default Match;

import React from 'react';

const BOARD_SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

function Placement({ 
  myBoard, 
  currentShipIndex, 
  isHorizontal, 
  onCellClick, 
  onToggleDirection, 
  onReady 
}) {
  const isDone = currentShipIndex >= SHIP_LENGTHS.length;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full bg-slate-800/80 p-6 rounded-2xl border-2 border-cyan-500/30 shadow-lg shadow-cyan-900/20 mb-8 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Dàn Quân</h2>
          <p className="text-slate-400 text-sm">Sắp xếp hạm đội của bạn lên bản đồ.</p>
        </div>
        
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Tàu tiếp theo</p>
            <p className="text-2xl font-black text-cyan-400">
              {isDone ? "Hoàn tất!" : `${SHIP_LENGTHS[currentShipIndex]} ô`}
            </p>
          </div>
          
          {!isDone && (
            <button 
              onClick={onToggleDirection}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {isHorizontal ? "Ngang" : "Dọc"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900 p-4 md:p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded-xl border-2 border-slate-700">
          {myBoard.map((cell, i) => (
            <div 
              key={i} 
              onClick={() => onCellClick(i)}
              className={`w-8 h-8 sm:w-12 sm:h-12 border border-slate-700/50 rounded-sm cursor-pointer transition-all duration-300
                ${cell === 'S' ? 'bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400' : 'bg-slate-800 hover:bg-slate-700 hover:border-slate-500'}`}
            />
          ))}
        </div>
      </div>

      {isDone && (
        <button 
          onClick={onReady}
          className="mt-10 px-12 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black rounded-full shadow-xl shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-widest text-lg"
        >
          Tham Chiến
        </button>
      )}
    </div>
  );
}

export default Placement;

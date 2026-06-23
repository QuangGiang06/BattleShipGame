function Room({ roomInfo, playerId, isReady, onToggleReady, onLeaveRoom }) {
  const { roomCode, players } = roomInfo;
  const isFull = players.length === 2;
  const allReady = isFull && players.every((player) => player.ready);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-3xl mx-auto">
      <div className="w-full bg-slate-800/50 backdrop-blur-xl p-5 sm:p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative">
        <button
          onClick={onLeaveRoom}
          className="absolute top-5 left-5 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
        >
          ← Thoát
        </button>

        <div className="text-center mb-8 sm:mb-10 mt-10 sm:mt-4">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            Mã phòng tác chiến
          </p>
          <div className="inline-block bg-slate-900/80 border-2 border-cyan-500/50 px-6 sm:px-8 py-3 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-[0.2em]">
              {roomCode}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Gửi mã này cho người chơi thứ hai.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8 sm:mb-10">
          {[0, 1].map((slot) => {
            const player = players[slot];
            const isMe = player?.id === playerId;

            return (
              <div
                key={slot}
                className="bg-slate-900/60 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center h-48 relative overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-10 ${player?.ready ? 'bg-emerald-500' : 'bg-transparent'}`} />
                {player ? (
                  <>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${slot === 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      <span className="text-2xl">⚓</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {player.name} {isMe && <span className="text-xs text-cyan-400">(Bạn)</span>}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      !player.connected
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : player.ready
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-slate-700 text-slate-300'
                    }`}
                    >
                      {!player.connected ? 'Mất kết nối' : player.ready ? 'Đã sẵn sàng' : 'Đang chuẩn bị'}
                    </span>
                  </>
                ) : (
                  <div className="text-slate-500 animate-pulse flex flex-col items-center">
                    <span className="text-4xl mb-3">⌛</span>
                    <span>Đang chờ đối thủ...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={onToggleReady}
            disabled={!isFull}
            className={`px-10 sm:px-12 py-4 rounded-full font-black text-base sm:text-lg transition-all transform shadow-xl uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed ${
              isReady
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/30 hover:-translate-y-1'
            }`}
          >
            {!isFull ? 'Đang chờ đối thủ' : isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
          </button>

          {allReady && (
            <p className="mt-6 text-emerald-400 font-bold animate-pulse text-sm uppercase tracking-widest">
              Đang mở khu vực triển khai...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Room;

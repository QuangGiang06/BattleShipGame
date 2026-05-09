import React, { useState, useEffect } from 'react'; // Đã thêm useEffect vào đây
import { io } from 'socket.io-client';

// Kết nối tới server của Khoi (Người 2)
const socket = io("http://localhost:3000"); 

const BOARD_SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

function App() {
  const [isMyTurn, setIsMyTurn] = useState(false); // Quản lý lượt bắn
  const [gameMessage, setGameMessage] = useState("Giai đoạn: Dàn quân"); // Thông báo trận đấu
  const [myBoard, setMyBoard] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [opponentBoard, setOpponentBoard] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [isPlacementPhase, setIsPlacementPhase] = useState(true);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);

  // Lắng nghe tín hiệu từ Server (Backend của Khoi)
  useEffect(() => {
    socket.on('match_started', (data) => {
      setIsMyTurn(data.firstTurn === socket.id);
      setGameMessage(data.firstTurn === socket.id ? "🎯 Trận đấu bắt đầu! Lượt của bạn" : "⏳ Trận đấu bắt đầu! Đợi đối thủ...");
    });

    socket.on('shot_result', (data) => {
      setGameMessage(data.result === 'hit' ? "💥 TRÚNG RỒI! Bắn tiếp đi!" : "💧 Hụt rồi... Đổi lượt.");
      setIsMyTurn(data.result === 'hit');
      // Dùng prev để tránh lỗi dữ liệu cũ
      setOpponentBoard(prev => {
        const updated = [...prev];
        updated[data.index] = data.result;
        return updated;
      });
    });

    socket.on('opponent_shot', (data) => {
      setMyBoard(prev => {
        const updated = [...prev];
        updated[data.index] = data.result === 'hit' ? 'X' : 'O';
        return updated;
      });
      // Nếu mình bị bắn trúng, thường là đối thủ bắn tiếp, nếu hụt thì đến lượt mình
      if (data.result === 'miss') {
        setIsMyTurn(true);
        setGameMessage("🎯 Đối thủ bắn trượt! Đến lượt bạn!");
      }
    });

    socket.on('turn_changed', (turnId) => {
      const myTurn = turnId === socket.id;
      setIsMyTurn(myTurn);
      setGameMessage(myTurn ? "🎯 Đến lượt bạn bắn!" : "⏳ Đối thủ đang ngắm bắn...");
    });

    return () => {
      socket.off('match_started');
      socket.off('shot_result');
      socket.off('opponent_shot');
      socket.off('turn_changed');
      socket.off('game_over');
    };
  }, []); // Để mảng rỗng để chỉ đăng ký socket một lần duy nhất
  const checkValidPlacement = (startIndex, length, horizontal) => {
    const row = Math.floor(startIndex / BOARD_SIZE);
    const col = startIndex % BOARD_SIZE;
    for (let i = 0; i < length; i++) {
      let currentRow = row + (horizontal ? 0 : i);
      let currentCol = col + (horizontal ? i : 0);
      if (currentRow >= BOARD_SIZE || currentCol >= BOARD_SIZE) return false;
      if (myBoard[currentRow * BOARD_SIZE + currentCol] === 'S') return false;
    }
    return true;
  };

  const handleCellClick = (index) => {
    if (!isPlacementPhase || currentShipIndex >= SHIP_LENGTHS.length) return;
    const length = SHIP_LENGTHS[currentShipIndex];
    
    if (checkValidPlacement(index, length, isHorizontal)) {
      const newBoard = [...myBoard];
      const row = Math.floor(index / BOARD_SIZE);
      const col = index % BOARD_SIZE;
      for (let i = 0; i < length; i++) {
        const targetIndex = isHorizontal ? row * BOARD_SIZE + (col + i) : (row + i) * BOARD_SIZE + col;
        newBoard[targetIndex] = 'S';
      }
      setMyBoard(newBoard);
      setCurrentShipIndex(currentShipIndex + 1);
    } else {
      alert("Vị trí này không đặt được tàu đâu bạn ơi!");
    }
  };

  const handleAttack = (index) => {
    if (isPlacementPhase || !isMyTurn) return;
    if (opponentBoard[index]) return; // Ô này bắn rồi thì thôi

    // Gửi lệnh bắn lên cho Khoi xử lý
    socket.emit('fire_cell', { index });

    // Hiển thị trạng thái chờ xử lý (màu cam nhấp nháy)
    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[index] = 'fire'; 
    setOpponentBoard(newOpponentBoard);
  };

  const startBattle = () => {
    setIsPlacementPhase(false);
    // Chốt đội hình và gửi cho server
    socket.emit('submit_ships', { board: myBoard });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-5 flex flex-col items-center font-sans">
      <h1 className="text-4xl font-black mb-8 text-cyan-400 tracking-tighter">BATTLESHIP</h1>
      {/* Hệ thống HUD Thông báo - Điểm nhấn cho UI của Người 3 */}
<div className={`w-full max-w-2xl mb-8 p-4 rounded-xl border-2 transition-all duration-500 shadow-lg ${
  isMyTurn ? 'border-cyan-500 bg-cyan-500/10' : 'border-rose-500/30 bg-slate-800'
}`}>
  <div className="flex justify-between items-center">
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Trạng thái</span>
      <h2 className={`text-xl font-black ${isMyTurn ? 'text-cyan-400 animate-pulse' : 'text-slate-300'}`}>
        {gameMessage}
      </h2>
    </div>
    
    <div className="text-right">
      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Lượt chơi</span>
      <div className={`text-sm font-bold px-3 py-1 rounded-full ${
        isMyTurn ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400'
      }`}>
        {isMyTurn ? "YOUR TURN" : "WAITING..."}
      </div>
    </div>
  </div>
</div>
      <div className="flex gap-6 mb-10">
        <div className="p-4 bg-slate-800 rounded-lg border border-cyan-500 shadow-lg shadow-cyan-500/20">
          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Đang đặt tàu dài:</p>
          <p className="text-2xl font-black text-cyan-300">
            {currentShipIndex < SHIP_LENGTHS.length ? SHIP_LENGTHS[currentShipIndex] + " ô" : "Đã xong!"}
          </p>
        </div>
        
        {isPlacementPhase && (
          <button 
            onClick={() => setIsHorizontal(!isHorizontal)}
            className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-black transition-all shadow-lg active:scale-95"
          >
            XOAY: {isHorizontal ? "NGANG" : "DỌC"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-12 justify-center items-start">
        <div className="flex flex-col items-center">
          <h2 className="mb-4 font-bold text-emerald-400 uppercase">Hạm đội của tôi</h2>
          <div className="grid grid-cols-10 gap-1 bg-slate-700 p-1 rounded-md border border-slate-600">
            {myBoard.map((cell, i) => (
              <div 
                key={i} 
                onClick={() => handleCellClick(i)}
                className={`w-8 h-8 sm:w-10 sm:h-10 border border-slate-800 cursor-pointer transition-all
                  ${cell === 'S' ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-slate-800 hover:bg-slate-600'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="mb-4 font-bold text-rose-500 uppercase">Vùng biển đối thủ</h2>
          <div className="grid grid-cols-10 gap-1 bg-slate-700 p-1 rounded-md border border-slate-600 shadow-2xl">
            {opponentBoard.map((cell, i) => (
              <div 
                key={i} 
                onClick={() => handleAttack(i)} 
                className={`w-8 h-8 sm:w-10 sm:h-10 border border-slate-800 cursor-crosshair transition-all
                  ${cell === 'fire' ? 'bg-orange-600 animate-pulse shadow-[0_0_15px_orange]' : 
                    cell === 'hit' ? 'bg-rose-600' : 
                    cell === 'miss' ? 'bg-slate-400' : 'bg-slate-800 hover:bg-rose-900/40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {currentShipIndex === SHIP_LENGTHS.length && isPlacementPhase && (
        <button 
          onClick={startBattle}
          className="mt-12 px-12 py-4 bg-emerald-600 hover:bg-emerald-500 font-black rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest"
        >
          SẴN SÀNG CHIẾN ĐẤU
        </button>
      )}
    </div>
  );
}

export default App;
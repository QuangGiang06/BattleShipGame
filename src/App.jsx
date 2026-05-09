import  { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

import Home from './components/Home';
import Splash from './components/Splash';
import Room from './components/Room';
import Placement from './components/Placement';
import Match from './components/Match';
import Endgame from './components/Endgame';
import ErrorToast from './components/ErrorToast';

const socket = io("http://localhost:3000");

// Đặt bằng true để test UI khi chưa có Backend, false khi ráp với Backend thật
const DEV_MODE = true;

const BOARD_SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

function App() {
  // Global States
  const [gameState, setGameState] = useState('splash'); // splash | home | room | placement | match | endgame
  const [playerName, setPlayerName] = useState('');
  const [roomInfo, setRoomInfo] = useState(null); // { roomId: string, players: [{id, name, ready}] }
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [winner, setWinner] = useState(null); // Name of the winner

  // Match States
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [myBoard, setMyBoard] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  const [opponentBoard, setOpponentBoard] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
  
  // Placement States
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);

  useEffect(() => {
    // Room Flow
    socket.on('room_created', (roomId) => {
      setRoomInfo({ roomId, players: [{ id: socket.id, name: playerName, ready: false }] });
      setGameState('room');
    });

    socket.on('room_joined', (info) => {
      setRoomInfo(info);
      setGameState('room');
    });

    socket.on('room_update', (info) => {
      setRoomInfo(info);
      // Check if this player is still ready
      const me = info.players.find(p => p.id === socket.id);
      if (me) setIsReady(me.ready);
    });

    socket.on('all_ready', () => {
      setGameState('placement');
    });

    socket.on('error', (msg) => {
      setErrorMsg(msg);
    });

    // Match Flow
    socket.on('match_started', (data) => {
      setGameState('match');
      setIsMyTurn(data.firstTurn === socket.id);
      setGameMessage(data.firstTurn === socket.id ? "🎯 Trận đấu bắt đầu! Lượt của bạn" : "⏳ Trận đấu bắt đầu! Đợi đối thủ...");
    });

    socket.on('shot_result', (data) => {
      setGameMessage(data.result === 'hit' ? "💥 TRÚNG RỒI! Bắn tiếp đi!" : "💧 Hụt rồi... Đổi lượt.");
      setIsMyTurn(data.result === 'hit');
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

    socket.on('game_over', (data) => {
      setWinner(data.winnerName);
      setGameState('endgame');
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_update');
      socket.off('all_ready');
      socket.off('error');
      socket.off('match_started');
      socket.off('shot_result');
      socket.off('opponent_shot');
      socket.off('turn_changed');
      socket.off('game_over');
    };
  }, [playerName]);

  // Handlers - Room
  const handleCreateRoom = () => {
    if (DEV_MODE) {
      setTimeout(() => {
        setRoomInfo({ roomId: 'TEST99', players: [{ id: socket.id || '123', name: playerName, ready: false }] });
        setGameState('room');
      }, 300);
      return;
    }
    socket.emit('create_room', { playerName });
  };

  const handleJoinRoom = (roomId) => {
    if (DEV_MODE) {
      setTimeout(() => {
        setRoomInfo({ 
          roomId, 
          players: [
            { id: 'other', name: 'Địch thủ', ready: true },
            { id: socket.id || '123', name: playerName, ready: false }
          ] 
        });
        setGameState('room');
      }, 300);
      return;
    }
    socket.emit('join_room', { roomId, playerName });
  };

  const handleToggleReady = () => {
    if (DEV_MODE) {
      setIsReady(!isReady);
      if (!isReady && roomInfo.players.length === 2) {
        setTimeout(() => setGameState('placement'), 1000);
      }
      return;
    }
    socket.emit('player_ready', { roomId: roomInfo.roomId, ready: !isReady });
    setIsReady(!isReady);
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room', { roomId: roomInfo?.roomId });
    setGameState('home');
    setRoomInfo(null);
    setIsReady(false);
  };

  // Handlers - Placement
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

  const handlePlacementClick = (index) => {
    if (currentShipIndex >= SHIP_LENGTHS.length) return;
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
      setErrorMsg("Vị trí này không đặt được tàu!");
    }
  };

  const handleSubmitShips = () => {
    if (DEV_MODE) {
      setTimeout(() => {
        setGameState('match');
        setIsMyTurn(true);
        setGameMessage("🎯 Trận đấu bắt đầu! Lượt của bạn");
      }, 1000);
      return;
    }
    socket.emit('submit_ships', { roomId: roomInfo.roomId, board: myBoard });
    // Keep showing placement board but wait for match_started
  };

  // Handlers - Match
  const handleAttack = (index) => {
    if (!isMyTurn || opponentBoard[index]) return;
    
    if (DEV_MODE) {
      const newOpponentBoard = [...opponentBoard];
      newOpponentBoard[index] = 'fire'; 
      setOpponentBoard(newOpponentBoard);
      
      setTimeout(() => {
        const isHit = Math.random() > 0.5;
        const updated = [...newOpponentBoard];
        updated[index] = isHit ? 'hit' : 'miss';
        setOpponentBoard(updated);
        setGameMessage(isHit ? "💥 TRÚNG RỒI! Bắn tiếp đi!" : "💧 Hụt rồi...");
        
        if (!isHit) {
          setIsMyTurn(false);
          setGameMessage("⏳ Đối thủ đang ngắm bắn...");
          setTimeout(() => {
            setGameMessage("🎯 Đến lượt bạn bắn!");
            setIsMyTurn(true);
          }, 2000);
        }
      }, 500);
      return;
    }

    socket.emit('fire_cell', { roomId: roomInfo.roomId, index });
    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[index] = 'fire'; 
    setOpponentBoard(newOpponentBoard);
  };

  const handleSurrender = () => {
    if (DEV_MODE) {
      setWinner(roomInfo?.players?.find(p => p.id !== socket.id)?.name || "Địch thủ");
      setGameState('endgame');
      return;
    }
    socket.emit('surrender', { roomId: roomInfo.roomId, playerName });
  };

  const handleQuitMatch = () => {
    if (DEV_MODE) {
      setGameState('home');
      setRoomInfo(null);
      setIsReady(false);
      return;
    }
    socket.emit('leave_room', { roomId: roomInfo.roomId });
    setGameState('home');
    setRoomInfo(null);
    setIsReady(false);
  };

  // Handlers - Endgame
  const handleRematch = () => {
    socket.emit('rematch_request', { roomId: roomInfo.roomId });
    // Reset state for new match
    setMyBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
    setOpponentBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(null));
    setCurrentShipIndex(0);
    setIsReady(false);
    setGameState('room'); // Go back to room waiting state
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-5 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto py-8">
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} />

        {gameState === 'splash' && (
          <Splash onStart={() => setGameState('home')} />
        )}

        {gameState === 'home' && (
          <Home 
            playerName={playerName} 
            setPlayerName={setPlayerName} 
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {gameState === 'room' && (
          <Room 
            roomInfo={roomInfo}
            isReady={isReady}
            onToggleReady={handleToggleReady}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {gameState === 'placement' && (
          <Placement 
            myBoard={myBoard}
            currentShipIndex={currentShipIndex}
            isHorizontal={isHorizontal}
            onCellClick={handlePlacementClick}
            onToggleDirection={() => setIsHorizontal(!isHorizontal)}
            onReady={handleSubmitShips}
          />
        )}

        {gameState === 'match' && (
          <Match 
            isMyTurn={isMyTurn}
            gameMessage={gameMessage}
            myBoard={myBoard}
            opponentBoard={opponentBoard}
            onAttack={handleAttack}
            onSurrender={handleSurrender}
            onQuitMatch={handleQuitMatch}
          />
        )}

        {gameState === 'endgame' && (
          <Endgame 
            winner={winner}
            isMe={winner === playerName}
            onRematch={handleRematch}
            onQuit={handleLeaveRoom}
          />
        )}
      </div>
    </div>
  );
}

export default App;
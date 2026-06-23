import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import ConnectionStatus from './components/ConnectionStatus';
import ConfirmDialog from './components/ConfirmDialog';
import CreateRoom from './components/CreateRoom';
import Endgame from './components/Endgame';
import ErrorToast from './components/ErrorToast';
import Home from './components/Home';
import Match from './components/Match';
import Placement from './components/Placement';
import Room from './components/Room';
import Splash from './components/Splash';
import {
  combatStatsFromGameView,
  createEmptyBoard,
  createRandomFleet,
  FLEET,
  fleetFromGameView,
  opponentBoardFromGameView,
  ownBoardFromGameView,
  placeFleetShip,
  rebuildBoard,
} from './game/clientBoard';
import { playBattleSound } from './game/battleSound';
import { socket } from './socket';

const CONFIRMATION_CONTENT = {
  surrender: {
    tone: 'warning',
    eyebrow: 'Xác nhận chiến thuật',
    title: 'Bạn muốn đầu hàng?',
    message: 'Trận đấu sẽ kết thúc ngay và đối thủ được tính là người chiến thắng. Hành động này không thể hoàn tác.',
    confirmLabel: 'Xác nhận đầu hàng',
  },
  quitMatch: {
    tone: 'danger',
    eyebrow: 'Rời khu vực tác chiến',
    title: 'Bạn muốn thoát trận?',
    message: 'Rời trận khi giao tranh chưa kết thúc sẽ được tính là thua và bạn sẽ rời khỏi phòng hiện tại.',
    confirmLabel: 'Thoát trận',
  },
  leaveRoom: {
    tone: 'danger',
    eyebrow: 'Rời phòng tác chiến',
    title: 'Bạn muốn rời phòng?',
    message: 'Bạn sẽ rời khỏi phòng hiện tại. Nếu muốn quay lại, bạn cần nhập lại mã phòng và chờ trận mới.',
    confirmLabel: 'Rời phòng',
  },
};

const ERROR_MESSAGES = {
  CELL_ALREADY_SHOT: 'Ô này đã được bắn.',
  FLEET_COMPOSITION_INVALID: 'Đội tàu không đúng cấu hình chuẩn.',
  FLEET_SHIP_COUNT_MISMATCH: 'Bạn phải đặt đủ 5 tàu.',
  MATCH_NOT_ENDED: 'Chỉ có thể yêu cầu tái đấu sau khi trận kết thúc.',
  MATCH_NOT_STARTED: 'Trận đấu chưa bắt đầu.',
  NOT_PLAYER_TURN: 'Chưa đến lượt của bạn.',
  OPPONENT_NOT_AVAILABLE: 'Đối thủ hiện không sẵn sàng.',
  PAYLOAD_TOO_LARGE: 'Dữ liệu gửi lên quá lớn.',
  PLACEMENT_NOT_ALLOWED: 'Hiện không thể gửi lại đội tàu.',
  PLAYER_NOT_IN_ROOM: 'Bạn không còn ở trong phòng.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau vài giây.',
  ROOM_CODE_INVALID: 'Mã phòng phải có đúng 5 ký tự.',
  ROOM_FULL: 'Phòng đã đủ hai người.',
  ROOM_NOT_FOUND: 'Không tìm thấy phòng.',
  ROOM_NOT_JOINABLE: 'Phòng đã bắt đầu hoặc đã kết thúc.',
  SHIP_BOARD_CANNOT_BE_RECONSTRUCTED: 'Cách xếp tàu không hợp lệ.',
  SHIP_CELL_COUNT_MISMATCH: 'Số ô tàu không đúng.',
  SHIP_OVERLAP: 'Các tàu không được chồng lên nhau.',
  SHIP_OUT_OF_BOUNDS: 'Tàu vượt ra ngoài bản đồ.',
};

function messageForError(error) {
  return ERROR_MESSAGES[error] ?? `Có lỗi xảy ra: ${error || 'UNKNOWN_ERROR'}`;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [connectionState, setConnectionState] = useState(socket.connected ? 'connected' : 'connecting');
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState(
    () => window.localStorage.getItem('battleship.playerName') ?? '',
  );
  const [roomInfo, setRoomInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationIntent, setConfirmationIntent] = useState(null);
  const [winner, setWinner] = useState(null);
  const [endReason, setEndReason] = useState(null);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameMessage, setGameMessage] = useState('');
  const [myBoard, setMyBoard] = useState(createEmptyBoard);
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placements, setPlacements] = useState([]);
  const [placementSubmitted, setPlacementSubmitted] = useState(false);
  const [shotPending, setShotPending] = useState(false);
  const [myShips, setMyShips] = useState([]);
  const [opponentShips, setOpponentShips] = useState([]);
  const [combatStats, setCombatStats] = useState({ shots: 0, hits: 0, accuracy: 0 });
  const [battleFx, setBattleFx] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(
    () => window.localStorage.getItem('battleship.soundEnabled') !== 'false',
  );
  const shotStartedAtRef = useRef(0);
  const shotPendingRef = useRef(false);
  const battleFxRef = useRef(null);
  const fxTimersRef = useRef(new Set());

  const currentShipIndex = placements.length;
  const currentPlayer = useMemo(
    () => roomInfo?.players?.find((player) => player.id === playerId) ?? null,
    [playerId, roomInfo],
  );

  const applyRoomState = useCallback((payload) => {
    const room = payload?.room ?? payload;

    if (!room?.roomCode) {
      return;
    }

    setRoomInfo(room);
    const me = room.players?.find((player) => player.id === (payload?.playerId ?? playerId));
    if (me) {
      setIsReady(Boolean(me.ready));
    }
  }, [playerId]);

  const applyGameView = useCallback((gameView) => {
    if (!gameView) {
      return;
    }

    setIsMyTurn(Boolean(gameView.isMyTurn));
    setMyBoard(ownBoardFromGameView(gameView));
    setOpponentBoard(opponentBoardFromGameView(gameView));
    const fleet = fleetFromGameView(gameView);
    setMyShips(fleet.ownShips);
    setOpponentShips(fleet.opponentShips);
    setCombatStats(combatStatsFromGameView(gameView));
  }, []);

  const scheduleFx = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      fxTimersRef.current.delete(timer);
      callback();
    }, delay);
    fxTimersRef.current.add(timer);
    return timer;
  }, []);

  const showBattleFx = useCallback((effect) => {
    battleFxRef.current = effect;
    setBattleFx(effect);
  }, []);

  const clearBattleFx = useCallback(() => {
    battleFxRef.current = null;
    setBattleFx(null);
  }, []);

  const resetPlacement = useCallback(() => {
    setMyBoard(createEmptyBoard());
    setOpponentBoard(createEmptyBoard());
    setPlacements([]);
    setIsHorizontal(true);
    setPlacementSubmitted(false);
    setShotPending(false);
    shotPendingRef.current = false;
    setMyShips([]);
    setOpponentShips([]);
    setCombatStats({ shots: 0, hits: 0, accuracy: 0 });
    clearBattleFx();
  }, [clearBattleFx]);

  useEffect(() => {
    const onConnect = () => setConnectionState('connected');
    const onDisconnect = () => setConnectionState('disconnected');
    const onConnectError = () => setConnectionState('disconnected');
    const onServerReady = (data) => {
      setPlayerId(data.playerId);
      setConnectionState('connected');
    };
    const onRoomJoined = (payload) => {
      applyRoomState(payload);
      navigate('/room');
    };
    const onRoomUpdated = (payload) => applyRoomState(payload);
    const onPlacementStarted = (payload) => {
      applyRoomState(payload);
      resetPlacement();
      setGameMessage('Hãy bố trí đủ 5 tàu để bắt đầu trận đấu.');
      navigate('/placement');
    };
    const onPlacementSubmitted = () => {
      setPlacementSubmitted(true);
      setGameMessage('Đã khóa đội hình. Đang chờ đối thủ...');
    };
    const onMatchStarted = (data) => {
      applyRoomState(data);
      applyGameView(data.gameView);
      setPlacementSubmitted(false);
      setWinner(null);
      setEndReason(null);
      setRematchWaiting(false);
      clearBattleFx();
      shotPendingRef.current = false;
      setGameMessage(
        data.currentPlayerId === playerId
          ? '🎯 Trận đấu bắt đầu! Lượt của bạn.'
          : '⏳ Trận đấu bắt đầu! Đợi đối thủ...',
      );
      navigate('/match');
    };
    const onGameStateUpdated = ({ gameView }) => {
      if (shotPendingRef.current || battleFxRef.current?.phase === 'launch') {
        return;
      }
      applyGameView(gameView);
    };
    const onShotResult = (data) => {
      const elapsed = performance.now() - shotStartedAtRef.current;
      const launchDelay = Math.max(0, 520 - elapsed);

      scheduleFx(() => {
        applyGameView(data.gameView);
        const result = data.sunk ? 'sunk' : data.hit ? 'hit' : 'miss';
        showBattleFx({
          id: `${data.turnNumber}-${data.index}-${result}`,
          board: 'opponent',
          index: data.index,
          phase: result,
          result,
          sunkShipId: data.sunkShipId,
        });
        playBattleSound(result, soundEnabled);
        setGameMessage(
          data.sunk
            ? '💥 ĐÁNH CHÌM! Một chiến hạm đối phương đã bị phá hủy.'
            : data.hit
              ? '💥 BẮN TRÚNG! Tiếp tục khai hỏa.'
              : '🌊 BẮN TRƯỢT! Quyền khai hỏa chuyển sang đối thủ.',
        );

        scheduleFx(() => {
          clearBattleFx();
          shotPendingRef.current = false;
          setShotPending(false);
        }, data.sunk ? 1400 : 1000);
      }, launchDelay);
    };
    const onOpponentShot = (data) => {
      showBattleFx({
        id: `${data.turnNumber}-${data.index}-incoming`,
        board: 'own',
        index: data.index,
        phase: 'launch',
      });
      playBattleSound('launch', soundEnabled);

      scheduleFx(() => {
        applyGameView(data.gameView);
        const result = data.sunk ? 'sunk' : data.hit ? 'hit' : 'miss';
        showBattleFx({
          id: `${data.turnNumber}-${data.index}-${result}`,
          board: 'own',
          index: data.index,
          phase: result,
          result,
          sunkShipId: data.sunkShipId,
        });
        playBattleSound(result, soundEnabled);
        setGameMessage(
          data.sunk
            ? '🔥 CHIẾN HẠM BỊ ĐÁNH CHÌM!'
            : data.hit
              ? '🔥 TRÚNG ĐẠN! Hạm đội đang chịu hỏa lực.'
              : '🌊 Đối thủ bắn trượt. Chuẩn bị phản công!',
        );
        scheduleFx(clearBattleFx, data.sunk ? 1400 : 1000);
      }, 520);
    };
    const onTurnChanged = (turnId) => {
      const myTurn = turnId === playerId;
      setIsMyTurn(myTurn);
      if (!shotPendingRef.current && !battleFxRef.current) {
        setGameMessage(myTurn ? '🎯 Đến lượt bạn bắn!' : '⏳ Đối thủ đang ngắm bắn...');
      }
    };
    const onGameOver = (data) => {
      applyRoomState(data);
      setWinner({
        id: data.winnerId,
        name: data.winnerName,
      });
      setEndReason(data.reason);
      setIsMyTurn(false);
      setShotPending(false);
      shotPendingRef.current = false;
      clearBattleFx();
      navigate('/endgame');
    };
    const onActionError = (data) => {
      setShotPending(false);
      shotPendingRef.current = false;
      clearBattleFx();
      if (data.event === 'submit_ships') {
        setPlacementSubmitted(false);
      }
      setErrorMsg(messageForError(data.error));
    };
    const onWaitingForOpponent = (payload) => {
      applyRoomState(payload);
      setGameMessage('Đang chờ người chơi thứ hai...');
    };
    const onOpponentDisconnected = (data) => {
      setGameMessage(`Mất kết nối với ${data.playerName ?? 'đối thủ'}. Đang chờ họ kết nối lại...`);
    };
    const onOpponentReconnected = (data) => {
      setGameMessage(`${data.playerName ?? 'Đối thủ'} đã kết nối lại.`);
    };
    const onOpponentLeft = (data) => {
      applyRoomState(data);
      setErrorMsg('Đối thủ đã rời phòng.');
      setIsReady(false);
      resetPlacement();
      navigate('/room');
    };
    const onSessionRestored = (payload) => {
      applyRoomState(payload);
      applyGameView(payload.gameView);

      if (payload.room.phase === 'playing') {
        navigate('/match');
      } else if (payload.room.phase === 'placement') {
        navigate('/placement');
      } else if (payload.room.phase === 'ended') {
        const restoredWinner = payload.room.players.find(
          (player) => player.id === payload.room.game?.winnerId,
        );
        if (restoredWinner) {
          setWinner({ id: restoredWinner.id, name: restoredWinner.name });
        }
        navigate('/endgame');
      } else {
        navigate('/room');
      }
    };
    const onRematchState = ({ votes, needed }) => {
      setRematchWaiting(votes.includes(playerId));
      setGameMessage(`Đã có ${votes.length}/${needed} người đồng ý tái đấu.`);
    };
    const onRoomLeft = () => {
      setRoomInfo(null);
      setIsReady(false);
      setWinner(null);
      resetPlacement();
      navigate('/home');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('server_ready', onServerReady);
    socket.on('room_created', onRoomJoined);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_state_updated', onRoomUpdated);
    socket.on('placement_started', onPlacementStarted);
    socket.on('placement_submitted', onPlacementSubmitted);
    socket.on('waiting_for_opponent', onWaitingForOpponent);
    socket.on('match_started', onMatchStarted);
    socket.on('game_state_updated', onGameStateUpdated);
    socket.on('shot_result', onShotResult);
    socket.on('opponent_shot', onOpponentShot);
    socket.on('turn_changed', onTurnChanged);
    socket.on('match_ended', onGameOver);
    socket.on('action_error', onActionError);
    socket.on('opponent_disconnected', onOpponentDisconnected);
    socket.on('opponent_reconnected', onOpponentReconnected);
    socket.on('opponent_left', onOpponentLeft);
    socket.on('session_restored', onSessionRestored);
    socket.on('rematch_state_updated', onRematchState);
    socket.on('room_left', onRoomLeft);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('server_ready', onServerReady);
      socket.off('room_created', onRoomJoined);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_state_updated', onRoomUpdated);
      socket.off('placement_started', onPlacementStarted);
      socket.off('placement_submitted', onPlacementSubmitted);
      socket.off('waiting_for_opponent', onWaitingForOpponent);
      socket.off('match_started', onMatchStarted);
      socket.off('game_state_updated', onGameStateUpdated);
      socket.off('shot_result', onShotResult);
      socket.off('opponent_shot', onOpponentShot);
      socket.off('turn_changed', onTurnChanged);
      socket.off('match_ended', onGameOver);
      socket.off('action_error', onActionError);
      socket.off('opponent_disconnected', onOpponentDisconnected);
      socket.off('opponent_reconnected', onOpponentReconnected);
      socket.off('opponent_left', onOpponentLeft);
      socket.off('session_restored', onSessionRestored);
      socket.off('rematch_state_updated', onRematchState);
      socket.off('room_left', onRoomLeft);
    };
  }, [
    applyGameView,
    applyRoomState,
    clearBattleFx,
    navigate,
    playerId,
    resetPlacement,
    scheduleFx,
    showBattleFx,
    soundEnabled,
  ]);

  useEffect(() => {
    window.localStorage.setItem('battleship.playerName', playerName);
  }, [playerName]);

  useEffect(() => {
    window.localStorage.setItem('battleship.soundEnabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => () => {
    fxTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    fxTimersRef.current.clear();
  }, []);

  const requireConnection = () => {
    if (socket.connected) {
      return true;
    }

    setErrorMsg('Chưa kết nối được tới server. Vui lòng đợi hoặc tải lại trang.');
    return false;
  };

  const handleCreateRoom = () => {
    if (!requireConnection() || !playerName.trim()) {
      return;
    }
    socket.emit('create_room', { playerName: playerName.trim() });
  };

  const handleJoinRoom = (roomCode) => {
    if (!requireConnection() || !playerName.trim()) {
      return;
    }
    socket.emit('join_room', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  const handleToggleReady = () => {
    socket.emit('player_ready', { ready: !isReady });
  };

  const handleLeaveRoom = () => setConfirmationIntent('leaveRoom');

  const closeConfirmation = useCallback(() => {
    setConfirmationIntent(null);
  }, []);

  const confirmRequestedAction = () => {
    const intent = confirmationIntent;
    setConfirmationIntent(null);

    if (intent === 'surrender') {
      socket.emit('surrender');
      return;
    }

    if (intent === 'quitMatch' || intent === 'leaveRoom') {
      socket.emit('leave_room');
    }
  };

  const handlePlacementClick = (index) => {
    if (placementSubmitted || currentShipIndex >= FLEET.length) {
      return;
    }

    const result = placeFleetShip(myBoard, index, FLEET[currentShipIndex], isHorizontal);

    if (!result) {
      setErrorMsg('Vị trí này không đặt được tàu.');
      return;
    }

    setMyBoard(result.board);
    setPlacements((current) => [...current, result.placement]);
  };

  const handleUndoPlacement = () => {
    if (placementSubmitted || placements.length === 0) {
      return;
    }
    const nextPlacements = placements.slice(0, -1);
    setPlacements(nextPlacements);
    setMyBoard(rebuildBoard(nextPlacements));
  };

  const handleResetPlacement = () => {
    if (!placementSubmitted) {
      resetPlacement();
    }
  };

  const handleRandomPlacement = () => {
    if (placementSubmitted) {
      return;
    }

    try {
      const randomFleet = createRandomFleet();
      setMyBoard(randomFleet.board);
      setPlacements(randomFleet.placements);
    } catch {
      setErrorMsg('Không thể tạo đội hình ngẫu nhiên. Vui lòng thử lại.');
    }
  };

  const handleSubmitShips = () => {
    if (placements.length !== FLEET.length || placementSubmitted) {
      return;
    }
    setPlacementSubmitted(true);
    socket.emit('submit_ships', { placements });
  };

  const handleAttack = (index) => {
    if (!isMyTurn || shotPending || opponentBoard[index]) {
      return;
    }

    setShotPending(true);
    shotPendingRef.current = true;
    shotStartedAtRef.current = performance.now();
    showBattleFx({
      id: `launch-${Date.now()}-${index}`,
      board: 'opponent',
      index,
      phase: 'launch',
    });
    playBattleSound('launch', soundEnabled);
    setOpponentBoard((current) => {
      const next = [...current];
      next[index] = 'fire';
      return next;
    });
    socket.emit('fire_cell', { index });
  };

  const handleSurrender = () => setConfirmationIntent('surrender');

  const handleQuitMatch = () => setConfirmationIntent('quitMatch');

  const handleRematch = () => {
    setRematchWaiting(true);
    socket.emit('request_rematch');
  };

  const hasRoom = Boolean(roomInfo);
  const isMatchRouteAllowed = hasRoom && ['playing', 'ended'].includes(roomInfo.phase);

  return (
    <div className="app-shell min-h-screen text-white p-3 sm:p-5 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      <ConnectionStatus state={connectionState} />

      <ConfirmDialog
        open={Boolean(confirmationIntent)}
        {...(CONFIRMATION_CONTENT[confirmationIntent] ?? {})}
        onConfirm={confirmRequestedAction}
        onCancel={closeConfirmation}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto py-4 sm:py-8">
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} />

        <Routes>
          <Route path="/" element={<Splash onStart={() => navigate('/home')} />} />
          <Route
            path="/home"
            element={(
              <Home
                playerName={playerName}
                setPlayerName={setPlayerName}
                onJoinRoom={handleJoinRoom}
              />
            )}
          />
          <Route
            path="/create-room"
            element={(
              <CreateRoom
                playerName={playerName}
                setPlayerName={setPlayerName}
                onCreateRoom={handleCreateRoom}
              />
            )}
          />
          <Route
            path="/room"
            element={hasRoom
              ? (
                  <Room
                    roomInfo={roomInfo}
                    playerId={playerId}
                    isReady={isReady}
                    onToggleReady={handleToggleReady}
                    onLeaveRoom={handleLeaveRoom}
                  />
                )
              : <Navigate to="/home" replace />}
          />
          <Route
            path="/placement"
            element={hasRoom
              ? (
                  <Placement
                    myBoard={myBoard}
                    placements={placements}
                    currentShipIndex={currentShipIndex}
                    isHorizontal={isHorizontal}
                    placementSubmitted={placementSubmitted}
                    statusMessage={gameMessage}
                    onCellClick={handlePlacementClick}
                    onToggleDirection={() => setIsHorizontal((current) => !current)}
                    onUndo={handleUndoPlacement}
                    onReset={handleResetPlacement}
                    onRandom={handleRandomPlacement}
                    onReady={handleSubmitShips}
                  />
                )
              : <Navigate to="/home" replace />}
          />
          <Route
            path="/match"
            element={isMatchRouteAllowed
              ? (
                  <Match
                    isMyTurn={isMyTurn}
                    gameMessage={gameMessage}
                    myBoard={myBoard}
                    opponentBoard={opponentBoard}
                    myShips={myShips}
                    opponentShips={opponentShips}
                    combatStats={combatStats}
                    battleFx={battleFx}
                    shotPending={shotPending}
                    soundEnabled={soundEnabled}
                    onToggleSound={() => setSoundEnabled((current) => !current)}
                    onAttack={handleAttack}
                    onSurrender={handleSurrender}
                    onQuitMatch={handleQuitMatch}
                  />
                )
              : <Navigate to={hasRoom ? '/room' : '/home'} replace />}
          />
          <Route
            path="/endgame"
            element={winner
              ? (
                  <Endgame
                    winner={winner.name}
                    isMe={winner.id === playerId}
                    reason={endReason}
                    rematchWaiting={rematchWaiting}
                    onRematch={handleRematch}
                    onQuit={handleLeaveRoom}
                  />
                )
              : <Navigate to={hasRoom ? '/room' : '/home'} replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {import.meta.env.DEV && location.pathname !== '/' && currentPlayer && (
          <div className="fixed bottom-2 left-2 text-[10px] text-slate-600 pointer-events-none">
            {currentPlayer.name} · {roomInfo?.roomCode}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

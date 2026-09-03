import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import RoomSettings from './components/RoomSettings';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import RoleReveal from './components/RoleReveal';
import GameTutorial from './components/GameTutorial';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [banishmentReveal, setBanishmentReveal] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('lobby'); // 'lobby', 'settings', 'waiting', 'tutorial', 'roleReveal', 'game'
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameData, setGameData] = useState(null);

  // Estados para o Tutorial e Fases
  const [isTutorialOverlay, setIsTutorialOverlay] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [phaseIntro, setPhaseIntro] = useState(null); // Guarda a intro da fase até ser a hora certa
  const [isEvaluation, setIsEvaluation] = useState(false);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });

    // ESPIÃO DE EVENTOS (Para debug no console)
    newSocket.onAny((event, ...args) => {
        console.log(`[SOCKET RECEBIDO] Evento: ${event}`, args);
    });

    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    newSocket.on('game_started', (playerState) => {
        setGameData(playerState);
        setRoomData(prev => ({ ...prev, roomCode: playerState.roomCode })); // FIX: Garante que roomData tem o código
        setTutorialStep(0);
        setCurrentScreen('tutorial');
        setPhaseIntro(null);
    });

    newSocket.on('phase_intro', (data) => {
      setPhaseIntro(data);
    });

    newSocket.on('phase_started', (data) => {
      setPhaseIntro(null);
      setIsEvaluation(false);
      setGameData(prev => ({ ...prev, phase: data.phase, timer: data.timer, roundNumber: data.roundNumber }));
    });

    newSocket.on('mission_evaluation', () => {
      setIsEvaluation(true);
      setPhaseIntro(null);
    });

    newSocket.on('banishment_reveal', (data) => {
      setBanishmentReveal(data);  // Definir estado para mostrar no UI
      setPhaseIntro(null);
      setIsEvaluation(false);
    });

    return () => newSocket.close();
  }, []);

  const handleRoomCreated = (data) => {
    setRoomData(data);
    setIsHost(true);
    setCurrentScreen('settings');
  };

  const handleRoomJoined = (data) => {
    setRoomData(data);
    setIsHost(false);
    setCurrentScreen('waiting');
  };

  const handleTutorialClose = () => {
    if (currentScreen === 'tutorial') {
      // Saiu do tutorial -> vai para o Role Reveal
      setCurrentScreen('roleReveal');
    } else {
      // Saiu do popup de ajuda
      setIsTutorialOverlay(false);
    }
  };

  const handleRoleRevealContinue = () => {
    // Saiu do Role Reveal -> Entra no Jogo
    setCurrentScreen('game');
  };

  const openHelp = (step) => {
    setTutorialStep(step || 0);
    setIsTutorialOverlay(true);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        
        {!connected && (
          <div className="text-center slow-reveal">
            <h1 className="font-display text-6xl mb-4 tracking-widest text-[#D8B66C]">THE TRAITORS</h1>
            <p className="text-[#F3EBDD] mb-8">A ligar ao servidor...</p>
          </div>
        )}

        {connected && currentScreen === 'lobby' && (
          <Lobby socket={socket} setPlayerName={setPlayerName} playerName={playerName} onRoomCreated={handleRoomCreated} onRoomJoined={handleRoomJoined} />
        )}

        {connected && currentScreen === 'settings' && isHost && (
          <RoomSettings socket={socket} roomData={roomData} setRoomData={setRoomData} onBack={() => setCurrentScreen('lobby')} />
        )}

        {connected && currentScreen === 'waiting' && !isHost && (
          <WaitingRoom socket={socket} roomData={roomData} onBack={() => setCurrentScreen('lobby')} />
        )}

        {/* TUTORIAL (Apenas se a tela atual for 'tutorial') */}
        {connected && currentScreen === 'tutorial' && (
          <GameTutorial onClose={handleTutorialClose} initialStep={0} />
        )}

        {/* ROLE REVEAL (Apenas se a tela atual for 'roleReveal') */}
        {connected && currentScreen === 'roleReveal' && gameData && (
          <RoleReveal 
            playerState={gameData} 
            onContinue={handleRoleRevealContinue} 
          />
        )}

        {/* JOGO (Apenas se a tela atual for 'game') */}
        {connected && currentScreen === 'game' && gameData && (
          <GameBoard 
            playerState={gameData} 
            onOpenHelp={openHelp} 
            socket={socket}
            phaseIntro={phaseIntro} // Passa a intro apenas quando for para o jogo
            banishmentReveal={banishmentReveal}
            playerId={socket.id}
            onVote={(targetPlayerId) => {
                if (roomData && roomData.roomCode) {
                    socket.emit('submit_banishment_vote', { roomCode: roomData.roomCode, targetPlayerId });
                }
            }}
            isEvaluation={isEvaluation}
            onReady={() => {
              if (roomData && roomData.roomCode) {
                socket.emit('player_ready', { roomCode: roomData.roomCode });
              }
            }}
            onEndMission={() => socket.emit('end_mission', { roomCode: roomData.roomCode })}
            onEvaluation={(data) => socket.emit('submit_evaluation', { roomCode: roomData.roomCode, data })}
          />
        )}

        {/* OVERLAY DE AJUDA (Pode aparecer em qualquer altura do jogo) */}
        {isTutorialOverlay && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
            <GameTutorial onClose={handleTutorialClose} initialStep={tutorialStep} />
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
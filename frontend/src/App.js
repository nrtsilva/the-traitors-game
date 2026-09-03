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
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('lobby');
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameData, setGameData] = useState(null);

  // Estados para o Tutorial
  const [isTutorialOverlay, setIsTutorialOverlay] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    newSocket.on('game_started', (playerState) => {
      setGameData(playerState);
      setTutorialStep(0); // Começa o tutorial do início
      setCurrentScreen('tutorial'); // Vai primeiro para o tutorial
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

  // Fecha o tutorial (volta ao RoleReveal se for o início, ou fecha o pop-up)
  const handleTutorialClose = () => {
    if (currentScreen === 'tutorial') {
      setCurrentScreen('roleReveal');
    } else {
      setIsTutorialOverlay(false);
    }
  };

  // Abre o tutorial como pop-up durante o jogo
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

        {connected && currentScreen === 'tutorial' && (
          <GameTutorial onClose={handleTutorialClose} initialStep={0} />
        )}

        {connected && currentScreen === 'roleReveal' && gameData && (
          <RoleReveal 
            playerState={gameData} 
            onContinue={() => setCurrentScreen('game')} 
          />
        )}

        {connected && currentScreen === 'game' && gameData && (
          <GameBoard playerState={gameData} onOpenHelp={openHelp} />
        )}

        {/* Overlay do Tutorial (Ajuda durante o jogo) */}
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
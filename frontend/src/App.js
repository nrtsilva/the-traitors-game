import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import RoomSettings from './components/RoomSettings';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import RoleReveal from './components/RoleReveal';
import GameTutorial from './components/GameTutorial';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [arsenalResult, setArsenalResult] = useState(null);
  const [banishmentReveal, setBanishmentReveal] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('lobby');
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameData, setGameData] = useState(null);

  const [isTutorialOverlay, setIsTutorialOverlay] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [phaseIntro, setPhaseIntro] = useState(null);
  const [isEvaluation, setIsEvaluation] = useState(false);

  const [blindfold, setBlindfold] = useState(false);
  const [traitorChoices, setTraitorChoices] = useState(null);
  const [showPlayerList, setShowPlayerList] = useState(null);
  const [recruitInvitation, setRecruitInvitation] = useState(false);
  const [recruitResult, setRecruitResult] = useState(null);
  const [murderReveal, setMurderReveal] = useState(null);

  // SOLUÇÃO: UseRef para aceder ao valor mais recente dentro do socket sem recriar a ligação
  const isEvaluationRef = useRef(isEvaluation);
  useEffect(() => {
    isEvaluationRef.current = isEvaluation;
  }, [isEvaluation]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });

    newSocket.onAny((event, ...args) => {
        console.log(`[SOCKET RECEBIDO] Evento: ${event}`, args);
    });

    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));
    
    newSocket.on('room_update', (data) => {
      setRoomData(prev => ({ ...prev, players: data.players, settings: data.settings }));
    });
    
    newSocket.on('game_started', (playerState) => {
        setGameData(playerState);
        setRoomData(prev => ({ ...prev, roomCode: playerState.roomCode }));
        setTutorialStep(0);
        setCurrentScreen('tutorial');
        setPhaseIntro(null);
    });

    newSocket.on('mission_evaluation', () => {
        console.log("Evento mission_evaluation recebido!");
        setPhaseIntro(null);
        setBanishmentReveal(null);
        setIsEvaluation(true);
    });

    newSocket.on('arsenal_result', (data) => {
      setArsenalResult(data);
      setPhaseIntro(null);
      setIsEvaluation(false);
    });

    newSocket.on('phase_intro', (data) => {
      setPhaseIntro(data);
      setBanishmentReveal(null);
      setArsenalResult(null);
      setIsEvaluation(false);
    });

    newSocket.on('phase_started', (data) => {
      setPhaseIntro(null);
      setIsEvaluation(false);
      setGameData(prev => ({ ...prev, phase: data.phase, timer: data.timer, roundNumber: data.roundNumber }));
    });

    newSocket.on('banishment_reveal', (data) => {
      setBanishmentReveal(data);
      setPhaseIntro(null);
      setIsEvaluation(false);
    });

    newSocket.on('blindfold_begin', () => {
      setBlindfold(true);
      setTraitorChoices(null);
      setShowPlayerList(null);
      setMurderReveal(null);
      setRecruitInvitation(false);
    });

    newSocket.on('traitor_choices', (data) => {
      setBlindfold(false);
      setTraitorChoices(data);
    });

    newSocket.on('show_player_list', (data) => {
      setTraitorChoices(null);
      setShowPlayerList(data);
    });

    newSocket.on('recruit_invitation', () => {
      setBlindfold(false);
      setRecruitInvitation(true);
    });

    newSocket.on('recruit_result', (data) => {
      setRecruitInvitation(false);
      setRecruitResult(data);
    });

    newSocket.on('murder_reveal', (data) => {
      setBlindfold(false);
      setTraitorChoices(null);
      setShowPlayerList(null);
      setMurderReveal(data);
    });

    newSocket.on('decoy_question', () => {
      // Limpa os ecrãs do traidor para ele ver a "decoy"
      setBlindfold(false);
      setTraitorChoices(null);
      setShowPlayerList(null);
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
      setCurrentScreen('roleReveal');
    } else {
      setIsTutorialOverlay(false);
    }
  };

  const handleRoleRevealContinue = () => {
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

        {connected && currentScreen === 'tutorial' && (
          <GameTutorial onClose={handleTutorialClose} initialStep={0} />
        )}

        {connected && currentScreen === 'roleReveal' && gameData && (
          <RoleReveal 
            playerState={gameData} 
            onContinue={handleRoleRevealContinue} 
          />
        )}

        {connected && currentScreen === 'game' && gameData && (
          <GameBoard 
              playerState={gameData} 
              onOpenHelp={openHelp} 
              socket={socket}
              phaseIntro={phaseIntro}
              banishmentReveal={banishmentReveal}
              playerId={socket.id}
              arsenalResult={arsenalResult}
              blindfold={blindfold}
              traitorChoices={traitorChoices}
              showPlayerList={showPlayerList}
              recruitInvitation={recruitInvitation}
              recruitResult={recruitResult}
              murderReveal={murderReveal}
              onTraitorChoice={(action) => socket.emit('traitor_choice', { roomCode: roomData.roomCode, action })}
              onTraitorMurder={(targetId) => socket.emit('traitor_murder_choice', { roomCode: roomData.roomCode, targetPlayerId: targetId })}
              onTraitorRecruit={(targetId) => socket.emit('traitor_recruit_choice', { roomCode: roomData.roomCode, targetPlayerId: targetId })}
              onDecoyAnswer={() => socket.emit('decoy_answer', { roomCode: roomData.roomCode })}
              onRecruitDecision={(accepted) => socket.emit('recruit_decision', { roomCode: roomData.roomCode, accepted })}
              onContinueAfterReveal={() => { setMurderReveal(null); setRecruitResult(null); }}
              onArsenalAction={(value) => {
                  if (roomData && roomData.roomCode) {
                      socket.emit('submit_arsenal_action', { roomCode: roomData.roomCode, actionData: { value } });
                  }
              }}
              onVote={(targetPlayerId, useDagger) => {
                  if (roomData && roomData.roomCode) {
                      socket.emit('submit_banishment_vote', { roomCode: roomData.roomCode, targetPlayerId, useDagger });
                  }
              }}
              isEvaluation={isEvaluation}
              onReady={() => {
                if (roomData && roomData.roomCode) {
                  socket.emit('player_ready', { roomCode: roomData.roomCode });
                }
              }}
              onEndMission={() => {
                  if (roomData && roomData.roomCode) {
                      socket.emit('end_mission', { roomCode: roomData.roomCode });
                  }
              }}
              onEvaluation={(data) => {
                  const code = (roomData && roomData.roomCode) || (gameData && gameData.roomCode);
                  if (code) {
                      socket.emit('submit_evaluation', { roomCode: code, data });
                      // Não definimos isEvaluation para false aqui; esperamos que o servidor envie a próxima fase.
                  } else {
                      console.error("Erro: roomCode não encontrado. roomData:", roomData, "gameData:", gameData);
                  }
              }}
          />
        )}

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
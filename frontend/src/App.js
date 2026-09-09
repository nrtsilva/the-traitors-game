// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useAudio } from './hooks/useAudio';
import { useGameState } from './hooks/useGameState';
import { GameProvider } from './context/GameContext';
import Lobby from './components/Lobby';
import RoomSettings from './components/RoomSettings';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import RoleReveal from './components/RoleReveal';
import GameTutorial from './components/GameTutorial';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const { socket, connected } = useSocket(BACKEND_URL);
  const { isMuted, toggleMute, play, stop } = useAudio();
  const [state, dispatch] = useGameState();
  const [playerName, setPlayerName] = useState('');
  const lastPlayedRef = useRef(null); // controla o último áudio tocado pelo ecrã

  // --- REFS para manter dados atualizados nos handlers do socket ---
  const roomDataRef = useRef(state.roomData);
  const gameDataRef = useRef(state.gameData);
  const currentScreenRef = useRef(state.currentScreen);

  useEffect(() => {
    roomDataRef.current = state.roomData;
  }, [state.roomData]);

  useEffect(() => {
    currentScreenRef.current = state.currentScreen;
  }, [state.currentScreen]);

  useEffect(() => {
    gameDataRef.current = state.gameData;
  }, [state.gameData]);

  // --- GERENCIAMENTO DE ÁUDIO POR ECRÃ ---
  useEffect(() => {
    const playAudioForScreen = () => {
      if (isMuted) return; // se mutado, não toca

      let filename = null;

      if (state.currentScreen === 'lobby') {
        filename = 'lobby.mp3';
      } else if (state.currentScreen === 'tutorial') {
        filename = 'tutorial.mp3';
      } else if (state.currentScreen === 'roleReveal') {
        filename = 'role-reveal.mp3';
      } else if (state.currentScreen === 'game') {
        // Durante o jogo, o áudio é controlado pelos handlers de socket
        // Mas se não houver fase definida, toca mission.mp3
        if (!state.phaseIntro && !state.gameData?.phase) {
          filename = 'mission.mp3';
        } else {
          // Se há phaseIntro, o áudio será tratado pelo handler phase_intro/phase_started
          return;
        }
      }

      if (filename && lastPlayedRef.current !== filename) {
        play(filename);
        lastPlayedRef.current = filename;
      }
    };

    playAudioForScreen();
  }, [state.currentScreen, state.phaseIntro, state.gameData?.phase, isMuted, play]);

  // --- HANDLERS DO SOCKET ---
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      room_update: (data) => {
        const currentRoom = roomDataRef.current || {};
        dispatch({
          type: 'SET_ROOM_DATA',
          payload: {
            ...currentRoom,
            players: data.players,
            settings: data.settings
          }
        });
      },

      game_started: (playerState) => {
        if (!playerState.currentMission) {
          console.warn('[game_started] currentMission ausente! Usando fallback.');
          playerState.currentMission = {
            id: 'fallback',
            title: 'Missão Padrão',
            description: 'Completem a missão.',
            type: 'DEFAULT',
            reward: 0
          };
        }
        dispatch({ type: 'SET_GAME_DATA', payload: playerState });
        dispatch({ type: 'SET_SCREEN', payload: 'tutorial' });
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
        dispatch({ type: 'SET_GAME_OVER', payload: null });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
      },

      phase_intro: (data) => {
        // Mostra a fortuna sempre que for uma missão (PHASE_1_MISSION)
        if (data.phase === 'PHASE_1_MISSION') {
          const currentGame = gameDataRef.current || {};
          const player = currentGame?.players?.find(p => p.id === socket.id) || {};
          const fortuneData = {
            playerName: player.name || 'Jogador',
            gold: player.gold ?? 0,
            bars: player.bars ?? 0,
            commonCoins: currentGame?.prizeFund?.coins ?? 0,
            commonBars: currentGame?.prizeFund?.bars ?? 0,
          };
          dispatch({ type: 'SET_FORTUNE_DATA', payload: fortuneData });
          dispatch({ type: 'SET_SHOW_FORTUNE', payload: true });
          dispatch({ type: 'SET_PENDING_PHASE_INTRO', payload: data });
        } else {
          // Outras fases (arsenal, expulsão, etc.)
          dispatch({ type: 'SET_PHASE_INTRO', payload: data });
          if (data.phase) {
            const currentGame = gameDataRef.current || {};
            dispatch({
              type: 'SET_GAME_DATA',
              payload: { ...currentGame, phase: data.phase }
            });
          }
          dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
          dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
          dispatch({ type: 'SET_IS_EVALUATION', payload: false });
          dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        }
      },

      mission_outcome: (data) => {
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: data });
      },

      mission_evaluation: () => {
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
        dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
        dispatch({ type: 'SET_IS_EVALUATION', payload: true });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('evaluation.mp3');
          lastPlayedRef.current = 'evaluation.mp3';
        }
      },

      arsenal_result: (data) => {
        dispatch({ type: 'SET_ARSENAL_RESULT', payload: data });
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
        dispatch({ type: 'SET_IS_EVALUATION', payload: false });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('arsenal.mp3');
          lastPlayedRef.current = 'arsenal.mp3';
        }
      },

      banishment_reveal: (data) => {
        dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: data });
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
        dispatch({ type: 'SET_IS_EVALUATION', payload: false });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('banishment.mp3');
          lastPlayedRef.current = 'banishment.mp3';
        }
      },

      blindfold_begin: () => {
        dispatch({ type: 'SET_BLINDFOLD', payload: true });
        dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
        dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
        dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
        dispatch({ type: 'SET_MURDER_REVEAL', payload: null });
        dispatch({ type: 'SET_RECRUIT_INVITATION', payload: false });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('murder-blindfold.mp3');
          lastPlayedRef.current = 'murder-blindfold.mp3';
        }
      },

      traitor_choices: (data) => {
        dispatch({ type: 'SET_BLINDFOLD', payload: false });
        dispatch({ type: 'SET_TRAITOR_CHOICES', payload: data });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('murder-blindfold.mp3');
          lastPlayedRef.current = 'murder-blindfold.mp3';
        }
      },

      show_player_list: (data) => {
        dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
        dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: data });
      },

      recruit_invitation: () => {
        dispatch({ type: 'SET_BLINDFOLD', payload: false });
        dispatch({ type: 'SET_RECRUIT_INVITATION', payload: true });
      },

      recruit_result: (data) => {
        dispatch({ type: 'SET_RECRUIT_INVITATION', payload: false });
        dispatch({ type: 'SET_RECRUIT_RESULT', payload: data });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('murder-reveal.mp3');
          lastPlayedRef.current = 'murder-reveal.mp3';
        }
      },

      murder_reveal: (data) => {
        dispatch({ type: 'SET_BLINDFOLD', payload: false });
        dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
        dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
        dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
        dispatch({ type: 'SET_MURDER_REVEAL', payload: data });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('murder-reveal.mp3');
          lastPlayedRef.current = 'murder-reveal.mp3';
        }
      },

      decoy_question: () => {
        dispatch({ type: 'SET_BLINDFOLD', payload: false });
        dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
        dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
        dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
        dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
      },

      game_over: (data) => {
        dispatch({ type: 'SET_GAME_OVER', payload: data });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        if (!isMuted) {
          play('game-over.mp3');
          lastPlayedRef.current = 'game-over.mp3';
        }
      },

      phase_started: (data) => {
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
        dispatch({ type: 'SET_IS_EVALUATION', payload: false });
        dispatch({ type: 'SET_MISSION_OUTCOME', payload: null });
        const currentGame = gameDataRef.current || {};
        dispatch({
          type: 'SET_GAME_DATA',
          payload: {
            ...currentGame,
            phase: data.phase,
            timer: data.timer,
            roundNumber: data.roundNumber
          }
        });
        if (!isMuted) {
          if (data.phase === 'PHASE_2_BANISHMENT') {
            play('banishment.mp3');
            lastPlayedRef.current = 'banishment.mp3';
          } else if (data.phase === 'PHASE_3_ARMOURY') {
            play('arsenal.mp3');
            lastPlayedRef.current = 'arsenal.mp3';
          } else {
            play('mission.mp3');
            lastPlayedRef.current = 'mission.mp3';
          }
        }
      },

      arsenal_task: (data) => {
        const currentGame = gameDataRef.current || {};
        dispatch({
          type: 'SET_GAME_DATA',
          payload: {
            ...currentGame,
            arsenalTask: data.task
          }
        });
        dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      },

      player_status_update: (data) => {
        dispatch({ type: 'SET_READY_COUNT', payload: data });
      }
    };

    Object.keys(handlers).forEach(event => {
      socket.on(event, handlers[event]);
    });

    return () => {
      Object.keys(handlers).forEach(event => {
        socket.off(event, handlers[event]);
      });
    };
  }, [socket, play, dispatch, isMuted]); // <-- dependências estáveis

  // --- HANDLERS DE NAVEGAÇÃO ---
  const handleRoomCreated = useCallback((data) => {
    dispatch({ type: 'SET_ROOM_DATA', payload: data });
    dispatch({ type: 'SET_IS_HOST', payload: true });
    dispatch({ type: 'SET_SCREEN', payload: 'settings' });
  }, [dispatch]);

  const handleRoomJoined = useCallback((data) => {
    dispatch({ type: 'SET_ROOM_DATA', payload: data });
    dispatch({ type: 'SET_IS_HOST', payload: false });
    dispatch({ type: 'SET_SCREEN', payload: 'waiting' });
  }, [dispatch]);

  const handleTutorialClose = useCallback(() => {
    if (state.currentScreen === 'tutorial') {
      dispatch({ type: 'SET_SCREEN', payload: 'roleReveal' });
    } else {
      dispatch({ type: 'SET_TUTORIAL', payload: { isTutorialOverlay: false } });
    }
  }, [state.currentScreen, dispatch]);

  const handleRoleRevealContinue = useCallback(() => {
    dispatch({ type: 'SET_SCREEN', payload: 'game' });
  }, [dispatch]);

  // --- HANDLERS PARA AÇÕES DO JOGO ---
  const handleTraitorChoice = useCallback((action) => {
    socket.emit('traitor_choice', { roomCode: state.roomData?.roomCode, action });
  }, [socket, state.roomData]);

  const handleTraitorMurder = useCallback((targetId) => {
    socket.emit('traitor_murder_choice', { roomCode: state.roomData?.roomCode, targetPlayerId: targetId });
  }, [socket, state.roomData]);

  const handleTraitorRecruit = useCallback((targetId) => {
    socket.emit('traitor_recruit_choice', { roomCode: state.roomData?.roomCode, targetPlayerId: targetId });
  }, [socket, state.roomData]);

  const handleDecoyAnswer = useCallback(() => {
    socket.emit('decoy_answer', { roomCode: state.roomData?.roomCode });
  }, [socket, state.roomData]);

  const handleRecruitDecision = useCallback((accepted) => {
    socket.emit('recruit_decision', { roomCode: state.roomData?.roomCode, accepted });
  }, [socket, state.roomData]);

  const handleMissionOutcome = useCallback((success) => {
    if (state.roomData?.roomCode) {
      socket.emit('end_mission', { roomCode: state.roomData.roomCode, outcome: success });
    }
  }, [socket, state.roomData]);

  const handleArsenalResultSubmit = useCallback((data) => {
    if (state.roomData?.roomCode) {
      socket.emit('submit_arsenal_task_result', { roomCode: state.roomData.roomCode, resultData: data });
    }
  }, [socket, state.roomData]);

  const handleContinueAfterReveal = useCallback(() => {
    if (state.roomData?.roomCode) {
      socket.emit('continue_after_reveal', { roomCode: state.roomData.roomCode });
    }
    dispatch({ type: 'SET_MURDER_REVEAL', payload: null });
    dispatch({ type: 'SET_RECRUIT_RESULT', payload: null });
  }, [socket, state.roomData, dispatch]);

  const handleVote = useCallback((targetPlayerId, useDagger) => {
    if (state.roomData?.roomCode) {
      socket.emit('submit_banishment_vote', { roomCode: state.roomData.roomCode, targetPlayerId, useDagger });
    }
  }, [socket, state.roomData]);

  const handleMissionValueSubmit = useCallback((value) => {
    if (state.roomData?.roomCode) {
      socket.emit('submit_mission_value', { roomCode: state.roomData.roomCode, value });
    }
  }, [socket, state.roomData]);

  const handleReady = useCallback(() => {
    if (state.roomData?.roomCode) {
      socket.emit('player_ready', { roomCode: state.roomData.roomCode });
    }
  }, [socket, state.roomData]);

  const handleEndMission = useCallback(() => {
    if (state.roomData?.roomCode) {
      socket.emit('end_mission', { roomCode: state.roomData.roomCode });
    }
  }, [socket, state.roomData]);

  const handleEvaluation = useCallback((data) => {
    const code = state.roomData?.roomCode || state.gameData?.roomCode;
    if (code) {
      socket.emit('submit_evaluation', { roomCode: code, data });
    }
  }, [socket, state.roomData, state.gameData]);

  const handleOpenHelp = useCallback((step) => {
    dispatch({ type: 'SET_TUTORIAL', payload: { tutorialStep: step || 0, isTutorialOverlay: true } });
  }, [dispatch]);

  const handleFortuneContinue = useCallback(() => {
    dispatch({ type: 'SET_SHOW_FORTUNE', payload: false });
    const pendingData = state.pendingPhaseIntro;
    if (pendingData) {
      // Limpa o pending
      dispatch({ type: 'SET_PENDING_PHASE_INTRO', payload: null });
      // Define a introdução da fase
      dispatch({ type: 'SET_PHASE_INTRO', payload: pendingData });
      if (pendingData.phase) {
        const currentGame = gameDataRef.current || {};
        dispatch({
          type: 'SET_GAME_DATA',
          payload: { ...currentGame, phase: pendingData.phase }
        });
      }
    }
  }, [dispatch, state.pendingPhaseIntro]);

  // --- CONTEXT VALUE ---
  const contextValue = {
    socket,
    connected,
    state,
    dispatch,
    isMuted,
    toggleMute,
    play,
    stop,
    playerName,
    setPlayerName,
    handleRoomCreated,
    handleRoomJoined,
    handleTutorialClose,
    handleRoleRevealContinue,
    handleTraitorChoice,
    handleTraitorMurder,
    handleTraitorRecruit,
    handleDecoyAnswer,
    handleRecruitDecision,
    handleMissionOutcome,
    handleArsenalResultSubmit,
    handleContinueAfterReveal,
    handleVote,
    handleMissionValueSubmit,
    handleReady,
    handleEndMission,
    handleEvaluation,
    handleOpenHelp,
  };

  // --- RENDERIZAÇÃO ---
  return (
    <GameProvider value={contextValue}>
      <div className="min-h-screen">
        <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen relative">
          {connected && (
            <button
              onClick={toggleMute}
              className="fixed top-4 right-4 z-[100] w-12 h-12 bg-[#291923] border border-[#D8B66C] rounded-full flex items-center justify-center text-2xl shadow-soft hover:bg-[#412734] transition"
              title={isMuted ? "Ativar Som" : "Silenciar"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          )}

          {!connected && (
            <div className="text-center slow-reveal">
              <h1 className="font-display text-6xl mb-4 tracking-widest text-[#D8B66C]">THE TRAITORS</h1>
              <p className="text-[#F3EBDD] mb-8">A ligar ao servidor...</p>
            </div>
          )}

          {connected && state.currentScreen === 'lobby' && (
            <Lobby
              socket={socket}
              playerName={playerName}
              setPlayerName={setPlayerName}
              onRoomCreated={handleRoomCreated}
              onRoomJoined={handleRoomJoined}
            />
          )}

          {connected && state.currentScreen === 'settings' && state.isHost && (
            <RoomSettings
              socket={socket}
              roomData={state.roomData}
              setRoomData={(data) => dispatch({ type: 'SET_ROOM_DATA', payload: data })}
              onBack={() => dispatch({ type: 'SET_SCREEN', payload: 'lobby' })}
            />
          )}

          {connected && state.currentScreen === 'waiting' && !state.isHost && (
            <WaitingRoom
              socket={socket}
              roomData={state.roomData}
              onBack={() => dispatch({ type: 'SET_SCREEN', payload: 'lobby' })}
            />
          )}

          {connected && state.currentScreen === 'tutorial' && (
            <GameTutorial onClose={handleTutorialClose} initialStep={0} />
          )}

          {connected && state.currentScreen === 'roleReveal' && state.gameData && (
            <RoleReveal playerState={state.gameData} onContinue={handleRoleRevealContinue} />
          )}

          {connected && state.currentScreen === 'game' && state.gameData && (
            <GameBoard
              playerState={state.gameData}
              onOpenHelp={handleOpenHelp}
              socket={socket}
              phaseIntro={state.phaseIntro}
              isEvaluation={state.isEvaluation}
              onReady={handleReady}
              onEvaluation={handleEvaluation}
              onVote={handleVote}
              banishmentReveal={state.banishmentReveal}
              arsenalResult={state.arsenalResult}
              playerId={socket.id}
              onEndMission={handleEndMission}
              blindfold={state.blindfold}
              onDecoyAnswer={handleDecoyAnswer}
              traitorChoices={state.traitorChoices}
              onTraitorChoice={handleTraitorChoice}
              showPlayerList={state.showPlayerList}
              onTraitorMurder={handleTraitorMurder}
              onTraitorRecruit={handleTraitorRecruit}
              recruitInvitation={state.recruitInvitation}
              onRecruitDecision={handleRecruitDecision}
              recruitResult={state.recruitResult}
              murderReveal={state.murderReveal}
              onContinueAfterReveal={handleContinueAfterReveal}
              gameOver={state.gameOver}
              roomData={state.roomData}
              onMissionValueSubmit={handleMissionValueSubmit}
              onArsenalResultSubmit={handleArsenalResultSubmit}
              onMissionOutcome={handleMissionOutcome}
              missionOutcome={state.missionOutcome}
              showFortune={state.showFortune}
              fortuneData={state.fortuneData}
              onFortuneContinue={handleFortuneContinue}
            />
          )}

          {state.isTutorialOverlay && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
              <GameTutorial onClose={handleTutorialClose} initialStep={state.tutorialStep} />
            </div>
          )}
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
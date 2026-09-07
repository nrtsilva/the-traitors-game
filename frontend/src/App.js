import React, { useEffect, useCallback } from 'react';
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

  // Reagir a eventos do socket
  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (data) => {
      dispatch({ type: 'SET_ROOM_DATA', payload: { ...state.roomData, players: data.players, settings: data.settings } });
    });

    socket.on('game_started', (playerState) => {
      dispatch({ type: 'SET_GAME_DATA', payload: playerState });
      dispatch({ type: 'SET_SCREEN', payload: 'tutorial' });
      dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      dispatch({ type: 'SET_GAME_OVER', payload: null });
    });

    socket.on('phase_intro', (data) => {
      dispatch({ type: 'SET_PHASE_INTRO', payload: data });
      dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
      dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
      dispatch({ type: 'SET_IS_EVALUATION', payload: false });
    });

    socket.on('mission_evaluation', () => {
      dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
      dispatch({ type: 'SET_IS_EVALUATION', payload: true });
      play('evaluation.mp3');
    });

    socket.on('arsenal_result', (data) => {
      dispatch({ type: 'SET_ARSENAL_RESULT', payload: data });
      dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      dispatch({ type: 'SET_IS_EVALUATION', payload: false });
      play('arsenal.mp3');
    });

    socket.on('banishment_reveal', (data) => {
      dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: data });
      dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      dispatch({ type: 'SET_IS_EVALUATION', payload: false });
      play('banishment.mp3');
    });

    socket.on('blindfold_begin', () => {
      dispatch({ type: 'SET_BLINDFOLD', payload: true });
      dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
      dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
      dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
      dispatch({ type: 'SET_MURDER_REVEAL', payload: null });
      dispatch({ type: 'SET_RECRUIT_INVITATION', payload: false });
      play('murder-blindfold.mp3');
    });

    socket.on('traitor_choices', (data) => {
      dispatch({ type: 'SET_BLINDFOLD', payload: false });
      dispatch({ type: 'SET_TRAITOR_CHOICES', payload: data });
      play('murder-blindfold.mp3');
    });

    socket.on('show_player_list', (data) => {
      dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
      dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: data });
    });

    socket.on('recruit_invitation', () => {
      dispatch({ type: 'SET_BLINDFOLD', payload: false });
      dispatch({ type: 'SET_RECRUIT_INVITATION', payload: true });
    });

    socket.on('recruit_result', (data) => {
      dispatch({ type: 'SET_RECRUIT_INVITATION', payload: false });
      dispatch({ type: 'SET_RECRUIT_RESULT', payload: data });
      play('murder-reveal.mp3');
    });

    socket.on('murder_reveal', (data) => {
      dispatch({ type: 'SET_BLINDFOLD', payload: false });
      dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
      dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
      dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
      dispatch({ type: 'SET_MURDER_REVEAL', payload: data });
      play('murder-reveal.mp3');
    });

    socket.on('decoy_question', () => {
      dispatch({ type: 'SET_BLINDFOLD', payload: false });
      dispatch({ type: 'SET_TRAITOR_CHOICES', payload: null });
      dispatch({ type: 'SET_SHOW_PLAYER_LIST', payload: null });
      dispatch({ type: 'SET_ARSENAL_RESULT', payload: null });
      dispatch({ type: 'SET_BANISHMENT_REVEAL', payload: null });
    });

    socket.on('game_over', (data) => {
      dispatch({ type: 'SET_GAME_OVER', payload: data });
      play('game-over.mp3');
    });

    socket.on('phase_started', (data) => {
      dispatch({ type: 'SET_PHASE_INTRO', payload: null });
      dispatch({ type: 'SET_IS_EVALUATION', payload: false });
      // Atualizar gameData com a nova fase
      dispatch({ type: 'SET_GAME_DATA', payload: { ...state.gameData, phase: data.phase, timer: data.timer, roundNumber: data.roundNumber } });

      if (data.phase === 'PHASE_2_BANISHMENT') play('banishment.mp3');
      else if (data.phase === 'PHASE_3_ARMOURY') play('arsenal.mp3');
      else play('mission.mp3');
    });

    // Limpeza
    return () => {
      socket.off('room_update');
      socket.off('game_started');
      // ... etc (todos os eventos)
    };
  }, [socket, play, state.gameData]);

  // Handlers para navegação
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

  // ... outros handlers (onVote, onTraitorChoice, etc.)

  // Context value
  const contextValue = {
    socket,
    connected,
    state,
    dispatch,
    isMuted,
    toggleMute,
    play,
    stop,
    handleRoomCreated,
    handleRoomJoined,
    handleTutorialClose,
    handleRoleRevealContinue,
    // ... passar outros handlers
  };

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
            <Lobby socket={socket} setPlayerName={(name) => {}} playerName="" onRoomCreated={handleRoomCreated} onRoomJoined={handleRoomJoined} />
          )}
          {connected && state.currentScreen === 'settings' && state.isHost && (
            <RoomSettings socket={socket} roomData={state.roomData} setRoomData={(data) => dispatch({ type: 'SET_ROOM_DATA', payload: data })} onBack={() => dispatch({ type: 'SET_SCREEN', payload: 'lobby' })} />
          )}
          {connected && state.currentScreen === 'waiting' && !state.isHost && (
            <WaitingRoom socket={socket} roomData={state.roomData} onBack={() => dispatch({ type: 'SET_SCREEN', payload: 'lobby' })} />
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
              onOpenHelp={(step) => dispatch({ type: 'SET_TUTORIAL', payload: { tutorialStep: step, isTutorialOverlay: true } })}
              socket={socket}
              phaseIntro={state.phaseIntro}
              banishmentReveal={state.banishmentReveal}
              playerId={socket.id}
              arsenalResult={state.arsenalResult}
              blindfold={state.blindfold}
              traitorChoices={state.traitorChoices}
              showPlayerList={state.showPlayerList}
              recruitInvitation={state.recruitInvitation}
              recruitResult={state.recruitResult}
              murderReveal={state.murderReveal}
              gameOver={state.gameOver}
              roomData={state.roomData}
              // ... passar todos os outros handlers necessários
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
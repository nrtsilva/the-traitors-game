import React, { useState, useEffect } from 'react';

import GameOverScreen from './phases/GameOverScreen';
import BanishmentRevealScreen from './phases/BanishmentRevealScreen';
import ArsenalResultScreen from './phases/ArsenalResultScreen';
import BlindfoldScreen from './phases/BlindfoldScreen';
import DecoyScreen from './phases/DecoyScreen';
import TraitorChoicesScreen from './phases/TraitorChoicesScreen';
import TraitorPlayerListScreen from './phases/TraitorPlayerListScreen';
import RecruitInvitationScreen from './phases/RecruitInvitationScreen';
import RecruitResultScreen from './phases/RecruitResultScreen';
import MurderRevealScreen from './phases/MurderRevealScreen';
import PhaseIntroScreen from './phases/PhaseIntroScreen';
import EvaluationScreen from './phases/EvaluationScreen';
import ArsenalPhase from './phases/ArsenalPhase';
import BanishmentVoteScreen from './phases/BanishmentVoteScreen';
import MissionPhase from './phases/MissionPhase';
import MissionOutcomeScreen from './phases/MissionOutcomeScreen';

export default function GameBoard({
  playerState,
  onOpenHelp,
  phaseIntro,
  isEvaluation,
  onReady,
  onEvaluation,
  onVote,
  banishmentReveal,
  arsenalResult,
  playerId,
  onEndMission,
  blindfold,
  onDecoyAnswer,
  traitorChoices,
  onTraitorChoice,
  showPlayerList,
  onTraitorMurder,
  onTraitorRecruit,
  recruitInvitation,
  onRecruitDecision,
  recruitResult,
  murderReveal,
  onContinueAfterReveal,
  gameOver,
  roomData,
  socket,
  onMissionValueSubmit,
  onArsenalResultSubmit,
  onMissionOutcome,
  missionOutcome,
}) {

  // Estado local para o timer (apenas UI)
  const [localTimer, setLocalTimer] = useState(playerState.timer || 0);
  const [intervalId, setIntervalId] = useState(null);

  // Sincronizar com o timer do servidor quando ele mudar
  useEffect(() => {
    if (playerState.timer !== undefined && playerState.timer !== null) {
      setLocalTimer(playerState.timer);
    }
  }, [playerState.timer]);

  // Decrementar o timer local a cada segundo
  useEffect(() => {
    // Só executa se estivermos na fase de missão e o timer for > 0
    if (playerState.phase === 'PHASE_1_MISSION' && localTimer > 0) {
      // Limpa intervalo anterior se existir
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      const id = setInterval(() => {
        setLocalTimer(prev => {
          if (prev <= 1) {
            clearInterval(id);
            setIntervalId(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIntervalId(id);
    } else {
      // Limpa o intervalo se não estiver na missão ou timer <= 0
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }

    // Cleanup ao desmontar
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    };
  }, [playerState.phase, localTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------- ECRÃS PRIORITÁRIOS --------------------

  // 1. Missão Outcome (resultado da missão) – prioridade alta
  if (missionOutcome) {
    return <MissionOutcomeScreen {...missionOutcome} />;
  }

  // 2. Fim de Jogo
  if (gameOver) {
    return <GameOverScreen gameOver={gameOver} />;
  }

  // 3. Revelação da Expulsão
  if (banishmentReveal) {
    return <BanishmentRevealScreen data={banishmentReveal} />;
  }

  // 4. Resultado do Arsenal
  if (arsenalResult) {
    return <ArsenalResultScreen result={arsenalResult} playerId={playerId} />;
  }

  // 5. Blindfold (Noite)
  if (blindfold) {
    return <BlindfoldScreen />;
  }

  // 6. Decoy (durante a noite, para não traidores)
  if (playerState.phase === 'PHASE_4_MURDER' && !traitorChoices && !recruitInvitation && !recruitResult && !murderReveal) {
    return <DecoyScreen onDecoyAnswer={onDecoyAnswer} />;
  }

  // 7. Escolhas do Traidor
  if (traitorChoices) {
    return <TraitorChoicesScreen choices={traitorChoices} onChoice={onTraitorChoice} />;
  }

  // 8. Lista de jogadores para o Traidor (assassinar ou recrutar)
  if (showPlayerList) {
    return (
      <TraitorPlayerListScreen
        players={playerState.players}
        type={showPlayerList.type}
        playerId={playerId}
        onSelect={showPlayerList.type === 'recruit' ? onTraitorRecruit : onTraitorMurder}
      />
    );
  }

  // 9. Convite para recrutamento
  if (recruitInvitation) {
    return <RecruitInvitationScreen onDecision={onRecruitDecision} />;
  }

  // 10. Resultado do recrutamento
  if (recruitResult) {
    return <RecruitResultScreen data={recruitResult} onContinue={onContinueAfterReveal} />;
  }

  // 11. Resultado do assassinato
  if (murderReveal) {
    return <MurderRevealScreen data={murderReveal} onContinue={onContinueAfterReveal} />;
  }

  // 12. Introdução de fase (inclui missão e arsenal)
  if (phaseIntro) {
    return (
      <PhaseIntroScreen
        data={phaseIntro}
        isTraitor={playerState.role === 'traitor'}
        onReady={onReady}
      />
    );
  }

  // 13. Avaliação da missão
  if (isEvaluation) {
    return <EvaluationScreen {...{ playerState, isTraitor: playerState.role === 'traitor', onEvaluation }} />;
  }

  // 14. Fase do Arsenal
  if (playerState.phase === 'PHASE_3_ARMOURY') {
    return <ArsenalPhase {...{ playerState, socket, roomData, onArsenalResultSubmit }} />;
  }

  // 15. Fase de Votação (Expulsão)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    return <BanishmentVoteScreen {...{ playerState, onVote, timer: playerState.timer }} />;
  }

  // 16. Missão (padrão) – passa todas as props necessárias
  // Aqui passamos o localTimer em vez do playerState.timer para o MissionPhase exibir
  const missionPlayerState = {
    ...playerState,
    timer: localTimer,
  };

  return (
    <MissionPhase
      playerState={missionPlayerState}
      currentMission={playerState.currentMission}
      onOpenHelp={onOpenHelp}
      onEndMission={onEndMission}
      onMissionValueSubmit={onMissionValueSubmit}
      onMissionOutcome={onMissionOutcome}
      socket={socket}
      roomData={roomData}
      playerId={playerId}
    />
  );
}
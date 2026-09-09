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
import FortuneRevealScreen from './phases/FortuneRevealScreen';

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
  showFortune,
  fortuneData,
  onFortuneContinue,
}) {
  // --- TIMER LOCAL PARA EXIBIÇÃO (apenas visual) ---
  const [displayTimer, setDisplayTimer] = useState(playerState.timer || 0);

  useEffect(() => {
    // Se fase for missão e timer for 0, usar timeLimit da missão
    if (playerState.phase === 'PHASE_1_MISSION') {
      let initialTimer = playerState.timer || 0;
      // Se o timer for 0, tentar usar o timeLimit da missão
      if (initialTimer === 0 && playerState.currentMission?.timeLimit) {
        initialTimer = playerState.currentMission.timeLimit;
      }
      setDisplayTimer(initialTimer);
      if (initialTimer > 0) {
        const interval = setInterval(() => {
          setDisplayTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(interval);
      }
    } else {
      // Para outras fases, usar o timer recebido
      setDisplayTimer(playerState.timer || 0);
    }
  }, [playerState.phase, playerState.timer, playerState.currentMission]);

  // -------------------- ECRÃS PRIORITÁRIOS --------------------

  // 0. Mostrar fortuna (prioridade máxima)
  if (showFortune && fortuneData) {
    return <FortuneRevealScreen {...fortuneData} onContinue={onFortuneContinue} />;
  }
  
  // 1. Missão Outcome (resultado da missão)
  if (missionOutcome) {
    // Preparar dados da fortuna para o ecrã de resultado
    const currentPlayer = playerState?.players?.find(p => p.id === playerId) || {};
    return (
      <MissionOutcomeScreen
        {...missionOutcome}
        playerName={currentPlayer.name || 'Jogador'}
        gold={currentPlayer.gold ?? 0}
        bars={currentPlayer.bars ?? 0}
        commonCoins={playerState?.prizeFund?.coins ?? 0}
        commonBars={playerState?.prizeFund?.bars ?? 0}
      />
    );
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

  // 8. Lista de jogadores para o Traidor
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

  // 12. Introdução de fase
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
    const voteTimer = displayTimer > 0 ? displayTimer : (playerState.timer || 0);
    return <BanishmentVoteScreen {...{ playerState, onVote, timer: voteTimer }} />;
  }

  // 16. Missão (padrão) – passa o timer visual
  return (
    <MissionPhase
      playerState={{
        ...playerState,
        timer: displayTimer, // Sobrescreve o timer com o visual
      }}
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
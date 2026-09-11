import React, { useState, useEffect, useRef } from 'react';
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
  const timerInitializedRef = useRef(null);

  // Extrair valores complexos para variáveis estáveis
  const missionId = playerState.currentMission?.id;
  const missionTimeLimit = playerState.currentMission?.timeLimit;
  const isTimerActive = displayTimer > 0;

  // Efeito 1: Inicializar o timer quando a missão muda
  useEffect(() => {
    if (playerState.phase === 'PHASE_1_MISSION') {
      const key = `${playerState.roundNumber}-${missionId}`;
      if (timerInitializedRef.current === key) return; // já inicializado
      timerInitializedRef.current = key;

      let initialTimer = playerState.timer || 0;
      if (initialTimer === 0 && missionTimeLimit) {
        initialTimer = missionTimeLimit;
      }
      setDisplayTimer(initialTimer);
    } else {
      timerInitializedRef.current = null;
      setDisplayTimer(playerState.timer || 0);
    }
  }, [playerState.phase, playerState.roundNumber, missionId, playerState.timer, missionTimeLimit]);

  // Efeito 2: Decrementar (só quando ativo)
  useEffect(() => {
    if (playerState.phase !== 'PHASE_1_MISSION') return;
    if (!isTimerActive) return;

    const interval = setInterval(() => {
      setDisplayTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [playerState.phase, isTimerActive]);

  // -------------------- ECRÃS PRIORITÁRIOS --------------------

  // 0. Mostrar fortuna (prioridade máxima)
  if (showFortune && fortuneData) {
    return <FortuneRevealScreen {...fortuneData} onContinue={onFortuneContinue} />;
  }

  // 1. Missão Outcome (resultado da missão)
  if (missionOutcome) {
    const currentPlayer = playerState?.players?.find((p) => p.id === playerId) || {};
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
  if (
    playerState.phase === 'PHASE_4_MURDER' &&
    !traitorChoices &&
    !recruitInvitation &&
    !recruitResult &&
    !murderReveal
  ) {
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
    return (
      <EvaluationScreen
        {...{ playerState, isTraitor: playerState.role === 'traitor', onEvaluation }}
      />
    );
  }

  // 14. Fase do Arsenal
  if (playerState.phase === 'PHASE_3_ARMOURY') {
    return (
      <ArsenalPhase
        {...{ playerState, socket, roomData, onArsenalResultSubmit, playerId }}
      />
    );
  }

  // 15. Fase de Votação (Expulsão)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    const voteTimer = displayTimer > 0 ? displayTimer : playerState.timer || 0;
    return <BanishmentVoteScreen {...{ playerState, onVote, timer: voteTimer }} />;
  }

  // 16. Missão (padrão) – passa o timer visual
  return (
    <MissionPhase
      playerState={{
        ...playerState,
        timer: displayTimer,
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
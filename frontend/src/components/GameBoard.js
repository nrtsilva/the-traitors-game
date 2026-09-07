import React from 'react';

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
  onMissionOutcome
}) {
  // Fim de Jogo
  if (gameOver) {
    return <GameOverScreen gameOver={gameOver} />;
  }

  // Revelação da Expulsão
  if (banishmentReveal) {
    return <BanishmentRevealScreen data={banishmentReveal} />;
  }

  // Resultado do Arsenal
  if (arsenalResult) {
    return <ArsenalResultScreen result={arsenalResult} playerId={playerId} />;
  }

  // Blindfold (Noite)
  if (blindfold) {
    return <BlindfoldScreen />;
  }

  // Decoy (durante a noite, para não traidores)
  if (playerState.phase === 'PHASE_4_MURDER' && !traitorChoices && !recruitInvitation && !recruitResult && !murderReveal) {
    return <DecoyScreen onDecoyAnswer={onDecoyAnswer} />;
  }

  // Escolhas do Traidor
  if (traitorChoices) {
    return <TraitorChoicesScreen choices={traitorChoices} onChoice={onTraitorChoice} />;
  }

  // Lista de jogadores para o Traidor (assassinar ou recrutar)
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

  // Convite para recrutamento
  if (recruitInvitation) {
    return <RecruitInvitationScreen onDecision={onRecruitDecision} />;
  }

  // Resultado do recrutamento
  if (recruitResult) {
    return <RecruitResultScreen data={recruitResult} onContinue={onContinueAfterReveal} />;
  }

  // Resultado do assassinato
  if (murderReveal) {
    return <MurderRevealScreen data={murderReveal} onContinue={onContinueAfterReveal} />;
  }

  // Introdução de fase
  if (phaseIntro) {
    return (
      <PhaseIntroScreen
        data={phaseIntro}
        isTraitor={playerState.role === 'traitor'}
        onReady={onReady}
      />
    );
  }

  // Avaliação da missão
  if (isEvaluation) {
    return <EvaluationScreen {...{ playerState, isTraitor: playerState.role === 'traitor', onEvaluation }} />;
  }

  // Fase do Arsenal
  if (playerState.phase === 'PHASE_3_ARMOURY') {
    return <ArsenalPhase {...{ playerState, socket, roomData, onArsenalResultSubmit }} />;
  }

  // Fase de Votação (Expulsão)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    return <BanishmentVoteScreen {...{ playerState, onVote, timer: playerState.timer }} />;
  }

  // Missão (padrão) – passa todas as props necessárias
  return (
    <MissionPhase
      playerState={playerState}
      onOpenHelp={onOpenHelp}
      onEndMission={onEndMission}
      onMissionValueSubmit={onMissionValueSubmit}
      onMissionOutcome={onMissionOutcome}
      socket={socket}
      roomData={roomData}
    />
  );
}
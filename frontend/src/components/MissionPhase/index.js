import React, { useState } from 'react';
import MissionCollaborativeDrawing from './MissionCollaborativeDrawing';
import MissionNumberInput from './MissionNumberInput';
import MissionDefault from './MissionDefault';

export default function MissionPhase(props) {
  const { playerState, onOpenHelp, onEndMission, onMissionValueSubmit, onMissionOutcome } = props;
  const mission = playerState.currentMission;

  // Renderiza o conteúdo específico da missão
  let missionContent = null;
  if (mission.type === 'COLLABORATIVE_DRAWING') {
    missionContent = <MissionCollaborativeDrawing {...props} />;
  } else if (mission.requiresNumberInput) {
    missionContent = <MissionNumberInput {...props} />;
  } else if (['WORD_GUESSER', 'PHYSICAL_OBJECT_HUNT', 'TEAM_ESTIMATION', 'PRICE_GUESS', 'NUMBER_GUESS', 'MEMORY_GAME', 'CATEGORY_GAME', 'TIMER_GUESS', 'FORBIDDEN_WORD', 'REMOTE_QUIZ', 'CODE_BREAKING', 'SOUND_GUESS', 'NAME_GAME', 'IMAGE_SEARCH', 'MAP_SEARCH', 'PHOTO_UPLOAD', 'STORY_BUILDING', 'SYNC_ANSWER', 'SYNC_ACTION', 'CHAT_ARGUMENT', 'DIGITAL_DRAWING', 'WHO_AM_I', 'YES_NO_GAME', 'GESTURE_GAME', 'ANONYMOUS_ANSWER', 'TRUTH_OR_LIE', 'SABOTAGE_BUILD', 'NO_LAUGH', 'ACCURACY_GAME', 'PHYSICAL_ACTION', 'RANKING'].includes(mission.type)) {
    missionContent = <MissionDefault {...props} />;
  } else {
    missionContent = <div className="text-center"><p className="text-white">Tipo de missão não suportado.</p></div>;
  }

  return (
    <div className="relative">
      <button onClick={() => onOpenHelp(0)} className="absolute top-0 right-4 text-3xl text-[#E5C982]">?</button>

      {/* TESOURO COMUM E VALOR EM JOGO */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 mb-6 flex justify-center items-center gap-8 shadow-soft">
        <div className="text-center">
          <span className="text-3xl">💰</span>
          <div className="text-2xl font-bold text-[#E5C982]">{playerState.prizeFund?.coins || 0} Moedas</div>
          <div className="text-xs text-[#F3EBDD]/60">Acumulado no Tesouro</div>
        </div>
        <div className="w-px h-10 bg-[#D8B66C]/30"></div>
        <div className="text-center">
          <span className="text-3xl">🏆</span>
          <div className="text-2xl font-bold text-[#E5C982]">{playerState.prizeFund?.bars || 0} Barras</div>
          <div className="text-xs text-[#F3EBDD]/60">Barras</div>
        </div>
        <div className="w-px h-10 bg-[#D8B66C]/30"></div>
        <div className="text-center">
          <span className="text-3xl">⚔️</span>
          <div className="text-2xl font-bold text-[#D8B66C]">{playerState.reward || "Variável"}</div>
          <div className="text-xs text-[#F3EBDD]/60">Valor em Jogo</div>
        </div>
      </div>

      {/* TIMER EM DESTAQUE */}
      <div className="text-center mb-8">
        <div className="inline-block bg-[#D8B66C] text-[#291923] font-display text-5xl font-bold px-10 py-4 rounded-lg shadow-soft">
          {playerState.timer || 0}s
        </div>
        <p className="text-white mt-2">Tempo restante</p>
      </div>

      {/* Missão */}
      <div className="bg-[#291923] border border-[#D8B66C] p-8 rounded-md">
        <h2 className="font-display text-3xl font-bold text-[#E5C982] mb-4 text-center">{mission.title}</h2>
        <p className="text-[#F3EBDD] text-lg mb-8 text-center">{mission.description}</p>
        {missionContent}
      </div>
    </div>
  );
}
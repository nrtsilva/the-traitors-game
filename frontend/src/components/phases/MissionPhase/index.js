import React, { useState } from 'react';
import MissionCollaborativeDrawing from './MissionCollaborativeDrawing';
import MissionNumberInput from './MissionNumberInput';
import MissionDefault from './MissionDefault';
import MissionDescription from '../../MissionDescription';
import MissionEmojiCount from './MissionEmojiCount';
import MissionSilentMime from './MissionSilentMime';
import MissionTicoTecoTaco from './MissionTicoTecoTaco';
import MissionMostSuspect from './MissionMostSuspect';

export default function MissionPhase(props) {
  const { 
    playerState, 
    playerId,
    currentMission: missionFromProp
  } = props;

  const mission = missionFromProp || playerState?.currentMission;
  const [isTreasureOpen, setIsTreasureOpen] = useState(false);

  if (!mission) {
    return <div className="text-center"><p className="text-[#F3EBDD]">A carregar missão...</p></div>;
  }

  let missionContent = null;
  if (mission.type === 'COLLABORATIVE_DRAWING') {
    missionContent = <MissionCollaborativeDrawing {...props} playerId={playerId} />;
  } else if (mission.type === 'MOST_SUSPECT') {
    missionContent = <MissionMostSuspect {...props} playerId={playerId} />;
  } else if (mission.requiresNumberInput) {
    missionContent = <MissionNumberInput {...props} />;
  } else if (['WORD_GUESSER', 'PHYSICAL_OBJECT_HUNT', 'TEAM_ESTIMATION', 'PRICE_GUESS', 'NUMBER_GUESS', 'MEMORY_GAME', 'CATEGORY_GAME', 'TIMER_GUESS', 'FORBIDDEN_WORD', 'REMOTE_QUIZ', 'CODE_BREAKING', 'SOUND_GUESS', 'NAME_GAME', 'IMAGE_SEARCH', 'MAP_SEARCH', 'PHOTO_UPLOAD', 'STORY_BUILDING', 'SYNC_ANSWER', 'SYNC_ACTION', 'CHAT_ARGUMENT', 'DIGITAL_DRAWING', 'WHO_AM_I', 'YES_NO_GAME', 'GESTURE_GAME', 'ANONYMOUS_ANSWER', 'TRUTH_OR_LIE', 'SABOTAGE_BUILD', 'NO_LAUGH', 'ACCURACY_GAME', 'PHYSICAL_ACTION', 'RANKING'].includes(mission.type)) {
    missionContent = <MissionDefault {...props} />;
  } else if (mission.type === 'EMOJI_COUNT') {
    missionContent = <MissionEmojiCount {...props} />;
  } else if (mission.type === 'SILENT_MIME') {
    missionContent = <MissionSilentMime {...props} playerId={playerId} />;
  } else if (mission.type === 'TICO_TECO_TACO') {
    missionContent = <MissionTicoTecoTaco {...props} playerId={playerId} />;
  } else {
    missionContent = <div className="text-center"><p className="text-white">Tipo de missão não suportado.</p></div>;
  }

  return (
    <div className="relative">
      <div className="mb-6">
        <button
          onClick={() => setIsTreasureOpen(!isTreasureOpen)}
          className="w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-3 flex justify-between items-center hover:border-[#E5C982] transition"
        >
          <span className="text-[#F3EBDD] font-display text-sm uppercase tracking-widest">
            🪙 Prémio Total
          </span>
          <span className="text-[#D8B66C] text-xl">
            {isTreasureOpen ? '▲' : '▼'}
          </span>
        </button>

        {isTreasureOpen && (
          <div className="bg-[#291923] border-2 border-t-0 border-[#D8B66C] rounded-b-lg p-4 flex justify-center items-center gap-8 shadow-soft">
            <div className="text-center">
              <span className="text-3xl">🪙</span>
              <div className="text-2xl font-bold text-[#E5C982]">{playerState.prizeFund?.coins || 0} Moedas</div>
            </div>
            <div className="w-px h-10 bg-[#D8B66C]/30"></div>
            <div className="text-center">
              <span className="text-3xl">🟨</span>
              <div className="text-2xl font-bold text-[#E5C982]">{playerState.prizeFund?.bars || 0} Barras</div>
              <div className="text-xs text-[#F3EBDD]/60">(1 Barra = 5 Moedas)</div>
            </div>
          </div>
        )}
      </div>

      {/* VALOR EM JOGO – sempre visível */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 mb-4 flex justify-center items-center shadow-soft">
        <div className="text-center">
          <span className="text-3xl">⚔️</span>
          <div className="text-2xl font-bold text-[#D8B66C]">{playerState.reward || "Variável"}</div>
          <div className="text-xs text-[#F3EBDD]/60">Valor em Jogo</div>
        </div>
      </div>

      {/* TIMER EM DESTAQUE (só aparece se a missão tiver tempo definido) */}
      {playerState.timer > 0 && (
        <div className="text-center mb-8">
          <div className="inline-block relative">
            <div className="w-24 h-24 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923] shadow-lg">
              <span className="font-display text-4xl font-bold text-[#D8B66C]">
                {playerState.timer}
              </span>
            </div>
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-[#F3EBDD]/60 uppercase tracking-widest">
              Tempo
            </span>
          </div>
        </div>
      )}

      {/* CARD DA MISSÃO */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
        
        <h2 className="font-display text-4xl font-bold text-[#E5C982] mb-2 text-center tracking-widest">
          {mission.title}
        </h2>
        <div className="w-24 h-0.5 bg-[#D8B66C] mx-auto mb-6"></div>

        <div className="text-[#F3EBDD] text-lg mb-8">
          <MissionDescription description={mission.description} />
        </div>

        <div className="mt-6">
          {missionContent}
        </div>
      </div>
    </div>
  );
}
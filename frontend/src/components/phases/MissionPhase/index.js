import React from 'react';
import MissionCollaborativeDrawing from './MissionCollaborativeDrawing';
import MissionNumberInput from './MissionNumberInput';
import MissionDefault from './MissionDefault';
import MissionDescription from '../../MissionDescription';
import MissionCategoryChoice from './MissionCategoryChoice';

export default function MissionPhase(props) {
  const { 
    playerState, 
    onOpenHelp, 
    socket,
    roomData,
    playerId
  } = props;

  const mission = playerState.currentMission;
  const isTraitor = playerState.role === 'traitor';

  // Renderiza o conteúdo específico da missão
  let missionContent = null;
  
  if (mission.type === 'CATEGORY_CHOICE') {
    missionContent = (
      <MissionCategoryChoice 
        {...props} 
        onCategorySubmit={(choice) => {
          if (socket && roomData) {
            socket.emit('submit_category_choice', { 
              roomCode: roomData.roomCode, 
              choice 
            });
          }
        }} 
      />
    );
  } else if (mission.type === 'COLLABORATIVE_DRAWING') {
    missionContent = <MissionCollaborativeDrawing {...props} playerId={playerId} />;
  } else if (mission.requiresNumberInput) {
    missionContent = <MissionNumberInput {...props} />;
  } else if (['WORD_GUESSER', 'PHYSICAL_OBJECT_HUNT', 'TEAM_ESTIMATION', 'PRICE_GUESS', 'NUMBER_GUESS', 'MEMORY_GAME', 'CATEGORY_GAME', 'TIMER_GUESS', 'FORBIDDEN_WORD', 'REMOTE_QUIZ', 'CODE_BREAKING', 'SOUND_GUESS', 'NAME_GAME', 'IMAGE_SEARCH', 'MAP_SEARCH', 'PHOTO_UPLOAD', 'STORY_BUILDING', 'SYNC_ANSWER', 'SYNC_ACTION', 'CHAT_ARGUMENT', 'DIGITAL_DRAWING', 'WHO_AM_I', 'YES_NO_GAME', 'GESTURE_GAME', 'ANONYMOUS_ANSWER', 'TRUTH_OR_LIE', 'SABOTAGE_BUILD', 'NO_LAUGH', 'ACCURACY_GAME', 'PHYSICAL_ACTION', 'RANKING'].includes(mission.type)) {
    missionContent = <MissionDefault {...props} />;
  } else {
    missionContent = <div className="text-center"><p className="text-white">Tipo de missão não suportado.</p></div>;
  }

  // Obtém a tarefa secreta do traidor (se houver)
  const secretMission = isTraitor && playerState.secretMissions && playerState.secretMissions.length > 0 
    ? playerState.secretMissions[0] 
    : null;

  return (
    <div className="relative">
      {/* Botão de ajuda */}
      <button 
        onClick={() => onOpenHelp(0)} 
        className="absolute top-0 right-4 text-3xl text-[#E5C982] hover:text-[#D8B66C] transition-colors z-10"
        title="Ajuda"
      >
        ?
      </button>

      {/* TESOURO COMUM E VALOR EM JOGO - mantido igual */}
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

      {/* TIMER EM DESTAQUE - versão circular melhorada */}
      <div className="text-center mb-8">
        <div className="inline-block relative">
          <div className="w-24 h-24 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923] shadow-lg">
            <span className="font-display text-4xl font-bold text-[#D8B66C]">
              {playerState.timer || 0}
            </span>
          </div>
          <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-[#F3EBDD]/60 uppercase tracking-widest">
            Tempo
          </span>
        </div>
      </div>

      {/* CARD DA MISSÃO - com efeito de pergaminho e borda decorativa */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 shadow-2xl relative overflow-hidden">
        {/* Linha decorativa superior */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
        
        {/* Título com separador */}
        <h2 className="font-display text-4xl font-bold text-[#E5C982] mb-2 text-center tracking-widest">
          {mission.title}
        </h2>
        <div className="w-24 h-0.5 bg-[#D8B66C] mx-auto mb-6"></div>

        {/* Descrição da missão (formatada pelo MissionDescription) */}
        <div className="text-[#F3EBDD] text-lg mb-8">
          <MissionDescription description={mission.description} />
        </div>

        {/* TAREFA SECRETA DO TRAIDOR - badge com ícone e borda dourada */}
        {secretMission && (
          <div className="mt-6 p-4 border border-[#D8B66C] rounded-lg bg-[#291923]/80 shadow-inner">
            <div className="flex items-center gap-3 text-[#E5C982]">
              <span className="text-2xl">🔮</span>
              <span className="font-display tracking-wider text-sm uppercase">Tarefa Secreta</span>
            </div>
            <p className="text-[#F3EBDD] mt-2 text-sm italic">
              {secretMission}
            </p>
          </div>
        )}

        {/* Conteúdo específico da missão (botões, inputs, etc.) */}
        <div className="mt-6">
          {missionContent}
        </div>
      </div>
    </div>
  );
}
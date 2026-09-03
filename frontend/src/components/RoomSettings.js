import React from 'react';

export default function RoomSettings({ socket, roomData, setRoomData, onBack }) {
  const settings = roomData.settings;

  const updateSetting = (key, value) => {
      const newSettings = { ...settings, [key]: value };
      setRoomData({ ...roomData, settings: newSettings });
      socket.emit('update_settings', { roomCode: roomData.roomCode, newSettings }, (response) => {
          if (response && !response.success) {
              console.log(response.message);
          }
      });
  };

  const handleStart = () => {
    socket.emit('start_game', { roomCode: roomData.roomCode }, (response) => {
      if (!response.success) alert(response.message);
    });
  };

  return (
    <div className="w-full max-w-lg bg-[#291923] p-8 rounded-md gold-border-3 shadow-soft slow-reveal">
      <div className="text-center mb-8 border-b border-[#D8B66C]/50 pb-6">
        <h2 className="font-display text-3xl tracking-widest text-[#E5C982]">CONFIGURAÇÕES</h2>
        <p className="text-sm text-[#F3EBDD]/70 mt-2">Código da Sala: <span className="font-bold text-[#D8B66C] tracking-widest">{roomData.roomCode}</span></p>
      </div>

      <div className="space-y-6">
        {/* DESTAQUE: TIPO DE JOGO (Presencial vs Remoto) */}
        <div className="bg-[#291923] p-6 rounded-sm border-2 border-[#E5C982] mb-6 shadow-lg">
          <label className="block text-xl font-display font-bold mb-2 text-[#E5C982] text-center tracking-widest">
            ONDE ESTÃO OS JOGADORES?
          </label>
          <p className="text-sm text-[#F3EBDD]/70 mb-4 text-center">
            Isto determina o tipo de missões que serão geradas.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => updateSetting('gameMode', 'in_person')}
              className={`flex-1 p-4 rounded-sm font-bold transition border-2 ${
                settings.gameMode === 'in_person' 
                  ? 'bg-[#D8B66C] text-[#291923] border-[#E5C982]' 
                  : 'bg-[#412734] text-[#F3EBDD] border-[#D8B66C]/30 hover:border-[#D8B66C]'
              }`}
            >
              <div className="text-3xl mb-2">🏠</div>
              <div className="text-lg">Presencial</div>
              <div className="text-xs font-normal mt-1 opacity-80">Mesmo espaço físico<br/>(Missões de objetos e cores)</div>
            </button>

            <button
              onClick={() => updateSetting('gameMode', 'remote')}
              className={`flex-1 p-4 rounded-sm font-bold transition border-2 ${
                settings.gameMode === 'remote' 
                  ? 'bg-[#D8B66C] text-[#291923] border-[#E5C982]' 
                  : 'bg-[#412734] text-[#F3EBDD] border-[#D8B66C]/30 hover:border-[#D8B66C]'
              }`}
            >
              <div className="text-3xl mb-2">💻</div>
              <div className="text-lg">Remoto</div>
              <div className="text-xs font-normal mt-1 opacity-80">Jogadores à distância<br/>(Missões digitais e de conhecimento)</div>
            </button>
          </div>
          
          {/* Texto dinâmico de aviso */}
          <div className="mt-4 p-3 bg-[#412734] border border-[#D8B66C]/30 rounded-sm text-center">
            <span className="text-[#E5C982] font-bold uppercase tracking-wider text-sm">
              {settings.gameMode === 'in_person' ? '⚠️ Missões Físicas Ativas' : '🌐 Missões Digitais Ativas'}
            </span>
          </div>
        </div>
        {/* Nº de Jogadores */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <div className="flex justify-between mb-2">
            <label className="text-[#F3EBDD]">Número de Jogadores</label>
            <span className="font-bold text-[#D8B66C]">{settings.maxPlayers}</span>
          </div>
          <input 
            type="range" min="2" max="10" 
            value={settings.maxPlayers} 
            onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
            className="w-full accent-[#D8B66C]" 
          />
        </div>

        {/* Nº de Traidores */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30 flex justify-between items-center">
          <label className="text-[#F3EBDD]">Número de Traidores</label>
          <div className="flex gap-2">
            {[1, 2].map(num => (
              <button 
                key={num}
                onClick={() => updateSetting('numTraitors', num)}
                className={`px-4 py-2 rounded-sm font-bold transition ${settings.numTraitors === num ? 'bg-[#D8B66C] text-[#291923]' : 'bg-[#412734] text-[#F3EBDD] border border-[#D8B66C]/30'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Opções Toggle */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { key: 'sabotageActive', label: 'Traidor pode sabotar' },
            { key: 'recruitingActive', label: 'Traidor pode recrutar' },
            { key: 'banishedLoseGold', label: 'Banidos perdem 2 ouro' },
            { key: 'eliminatedAsSpectator', label: 'Eliminados ficam como espectadores' },
          ].map((opt) => (
            <div key={opt.key} className="flex justify-between items-center bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
              <span className="text-[#F3EBDD]">{opt.label}</span>
              <button 
                onClick={() => updateSetting(opt.key, !settings[opt.key])}
                className={`w-14 h-7 rounded-full p-1 transition ${settings[opt.key] ? 'bg-[#D8B66C]' : 'bg-[#412734] border border-[#D8B66C]/50'}`}
              >
                <div className={`w-5 h-5 bg-[#F3EBDD] rounded-full shadow-md transform transition ${settings[opt.key] ? 'translate-x-7' : ''}`}></div>
              </button>
            </div>
          ))}
        </div>

        {/* Tempo de Debate */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <label className="block mb-2 text-[#F3EBDD]">Tempo de Debate (Expulsão)</label>
          <select 
            value={settings.debateTime} 
            onChange={(e) => updateSetting('debateTime', e.target.value)}
            className="w-full p-2 bg-[#291923] border border-[#D8B66C]/50 text-[#F3EBDD] rounded-sm focus:outline-none focus:border-[#E5C982]"
          >
            <option value="0">Ilimitado</option>
            <option value="60">60 Segundos</option>
            <option value="90">90 Segundos</option>
            <option value="120">120 Segundos</option>
          </select>
        </div>

      </div>

      <div className="mt-8 flex gap-4 pt-6 border-t border-[#D8B66C]/50">
        <button 
          onClick={onBack}
          className="flex-1 py-3 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] rounded-sm hover:bg-[#291923] transition"
        >
          Voltar
        </button>
        <button 
          onClick={handleStart}
          className="flex-1 py-3 bg-[#D8B66C] text-[#291923] rounded-sm font-bold text-lg hover:bg-[#E5C982] transition shadow-soft"
        >
          INICIAR JOGO
        </button>
      </div>
    </div>
  );
}
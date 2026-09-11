import React, { useState } from 'react';
import RoundTable from './RoundTable';

export default function RoomSettings({ socket, roomData, setRoomData, onBack }) {
  const settings = roomData.settings;
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setRoomData({ ...roomData, settings: newSettings });
    socket.emit('update_settings', { roomCode: roomData.roomCode, newSettings });
  };

  const handleStart = () => {
    socket.emit('start_game', { roomCode: roomData.roomCode }, (response) => {
      if (!response.success) {
        setErrorMessage(response.message);
      } else {
        setErrorMessage('');
      }
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomData.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback para browsers antigos
      const textarea = document.createElement('textarea');
      textarea.value = roomData.roomCode;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Erro ao copiar:', e);
      }
      document.body.removeChild(textarea);
    }
  };

  const isInPerson = settings.gameMode === 'in_person';
  // Mostrar secção de traidores apenas a partir de 8 jogadores
  const showTraitorsSection = (settings.maxPlayers || 6) >= 8;

  return (
    <div className="w-full max-w-lg bg-[#291923] p-8 rounded-md gold-border-3 shadow-soft slow-reveal">
      {/* ====== CABEÇALHO ====== */}
      <div className="text-center mb-6 border-b border-[#D8B66C]/50 pb-4">
        <h2 className="font-display text-3xl tracking-widest text-[#E5C982]">
          CONFIGURAÇÕES
        </h2>

        {/* Código da Sala com botão de copiar discreto */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <p className="font-ui text-sm text-[#F3EBDD]/70 tracking-widest">
            Código da Sala:{' '}
            <span className="font-bold text-[#D8B66C] tracking-[0.3em]">
              {roomData.roomCode}
            </span>
          </p>
          <button
            onClick={handleCopyCode}
            className={`text-base transition-all duration-200 ${
              copied
                ? 'text-green-400 scale-110'
                : 'text-[#D8B66C]/40 hover:text-[#E5C982] hover:scale-110'
            }`}
            title={copied ? 'Copiado!' : 'Copiar código'}
          >
            {copied ? '✓' : '⧉'}
          </button>
        </div>
      </div>

      {/* ====== MESA REDONDA ANIMADA ====== */}
      <div className="mb-6">
        <RoundTable
          players={roomData.players}
          maxPlayers={settings.maxPlayers || 6}
          hostId={roomData.hostId || roomData.players[0]?.id}
        />

        <div className="text-center mt-4">
          <p className="text-[#F3EBDD]/70 text-sm font-ui">
            <span className="text-[#D8B66C] font-bold text-lg">{roomData.players.length}</span>
            {' / '}
            <span className="text-[#F3EBDD]">{settings.maxPlayers || 6}</span>
            {' '}jogadores na sala
          </p>
          {roomData.players.length < (settings.maxPlayers || 6) && (
            <p className="text-[#D8B66C]/70 text-xs mt-1 animate-pulse">
              A aguardar mais jogadores...
            </p>
          )}
          {roomData.players.length >= (settings.maxPlayers || 6) && (
            <p className="text-[#E5C982] text-xs mt-1 font-bold">
              ✅ Sala cheia! Podes iniciar o jogo.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6 font-ui">
        {/* ====== Nº DE JOGADORES ====== */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <div className="flex justify-between mb-2">
            <label className="text-[#F3EBDD] font-semibold uppercase tracking-widest text-sm">
              Número de Jogadores
            </label>
            <span className="font-bold text-[#D8B66C] text-lg">{settings.maxPlayers}</span>
          </div>
          <input
            type="range"
            min="4"
            max="10"
            value={settings.maxPlayers}
            onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
            className="w-full accent-[#D8B66C]"
          />
          <p className="text-xs text-[#F3EBDD]/50 mt-2">
            A mesa redonda ajusta-se automaticamente ao número de jogadores.
          </p>
        </div>

        {/* ====== PRESENCIAL vs REMOTO (SLIDER) ====== */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <div className="flex justify-between items-center mb-3">
            <label className="text-[#F3EBDD] font-semibold uppercase tracking-widest text-sm">
              Modo de Jogo
            </label>
            <span className={`font-bold text-lg transition ${isInPerson ? 'text-[#D8B66C]' : 'text-[#E5C982]'}`}>
              {isInPerson ? '🏠 Presencial' : '💻 Remoto'}
            </span>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="1"
              value={isInPerson ? 0 : 1}
              onChange={(e) =>
                updateSetting('gameMode', parseInt(e.target.value) === 0 ? 'in_person' : 'remote')
              }
              className="w-full accent-[#D8B66C] cursor-pointer"
            />
          </div>

          <div className="flex justify-between mt-1 text-xs">
            <span className={`transition ${isInPerson ? 'text-[#D8B66C] font-bold' : 'text-[#F3EBDD]/50'}`}>
              🏠 Presencial
            </span>
            <span className={`transition ${!isInPerson ? 'text-[#D8B66C] font-bold' : 'text-[#F3EBDD]/50'}`}>
              💻 Remoto
            </span>
          </div>

          <p className="text-xs text-[#F3EBDD]/50 mt-3 text-center">
            {isInPerson
              ? 'Todos no mesmo espaço físico (missões presenciais).'
              : 'Jogadores em locais diferentes (missões remotas).'}
          </p>
        </div>

        {/* ====== Nº DE TRAIDORES (só a partir de 8 jogadores) ====== */}
        {showTraitorsSection && (
          <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30 flex justify-between items-center">
            <div>
              <label className="text-[#F3EBDD] font-semibold uppercase tracking-widest text-sm">
                Número de Traidores
              </label>
              <p className="text-[#F3EBDD]/50 text-xs mt-1">
                Podes escolher entre 1 ou 2 traidores para este jogo.
              </p>
            </div>
            <div className="flex gap-2">
              {[1, 2].map((num) => (
                <button
                  key={num}
                  onClick={() => updateSetting('numTraitors', num)}
                  className={`px-5 py-2 rounded-sm font-bold transition ${
                    settings.numTraitors === num
                      ? 'bg-[#D8B66C] text-[#291923]'
                      : 'bg-[#412734] text-[#F3EBDD] border border-[#D8B66C]/30'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== Nº DE FASES ====== */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <div className="flex justify-between mb-2">
            <label className="text-[#F3EBDD] font-semibold uppercase tracking-widest text-sm">
              Nº de Fases da Aventura
            </label>
            <span className="font-bold text-[#D8B66C] text-lg">{settings.numPhases || 2}</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            value={settings.numPhases || 2}
            onChange={(e) => updateSetting('numPhases', parseInt(e.target.value))}
            className="w-full accent-[#D8B66C]"
          />
          <p className="text-xs text-[#F3EBDD]/50 mt-2">
            Missão → Mesa Redonda → Arsenal → Conclave
          </p>
        </div>

        {/* ====== OPÇÕES TOGGLE ====== */}
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              key: 'recruitingActive',
              label: 'Traidor pode recrutar (apenas 8+)',
              disabled: settings.maxPlayers < 8,
            },
            {
              key: 'eliminatedAsSpectator',
              label: 'Eliminados ficam como espectadores',
            },
            {
              key: 'soundEffects',
              label: 'Efeitos Sonoros',
            },
          ].map((opt) => (
            <div
              key={opt.key}
              className="flex justify-between items-center bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30"
            >
              <span
                className={`text-[#F3EBDD] font-medium text-sm uppercase tracking-wider ${
                  opt.disabled ? 'opacity-50' : ''
                }`}
              >
                {opt.label}
              </span>
              <button
                onClick={() => updateSetting(opt.key, !settings[opt.key])}
                disabled={opt.disabled}
                className={`w-14 h-7 rounded-full p-1 transition ${
                  settings[opt.key] ? 'bg-[#D8B66C]' : 'bg-[#412734] border border-[#D8B66C]/50'
                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-5 h-5 bg-[#F3EBDD] rounded-full shadow-md transform transition ${
                    settings[opt.key] ? 'translate-x-7' : ''
                  }`}
                ></div>
              </button>
            </div>
          ))}
        </div>

        {/* ====== TEMPO DE DEBATE ====== */}
        <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30">
          <label className="block mb-3 text-[#F3EBDD] font-semibold uppercase tracking-widest text-sm">
            Tempo de Debate (Mesa Redonda)
          </label>
          <select
            value={settings.debateTime}
            onChange={(e) => updateSetting('debateTime', e.target.value)}
            className="w-full p-3 bg-[#291923] border border-[#D8B66C]/50 text-[#F3EBDD] rounded-sm focus:outline-none focus:border-[#E5C982]"
          >
            <option value="0">Ilimitado</option>
            <option value="60">60 Segundos</option>
            <option value="90">90 Segundos</option>
            <option value="120">120 Segundos</option>
          </select>
        </div>
      </div>

      {/* ====== MENSAGEM DE ERRO ====== */}
      {errorMessage && (
        <div className="mt-6 p-4 bg-red-900/40 border border-red-500 rounded-sm text-center">
          <p className="text-red-300 font-bold">{errorMessage}</p>
        </div>
      )}

      {/* ====== BOTÕES ====== */}
      <div className="mt-8 flex gap-4 pt-6 border-t border-[#D8B66C]/50">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] font-ui font-semibold uppercase tracking-widest text-sm rounded-sm hover:bg-[#291923] transition"
        >
          Voltar
        </button>
        <button
          onClick={handleStart}
          className="flex-1 py-3 bg-[#D8B66C] text-[#291923] font-ui font-bold uppercase tracking-widest text-sm rounded-sm hover:bg-[#E5C982] transition shadow-soft"
        >
          Iniciar Jogo
        </button>
      </div>
    </div>
  );
}
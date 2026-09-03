import React, { useState } from 'react';
import logo from '../images/logo.svg'; // Confirme que importa o seu logo aqui

export default function Lobby({ socket, playerName, setPlayerName, onRoomCreated, onRoomJoined }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) return setError("Insira o seu nome");
    socket.emit('create_room', { playerName }, (response) => {
      if (response.success) onRoomCreated(response);
      else setError(response.message);
    });
  };

  const handleJoin = () => {
    if (!playerName.trim()) return setError("Insira o seu nome");
    if (!roomCode.trim()) return setError("Insira o código da sala");
    socket.emit('join_room', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
      if (response.success) onRoomJoined(response);
      else setError(response.message);
    });
  };

  return (
    <div className="w-full max-w-md bg-[#291923] p-10 rounded-md gold-border-2 shadow-soft slow-reveal">
      
      {/* Emblema / Logo */}
      <div className="flex justify-center mb-8 emblema-appear">
        <img src={logo} alt="Emblema do jogo" className="w-49 h-auto mx-auto" />
      </div>

      <div className="space-y-8">
        
        {/* Input do Nome (Mudança para Montserrat UI) */}
        <div className="font-ui">
          <label className="block text-xs font-semibold mb-2 text-[#F3EBDD]/80 uppercase tracking-[0.2em]">Revela a tua identidade</label>
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-4 bg-[#291923] border border-[#D8B66C]/50 text-[#F3EBDD] font-medium rounded-sm focus:outline-none focus:border-[#E5C982] placeholder-[#F3EBDD]/40"
            placeholder="O teu nome na mansão"
          />
        </div>

        {error && <p className="text-red-400 text-sm font-ui font-semibold uppercase tracking-widest">{error}</p>}

        {/* Botão Criar Sala */}
        <button 
          onClick={handleCreate}
          className="w-full py-4 bg-[#D8B66C] text-[#291923] font-ui font-bold text-lg uppercase tracking-[0.2em] rounded-sm hover:bg-[#E5C982] transition duration-300"
        >
          Criar Sala
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[#D8B66C]/50"></div>
          <span className="px-4 text-xs font-ui text-[#F3EBDD]/70 tracking-[0.2em]">OU</span>
          <div className="flex-grow border-t border-[#D8B66C]/50"></div>
        </div>

        {/* Input do Código da Sala (Mudança para Montserrat UI) */}
        <div className="font-ui">
          <label className="block text-xs font-semibold mb-2 text-[#F3EBDD]/80 uppercase tracking-[0.2em]">Código da Sala</label>
          <input 
            type="text" 
            value={roomCode} 
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full p-4 bg-[#291923] border border-[#D8B66C]/50 text-[#E5C982] font-bold text-center tracking-[0.4em] rounded-sm focus:outline-none focus:border-[#E5C982] placeholder-[#F3EBDD]/40"
            placeholder="XXXXXX"
            maxLength={6}
          />
        </div>

        {/* Botão Entrar na Sala */}
        <button 
          onClick={handleJoin}
          className="w-full py-4 bg-transparent border border-[#D8B66C] text-[#E5C982] font-ui font-bold text-lg uppercase tracking-[0.2em] rounded-sm hover:bg-[#D8B66C] hover:text-[#291923] transition duration-300"
        >
          Entrar na Sala
        </button>

      </div>
    </div>
  );
}
import React, { useState } from 'react';
import logo from '../images/logo.svg';

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
      
      {/* Emblema / Logo Placeholder */}
      <div className="flex justify-center mb-6 emblema-appear">
        <img src={logo} alt="Emblema do jogo" className="w-24 h-24 mx-auto mb-6" />
      </div>

      <h2 className="font-display text-4xl text-center mb-8 tracking-widest text-[#E5C982]">ENTRAR</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm mb-2 text-[#F3EBDD]/80">O teu Nome</label>
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 bg-[#291923] border border-[#D8B66C]/50 text-[#F3EBDD] rounded focus:outline-none focus:border-[#E5C982]"
            placeholder="Ex: Nuno"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button 
          onClick={handleCreate}
          className="w-full py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition duration-300"
        >
          CRIAR SALA
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-[#D8B66C]/50"></div>
          <span className="px-4 text-sm text-[#F3EBDD]/70">OU</span>
          <div className="flex-grow border-t border-[#D8B66C]/50"></div>
        </div>

        <div>
          <label className="block text-sm mb-2 text-[#F3EBDD]/80">Código da Sala</label>
          <input 
            type="text" 
            value={roomCode} 
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full p-3 bg-[#291923] border border-[#D8B66C]/50 text-[#F3EBDD] rounded text-center tracking-[0.3em] font-bold focus:outline-none focus:border-[#E5C982]"
            placeholder="XXXXXX"
            maxLength={6}
          />
        </div>

        <button 
          onClick={handleJoin}
          className="w-full py-4 bg-transparent border border-[#D8B66C] text-[#E5C982] font-bold text-xl rounded-sm hover:bg-[#D8B66C] hover:text-[#291923] transition duration-300"
        >
          ENTRAR NA SALA
        </button>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [message, setMessage] = useState('Ainda não ligado');

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setMessage('Ligado ao servidor com sucesso!');
    });

    newSocket.on('disconnect', () => {
      setMessage('Desligado do servidor.');
    });

    return () => newSocket.close();
  }, []);

  // Apenas um teste visual rápido
  return (
    <div style={{ fontFamily: 'serif', background: '#221c23', color: '#fceba5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>THE TRAITORS</h1>
      <p>{message}</p>
      <input placeholder="Nome" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
      <input placeholder="Código da Sala" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
      <button>Criar Sala</button>
    </div>
  );
}

export default App;
// src/components/phases/MissionPhase/MissionCollaborativeDrawing.js
import React, { useState, useEffect } from 'react';
import DrawingCanvas from '../../DrawingCanvas';

// Lista de palavras secretas (desenhos fáceis de representar com formas geométricas)
const SECRET_WORDS = [
  'CASA', 'BARCO', 'BICICLETA', 'ÁRVORE', 'SOL', 'FLOR', 
  'CARRO', 'AVIÃO', 'PEIXE', 'GATO', 'CORAÇÃO', 'ESTRELA',
  'BOLA', 'CHUVA', 'MONTANHA', 'RELÓGIO', 'CHAPÉU', 'ÓCULOS'
];

export default function MissionCollaborativeDrawing({ 
  playerState, 
  onMissionOutcome, 
  socket, 
  roomData,
  playerId  // precisa receber o id do jogador atual
}) {
  const [openCanvas, setOpenCanvas] = useState(false);
  const [secretWord, setSecretWord] = useState('');
  const [isFirstPlayer, setIsFirstPlayer] = useState(false);

  // Gerar palavra secreta aleatória quando o componente monta (apenas uma vez)
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SECRET_WORDS.length);
    setSecretWord(SECRET_WORDS[randomIndex]);
  }, []);

  // Verificar se o jogador atual é o primeiro da lista (orde de chegada)
  useEffect(() => {
    if (playerState.players && playerState.players.length > 0) {
      const firstPlayerId = playerState.players[0]?.id;
      setIsFirstPlayer(firstPlayerId === playerId);
    }
  }, [playerState.players, playerId]);

  if (playerState.gameMode === 'in_person') {
    return (
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6 text-left">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">🎨 Desenho nas Costas</h3>
        <ol className="list-decimal text-[#F3EBDD] space-y-2 mb-6">
          <li><strong>Formem uma fila</strong> e definam a ordem dos jogadores, do primeiro ao último.</li>
          <li>O <strong>primeiro jogador</strong> recebe secretamente uma palavra ou objeto que terá de transmitir.</li>
          <li>Sem falar, o primeiro jogador <strong>desenha a palavra com o dedo nas costas do segundo jogador</strong>.</li>
          <li>O segundo jogador tenta perceber o que sentiu e, <strong>sem fazer perguntas</strong>, desenha a mesma coisa nas costas do terceiro.</li>
          <li>O processo continua, passando o desenho de jogador para jogador, até chegar ao <strong>último jogador da fila</strong>.</li>
          <li>O último jogador deve dizer <strong>em voz alta o que acha que foi desenhado nas suas costas</strong>.</li>
          <li>🎉 <strong>Se a resposta for a palavra/objeto original, a equipa ganha!</strong></li>
        </ol>
        <p className="text-[#F3EBDD]/80 mb-6">
          <strong>Regra importante:</strong> ninguém pode falar, mostrar o desenho ou dar pistas durante a transmissão. 
          A ideia é descobrir <strong>até que ponto a mensagem consegue chegar ao fim sem se perder pelo caminho!</strong>
        </p>

        {/* Exibir a palavra secreta APENAS ao primeiro jogador */}
        {isFirstPlayer && secretWord && (
          <div className="mb-6 p-4 bg-[#D8B66C]/20 border-2 border-[#D8B66C] rounded-lg text-center">
            <p className="text-white text-sm uppercase tracking-wider">🔒 Palavra secreta (mostra apenas ao 1º jogador)</p>
            <p className="text-4xl font-bold text-[#D8B66C] mt-2">{secretWord}</p>
          </div>
        )}

        {!isFirstPlayer && (
          <div className="mb-6 p-4 bg-[#291923] border border-[#D8B66C]/30 rounded-lg text-center">
            <p className="text-[#F3EBDD]/60">Aguarda a tua vez na fila. Não olhes para a palavra secreta!</p>
          </div>
        )}

        <div className="text-center">
          <button 
            onClick={() => onMissionOutcome(true)}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm mr-2"
          >
            ✅ Concluir com Sucesso
          </button>
          <button 
            onClick={() => onMissionOutcome(false)}
            className="px-8 py-3 bg-[#291923] text-white border border-[#D8B66C] font-bold rounded-sm"
          >
            ❌ Falhar Missão
          </button>
        </div>
      </div>
    );
  }

  // Modo remoto (mantém-se igual)
  return (
    <div className="text-center">
      <p className="text-white mb-4">Abram o quadro para desenharem em conjunto.</p>
      <button onClick={() => setOpenCanvas(true)} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">Abrir Quadro</button>
      {openCanvas && <DrawingCanvas socket={socket} roomCode={roomData?.roomCode} />}
    </div>
  );
}
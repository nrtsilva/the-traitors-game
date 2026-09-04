import React, { useState, useEffect } from 'react';

export default function GameBoard({ playerState, onOpenHelp, phaseIntro, isEvaluation, onReady, onEvaluation, onVote, onArsenalAction, banishmentReveal, arsenalResult, playerId, onEndMission, blindfold, onDecoyAnswer, traitorChoices, onTraitorChoice, showPlayerList, onTraitorMurder, onTraitorRecruit, recruitInvitation, onRecruitDecision, recruitResult, murderReveal, onContinueAfterReveal }) {
  const isTraitor = playerState.role === 'traitor';
  const [selectedRating, setSelectedRating] = useState(0);
  const [traitorAnswer, setTraitorAnswer] = useState(null); // Para não estar selecionado por defeito
  const [selectedVote, setSelectedVote] = useState(null);
  const [useDagger, setUseDagger] = useState(false);
  const [arsenalNumber, setArsenalNumber] = useState(1);
  const [timer, setTimer] = useState(0);
  const [decoyAnswered, setDecoyAnswered] = useState(false); // Para esconder o botão depois de clicar

  useEffect(() => {
    if (playerState.timer && playerState.timer > 0) {
      setTimer(playerState.timer);
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playerState.timer]);

  // 1. REVELAÇÃO DA EXPULSÃO
  if (banishmentReveal) {
    const { isTie, banishedName, lostGold } = banishmentReveal;

    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center animate-pulse">
          {/* Efeito de "tocha" ou brilho */}
          <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-[#D8B66C]/20 blur-3xl"></div>
          
          {isTie ? (
            <>
              <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EMPATE</h1>
              <p className="text-3xl text-white mb-4">NINGUÉM FOI EXPULSO</p>
              <p className="text-xl text-white/70 mb-8">Todos os jogadores empatados perderam <span className="font-bold text-[#D8B66C]">1 moeda</span>.</p>
            </>
          ) : (
            <>
              <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EXPULSÃO</h1>
              <p className="text-4xl text-red-400 font-bold mb-4">{banishedName} FOI EXPULSO</p>
              <p className="text-xl text-white/70 mb-8">Perdeu <span className="font-bold text-[#D8B66C]">{lostGold} moedas</span>.</p>
            </>
          )}

          {/* Indicador de progresso para o Arsenal */}
          <p className="text-lg text-[#D8B66C] mt-12 animate-bounce">A preparar o Arsenal...</p>
        </div>
      </div>
    );
  }

  // RESULTADO DO ARSENAL
  if (arsenalResult) {
    const isWinner = arsenalResult.winnerId === playerId;
    const reward = arsenalResult.reward;
    let icon, title, description;

    if (isWinner) {
      // Mensagem para o VENCEDOR
      if (reward === '2_coins' || reward === '1_coin') {
        icon = <div className="text-9xl text-[#D8B66C] drop-shadow-lg">◉</div>;
        title = `Ganhaste ${reward === '2_coins' ? '2' : '1'} moeda${reward === '2_coins' ? 's' : ''}!`;
        description = 'O ouro foi adicionado ao teu cofre.';
      } else if (reward === 'shield') {
        icon = <div className="text-9xl drop-shadow-lg">🛡️</div>;
        title = 'Ganhaste um Escudo!';
        description = 'Este escudo protege-te de um assassinato na próxima noite.';
      } else if (reward === 'dagger') {
        icon = <div className="text-9xl drop-shadow-lg">🗡️</div>;
        title = 'Ganhaste um Punhal!';
        description = 'Este punhal dá-te direito a 2 votos na próxima votação para expulsão.';
      } else {
        icon = <div className="text-9xl text-[#D8B66C]">✖</div>;
        title = 'Ninguém venceu!';
        description = 'Não foi atribuído nenhum prémio.';
      }
    } else {
      // Mensagem para os restantes jogadores
      icon = <div className="text-9xl text-[#F3EBDD]/40">😔</div>;
      title = 'Não foste o vencedor!';
      description = `O vencedor foi ${arsenalResult.winnerName}. Prepara-te para a noite.`;
    }

    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center animate-pulse">
          <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-[#D8B66C]/20 blur-3xl"></div>
          {icon}
          <h1 className="text-5xl font-display font-bold text-[#E5C982] mt-6 mb-4">{title}</h1>
          <p className="text-2xl text-white/80 mb-8">{description}</p>
          <p className="text-lg text-[#D8B66C] animate-bounce">A preparar a noite...</p>
        </div>
      </div>
    );
  }

  // FASE DE VENDA-DOS-OLHOS (Blindfold)
  if (blindfold) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-8xl mb-8 animate-pulse">🌙</div>
          <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-6">A Noite Caiu...</h1>
          <p className="text-2xl text-white mb-4">Coloca o telemóvel virado para baixo.</p>
          <p className="text-xl text-white/60">Vendem os olhos e aguardem instruções.</p>
        </div>
      </div>
    );
  }
  
  // FASE DE DECOY (Estás a gostar do jogo?)
  if (playerState.phase === 'PHASE_4_MURDER' && !traitorChoices && !recruitInvitation && !recruitResult && !murderReveal) {
    if (decoyAnswered) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <p className="text-2xl text-white/60 animate-pulse">A aguardar os outros jogadores...</p>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-6">Aguarda...</h1>
          <p className="text-2xl text-white mb-8">Estás a gostar do jogo até agora?</p>
          <div className="flex justify-center gap-6">
            <button onClick={() => { setDecoyAnswered(true); onDecoyAnswer(); }} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-2xl rounded-lg hover:bg-[#E5C982] transition">Sim</button>
            <button onClick={() => { setDecoyAnswered(true); onDecoyAnswer(); }} className="px-10 py-4 bg-[#291923] text-white border border-[#D8B66C] font-bold text-2xl rounded-lg hover:border-[#E5C982] transition">Não</button>
          </div>
        </div>
      </div>
    );
  }

  // ESCOLHAS DO TRAIDOR (Matar, Recrutar ou Ignorar)
  if (traitorChoices) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-red-500 mb-8">Escolhe a tua Ação</h1>
          <div className="space-y-4">
            {traitorChoices.options.includes('kill') && <button onClick={() => onTraitorChoice('kill')} className="block w-80 py-4 bg-red-900/40 border border-red-500 text-white font-bold text-xl rounded-lg hover:bg-red-900/80 transition">🗡️ Assassinar</button>}
            {traitorChoices.options.includes('recruit') && <button onClick={() => onTraitorChoice('recruit')} className="block w-80 py-4 bg-[#291923] border border-[#D8B66C] text-[#E5C982] font-bold text-xl rounded-lg hover:bg-[#412734] transition">🎭 Recrutar</button>}
            {traitorChoices.options.includes('skip') && <button onClick={() => onTraitorChoice('skip')} className="block w-80 py-4 bg-[#291923] border border-white/20 text-white/60 font-bold text-xl rounded-lg hover:bg-[#412734] transition">Passar a Noite</button>}
          </div>
        </div>
      </div>
    );
  }

  // LISTA DE JOGADORES (Para o Traidor escolher a vítima ou recruta)
  if (showPlayerList) {
    const playersToKill = playerState.players.filter(p => p.id !== playerId && p.alive);
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-8">{showPlayerList.type === 'recruit' ? 'Quem queres recrutar?' : 'Quem queres assassinar?'}</h1>
          <div className="space-y-4">
            {playersToKill.map(player => (
              <button key={player.id} 
                onClick={() => showPlayerList.type === 'recruit' ? onTraitorRecruit(player.id) : onTraitorMurder(player.id)}
                className="block w-80 py-4 bg-[#291923] border border-[#D8B66C]/30 text-white font-bold text-xl rounded-lg hover:border-[#D8B66C] transition">
                {player.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CONVITE PARA RECRUTAMENTO (Só para o alvo)
  if (recruitInvitation) {
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-8">🤝 Uma Proposta</h1>
          <p className="text-2xl text-white mb-8">Foste escolhido para te juntares aos Traidores!</p>
          <div className="flex justify-center gap-6">
            <button onClick={() => onRecruitDecision(true)} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition">Aceitar</button>
            <button onClick={() => onRecruitDecision(false)} className="px-10 py-4 bg-[#291923] text-white border border-[#D8B66C] font-bold text-xl rounded-lg hover:border-[#E5C982] transition">Recusar</button>
          </div>
        </div>
      </div>
    );
  }

  // RESULTADO DO RECRUTAMENTO
  if (recruitResult) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-8">🤫 O Recrutamento</h1>
          <p className="text-2xl text-white mb-8">
            {recruitResult.accepted ? `${recruitResult.playerName} juntou-se aos Traidores!` : `${recruitResult.playerName} recusou o convite.`}
          </p>
          <p className="text-xl text-white/60 mb-8">Ninguém foi assassinado esta noite.</p>
          <button onClick={onContinueAfterReveal} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition">Continuar</button>
        </div>
      </div>
    );
  }

  // RESULTADO DO ASSASSINATO
  if (murderReveal) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center">
          {murderReveal.type === 'murder' ? (
            <>
              <div className="text-8xl mb-6">🗡️</div>
              <h1 className="text-5xl font-display font-bold text-red-500 mb-6">Assassinato!</h1>
              <p className="text-3xl text-white mb-4">{murderReveal.playerName} foi assassinado!</p>
              <p className="text-xl text-white/70">Perdeu {murderReveal.lostGold} moedas.</p>
            </>
          ) : murderReveal.type === 'shield' ? (
            <>
              <div className="text-8xl mb-6">🛡️</div>
              <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-6">O Escudo Protegeu!</h1>
              <p className="text-2xl text-white mb-4">Ninguém foi assassinado. O alvo tinha um Escudo.</p>
            </>
          ) : (
            <>
              <div className="text-8xl mb-6">🌙</div>
              <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-6">Ninguém Morreu</h1>
              <p className="text-2xl text-white mb-4">Esta noite foi tranquila.</p>
            </>
          )}
          <button onClick={onContinueAfterReveal} className="mt-8 px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition">Continuar</button>
        </div>
      </div>
    );
  }

  // 2. INTRODUÇÃO DE FASE
  if (phaseIntro) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#E5C982] mb-4">{phaseIntro.title}</h1>
        <p className="text-xl mb-8">{phaseIntro.description}</p>
        {isTraitor && phaseIntro.secretMission && <p className="text-red-400 mb-8">TAREFA SECRETA: {phaseIntro.secretMission}</p>}
        <button onClick={onReady} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">INICIAR FASE</button>
      </div>
    );
  }

  // 3. AVALIAÇÃO DA MISSÃO (Fiéis dão estrelas, Traidor confirma)
  if (isEvaluation) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 text-center">
        <h2 className="font-display text-3xl text-[#E5C982] mb-6">MISSÃO TERMINADA</h2>
        <p className="text-[#F3EBDD] text-lg mb-10">A missão terminou. Todos devem avaliar esta missão.</p>
        
        {isTraitor ? (
          <div className="mb-8">
            <h3 className="text-2xl text-red-400 mb-4">Completaste a tua missão secreta?</h3>
            <div className="flex justify-center gap-4 mb-6">
              <button 
                onClick={() => setTraitorAnswer(true)}
                className={`px-8 py-4 font-bold rounded-sm transition ${traitorAnswer === true ? 'bg-[#D8B66C] text-[#291923] scale-105' : 'bg-[#291923] text-[#F3EBDD] border border-[#D8B66C]'}`}>
                Sim, completei
              </button>
              <button 
                onClick={() => setTraitorAnswer(false)}
                className={`px-8 py-4 font-bold rounded-sm transition ${traitorAnswer === false ? 'bg-[#D8B66C] text-[#291923] scale-105' : 'bg-[#291923] text-[#F3EBDD] border border-[#D8B66C]'}`}>
                Não, falhei
              </button>
            </div>
            <button 
              onClick={() => onEvaluation({ type: 'traitor_answer', value: traitorAnswer })}
              disabled={traitorAnswer === null}
              className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Confirmar
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <h3 className="text-2xl text-[#F3EBDD] mb-4">Avalia a missão (1 a 5 estrelas)</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setSelectedRating(star)} className={`text-5xl transition ${selectedRating >= star ? 'text-[#D8B66C]' : 'text-[#F3EBDD]/30'}`}>★</button>
              ))}
            </div>
            <button 
              onClick={() => onEvaluation({ type: 'faithful_rating', value: selectedRating })} 
              disabled={selectedRating === 0} 
              className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Confirmar Avaliação
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. ARSENAL (Mini-jogo Individual)
  if (playerState.phase === 'PHASE_3_ARMOURY') {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O ARSENAL</h1>
        <p className="text-xl mb-6">Escolhe um número de 1 a 6. O maior número único vence e ganha o prémio!</p>
        
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button 
              key={num} 
              onClick={() => setArsenalNumber(num)}
              className={`w-16 h-16 rounded-full text-2xl font-bold border-2 ${arsenalNumber === num ? 'bg-[#D8B66C] text-[#291923] border-white' : 'bg-[#412734] text-white border-[#D8B66C]/30'}`}
            >
              {num}
            </button>
          ))}
        </div>

        <button onClick={() => onArsenalAction(arsenalNumber)} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">
          CONFIRMAR NÚMERO
        </button>
      </div>
    );
  }

  // 5. FASE DE VOTAÇÃO (Expulsão com Dagger)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    const votablePlayers = playerState.players.filter(p => p.id !== playerId && p.alive);
    const hasDagger = playerState.inventory && playerState.inventory.includes('dagger');

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden">
        {/* Efeito de fundo místico */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D8B66C]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center">
          <h1 className="font-display text-5xl font-bold text-[#E5C982] mb-4 tracking-widest">A EXPULSÃO</h1>
          <p className="text-[#F3EBDD] text-xl mb-8">Quem será o traidor? A decisão está nas tuas mãos.</p>
          
          <div className="mb-8">
            <div className="text-7xl font-bold text-[#D8B66C] font-display drop-shadow-lg">{timer}</div>
            <p className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mt-2">Tempo restante</p>
          </div>

          <div className="space-y-4 mb-8 max-w-md mx-auto">
            {votablePlayers.map(player => (
              <div 
                key={player.id} 
                onClick={() => setSelectedVote(player.id)}
                className={`bg-[#291923] border-2 p-5 rounded-lg cursor-pointer transition-all duration-300 ${selectedVote === player.id ? 'border-[#D8B66C] bg-[#412734] scale-105 shadow-lg' : 'border-[#D8B66C]/30 hover:border-[#D8B66C] hover:bg-[#291923]/80'}`}
              >
                <span className="text-2xl text-white font-bold">{player.name}</span>
              </div>
            ))}
          </div>

          {hasDagger && (
            <div className="mb-6 flex items-center justify-center gap-3 text-[#E5C982]">
              <span className="text-lg">Usar Adaga (2 Votos):</span>
              <input type="checkbox" checked={useDagger} onChange={(e) => setUseDagger(e.target.checked)} className="w-6 h-6 accent-[#D8B66C] cursor-pointer" />
            </div>
          )}

          <button 
            onClick={() => onVote(selectedVote, useDagger)}
            disabled={!selectedVote}
            className="px-12 py-4 bg-[#D8B66C] text-[#291923] font-bold text-2xl rounded-lg shadow-soft hover:bg-[#E5C982] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CONFIRMAR VOTO
          </button>
        </div>
      </div>
    );
  }

  // 6. TABULEIRO NORMAL (Missão)
  return (
    <div className="relative">
      <button onClick={() => onOpenHelp(0)} className="absolute top-0 right-4 text-3xl text-[#E5C982]">?</button>

      {/* TIMER EM DESTAQUE */}
      <div className="text-center mb-8">
        <div className="inline-block bg-[#D8B66C] text-[#291923] font-display text-5xl font-bold px-10 py-4 rounded-lg shadow-soft">
          {timer}s
        </div>
        <p className="text-white mt-2">Tempo restante</p>
      </div>

      {/* Missão */}
      <div className="bg-[#291923] border border-[#D8B66C] p-8 rounded-md">
        <h2 className="font-display text-3xl font-bold text-[#E5C982] mb-4 text-center">{playerState.currentMission.title}</h2>
        <div className="space-y-4">
          {playerState.currentMission.items.map((item, index) => (
            <div key={item.id} className="bg-[#412734]/60 border border-[#D8B66C]/30 p-4 rounded-sm">
              <span className="text-white">{index + 1}. {item.name}</span>
            </div>
          ))}
        </div>
        <button onClick={onEndMission} className="mt-8 w-full py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl rounded-sm">
          CONCLUIR MISSÃO
        </button>
        <p className="text-xs text-white/60 mt-2 text-center">Todos os jogadores vivos têm de concordar.</p>
      </div>
    </div>
  );
}
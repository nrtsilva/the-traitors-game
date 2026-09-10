import React from 'react';
import ArsenalTimeGuess from './ArsenalTimeGuess';
import ArsenalTextFlood from './ArsenalTextFlood';
import ArsenalWaiting from './ArsenalWaiting';
import ArsenalWordGuesser from './ArsenalWordGuesser';
import ArsenalColorReflex from './ArsenalColorReflex';
import ArsenalTimeStop from './ArsenalTimeStop';
import ArsenalWordBuilder from './ArsenalWordBuilder';
import ArsenalWordRoulette from './ArsenalWordRoulette';
import ArsenalEmojiGuess from './ArsenalEmojiGuess';
import ArsenalBlowSurvive from './ArsenalBlowSurvive';
import ArsenalFindOranges from './ArsenalFindOranges';
import ArsenalSoundsCode from './ArsenalSoundsCode'; 
import ArsenalEightLetters from './ArsenalEightLetters';

export default function ArsenalPhase(props) {
  const task = props.playerState.arsenalTask || null;

  if (!task) return <ArsenalWaiting />;

  if (task.type === 'TIME_GUESS') return <ArsenalTimeGuess {...props} task={task} />;
  if (task.type === 'WORD_COMBINATION') return <ArsenalWordGuesser {...props} task={task} />;
  if (task.type === 'COLOR_REFLEX') return <ArsenalColorReflex {...props} task={task} />;
  if (task.type === 'PRECISION_TIMER') return <ArsenalTimeStop {...props} task={task} />;
  if (task.type === 'WORD_BUILDER') return <ArsenalWordBuilder {...props} task={task} />;
  if (task.type === 'WORD_ROULETTE') return <ArsenalWordRoulette {...props} task={task} />;
  if (task.type === 'EMOJI_GUESS') return <ArsenalEmojiGuess {...props} task={task} />;
  if (task.type === 'BLOW_SURVIVE') return <ArsenalBlowSurvive {...props} task={task} />;
  if (task.type === 'FIND_ORANGES') return <ArsenalFindOranges {...props} task={task} />;
  if (task.type === 'SOUNDS_CODE') return <ArsenalSoundsCode {...props} task={task} />;
  if (task.type === 'EIGHT_LETTERS') return <ArsenalEightLetters {...props} task={task} />;

  // TEXT_FLOOD ou outros
  return <ArsenalTextFlood {...props} task={task} />;
}
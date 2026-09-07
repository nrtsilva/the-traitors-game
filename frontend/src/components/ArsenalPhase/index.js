import React from 'react';
import ArsenalTimeGuess from './ArsenalTimeGuess';
import ArsenalTextFlood from './ArsenalTextFlood';
import ArsenalWaiting from './ArsenalWaiting';

export default function ArsenalPhase(props) {
  const task = props.playerState.arsenalTask || null;

  if (!task) return <ArsenalWaiting />;

  if (task.type === 'TIME_GUESS') {
    return <ArsenalTimeGuess {...props} task={task} />;
  }

  // Assume TEXT_FLOOD ou outros
  return <ArsenalTextFlood {...props} task={task} />;
}
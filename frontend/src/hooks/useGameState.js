import { useReducer } from 'react';

const initialState = {
  currentScreen: 'lobby',
  roomData: null,
  gameData: null,
  isHost: false,
  phaseIntro: null,
  isEvaluation: false,
  banishmentReveal: null,
  arsenalResult: null,
  blindfold: false,
  traitorChoices: null,
  showPlayerList: null,
  recruitInvitation: false,
  recruitResult: null,
  murderReveal: null,
  gameOver: null,
  isTutorialOverlay: false,
  tutorialStep: 0,
  missionOutcome: null,
  readyCount: 0,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload };
    case 'SET_ROOM_DATA':
      return { ...state, roomData: action.payload };
    case 'SET_GAME_DATA':
      return { 
        ...state, 
        gameData: { 
          ...state.gameData,
          ...action.payload
        } 
      };
    case 'SET_IS_HOST':
      return { ...state, isHost: action.payload };
    case 'SET_PHASE_INTRO':
      return { ...state, phaseIntro: action.payload };
    case 'SET_IS_EVALUATION':
      return { ...state, isEvaluation: action.payload };
    case 'SET_BANISHMENT_REVEAL':
      return { ...state, banishmentReveal: action.payload };
    case 'SET_ARSENAL_RESULT':
      return { ...state, arsenalResult: action.payload };
    case 'SET_BLINDFOLD':
      return { ...state, blindfold: action.payload };
    case 'SET_TRAITOR_CHOICES':
      return { ...state, traitorChoices: action.payload };
    case 'SET_SHOW_PLAYER_LIST':
      return { ...state, showPlayerList: action.payload };
    case 'SET_RECRUIT_INVITATION':
      return { ...state, recruitInvitation: action.payload };
    case 'SET_RECRUIT_RESULT':
      return { ...state, recruitResult: action.payload };
    case 'SET_MURDER_REVEAL':
      return { ...state, murderReveal: action.payload };
    case 'SET_GAME_OVER':
      return { ...state, gameOver: action.payload };
    case 'SET_TUTORIAL':
      return { ...state, ...action.payload };
    case 'RESET_GAME':
      return { ...initialState, currentScreen: 'lobby' };
    case 'SET_MISSION_OUTCOME':
      return { ...state, missionOutcome: action.payload };
    default:
      return state;
  }
}

export function useGameState() {
  return useReducer(gameReducer, initialState);
}
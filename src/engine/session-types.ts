import type { GameEngine } from './game';
import type { 
  MatchPlayer, 
  PlayedMove, 
  InstantWinType, 
  GameRules, 
  GameSettings, 
  BotPersonaIdTuple, 
  CustomBotConfigTuple 
} from './types';
import type { BotConfig } from '../ai/types';
import type { CampaignChapter } from './campaign';
import type { ChopNotificationData } from '../stores/useGameStore';
import type { MatchState } from './state-machine';

export interface TableSessionConfig {
  gameType: 'QUICK' | 'CAMPAIGN';
  rules: GameRules;
  settings: GameSettings;
  playerCount: number;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  campaignChapter: CampaignChapter | null;
}

export interface MatchSnapshot {
  gameNumber: number;
  players: MatchPlayer[];
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  currentMove: PlayedMove | null;
  winners: MatchPlayer[];
  isGameOver: boolean;
  instantWinType: InstantWinType | null;
  isDealing: boolean;
  dealtCounts: Record<string, number>;
  dealBanner: string | null;
  chopNotification: ChopNotificationData | null;
  botThinkingThought: { botId: string; text: string } | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
}

export interface MatchCompletionResult {
  engine: GameEngine;
  instantWin: boolean;
  instantWinType: InstantWinType | null;
}

export type SnapshotListener = (snapshot: MatchSnapshot) => void;
export type MatchStateListener = (state: MatchState) => void;
export type CompletionListener = (result: MatchCompletionResult) => void;

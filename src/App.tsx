/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlphabetteDoubleBar } from './components/AlphabetteDoubleBar';
import { LobbyView } from './components/LobbyView';
import { DuelArenaView } from './components/DuelArenaView';
import { SummaryView } from './components/SummaryView';
import { BOSS_PROFILES, createJokerInstance, PREBUILT_DECKS } from './data/decks';
import {
  BossId,
  Deck,
  GameMode,
  JokerType,
  MissedQuestionRecord,
  PlayerMatchState,
} from './types';

type AppView = 'LOBBY' | 'ARENA' | 'SUMMARY';

export default function App() {
  // Theme & Accessibility states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('alphabette_revisclash_dark');
      return saved ? saved === 'true' : true; // Default tactical dark arena
    } catch {
      return true;
    }
  });

  const [isBigMode, setIsBigMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alphabette_revisclash_big') === 'true';
    } catch {
      return false;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeReadableText, setActiveReadableText] = useState<string>(
    "Bienvenue sur Révis'Clash, l'arène de révision en 1 contre 1 de la suite Alphabette pour le Brevet et le Bac. Choisissez l'un des 4 decks hors-ligne ou générez un deck par IA à partir de votre cours."
  );

  // Sync `.dark` class on `<html>`
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('alphabette_revisclash_dark', String(isDarkMode));
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('alphabette_revisclash_big', String(isBigMode));
    } catch {
      // ignore
    }
  }, [isBigMode]);

  // Custom AI-generated decks persisted in localStorage
  const [customDecks, setCustomDecks] = useState<Deck[]>(() => {
    try {
      const raw = localStorage.getItem('alphabette_revisclash_custom_decks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const allDecks: Deck[] = [...PREBUILT_DECKS, ...customDecks];

  const [selectedDeckId, setSelectedDeckId] = useState<string>(PREBUILT_DECKS[0].id);
  const [gameMode, setGameMode] = useState<GameMode>('BOSS_SOLO');
  const [selectedBossId, setSelectedBossId] = useState<BossId>('MAJOR');
  const [player1Name, setPlayer1Name] = useState<string>('Joueur 1');
  const [player2Name, setPlayer2Name] = useState<string>('Joueur 2');

  // 2 freely chosen Joker cards per player
  const [p1JokerTypes, setP1JokerTypes] = useState<JokerType[]>(['BROUILLARD', 'DOUBLE_MISE']);
  const [p2JokerTypes, setP2JokerTypes] = useState<JokerType[]>(['CHRONO_HALF', 'DOUBLE_MISE']);

  // Active Match State
  const [view, setView] = useState<AppView>('LOBBY');
  const [matchKey, setMatchKey] = useState(0);
  const [finalP1, setFinalP1] = useState<PlayerMatchState | null>(null);
  const [finalP2, setFinalP2] = useState<PlayerMatchState | null>(null);
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestionRecord[]>([]);
  const [wasSuddenDeath, setWasSuddenDeath] = useState(false);

  const selectedDeck = allDecks.find((d) => d.id === selectedDeckId) || PREBUILT_DECKS[0];
  const selectedBoss = BOSS_PROFILES.find((b) => b.id === selectedBossId) || BOSS_PROFILES[1];

  const handleAddCustomDeck = (newDeck: Deck) => {
    setCustomDecks((prev) => {
      const next = [newDeck, ...prev];
      try {
        localStorage.setItem('alphabette_revisclash_custom_decks', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDeleteCustomDeck = (id: string) => {
    setCustomDecks((prev) => {
      const next = prev.filter((d) => d.id !== id);
      try {
        localStorage.setItem('alphabette_revisclash_custom_decks', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (selectedDeckId === id) {
      setSelectedDeckId(PREBUILT_DECKS[0].id);
    }
  };

  // Speech synthesis (fr-FR)
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeReadableText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStartDuel = () => {
    stopSpeech();
    setMatchKey((k) => k + 1);
    setView('ARENA');
  };

  const handleFinishDuel = (
    p1Result: PlayerMatchState,
    p2Result: PlayerMatchState,
    missed: MissedQuestionRecord[],
    sd: boolean
  ) => {
    stopSpeech();
    setFinalP1(p1Result);
    setFinalP2(p2Result);
    setMissedQuestions(missed);
    setWasSuddenDeath(sd);
    setView('SUMMARY');
  };

  const handleResetHome = () => {
    stopSpeech();
    setView('LOBBY');
    setActiveReadableText(
      `Accueil Révis'Clash. Deck sélectionné : ${selectedDeck.title}. ${selectedDeck.subtitle}.`
    );
  };

  const initialP1State: PlayerMatchState = {
    name: player1Name.trim() || 'Joueur 1',
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    totalTimeMs: 0,
    jokers: p1JokerTypes.map((t, i) => createJokerInstance(t, i)),
  };

  const initialP2State: PlayerMatchState = {
    name: gameMode === 'BOSS_SOLO' ? selectedBoss.name : player2Name.trim() || 'Joueur 2',
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    totalTimeMs: 0,
    jokers: (gameMode === 'BOSS_SOLO' ? selectedBoss.jokers : p2JokerTypes).map((t, i) =>
      createJokerInstance(t, i)
    ),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100 transition-colors">
      {/* DOUBLE BARRE ALPHABETTE (STYLE INFO PERSO) - px fixes */}
      <AlphabetteDoubleBar
        isBigMode={isBigMode}
        onToggleBigMode={() => setIsBigMode((b) => !b)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((d) => !d)}
        isSpeaking={isSpeaking}
        onToggleSpeech={handleToggleSpeech}
        onResetHome={handleResetHome}
        showBackButton={view !== 'LOBBY'}
      />

      {/* CONTENU PRINCIPAL DE L'APPLICATION (Échelle isolée pour le mode BIG) */}
      <main
        className="flex-1 w-full"
        style={{ fontSize: isBigMode ? '20px' : '16px' }}
      >
        {view === 'LOBBY' && (
          <LobbyView
            decks={allDecks}
            selectedDeckId={selectedDeck.id}
            onSelectDeck={setSelectedDeckId}
            onAddCustomDeck={handleAddCustomDeck}
            onDeleteCustomDeck={handleDeleteCustomDeck}
            gameMode={gameMode}
            onChangeGameMode={setGameMode}
            selectedBossId={selectedBossId}
            onSelectBoss={setSelectedBossId}
            player1Name={player1Name}
            onChangePlayer1Name={setPlayer1Name}
            player2Name={player2Name}
            onChangePlayer2Name={setPlayer2Name}
            p1Jokers={p1JokerTypes}
            onChangeP1Jokers={setP1JokerTypes}
            p2Jokers={p2JokerTypes}
            onChangeP2Jokers={setP2JokerTypes}
            onStartDuel={handleStartDuel}
            isBigMode={isBigMode}
          />
        )}

        {view === 'ARENA' && (
          <DuelArenaView
            key={`duel-${matchKey}`}
            deck={selectedDeck}
            gameMode={gameMode}
            boss={selectedBoss}
            initialP1={initialP1State}
            initialP2={initialP2State}
            isBigMode={isBigMode}
            onFinishDuel={handleFinishDuel}
            onActiveTextChange={setActiveReadableText}
          />
        )}

        {view === 'SUMMARY' && finalP1 && finalP2 && (
          <SummaryView
            deck={selectedDeck}
            gameMode={gameMode}
            p1={finalP1}
            p2={finalP2}
            missedRecords={missedQuestions}
            wasSuddenDeath={wasSuddenDeath}
            isBigMode={isBigMode}
            onReplaySameDeck={handleStartDuel}
            onBackToLobby={handleResetHome}
            onActiveTextChange={setActiveReadableText}
          />
        )}
      </main>

      {/* PIED DE PAGE OBLIGATOIRE */}
      <footer className="w-full py-5 px-4 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 no-print">
        <p>
          Un jeu{' '}
          <a
            href="https://alphabette.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Alphabette
          </a>{' '}
          — Tu aimes les duels de cartes ? Découvre{' '}
          <a
            href="https://alphabette.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Chèvre Royale
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

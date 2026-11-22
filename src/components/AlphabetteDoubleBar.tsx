import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Check,
  Crown,
  Globe,
  Heart,
  LayoutGrid,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Printer,
  Smartphone,
  Smile,
  Star,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface AlphabetteHeaderProps {
  isBigMode: boolean;
  onToggleBigMode: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  onResetHome: () => void;
  showBackButton?: boolean;
}

interface AlphabetteAppItem {
  id: string;
  name: string;
  desc: string;
  url: string;
  isNew?: boolean;
}

const ALPHABETTE_SUITE_APPS: AlphabetteAppItem[] = [
  { id: 'revis-clash', name: "Révis'Clash", desc: 'Arène de révision 1v1 en cartes tactiques (Brevet & Bac)', url: '#', isNew: true },
  { id: 'info-perso', name: 'Info Perso', desc: 'Coffre-fort familial & mémo administratif personnel', url: 'https://alphabette.fr', isNew: false },
  { id: 'chevre-royale', name: 'Chèvre Royale', desc: 'Jeu de duel de cartes stratégique et décalé', url: 'https://alphabette.fr', isNew: true },
  { id: 'mots-croises', name: 'Mots Mêlés Senior', desc: 'Grilles haute lisibilité avec indices progressifs', url: 'https://alphabette.fr', isNew: false },
  { id: 'budget-clair', name: 'Budget Clair', desc: 'Suivi simple des dépenses mensuelles sans jargon', url: 'https://alphabette.fr', isNew: false },
  { id: 'dictee-flash', name: 'Dictée Flash', desc: 'Entraînement orthographique vocal en 3 minutes', url: 'https://alphabette.fr', isNew: true },
  { id: 'jardin-zen', name: 'Calendrier Potager', desc: 'Semis et récoltes mois par mois au jardin', url: 'https://alphabette.fr', isNew: false },
];

type ActiveModal =
  | null
  | 'ALL_APPS'
  | 'NEW_APPS'
  | 'SUBSCRIPTION'
  | 'DONATION'
  | 'INSTALL_PWA'
  | 'FEEDBACK'
  | 'LANGUAGE';

export const AlphabetteDoubleBar: React.FC<AlphabetteHeaderProps> = ({
  isBigMode,
  onToggleBigMode,
  isDarkMode,
  onToggleDarkMode,
  isSpeaking,
  onToggleSpeech,
  onResetHome,
  showBackButton = false,
}) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alphabette_revisclash_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [favoriteApps, setFavoriteApps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('alphabette_fav_apps');
      return saved ? JSON.parse(saved) : ['revis-clash'];
    } catch {
      return ['revis-clash'];
    }
  });
  const [simpleModeToast, setSimpleModeToast] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'FR' | 'EN' | 'ES'>('FR');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const toggleFavoriteApp = (appId: string) => {
    setFavoriteApps((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId];
      try {
        localStorage.setItem('alphabette_fav_apps', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      localStorage.setItem('alphabette_revisclash_pinned', String(next));
    } catch {
      // ignore
    }
    setMenuOpen(false);
  };

  const handleSimpleMode = () => {
    if (!isBigMode) {
      onToggleBigMode();
    }
    setMenuOpen(false);
    setSimpleModeToast('Mode simple activé : texte agrandi et lecture apaisée.');
    setTimeout(() => setSimpleModeToast(null), 3500);
  };

  const handlePrint = () => {
    setMenuOpen(false);
    window.print();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full select-none no-print">
        {/* 1. BARRE SUPÉRIEURE (Top Bar Écosystème) - dimensions en px fixes */}
        <div
          className={`w-full h-[46px] sm:h-[50px] px-[10px] sm:px-[16px] flex items-center justify-between gap-[6px] flex-nowrap transition-colors ${
            isDarkMode ? 'bg-[#0b1220] text-white' : 'bg-[#182334] text-white'
          }`}
        >
          {/* Bloc de gauche */}
          <div className="flex items-center gap-[6px] sm:gap-[10px] flex-nowrap min-w-0">
            {/* 1. Logo + Nom alphabette */}
            <a
              href="https://alphabette.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-[6px] shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 rounded-[8px]"
              aria-label="Accéder au portail alphabette.fr"
            >
              <span className="w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-full bg-[#3355d1] flex items-center justify-center text-white font-bold text-[15px] sm:text-[16px] leading-none shadow-sm">
                a
              </span>
              <span className="font-bold lowercase text-[15px] sm:text-[17px] tracking-tight text-white whitespace-nowrap">
                alphabette
              </span>
            </a>

            {/* 2. Bouton .eu */}
            <a
              href="https://alphabette.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[12px] sm:text-[13px] font-semibold text-white shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
              aria-label="Laboratoire alphabette.eu"
            >
              .eu
            </a>

            {/* 3. Bouton Toutes les applis */}
            <button
              type="button"
              onClick={() => setActiveModal('ALL_APPS')}
              aria-label="Toutes les applis de la suite Alphabette"
              className="w-[34px] h-[34px] sm:w-auto sm:h-[36px] sm:px-[10px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center gap-[6px] text-white shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <LayoutGrid className="w-[17px] h-[17px] shrink-0" />
              <span className="hidden sm:inline text-[12.5px] font-medium whitespace-nowrap">
                Toutes les applis
              </span>
            </button>

            {/* 4. Bouton NEW */}
            <button
              type="button"
              onClick={() => setActiveModal('NEW_APPS')}
              aria-label="Voir les nouveautés Alphabette"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <span className="px-[4px] py-[2px] rounded-[4px] bg-gradient-to-r from-sky-200 to-sky-400 text-[#0f172a] font-extrabold text-[9px] leading-none tracking-tight uppercase">
                NEW
              </span>
            </button>
          </div>

          {/* Bloc de droite : 5. Bouton Abonnement */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveModal('SUBSCRIPTION')}
              aria-label="Informations sur l'abonnement Alphabette"
              className="h-[34px] sm:h-[36px] px-[10px] sm:px-[14px] rounded-full bg-white/10 hover:bg-white/15 border-[1.5px] border-[#f59e0b] flex items-center gap-[5px] shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Crown className="w-[14px] h-[14px] text-[#f59e0b] shrink-0" />
              <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#fbbf24] whitespace-nowrap">
                Abonnement
              </span>
            </button>
          </div>
        </div>

        {/* 2. BARRE INFÉRIEURE (Barre d'Application & Accessibilité) - dimensions en px fixes */}
        <div
          className={`w-full h-[54px] sm:h-[58px] px-[10px] sm:px-[16px] flex items-center justify-between gap-[6px] flex-nowrap border-b transition-colors ${
            isDarkMode
              ? 'bg-[#0f172a] border-[#334155] text-white'
              : 'bg-[#ffffff] border-[#e2e8f0] text-slate-900'
          }`}
        >
          {/* Bloc de gauche (min-width: 0; flex: 1) */}
          <div className="min-w-0 flex-1 flex items-center gap-[6px]">
            {showBackButton && (
              <button
                type="button"
                onClick={onResetHome}
                aria-label="Retour à l'accueil de l'arène"
                className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#1e293b] text-slate-200 hover:bg-slate-700'
                    : 'bg-[#f1f5f9] text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft className="w-[16px] h-[16px]" />
              </button>
            )}
            <button
              type="button"
              onClick={onResetHome}
              className="min-w-0 text-left flex flex-col justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500 rounded-[4px]"
              aria-label="Révis'Clash - Retour à l'accueil"
            >
              <div className="flex items-center gap-[4px] min-w-0">
                <span
                  className={`font-bold text-[14.5px] sm:text-[20px] tracking-tight truncate leading-tight ${
                    isDarkMode ? 'text-white' : 'text-[#3f51b5]'
                  }`}
                >
                  Révis&apos;Clash
                </span>
                {isPinned && (
                  <Star
                    className="w-[13px] h-[13px] text-[#f59e0b] fill-[#f59e0b] shrink-0"
                    aria-label="Application épinglée"
                  />
                )}
              </div>
              <span className="text-[9px] sm:text-[10.5px] uppercase tracking-[0.04em] text-[#64748b] dark:text-slate-400 truncate leading-tight font-semibold">
                DUEL CARTES BREVET BAC
              </span>
            </button>
          </div>

          {/* Bloc de droite : 5 boutons réglementaires alignés sans débordement */}
          <div className="flex items-center gap-[4px] sm:gap-[7px] shrink-0">
            {/* 1. Bouton Don */}
            <button
              type="button"
              onClick={() => setActiveModal('DONATION')}
              aria-label="Faire un don pour soutenir Alphabette"
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-[10px] sm:rounded-[11px] bg-[#db2777] hover:bg-[#be185d] flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-pink-500"
            >
              <Heart className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] fill-white text-white" />
            </button>

            {/* 2. Bouton BIG */}
            <button
              type="button"
              onClick={onToggleBigMode}
              aria-pressed={isBigMode}
              aria-label="Activer ou désactiver le mode grand texte BIG"
              className={`h-[34px] sm:h-[38px] px-[8px] sm:px-[11px] rounded-[10px] sm:rounded-[11px] flex items-center gap-[4px] text-white font-bold shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                isBigMode
                  ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-300'
                  : 'bg-[#4338ca] hover:bg-[#3730a3]'
              }`}
            >
              <span className="text-[12px] sm:text-[14px] leading-none">BIG</span>
              <BarChart2 className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] shrink-0" />
            </button>

            {/* 3. Bouton Mode Nuit / Jour */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
              className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                isDarkMode
                  ? 'bg-[#1e293b] border-[#334155] text-[#fbbf24] hover:bg-slate-700'
                  : 'bg-[#f1f5f9] border-[#e2e8f0] text-[#334155] hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? (
                <Sun className="w-[17px] h-[17px]" />
              ) : (
                <Moon className="w-[17px] h-[17px]" />
              )}
            </button>

            {/* 4. Bouton Lecture à haute voix */}
            <button
              type="button"
              onClick={onToggleSpeech}
              aria-pressed={isSpeaking}
              aria-label={
                isSpeaking
                  ? 'Arrêter la lecture à haute voix'
                  : 'Lire le contenu principal à haute voix'
              }
              className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                isSpeaking
                  ? 'bg-[#047857] border-[#059669] text-white'
                  : isDarkMode
                    ? 'bg-[#1e293b] border-[#334155] text-slate-200 hover:bg-slate-700'
                    : 'bg-[#f1f5f9] border-[#e2e8f0] text-[#334155] hover:bg-slate-200'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-[17px] h-[17px]" />
              ) : (
                <Volume2 className="w-[17px] h-[17px]" />
              )}
            </button>

            {/* 5. Bouton Plus d'options (...) */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Plus d'options"
                className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  isDarkMode
                    ? 'bg-[#1e293b] border-[#334155] text-slate-200 hover:bg-slate-700'
                    : 'bg-[#f1f5f9] border-[#e2e8f0] text-[#334155] hover:bg-slate-200'
                }`}
              >
                <MoreHorizontal className="w-[17px] h-[17px]" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Menu d'options Alphabette"
                  className={`absolute right-0 mt-[8px] w-[260px] rounded-[14px] shadow-xl border py-[6px] z-50 ${
                    isDarkMode
                      ? 'bg-[#1e293b] border-[#334155] text-slate-100'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {/* 1. Épingler cette appli */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleTogglePin}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center justify-between hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Star
                        className={`w-[16px] h-[16px] ${
                          isPinned ? 'text-amber-400 fill-amber-400' : 'text-amber-500'
                        }`}
                      />
                      <span>Épingler cette appli</span>
                    </span>
                    {isPinned && <Check className="w-[15px] h-[15px] text-emerald-500" />}
                  </button>

                  {/* 2. Mon inscription */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('SUBSCRIPTION');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center gap-[10px] hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <User className="w-[16px] h-[16px] text-indigo-500" />
                    <span>Mon inscription</span>
                  </button>

                  {/* 3. Mode simple */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSimpleMode}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center justify-between hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Smile className="w-[16px] h-[16px] text-emerald-500" />
                      <span>Mode simple</span>
                    </span>
                    {isBigMode && <Check className="w-[15px] h-[15px] text-emerald-500" />}
                  </button>

                  {/* 4. Installer sur mon téléphone */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('INSTALL_PWA');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center gap-[10px] hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-[16px] h-[16px] text-sky-500" />
                    <span>Installer sur mon téléphone</span>
                  </button>

                  {/* 5. Donner mon avis */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setFeedbackSent(false);
                      setActiveModal('FEEDBACK');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center gap-[10px] hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-[16px] h-[16px] text-pink-500" />
                    <span>Donner mon avis</span>
                  </button>

                  {/* 6. Imprimer */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handlePrint}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center gap-[10px] hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <Printer className="w-[16px] h-[16px] text-slate-500" />
                    <span>Imprimer</span>
                  </button>

                  {/* 7. Langue */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('LANGUAGE');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-medium flex items-center justify-between hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Globe className="w-[16px] h-[16px] text-indigo-500" />
                      <span>Langue</span>
                    </span>
                    <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedLang}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Mode Simple */}
      {simpleModeToast && (
        <div
          role="status"
          className="fixed bottom-[16px] left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-[16px] py-[10px] rounded-[12px] shadow-lg text-[14px] font-medium flex items-center gap-[8px]"
        >
          <Check className="w-[16px] h-[16px] shrink-0" />
          <span>{simpleModeToast}</span>
        </div>
      )}

      {/* MODALES AUTONOMES DE LA DOUBLE BARRE */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-[16px]"
          onClick={() => setActiveModal(null)}
        >
          <div
            className={`w-full max-w-[460px] rounded-[18px] border p-[20px] shadow-2xl ${
              isDarkMode
                ? 'bg-[#1e293b] border-[#334155] text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Modale Toutes les applis */}
            {activeModal === 'ALL_APPS' && (
              <div>
                <div className="flex items-center justify-between mb-[14px]">
                  <h2 className="text-[18px] font-bold">Toutes les applis Alphabette</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-[12px]">
                  Cliquez sur l&apos;étoile pour mettre vos applications préférées en favori.
                </p>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[300px] overflow-y-auto">
                  {ALPHABETTE_SUITE_APPS.map((app) => {
                    const isFav = favoriteApps.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        className="py-[10px] flex items-center justify-between gap-[10px]"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[14.5px] truncate">{app.name}</div>
                          <div className="text-[12.5px] text-slate-500 dark:text-slate-400 truncate">
                            {app.desc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteApp(app.id)}
                          aria-label={`Mettre ${app.name} en favori`}
                          className="p-[8px] rounded-full hover:bg-amber-500/10 shrink-0 cursor-pointer"
                        >
                          <Star
                            className={`w-[18px] h-[18px] ${
                              isFav
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-[16px] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* 2. Modale Nouveautés (NEW) */}
            {activeModal === 'NEW_APPS' && (
              <div>
                <div className="flex items-center justify-between mb-[14px]">
                  <h2 className="text-[18px] font-bold">Nouveautés Alphabette</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {ALPHABETTE_SUITE_APPS.filter((a) => a.isNew).map((app) => {
                    const isFav = favoriteApps.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        className="py-[12px] flex items-center justify-between gap-[10px]"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[15px]">{app.name}</div>
                          <div className="text-[13px] text-slate-500 dark:text-slate-400">
                            {app.desc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteApp(app.id)}
                          aria-label={`Mettre ${app.name} en favori`}
                          className="p-[8px] rounded-full hover:bg-amber-500/10 shrink-0 cursor-pointer"
                        >
                          <Star
                            className={`w-[18px] h-[18px] ${
                              isFav
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-[16px] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* 3. Modale Abonnement (7 mai : 15 € / an ou 40 € / an) */}
            {activeModal === 'SUBSCRIPTION' && (
              <div>
                <div className="flex items-center justify-between mb-[12px]">
                  <div className="flex items-center gap-[8px]">
                    <Crown className="w-[20px] h-[20px] text-amber-500" />
                    <h2 className="text-[18px] font-bold">Abonnement Alphabette</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <div className="p-[14px] rounded-[12px] bg-amber-500/10 border border-amber-500/30 mb-[14px]">
                  <p className="text-[14.5px] leading-relaxed font-medium">
                    Lancement de l&apos;abonnement payant le{' '}
                    <strong className="text-amber-600 dark:text-amber-400 font-bold">7 mai</strong>{' '}
                    au tarif de :
                  </p>
                  <ul className="mt-[10px] space-y-[8px] text-[14px]">
                    <li className="flex items-center justify-between font-semibold">
                      <span>Formule 1 Application</span>
                      <span className="font-mono font-bold text-[15px]">15 € / an</span>
                    </li>
                    <li className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                      <span>Pass Intégral (Toutes les applis)</span>
                      <span className="font-mono font-bold text-[15px]">40 € / an</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-[16px]">
                  Un compte unique Alphabette sans publicité, sans revente de données et accessible sur tous vos appareils.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* 4. Modale Don */}
            {activeModal === 'DONATION' && (
              <div>
                <div className="flex items-center justify-between mb-[12px]">
                  <div className="flex items-center gap-[8px]">
                    <Heart className="w-[20px] h-[20px] text-pink-600 fill-pink-600" />
                    <h2 className="text-[18px] font-bold">Soutenir Alphabette</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 mb-[16px]">
                  Les applications éducatives Alphabette sont conçues sans publicité intrusive ni traçage. Votre soutien finance l&apos;hébergement et la création de nouveaux decks de révision pour le Brevet et le Bac.
                </p>
                <div className="flex items-center justify-end gap-[10px]">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[14px] py-[8px] rounded-[10px] border border-slate-300 dark:border-slate-600 text-[14px] font-medium cursor-pointer"
                  >
                    Plus tard
                  </button>
                  <a
                    href="https://alphabette.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-[16px] py-[8px] rounded-[10px] bg-[#db2777] hover:bg-[#be185d] text-white font-semibold text-[14px]"
                  >
                    Soutenir sur alphabette.fr
                  </a>
                </div>
              </div>
            )}

            {/* 5. Modale Installer PWA */}
            {activeModal === 'INSTALL_PWA' && (
              <div>
                <div className="flex items-center justify-between mb-[12px]">
                  <div className="flex items-center gap-[8px]">
                    <Smartphone className="w-[20px] h-[20px] text-sky-500" />
                    <h2 className="text-[18px] font-bold">Installer sur mon téléphone</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <ol className="space-y-[10px] text-[14px] text-slate-600 dark:text-slate-300 mb-[16px] list-decimal list-inside">
                  <li>
                    <strong>Sur Android (Chrome) :</strong> appuyez sur le menu ⋮ en haut à droite puis sur{' '}
                    <em>« Ajouter à l&apos;écran d&apos;accueil »</em>.
                  </li>
                  <li>
                    <strong>Sur iPhone / iPad (Safari) :</strong> appuyez sur le bouton Partager en bas puis sur{' '}
                    <em>« Sur l&apos;écran d&apos;accueil »</em>.
                  </li>
                </ol>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* 6. Modale Donner mon avis */}
            {activeModal === 'FEEDBACK' && (
              <div>
                <div className="flex items-center justify-between mb-[12px]">
                  <h2 className="text-[18px] font-bold">Donner mon avis sur Révis&apos;Clash</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                {feedbackSent ? (
                  <div className="py-[12px] text-center">
                    <p className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400 mb-[12px]">
                      Merci ! Votre retour a bien été enregistré.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 text-white font-semibold text-[14px] cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Une idée de deck, une remarque sur un Boss ou une question ?"
                      className="w-full rounded-[10px] border border-slate-300 dark:border-slate-600 bg-transparent p-[10px] text-[14px] mb-[12px] focus:outline-2 focus:outline-indigo-500"
                    />
                    <div className="flex justify-end gap-[8px]">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-[14px] py-[8px] rounded-[10px] border border-slate-300 dark:border-slate-600 text-[14px] cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackSent(true);
                          setFeedbackText('');
                        }}
                        className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. Modale Langue */}
            {activeModal === 'LANGUAGE' && (
              <div>
                <div className="flex items-center justify-between mb-[12px]">
                  <h2 className="text-[18px] font-bold">Langue de l&apos;interface</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label="Fermer la fenêtre"
                    className="p-[6px] rounded-full hover:bg-slate-500/10 cursor-pointer"
                  >
                    <X className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <div className="space-y-[8px] mb-[16px]">
                  {(
                    [
                      { code: 'FR', label: 'Français (Programme officiel Brevet / Bac)' },
                      { code: 'EN', label: 'English (International)' },
                      { code: 'ES', label: 'Español' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSelectedLang(item.code)}
                      className={`w-full px-[14px] py-[10px] rounded-[10px] border text-left text-[14px] font-medium flex items-center justify-between cursor-pointer ${
                        selectedLang === item.code
                          ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="font-mono font-bold">{item.code}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-[16px] py-[8px] rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] cursor-pointer"
                  >
                    Valider
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

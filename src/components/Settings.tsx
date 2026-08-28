import { useState } from 'react';
import { RefreshCw, Shield, Lock, MapPin, X, Award, Zap, Target, Heart, Calendar, Crown, Swords, Star, Languages } from 'lucide-react';
import type { GameSnapshot, Player, PlayerSchedule, PlayerRank } from '@/lib/types';
import { clearPlayerId } from '@/lib/device';
import { api } from '@/lib/api';
import { ScheduleForm } from '@/components/ScheduleForm';
import { computePlayerStats, getPlayerTitles, rankProgress, RANK_COLORS, ALL_TITLES, TITLE_REQUIREMENTS } from '@/lib/xp';
import { useLang } from '@/lib/LanguageContext';
import type { Language } from '@/lib/i18n';

const RANK_COLORS_LOCAL: Record<PlayerRank, string> = {
  Unranked: 'text-ink-500',
  Bronze: 'text-orange-400',
  Silver: 'text-ink-300',
  Gold: 'text-pending-bright',
  Platinum: 'text-blue-400',
  Diamond: 'text-cyan-300',
  Champion: 'text-purple-400',
  Legend: 'text-pending-bright',
};

interface Props {
  snapshot: GameSnapshot;
  me: Player;
  onSwitchPlayer: () => void;
  onOpenAdmin: () => void;
  onScheduleSaved: () => void;
}

export function Settings({ snapshot, me, onSwitchPlayer, onOpenAdmin, onScheduleSaved }: Props) {
  const { t, lang, setLang } = useLang();
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [titleBusy, setTitleBusy] = useState(false);
  const meLatest = snapshot.players.find((p) => p.id === me.id) ?? me;
  const mySchedule = snapshot.schedules.find((s) => s.playerId === me.id);

  const stats = computePlayerStats(snapshot, me.id);
  const unlockedTitles = getPlayerTitles(snapshot, me.id);
  const rp = rankProgress(meLatest.xp ?? 0);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    api.setLanguage(me.id, newLang).catch(() => {});
  };

  const handleScheduleSave = async (schedule: PlayerSchedule) => {
    setScheduleBusy(true);
    setScheduleError(null);
    try {
      await api.saveSchedule(me.id, schedule);
      setEditingSchedule(false);
      onScheduleSaved();
    } catch {
      setScheduleError('Could not save schedule. Try again.');
    } finally {
      setScheduleBusy(false);
    }
  };

  const handleEquipTitle = async (title: string | null) => {
    setTitleBusy(true);
    try {
      await api.equipTitle(me.id, title);
      onScheduleSaved();
    } catch {
      // ignore
    } finally {
      setTitleBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-20">
      <h1 className="font-display text-4xl font-black text-white">{t('settings.title').toUpperCase()}</h1>

      {/* Player identity + rank */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5 text-center">
        <p className="font-display text-3xl font-black text-white">{meLatest.name}</p>
        {meLatest.equipped_title && (
          <p className="mt-1 text-sm font-bold uppercase tracking-wider text-blue-400">{meLatest.equipped_title}</p>
        )}
        <p className={`mt-2 font-display text-xl font-black ${RANK_COLORS_LOCAL[meLatest.rank]}`}>{meLatest.rank.toUpperCase()}</p>
        <p className="text-sm text-ink-400">{meLatest.xp ?? 0} XP</p>

        {/* Rank progress bar */}
        {rp.nextMin !== null ? (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${rp.progress * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-500">{rp.nextMin - (meLatest.xp ?? 0)} XP to {RANK_THRESHOLDS_NEXT(rp.rank)}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-pending-bright">MAX RANK</p>
        )}
      </div>

      {/* Language selector */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-blue-400" />
          <p className="font-display text-lg font-black text-white">{t('settings.language')}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`rounded-xl border py-3 text-center font-bold transition active:scale-95 ${
              lang === 'en' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-ink-600 bg-ink-900/60 text-ink-400'
            }`}
          >
            {t('settings.english')}
          </button>
          <button
            onClick={() => handleLanguageChange('es')}
            className={`rounded-xl border py-3 text-center font-bold transition active:scale-95 ${
              lang === 'es' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-ink-600 bg-ink-900/60 text-ink-400'
            }`}
          >
            {t('settings.spanish')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-pending-bright" />
          <p className="font-display text-lg font-black text-white">STATS</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard label="Tags Made" value={stats.tagsMade} icon={Target} color="text-safe-bright" />
          <StatCard label="Times Tagged" value={stats.timesTagged} icon={Target} color="text-it-bright" />
          <StatCard label="Bounties Collected" value={stats.bountiesCollected} icon={Award} color="text-pending-bright" />
          <StatCard label="Revive Wins" value={stats.reviveWins} icon={Heart} color="text-safe-bright" />
          <StatCard label="Days Survived" value={stats.daysSurvived} icon={Calendar} color="text-blue-400" />
          <StatCard label="Survivor Wins" value={stats.survivorEventWins} icon={Shield} color="text-safe-bright" />
          <StatCard label="King of the Day" value={stats.kingOfTheDayWins} icon={Crown} color="text-pending-bright" />
          <StatCard label="Rivalry Wins" value={stats.rivalryWins} icon={Swords} color="text-blue-400" />
        </div>
      </div>

      {/* Titles */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-5">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-pending-bright" />
          <p className="font-display text-lg font-black text-white">MY TITLES</p>
        </div>
        <p className="mt-1 text-xs text-ink-500">Tap an unlocked title to equip it.</p>
        <div className="mt-4 space-y-2">
          {ALL_TITLES.map((title) => {
            const unlocked = unlockedTitles.includes(title);
            const equipped = meLatest.equipped_title === title;
            return (
              <button
                key={title}
                onClick={() => unlocked && !equipped && handleEquipTitle(title)}
                disabled={!unlocked || titleBusy || equipped}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition active:scale-95 ${
                  equipped
                    ? 'border-blue-500 bg-blue-500/20'
                    : unlocked
                      ? 'border-ink-600 bg-ink-900/60 hover:border-blue-500/50'
                      : 'border-ink-700 bg-ink-800/40 opacity-60'
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-semibold ${unlocked ? 'text-white' : 'text-ink-500'}`}>
                    {unlocked ? '✓' : '🔒'} {title}
                  </p>
                  <p className="text-xs text-ink-500">{TITLE_REQUIREMENTS[title]}</p>
                </div>
                {equipped && <span className="shrink-0 text-xs font-bold uppercase text-blue-400">Equipped</span>}
              </button>
            );
          })}
        </div>
        {meLatest.equipped_title && (
          <button
            onClick={() => handleEquipTitle(null)}
            disabled={titleBusy}
            className="mt-3 w-full rounded-xl border border-ink-600 py-2 text-xs font-bold text-ink-300 active:scale-95 disabled:opacity-50"
          >
            Unequip Title
          </button>
        )}
      </div>

      {/* Action buttons */}
      <button
        onClick={() => setConfirmSwitch(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800 p-4 text-left transition active:scale-[0.98]"
      >
        <RefreshCw className="h-5 w-5 text-blue-400" />
        <div>
          <p className="font-semibold text-white">Switch player</p>
          <p className="text-sm text-ink-400">Choose a different name on this device.</p>
        </div>
      </button>

      <button
        onClick={() => setEditingSchedule(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800 p-4 text-left transition active:scale-[0.98]"
      >
        <MapPin className="h-5 w-5 text-blue-400" />
        <div>
          <p className="font-semibold text-white">Edit schedule</p>
          <p className="text-sm text-ink-400">Update where you are during each period.</p>
        </div>
      </button>

      <button
        onClick={onOpenAdmin}
        className="flex w-full items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800 p-4 text-left transition active:scale-[0.98]"
      >
        <Lock className="h-5 w-5 text-ink-300" />
        <div>
          <p className="font-semibold text-white">Admin controls</p>
          <p className="text-sm text-ink-400">Manage the game with a pin.</p>
        </div>
      </button>

      {confirmSwitch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm animate-slide-down rounded-3xl border border-ink-700 bg-ink-900 p-6 text-center">
            <Shield className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-3 font-display text-2xl font-black text-white">Switch player?</h2>
            <p className="mt-2 text-sm text-ink-400">
              You'll need to pick your name again. Your game history stays saved.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmSwitch(false)}
                className="flex-1 rounded-xl border border-ink-600 py-3 font-semibold text-ink-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearPlayerId();
                  onSwitchPlayer();
                }}
                className="flex-1 rounded-xl bg-blue-500 py-3 font-bold text-white active:scale-95"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSchedule && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-sm animate-slide-down overflow-y-auto rounded-t-3xl border border-ink-700 bg-ink-900 p-5 pb-8 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-5 w-5 text-blue-400" />
                <h2 className="font-display text-2xl font-black text-white">EDIT SCHEDULE</h2>
              </div>
              <button onClick={() => setEditingSchedule(false)} className="rounded-full bg-ink-800 p-2 text-ink-400 active:scale-90">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ScheduleForm
              initial={mySchedule}
              onSubmit={handleScheduleSave}
              submitLabel="SAVE CHANGES"
              busy={scheduleBusy}
              error={scheduleError}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RANK_THRESHOLDS_NEXT(rank: PlayerRank): string {
  const order: PlayerRank[] = ['Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Legend'];
  const idx = order.indexOf(rank);
  if (idx < 0 || idx >= order.length - 1) return 'MAX';
  return order[idx + 1];
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Zap; color: string }) {
  return (
    <div className="rounded-xl bg-ink-900/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-xs text-ink-400">{label}</span>
      </div>
      <p className={`mt-1 font-display text-2xl font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- time helpers (server-authoritative, timezone aware) ----

function tzParts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour === 24 ? 0 : +map.hour,
    minute: +map.minute,
    second: +map.second,
    weekday: map.weekday, // Mon, Tue...
    dateStr: `${map.year}-${map.month}-${map.day}`,
  };
}

function parseHM(hm: string) {
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function isWeekday(weekday: string) {
  return !["Sat", "Sun"].includes(weekday);
}

// Wednesday uses special hours: 7:14 AM – 1:15 PM.
// Other weekdays use the competition's configured start/end times.
const WED_START = parseHM("07:14");
const WED_END = parseHM("13:15");

function dayStartMin(weekday: string, defaultStart: number): number {
  return weekday === "Wed" ? WED_START : defaultStart;
}

function dayEndMin(weekday: string, defaultEnd: number): number {
  return weekday === "Wed" ? WED_END : defaultEnd;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function announce(
  competitionId: string,
  dailyGameId: string | null,
  type: string,
  title: string,
  message: string,
) {
  await supabase.from("announcements").insert({
    competition_id: competitionId,
    daily_game_id: dailyGameId,
    type,
    title,
    message,
  });
}

async function postActivity(
  activityType: string,
  description: string,
  playerId: string | null = null,
  playerName: string | null = null,
  relatedTagId: string | null = null,
  relatedEventId: string | null = null,
) {
  await supabase.from("activity_feed").insert({
    activity_type: activityType,
    description,
    player_id: playerId,
    player_name: playerName,
    related_tag_id: relatedTagId,
    related_event_id: relatedEventId,
  });
}

async function postSystemChat(competitionId: string, message: string) {
  await supabase.from("chat_messages").insert({
    player_id: null,
    player_name: "SYSTEM",
    message,
    is_system: true,
  });
}

// ---- XP / Rank helpers ----

const RANK_THRESHOLDS: { rank: string; min: number }[] = [
  { rank: "Legend", min: 1500 },
  { rank: "Champion", min: 1000 },
  { rank: "Diamond", min: 750 },
  { rank: "Platinum", min: 500 },
  { rank: "Gold", min: 300 },
  { rank: "Silver", min: 150 },
  { rank: "Bronze", min: 50 },
  { rank: "Unranked", min: 0 },
];

function rankFromXp(xp: number): string {
  for (const t of RANK_THRESHOLDS) {
    if (xp >= t.min) return t.rank;
  }
  return "Unranked";
}

async function awardXp(playerId: string, amount: number, eventType: string, description: string, relatedTagId?: string, relatedEventId?: string) {
  const { error } = await supabase.from("player_xp_events").insert({
    player_id: playerId,
    event_type: eventType,
    xp_amount: amount,
    description,
    related_tag_id: relatedTagId ?? null,
    related_event_id: relatedEventId ?? null,
  });
  if (error) return; // duplicate unique constraint = already awarded
  // Update player's cached XP and rank
  const { data: player } = await supabase.from("players").select("xp").eq("id", playerId).maybeSingle();
  if (!player) return;
  const newXp = (player.xp ?? 0) + amount;
  const newRank = rankFromXp(newXp);
  await supabase.from("players").update({ xp: newXp, rank: newRank }).eq("id", playerId);
}

const ALL_TITLES = [
  "Hunter", "Bounty Hunter", "Bounty King", "Survivor", "Untouchable",
  "Comeback", "Revive King", "Tag Machine", "Most Wanted", "King of the Day",
  "Rival", "Legend",
];

async function checkAndUnlockTitles(playerId: string, snapshot?: any) {
  // Gather stats from DB directly
  const { data: tags } = await supabase.from("tags").select("*").or(`tagger_id.eq.${playerId},tagged_player_id.eq.${playerId}`);
  const { data: xpEvents } = await supabase.from("player_xp_events").select("*").eq("player_id", playerId);
  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
  const { data: allGames } = await supabase.from("daily_games").select("*").order("day_number");
  const { data: existingTitles } = await supabase.from("player_titles").select("*").eq("player_id", playerId);
  const unlockedSet = new Set((existingTitles ?? []).map((t) => t.title));

  const confirmedTagsByMe = (tags ?? []).filter((t) => t.status === "confirmed" && t.tagger_id === playerId);
  const tagsMade = confirmedTagsByMe.length;
  const bountiesCollected = (xpEvents ?? []).filter((e) => e.event_type === "BOUNTY" || e.event_type === "DOUBLE_BOUNTY").length;
  const reviveWins = (xpEvents ?? []).filter((e) => e.event_type === "REVIVE_WIN").length;
  const survivorWins = (xpEvents ?? []).filter((e) => e.event_type === "SURVIVOR_WIN").length;
  const kingWins = (xpEvents ?? []).filter((e) => e.event_type === "KING_OF_THE_DAY").length;
  const rivalryWins = (xpEvents ?? []).filter((e) => e.event_type === "RIVALRY_WIN").length;

  // Days survived: count days where player was active at end (not eliminated that day)
  const daysSurvived = (allGames ?? []).filter((g) => g.eliminated_player_id !== playerId && g.status === "ended").length;

  // Most Wanted selections: count game_events where player was selected for MOST_WANTED or DOUBLE_BOUNTY
  const { data: mwEvents } = await supabase.from("game_events").select("*").in("event_type", ["MOST_WANTED", "DOUBLE_BOUNTY"]);
  const mwCount = (mwEvents ?? []).filter((e) => e.selected_player_ids?.includes(playerId)).length;

  // Untouchable: survive 3 consecutive days without being tagged
  const timesTagged = (tags ?? []).filter((t) => t.status === "confirmed" && t.tagged_player_id === playerId);
  // Check last 3 ended days - was player tagged in any of them?
  const endedGames = (allGames ?? []).filter((g) => g.status === "ended").sort((a, b) => b.day_number - a.day_number).slice(0, 3);
  let untouchable = false;
  if (endedGames.length >= 3) {
    untouchable = endedGames.every((g) => !timesTagged.some((t) => t.daily_game_id === g.id) && g.eliminated_player_id !== playerId);
  }

  const newUnlocks: { title: string; unlocked: boolean }[] = [
    { title: "Hunter", unlocked: tagsMade >= 25 },
    { title: "Bounty Hunter", unlocked: bountiesCollected >= 3 },
    { title: "Bounty King", unlocked: bountiesCollected >= 10 },
    { title: "Survivor", unlocked: daysSurvived >= 5 },
    { title: "Untouchable", unlocked: untouchable },
    { title: "Comeback", unlocked: reviveWins >= 1 },
    { title: "Revive King", unlocked: reviveWins >= 5 },
    { title: "Tag Machine", unlocked: tagsMade >= 50 },
    { title: "Most Wanted", unlocked: mwCount >= 5 },
    { title: "King of the Day", unlocked: kingWins >= 1 },
    { title: "Rival", unlocked: rivalryWins >= 3 },
    { title: "Legend", unlocked: rankFromXp(player?.xp ?? 0) === "Legend" },
  ];

  const toInsert = newUnlocks.filter((t) => t.unlocked && !unlockedSet.has(t.title));
  if (toInsert.length > 0) {
    await supabase.from("player_titles").insert(toInsert.map((t) => ({ player_id: playerId, title: t.title })));
  }
}

// ---- Attendance helpers ----

async function getTodayAttendance(dateStr: string): Promise<Map<string, { status: string; leftAt: string | null }>> {
  const { data } = await supabase.from("attendance").select("*").eq("date", dateStr);
  const map = new Map<string, { status: string; leftAt: string | null }>();
  for (const a of data ?? []) {
    map.set(a.player_id, { status: a.status, leftAt: a.left_at });
  }
  return map;
}

function isPlayerAvailable(attendanceMap: Map<string, { status: string; leftAt: string | null }>, playerId: string, now: Date): boolean {
  const record = attendanceMap.get(playerId);
  if (!record) return true; // no attendance record = unknown = available
  if (record.status === "absent") return false;
  if (record.status === "left_early") {
    if (!record.leftAt) return false;
    return new Date(record.leftAt).getTime() > now.getTime();
  }
  return true; // present or unknown
}

function filterAvailablePlayers(players: any[], attendanceMap: Map<string, { status: string; leftAt: string | null }>, now: Date) {
  return players.filter((p) => isPlayerAvailable(attendanceMap, p.id, now));
}

// ---- Random Event System ----

async function maybeCreateEvent(competition: any, game: any, activePlayers: any[]) {
  // Only on weekdays (Mon-Fri)
  const local = tzParts(new Date(), competition.timezone);
  if (!isWeekday(local.weekday)) return;

  // Filter by attendance — absent and left-early players excluded
  const attendanceMap = await getTodayAttendance(game.date);
  const now = new Date();
  const availablePlayers = filterAvailablePlayers(activePlayers, attendanceMap, now);
  if (availablePlayers.length === 0) return;

  // Check if event already exists for this daily game
  const { data: existing } = await supabase.from("game_events").select("*").eq("daily_game_id", game.id).maybeSingle();
  if (existing) return;

  // Check for special event override on this date
  const { data: specialEvent } = await supabase.from("special_events")
    .select("*").eq("date", local.dateStr).eq("override_random", true).maybeSingle();
  if (specialEvent) {
    // Activate the special event instead of generating a random one
    if (specialEvent.status === "scheduled") {
      await supabase.from("special_events").update({ status: "active" }).eq("id", specialEvent.id);
      await announce(competition.id, game.id, "event", `${specialEvent.name}`, specialEvent.objective || "Special event is live!");
      await postActivity("SPECIAL_EVENT_START", `${specialEvent.name} has started!`);
      await postSystemChat(competition.id, `${specialEvent.name} has started!`);
    }
    return;
  }

  // 65% chance of event
  if (Math.random() > 0.65) return;

  // Choose event type
  const roll = Math.random();
  let eventType: string;
  if (roll < 0.30) eventType = "MOST_WANTED";
  else if (roll < 0.40) eventType = "DOUBLE_BOUNTY";
  else if (roll < 0.60) eventType = "SURVIVOR";
  else if (roll < 0.80) eventType = "KING_OF_THE_DAY";
  else eventType = "RIVALRY";

  // Get current IT to exclude
  const { data: slots } = await supabase.from("active_tags").select("*").eq("daily_game_id", game.id).eq("tag_slot", 1);
  const itId = slots?.[0]?.current_it_player_id;
  const eligible = availablePlayers.filter((p) => p.id !== itId);
  if (eligible.length === 0) return;

  let selectedIds: string[] = [];
  let rewardXp = 0;
  let metadata: any = {};

  if (eventType === "MOST_WANTED") {
    const [target] = pickRandom(eligible, 1);
    selectedIds = [target.id];
    rewardXp = 25;
    metadata = { targetName: target.name };
  } else if (eventType === "DOUBLE_BOUNTY") {
    const [target] = pickRandom(eligible, 1);
    selectedIds = [target.id];
    rewardXp = 50;
    metadata = { targetName: target.name };
  } else if (eventType === "SURVIVOR") {
    const [target] = pickRandom(eligible, 1);
    selectedIds = [target.id];
    rewardXp = 25;
    metadata = { targetName: target.name };
  } else if (eventType === "KING_OF_THE_DAY") {
    selectedIds = availablePlayers.map((p) => p.id);
    rewardXp = 50;
  } else if (eventType === "RIVALRY") {
    if (eligible.length < 2) return;
    const [a, b] = pickRandom(eligible, 2);
    selectedIds = [a.id, b.id];
    rewardXp = 30;
    metadata = { playerA: a.name, playerB: b.name };
  }

  const { data: event } = await supabase.from("game_events").insert({
    competition_id: competition.id,
    daily_game_id: game.id,
    event_type: eventType,
    status: "active",
    selected_player_ids: selectedIds,
    reward_xp: rewardXp,
    metadata,
  }).select().maybeSingle();

  if (event) {
    const names = selectedIds.map((id) => activePlayers.find((p) => p.id === id)?.name ?? "Unknown").join(" vs ");
    await announce(competition.id, game.id, "event", `RANDOM EVENT: ${eventType}`, names || eventType);
  }
}

async function resolveEventOnTag(competition: any, game: any, taggerId: string, taggedPlayerId: string, tagId: string) {
  const { data: events } = await supabase.from("game_events").select("*").eq("daily_game_id", game.id).eq("status", "active");
  if (!events || events.length === 0) return;

  for (const event of events) {
    if (event.event_type === "MOST_WANTED" || event.event_type === "DOUBLE_BOUNTY") {
      // Check if the tagged player is the target
      if (event.selected_player_ids.includes(taggedPlayerId)) {
        const bonus = event.event_type === "MOST_WANTED" ? 25 : 50;
        await awardXp(taggerId, bonus, event.event_type === "MOST_WANTED" ? "BOUNTY" : "DOUBLE_BOUNTY", `${event.event_type} bounty captured`, tagId, event.id);
        // Mark event completed
        await supabase.from("game_events").update({ status: "completed", winner_player_id: taggerId, completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", `${event.event_type} CAPTURED!`, `Bounty collected by ${taggerId === taggerId ? "the IT player" : "a player"}!`);
      }
    } else if (event.event_type === "SURVIVOR") {
      // If the survivor target was tagged, event fails
      if (event.selected_player_ids.includes(taggedPlayerId)) {
        await supabase.from("game_events").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", "SURVIVOR FAILED", "The survivor was tagged!");
      }
    }
    // KING_OF_THE_DAY and RIVALRY are resolved at end of day
  }
}

async function resolveEventsAtDayEnd(competition: any, game: any) {
  const { data: events } = await supabase.from("game_events").select("*").eq("daily_game_id", game.id).eq("status", "active");
  if (!events || events.length === 0) return;

  // Get all confirmed tags for this day
  const { data: dayTags } = await supabase.from("tags").select("*").eq("daily_game_id", game.id).eq("status", "confirmed");

  for (const event of events) {
    if (event.event_type === "SURVIVOR") {
      // Survivor survived the day
      const survivorId = event.selected_player_ids[0];
      if (survivorId) {
        // Check they weren't eliminated
        const { data: player } = await supabase.from("players").select("status").eq("id", survivorId).maybeSingle();
        if (player?.status === "active") {
          await awardXp(survivorId, 25, "SURVIVOR_WIN", "Survivor challenge won", undefined, event.id);
          await supabase.from("game_events").update({ status: "completed", winner_player_id: survivorId, completed_at: new Date().toISOString() }).eq("id", event.id);
        } else {
          await supabase.from("game_events").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", event.id);
        }
      }
    } else if (event.event_type === "KING_OF_THE_DAY") {
      // Count tags per player for this day
      const tagCounts = new Map<string, number>();
      for (const t of dayTags ?? []) {
        tagCounts.set(t.tagger_id, (tagCounts.get(t.tagger_id) ?? 0) + 1);
      }
      let winner: string | null = null;
      let maxTags = 0;
      let firstTagTime: string | null = null;
      // Find player with most tags; tie-break by first tag time
      for (const [pid, count] of tagCounts) {
        if (count > maxTags) {
          winner = pid;
          maxTags = count;
          firstTagTime = (dayTags ?? []).find((t) => t.tagger_id === pid)?.created_at ?? null;
        } else if (count === maxTags && count > 0 && firstTagTime) {
          const t = (dayTags ?? []).find((tag) => tag.tagger_id === pid)?.created_at;
          if (t && t < firstTagTime) {
            winner = pid;
            firstTagTime = t;
          }
        }
      }
      if (winner && maxTags > 0) {
        await awardXp(winner, 50, "KING_OF_THE_DAY", "King of the Day won", undefined, event.id);
        await supabase.from("game_events").update({ status: "completed", winner_player_id: winner, completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", "KING OF THE DAY", `Winner with ${maxTags} tags!`);
      } else {
        await supabase.from("game_events").update({ status: "expired", completed_at: new Date().toISOString() }).eq("id", event.id);
      }
    } else if (event.event_type === "RIVALRY") {
      const [pA, pB] = event.selected_player_ids;
      const countA = (dayTags ?? []).filter((t) => t.tagger_id === pA).length;
      const countB = (dayTags ?? []).filter((t) => t.tagger_id === pB).length;
      if (countA > countB) {
        await awardXp(pA, 30, "RIVALRY_WIN", "Rivalry event won", undefined, event.id);
        await supabase.from("game_events").update({ status: "completed", winner_player_id: pA, completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", "RIVALRY RESULT", `Winner with ${countA} tags!`);
      } else if (countB > countA) {
        await awardXp(pB, 30, "RIVALRY_WIN", "Rivalry event won", undefined, event.id);
        await supabase.from("game_events").update({ status: "completed", winner_player_id: pB, completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", "RIVALRY RESULT", `Winner with ${countB} tags!`);
      } else {
        // Draw
        await supabase.from("game_events").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", event.id);
        await announce(competition.id, game.id, "event", "RIVALRY DRAW", "No winner — it's a tie!");
      }
    } else if (event.event_type === "MOST_WANTED" || event.event_type === "DOUBLE_BOUNTY") {
      // Not captured during the day — expire
      await supabase.from("game_events").update({ status: "expired", completed_at: new Date().toISOString() }).eq("id", event.id);
    }
  }
}

async function awardSurvivalXp(competition: any, game: any) {
  // Get all active players who weren't eliminated this day
  const { data: players } = await supabase.from("players").select("*").eq("status", "active");
  for (const p of players ?? []) {
    await awardXp(p.id, 15, "SURVIVE_DAY", `Survived Day ${game.day_number}`);
  }
}

async function generateDailyRecap(competition: any, game: any) {
  // Top tagger
  const { data: dayTags } = await supabase.from("tags").select("*").eq("daily_game_id", game.id).eq("status", "confirmed");
  const tagCounts = new Map<string, number>();
  const taggedCounts = new Map<string, number>();
  for (const t of dayTags ?? []) {
    tagCounts.set(t.tagger_id, (tagCounts.get(t.tagger_id) ?? 0) + 1);
    taggedCounts.set(t.tagged_player_id, (taggedCounts.get(t.tagged_player_id) ?? 0) + 1);
  }
  let topTaggerId: string | null = null;
  let topTaggerCount = 0;
  for (const [pid, c] of tagCounts) {
    if (c > topTaggerCount) { topTaggerId = pid; topTaggerCount = c; }
  }
  let mostTaggedId: string | null = null;
  let mostTaggedCount = 0;
  for (const [pid, c] of taggedCounts) {
    if (c > mostTaggedCount) { mostTaggedId = pid; mostTaggedCount = c; }
  }

  // Event info
  const { data: event } = await supabase.from("game_events").select("*").eq("daily_game_id", game.id).maybeSingle();

  // Revives won today
  const { data: revives } = await supabase.from("revives").select("*").eq("status", "completed");
  const revivesWon = (revives ?? []).filter((r) => r.completed_at && new Date(r.completed_at).toDateString() === new Date(game.ended_at ?? game.started_at ?? new Date()).toDateString()).length;

  await supabase.from("daily_recaps").upsert({
    competition_id: competition.id,
    daily_game_id: game.id,
    day_number: game.day_number,
    top_tagger_id: topTaggerId,
    top_tagger_count: topTaggerCount,
    most_tagged_id: mostTaggedId,
    most_tagged_count: mostTaggedCount,
    event_type: event?.event_type ?? null,
    event_winner_id: event?.winner_player_id ?? null,
    revives_won: revivesWon,
    players_eliminated: game.eliminated_player_id ? 1 : 0,
  }, { onConflict: "daily_game_id" });
}

async function loadState() {
  const { data: competition } = await supabase.from("competition").select("*").limit(1).maybeSingle();
  const { data: players } = await supabase.from("players").select("*").order("sort_order");
  return { competition, players: players ?? [] };
}

// Auto start / end a day based on server time. Returns nothing; mutates DB.
async function runSchedule() {
  const { competition, players } = await loadState();
  if (!competition) return;
  if (competition.status === "finished") return;

  const now = new Date();
  const tz = competition.timezone;
  const local = tzParts(now, tz);
  const curMin = local.hour * 60 + local.minute;
  const defaultStart = parseHM(competition.start_time);
  const defaultEnd = parseHM(competition.end_time);
  const startMin = dayStartMin(local.weekday, defaultStart);
  const endMin = dayEndMin(local.weekday, defaultEnd);
  const activePlayers = players.filter((p) => p.status === "active");

  // Find the most recent daily game
  const { data: latest } = await supabase
    .from("daily_games")
    .select("*")
    .eq("competition_id", competition.id)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 1. End a running game whose window has passed.
  if (latest && latest.status === "running") {
    const passed = latest.date < local.dateStr || (latest.date === local.dateStr && curMin >= endMin);
    if (passed) {
      await endDay(competition, latest);
      return; // re-evaluate on next tick
    }
  }

  if (competition.status === "paused") return;

  // 2. Auto-start today's game if in window and none exists yet for today.
  const windowActive = isWeekday(local.weekday) && curMin >= startMin && curMin < endMin;
  const hasTodayGame = latest && latest.date === local.dateStr;

  if (windowActive && !hasTodayGame) {
    if (activePlayers.length <= 1) {
      // Competition already decided.
      if (activePlayers.length === 1 && competition.status !== "finished") {
        await supabase.from("competition").update({ status: "finished" }).eq("id", competition.id);
        await announce(competition.id, null, "winner", "WE HAVE A WINNER",
          `${activePlayers[0].name} is the last player standing and wins TAG!`);
      }
      return;
    }

    const dayNumber = (latest?.day_number ?? 0) + 1;
    const isFinal = activePlayers.length === 2;

    const { data: game } = await supabase
      .from("daily_games")
      .insert({
        competition_id: competition.id,
        day_number: dayNumber,
        date: local.dateStr,
        status: isFinal ? "final_pending" : "running",
        is_final: isFinal,
        started_at: now.toISOString(),
      })
      .select()
      .maybeSingle();

    await supabase.from("competition").update({ current_day: dayNumber }).eq("id", competition.id);

    if (!game) return;

    if (isFinal) {
      await announce(competition.id, game.id, "final_day", "FINAL DAY",
        `Only ${activePlayers[0].name} and ${activePlayers[1].name} remain. The admin will set the final rules.`);
    } else {
      const [a] = pickRandom(activePlayers, 1);
      await supabase.from("active_tags").insert([
        { daily_game_id: game.id, current_it_player_id: a.id, tag_slot: 1, started_at: now.toISOString() },
      ]);
      await supabase.from("daily_games").update({ starting_it_ids: [a.id] }).eq("id", game.id);
      await announce(competition.id, game.id, "day_start", `DAY ${dayNumber}`,
        `${a.name} is IT! The game is live.`);
      // Maybe create a random event
      await maybeCreateEvent(competition, game, activePlayers);
    }
  }
}

async function endDay(competition: any, game: any) {
  const now = new Date();
  // Current IT player.
  const { data: slots } = await supabase
    .from("active_tags")
    .select("*")
    .eq("daily_game_id", game.id)
    .order("tag_slot");

  let eliminatedId: string | null = null;
  if (slots && slots.length > 0) {
    eliminatedId = slots[0].current_it_player_id;
  }

  const finalItIds = slots?.map((s) => s.current_it_player_id) ?? [];
  await supabase
    .from("daily_games")
    .update({ status: "ended", ended_at: now.toISOString(), eliminated_player_id: eliminatedId, final_it_ids: finalItIds })
    .eq("id", game.id);

  if (eliminatedId) {
    await supabase
      .from("players")
      .update({ status: "eliminated", eliminated_day: game.day_number, eliminated_at: now.toISOString() })
      .eq("id", eliminatedId);
  }

  // Names for announcement.
  const { data: players } = await supabase.from("players").select("*");
  const nameOf = (id: string | null) => players?.find((p) => p.id === id)?.name ?? "Unknown";
  const itName = slots?.length ? nameOf(slots[0].current_it_player_id) : "Unknown";
  const remaining = (players ?? []).filter((p) => p.status === "active").length;

  await announce(
    competition.id,
    game.id,
    "day_result",
    `DAY ${game.day_number} RESULTS`,
    `${itName} was IT at the end and has been eliminated. ${remaining} players remaining.`,
  );

  // Resolve events at day end
  await resolveEventsAtDayEnd(competition, game);

  // Award survival XP to remaining active players
  await awardSurvivalXp(competition, game);

  // Generate daily recap
  await generateDailyRecap(competition, game);

  // If exactly one active player remains, the competition is over.
  if (remaining === 1) {
    const winner = (players ?? []).find((p) => p.status === "active");
    await supabase.from("competition").update({ status: "finished" }).eq("id", competition.id);
    await announce(competition.id, game.id, "winner", "WE HAVE A WINNER",
      `${winner?.name ?? "Unknown"} is the last player standing and wins TAG!`);
  }
}

async function getSnapshot() {
  const { competition, players } = await loadState();
  if (!competition) return { error: "no_competition" };

  const now = new Date();
  const tz = competition.timezone;
  const local = tzParts(now, tz);
  const curMin = local.hour * 60 + local.minute;
  const defaultStart = parseHM(competition.start_time);
  const defaultEnd = parseHM(competition.end_time);
  const startMin = dayStartMin(local.weekday, defaultStart);
  const endMin = dayEndMin(local.weekday, defaultEnd);
  const windowActive = isWeekday(local.weekday) && curMin >= startMin && curMin < endMin && competition.status === "active";

  const { data: latest } = await supabase
    .from("daily_games")
    .select("*")
    .eq("competition_id", competition.id)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let activeTags: any[] = [];
  let recentTags: any[] = [];
  if (latest) {
    const { data: at } = await supabase.from("active_tags").select("*").eq("daily_game_id", latest.id).order("tag_slot");
    activeTags = at ?? [];
    const { data: rt } = await supabase
      .from("tags")
      .select("*")
      .eq("daily_game_id", latest.id)
      .order("created_at", { ascending: false })
      .limit(20);
    recentTags = rt ?? [];
  }

  const { data: allGames } = await supabase
    .from("daily_games")
    .select("*")
    .eq("competition_id", competition.id)
    .order("day_number", { ascending: false });

  const { data: allTags } = await supabase
    .from("tags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("competition_id", competition.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: schedules } = await supabase.from("player_schedules").select("*");

  const { data: joinRequestsRaw } = await supabase
    .from("player_join_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: revivesRaw } = await supabase
    .from("revives")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(100);

  const { data: gameEventsRaw } = await supabase
    .from("game_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: xpEventsRaw } = await supabase
    .from("player_xp_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: dailyRecapsRaw } = await supabase
    .from("daily_recaps")
    .select("*")
    .order("day_number", { ascending: false })
    .limit(50);

  const { data: playerTitlesRaw } = await supabase
    .from("player_titles")
    .select("*");

  const { data: chatMessagesRaw } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: activityFeedRaw } = await supabase
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: appUpdatesRaw } = await supabase
    .from("app_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: specialEventsRaw } = await supabase
    .from("special_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: playerUpdateViewsRaw } = await supabase
    .from("player_update_views")
    .select("*");

  const { data: attendanceRaw } = await supabase
    .from("attendance")
    .select("*");

  return {
    serverTime: now.getTime(),
    competition,
    players,
    today: latest,
    activeTags,
    recentTags,
    allTags: allTags ?? [],
    allGames: allGames ?? [],
    announcements: announcements ?? [],
    schedules: (schedules ?? []).map((s: any) => ({
      playerId: s.player_id,
      period1: s.period1,
      period2: s.period2,
      period3: s.period3,
      period4: s.period4,
      period5Type: s.period5_type,
      period5: s.period5,
      period6: s.period6,
      period7: s.period7,
      scheduleCompleted: s.schedule_completed,
      updatedAt: s.updated_at,
    })),
    schedule: { startMin, endMin, curMin, localDate: local.dateStr, weekday: local.weekday, windowActive },
    joinRequests: (joinRequestsRaw ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      status: r.status,
      requestedDeviceId: r.requested_device_id,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      rejectionReason: r.rejection_reason,
    })),
    revives: (revivesRaw ?? []).map((r: any) => ({
      id: r.id,
      challengerPlayerId: r.challenger_player_id,
      opponentPlayerId: r.opponent_player_id,
      grade: r.grade,
      status: r.status,
      winnerPlayerId: r.winner_player_id,
      loserPlayerId: r.loser_player_id,
      requestedAt: r.requested_at,
      acceptedAt: r.accepted_at,
      completedAt: r.completed_at,
    })),
    gameEvents: (gameEventsRaw ?? []).map((e: any) => ({
      id: e.id,
      dailyGameId: e.daily_game_id,
      eventType: e.event_type,
      status: e.status,
      selectedPlayerIds: e.selected_player_ids ?? [],
      winnerPlayerId: e.winner_player_id,
      rewardXp: e.reward_xp,
      metadata: e.metadata,
      createdAt: e.created_at,
      completedAt: e.completed_at,
    })),
    xpEvents: (xpEventsRaw ?? []).map((e: any) => ({
      id: e.id,
      playerId: e.player_id,
      eventType: e.event_type,
      xpAmount: e.xp_amount,
      description: e.description,
      relatedTagId: e.related_tag_id,
      relatedEventId: e.related_event_id,
      createdAt: e.created_at,
    })),
    dailyRecaps: (dailyRecapsRaw ?? []).map((r: any) => ({
      id: r.id,
      dailyGameId: r.daily_game_id,
      dayNumber: r.day_number,
      topTaggerId: r.top_tagger_id,
      topTaggerCount: r.top_tagger_count,
      mostTaggedId: r.most_tagged_id,
      mostTaggedCount: r.most_tagged_count,
      eventType: r.event_type,
      eventWinnerId: r.event_winner_id,
      revivesWon: r.revives_won,
      playersEliminated: r.players_eliminated,
      createdAt: r.created_at,
    })),
    playerTitles: (playerTitlesRaw ?? []).map((t: any) => ({
      id: t.id,
      playerId: t.player_id,
      title: t.title,
      unlockedAt: t.unlocked_at,
    })),
    chatMessages: (chatMessagesRaw ?? []).map((m: any) => ({
      id: m.id,
      playerId: m.player_id,
      playerName: m.player_name,
      message: m.message,
      isSystem: m.is_system,
      createdAt: m.created_at,
    })),
    activityFeed: (activityFeedRaw ?? []).map((a: any) => ({
      id: a.id,
      activityType: a.activity_type,
      description: a.description,
      playerId: a.player_id,
      playerName: a.player_name,
      relatedTagId: a.related_tag_id,
      relatedEventId: a.related_event_id,
      createdAt: a.created_at,
    })),
    appUpdates: (appUpdatesRaw ?? []).map((u: any) => ({
      id: u.id,
      titleEn: u.title_en,
      titleEs: u.title_es,
      descriptionEn: u.description_en,
      descriptionEs: u.description_es,
      category: u.category,
      version: u.version,
      published: u.published,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
    specialEvents: (specialEventsRaw ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      startTime: e.start_time,
      endTime: e.end_time,
      hunterPlayerIds: e.hunter_player_ids ?? [],
      targetPlayerIds: e.target_player_ids ?? [],
      taggedPlayerIds: e.tagged_player_ids ?? [],
      objective: e.objective,
      rewardXp: e.reward_xp,
      overrideRandom: e.override_random,
      status: e.status,
      metadata: e.metadata,
      createdAt: e.created_at,
      completedAt: e.completed_at,
    })),
    playerUpdateViews: (playerUpdateViewsRaw ?? []).map((v: any) => ({
      id: v.id,
      playerId: v.player_id,
      updateId: v.update_id,
      viewedAt: v.viewed_at,
    })),
    attendance: (attendanceRaw ?? []).map((a: any) => ({
      id: a.id,
      playerId: a.player_id,
      date: a.date,
      status: a.status,
      leftAt: a.left_at,
      updatedAt: a.updated_at,
    })),
  };
}

function gameIsLive(snap: any): boolean {
  return (
    snap.competition.status === "active" &&
    snap.today &&
    snap.today.status === "running" &&
    snap.schedule.windowActive
  );
}

// ---- action handlers ----

async function handleClaim(body: any) {
  const { player_id, device_id } = body;
  const { data: player } = await supabase.from("players").select("*").eq("id", player_id).maybeSingle();
  if (!player) return json({ error: "player_not_found" }, 404);
  if (player.claimed_device_id && player.claimed_device_id !== device_id) {
    return json({ error: "already_claimed", conflict: true }, 409);
  }
  await supabase.from("players").update({ claimed_device_id: device_id }).eq("id", player_id);
  return json({ ok: true });
}

async function handleTag(body: any) {
  const { tagger_id, tagged_player_id } = body;
  const snap = await getSnapshot();
  if ("error" in snap) return json(snap, 400);
  if (!gameIsLive(snap)) return json({ error: "game_not_live" }, 400);

  const slot = snap.activeTags.find((t: any) => t.current_it_player_id === tagger_id);
  if (!slot) return json({ error: "not_it" }, 403);

  const target = snap.players.find((p: any) => p.id === tagged_player_id);
  if (!target || target.status !== "active") return json({ error: "invalid_target" }, 400);

  // Attendance check: both tagger and target must be available today
  const attendanceMap = await getTodayAttendance(snap.today.date);
  const now = new Date();
  if (!isPlayerAvailable(attendanceMap, tagger_id, now)) return json({ error: "tagger_unavailable" }, 400);
  if (!isPlayerAvailable(attendanceMap, tagged_player_id, now)) return json({ error: "target_unavailable" }, 400);

  // Check for active special event with no-tag-back for hunters
  const { data: specialEvents } = await supabase.from("special_events").select("*").eq("status", "active");
  const activeSpecial = (specialEvents ?? []).find((e: any) => e.hunter_player_ids?.includes(tagger_id));

  // No tag back: the current IT cannot tag the player who tagged them.
  // Exception: special event hunters can tag anyone (no tag back restriction).
  if (!activeSpecial) {
    const lastConfirmed = snap.recentTags.find((t: any) => t.status === "confirmed");
    if (lastConfirmed && lastConfirmed.tagged_player_id === tagger_id && lastConfirmed.tagger_id === tagged_player_id) {
      return json({ error: "no_tag_back" }, 400);
    }
  }

  // Tag is immediately confirmed — no acceptance step.
  const tagTime = new Date().toISOString();
  const { data: tag } = await supabase
    .from("tags")
    .insert({
      daily_game_id: snap.today.id,
      tag_slot: 1,
      tagger_id,
      tagged_player_id,
      status: "confirmed",
      confirmed_at: tagTime,
    })
    .select()
    .maybeSingle();

  // Transfer IT to the tagged player immediately.
  await supabase
    .from("active_tags")
    .update({ current_it_player_id: tagged_player_id, started_at: tagTime })
    .eq("daily_game_id", snap.today.id)
    .eq("tag_slot", 1);

  // Award +10 XP for the tag
  await awardXp(tagger_id, 10, "TAG", "Successful tag", tag.id);

  // Post activity feed entry
  const taggerName = snap.players.find((p: any) => p.id === tagger_id)?.name ?? "Unknown";
  const taggedName = target.name;
  await postActivity("TAG", `${taggerName} tagged ${taggedName}`, tagger_id, taggerName, tag.id);
  await postSystemChat(snap.competition.id, `${taggerName} tagged ${taggedName}`);

  // Handle special event progress (2 vs Everybody)
  if (activeSpecial) {
    const taggedIds: string[] = activeSpecial.tagged_player_ids ?? [];
    if (!taggedIds.includes(tagged_player_id) && !activeSpecial.hunter_player_ids.includes(tagged_player_id)) {
      taggedIds.push(tagged_player_id);
      const totalTargets = activeSpecial.target_player_ids.length;
      await supabase.from("special_events").update({ tagged_player_ids: taggedIds }).eq("id", activeSpecial.id);
      await postActivity("SPECIAL_EVENT_TAG", `${taggerName} tagged ${taggedName} — ${taggedIds.length}/${totalTargets}`, tagger_id, taggerName, tag.id);
      // Check completion
      if (taggedIds.length >= totalTargets) {
        await supabase.from("special_events").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", activeSpecial.id);
        await announce(snap.competition.id, snap.today.id, "event", "2 VS EVERYBODY COMPLETED!", "All targets have been tagged!");
        await postActivity("SPECIAL_EVENT_COMPLETE", "2 vs Everybody — COMPLETED!");
        await postSystemChat(snap.competition.id, "2 vs Everybody — COMPLETED! All targets tagged!");
      }
    }
  }

  // Resolve any events triggered by this tag
  await resolveEventOnTag(snap.competition, snap.today, tagger_id, tagged_player_id, tag.id);

  // Check title unlocks for tagger
  await checkAndUnlockTitles(tagger_id);

  return json({ ok: true, tag });
}

async function requireAdmin(body: any) {
  const { data: competition } = await supabase.from("competition").select("*").limit(1).maybeSingle();
  if (!competition) return null;
  if (body.pin !== competition.admin_pin) return null;
  return competition;
}

async function handleAdmin(action: string, body: any) {
  const competition = await requireAdmin(body);
  if (!competition) return json({ error: "unauthorized" }, 401);

  const { data: players } = await supabase.from("players").select("*").order("sort_order");
  const nameOf = (id: string | null) => players?.find((p) => p.id === id)?.name ?? "Unknown";
  const now = new Date();
  const tz = competition.timezone;
  const local = tzParts(now, tz);
  const validStatuses = ["present", "absent", "left_early", "unknown"];

  const latest = (
    await supabase.from("daily_games").select("*").eq("competition_id", competition.id)
      .order("day_number", { ascending: false }).limit(1).maybeSingle()
  ).data;

  switch (action) {
    case "start_day": {
      if (latest && latest.date === local.dateStr && latest.status === "running") {
        return json({ error: "already_running" }, 400);
      }
      const activePlayers = (players ?? []).filter((p) => p.status === "active");
      if (activePlayers.length < 2) return json({ error: "not_enough_players" }, 400);
      const dayNumber = (latest?.day_number ?? 0) + 1;
      const isFinal = activePlayers.length === 2;
      const { data: game } = await supabase.from("daily_games").insert({
        competition_id: competition.id,
        day_number: dayNumber,
        date: local.dateStr,
        status: isFinal ? "final_pending" : "running",
        is_final: isFinal,
        started_at: now.toISOString(),
      }).select().maybeSingle();
      await supabase.from("competition").update({ current_day: dayNumber, status: "active" }).eq("id", competition.id);
      if (game && !isFinal) {
        const [a] = pickRandom(activePlayers, 1);
        await supabase.from("active_tags").insert([
          { daily_game_id: game.id, current_it_player_id: a.id, tag_slot: 1 },
        ]);
        await supabase.from("daily_games").update({ starting_it_ids: [a.id] }).eq("id", game.id);
        await announce(competition.id, game.id, "day_start", `DAY ${dayNumber}`, `${a.name} is IT!`);
      } else if (game && isFinal) {
        await announce(competition.id, game.id, "final_day", "FINAL DAY", "The final two remain. Admin sets the rules.");
      }
      return json({ ok: true });
    }
    case "end_day": {
      if (!latest || latest.status !== "running") return json({ error: "no_running_game" }, 400);
      await endDay(competition, latest);
      return json({ ok: true });
    }
    case "pause": {
      await supabase.from("competition").update({ status: "paused" }).eq("id", competition.id);
      await announce(competition.id, latest?.id ?? null, "info", "GAME PAUSED", "Tagging is temporarily paused by the admin.");
      return json({ ok: true });
    }
    case "resume": {
      await supabase.from("competition").update({ status: "active" }).eq("id", competition.id);
      await announce(competition.id, latest?.id ?? null, "info", "GAME RESUMED", "Tagging is back on.");
      return json({ ok: true });
    }
    case "set_it": {
      const { player_id } = body;
      if (!latest) return json({ error: "no_game" }, 400);
      // Remove any extra slots, keep only slot 1.
      await supabase.from("active_tags").delete().eq("daily_game_id", latest.id).neq("tag_slot", 1);
      const existing = (await supabase.from("active_tags").select("*").eq("daily_game_id", latest.id).eq("tag_slot", 1).maybeSingle()).data;
      if (existing) {
        await supabase.from("active_tags").update({ current_it_player_id: player_id, started_at: now.toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("active_tags").insert({ daily_game_id: latest.id, current_it_player_id: player_id, tag_slot: 1 });
      }
      await announce(competition.id, latest.id, "info", "IT CHANGED", `${nameOf(player_id)} is now IT.`);
      return json({ ok: true });
    }
    case "undo_tag": {
      const { tag_id } = body;
      const tag = (await supabase.from("tags").select("*").eq("id", tag_id).maybeSingle()).data;
      if (!tag) return json({ error: "not_found" }, 404);
      await supabase.from("tags").update({ status: "undone" }).eq("id", tag_id);
      // Restore the tagger to IT.
      await supabase.from("active_tags").update({ current_it_player_id: tag.tagger_id, started_at: now.toISOString() })
        .eq("daily_game_id", tag.daily_game_id).eq("tag_slot", 1);
      await announce(competition.id, tag.daily_game_id, "info", "TAG UNDONE", `A tag was undone by the admin. ${nameOf(tag.tagger_id)} is IT again.`);
      return json({ ok: true });
    }
    case "restore_player": {
      const { player_id } = body;
      await supabase.from("players").update({ status: "active", eliminated_day: null, eliminated_at: null }).eq("id", player_id);
      // If this player was recorded as a day's eliminated player, clear it.
      await supabase.from("daily_games").update({ eliminated_player_id: null }).eq("eliminated_player_id", player_id);
      await supabase.from("competition").update({ status: "active" }).eq("id", competition.id);
      await announce(competition.id, latest?.id ?? null, "info", "PLAYER RESTORED", `${nameOf(player_id)} has been restored to the game.`);
      return json({ ok: true });
    }
    case "rerun_elimination": {
      if (!latest || latest.status !== "ended") return json({ error: "no_ended_game" }, 400);
      // Restore previously eliminated player from this day, then re-run.
      if (latest.eliminated_player_id) {
        await supabase.from("players").update({ status: "active", eliminated_day: null, eliminated_at: null })
          .eq("id", latest.eliminated_player_id);
      }
      const slots = (await supabase.from("active_tags").select("*").eq("daily_game_id", latest.id).eq("tag_slot", 1)).data ?? [];
      const itIds = slots.map((s) => s.current_it_player_id);
      const chosen = itIds.length ? itIds[0] : null;
      await supabase.from("daily_games").update({ eliminated_player_id: chosen }).eq("id", latest.id);
      if (chosen) {
        await supabase.from("players").update({ status: "eliminated", eliminated_day: latest.day_number, eliminated_at: now.toISOString() }).eq("id", chosen);
      }
      await announce(competition.id, latest.id, "day_result", `DAY ${latest.day_number} RE-RUN`, `${nameOf(chosen)} has been eliminated.`);
      return json({ ok: true });
    }
    case "announce": {
      await announce(competition.id, latest?.id ?? null, "custom", body.title ?? "ANNOUNCEMENT", body.message ?? "");
      return json({ ok: true });
    }
    case "reset_device": {
      const { player_id } = body;
      await supabase.from("players").update({ claimed_device_id: null }).eq("id", player_id);
      return json({ ok: true });
    }
    case "final_winner": {
      const { player_id } = body;
      if (!latest) return json({ error: "no_game" }, 400);
      const activePlayers = (players ?? []).filter((p) => p.status === "active");
      const loser = activePlayers.find((p) => p.id !== player_id);
      if (loser) {
        await supabase.from("players").update({ status: "eliminated", eliminated_day: latest.day_number, eliminated_at: now.toISOString() }).eq("id", loser.id);
      }
      await supabase.from("daily_games").update({ status: "final_done", ended_at: now.toISOString(), eliminated_player_id: loser?.id ?? null }).eq("id", latest.id);
      await supabase.from("competition").update({ status: "finished" }).eq("id", competition.id);
      await announce(competition.id, latest.id, "winner", "WE HAVE A WINNER", `${nameOf(player_id)} wins TAG! ${loser ? nameOf(loser.id) + " finishes second." : ""}`);
      return json({ ok: true });
    }
    case "set_timezone": {
      await supabase.from("competition").update({ timezone: body.timezone }).eq("id", competition.id);
      return json({ ok: true });
    }
    case "add_player": {
      const name = (body.name ?? "").toString().trim();
      if (!name) return json({ error: "name_required" }, 400);
      const grade = (body.grade ?? "").toString().trim();
      const validGrades = ["Freshman", "Sophomore", "Junior", "Senior"];
      if (!validGrades.includes(grade)) return json({ error: "grade_required" }, 400);

      // Case-insensitive duplicate name check.
      const existing = (players ?? []).find(
        (p: any) => p.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) return json({ error: "name_exists" }, 409);

      const { error: insertError } = await supabase.from("players").insert({
        name,
        grade,
        rank: "Unranked",
        sort_order: (players?.length ?? 0) + 1,
      });
      if (insertError) return json({ error: "name_exists" }, 409);
      await announce(competition.id, latest?.id ?? null, "info", "NEW PLAYER", `${name} joined the game.`);
      return json({ ok: true });
    }
    case "set_rank": {
      // Rank is now auto-determined by XP. Ignore manual rank changes.
      return json({ ok: true });
    }
    case "delete_player": {
      const { player_id } = body;
      if (!player_id) return json({ error: "player_id_required" }, 400);
      const target = (players ?? []).find((p) => p.id === player_id);
      if (!target) return json({ error: "player_not_found" }, 404);

      // Block removal if this player is currently IT.
      if (latest) {
        const { data: activeIt } = await supabase
          .from("active_tags")
          .select("current_it_player_id")
          .eq("daily_game_id", latest.id)
          .eq("tag_slot", 1)
          .maybeSingle();
        if (activeIt && activeIt.current_it_player_id === player_id) {
          return json({ error: "player_is_it" }, 400);
        }
      }

      // Remove the player from the game by marking them eliminated.
      // This keeps their record in the database (tag history, etc.) but
      // removes them from active play, roster, and login.
      await supabase
        .from("players")
        .update({
          status: "eliminated",
          eliminated_day: latest?.day_number ?? null,
          eliminated_at: now.toISOString(),
          claimed_device_id: null,
        })
        .eq("id", player_id);

      // Remove their schedule so they don't appear in schedule views.
      await supabase.from("player_schedules").delete().eq("player_id", player_id);

      await announce(competition.id, latest?.id ?? null, "info", "PLAYER REMOVED", `${target.name} has been removed from the game.`);
      return json({ ok: true });
    }
    case "approve_join_request": {
      const { request_id } = body;
      if (!request_id) return json({ error: "request_id_required" }, 400);

      const { data: req } = await supabase
        .from("player_join_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();
      if (!req) return json({ error: "request_not_found" }, 404);
      if (req.status !== "pending") return json({ error: "request_not_pending" }, 400);

      // Re-check no duplicate player name
      const dup = (players ?? []).some((p: any) => p.name.toLowerCase() === req.name.toLowerCase());
      if (dup) return json({ error: "name_exists" }, 409);

      // Create the official player
      const { error: insertErr } = await supabase.from("players").insert({
        name: req.name,
        grade: req.grade,
        rank: "Unranked",
        status: "active",
        sort_order: (players?.length ?? 0) + 1,
      });
      if (insertErr) return json({ error: "name_exists" }, 409);

      // Mark request as approved
      await supabase
        .from("player_join_requests")
        .update({ status: "approved", reviewed_at: now.toISOString() })
        .eq("id", request_id);

      await announce(competition.id, latest?.id ?? null, "info", "NEW PLAYER", `${req.name} joined the game.`);
      return json({ ok: true });
    }
    case "reject_join_request": {
      const { request_id } = body;
      if (!request_id) return json({ error: "request_id_required" }, 400);

      const { data: req } = await supabase
        .from("player_join_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();
      if (!req) return json({ error: "request_not_found" }, 404);
      if (req.status !== "pending") return json({ error: "request_not_pending" }, 400);

      await supabase
        .from("player_join_requests")
        .update({ status: "rejected", reviewed_at: now.toISOString() })
        .eq("id", request_id);

      return json({ ok: true });
    }
    case "complete_revive": {
      const { revive_id, winner_player_id } = body;
      if (!revive_id || !winner_player_id) return json({ error: "missing_data" }, 400);

      const { data: revive } = await supabase.from("revives").select("*").eq("id", revive_id).maybeSingle();
      if (!revive) return json({ error: "revive_not_found" }, 404);
      if (revive.status !== "accepted") return json({ error: "revive_not_active" }, 400);

      // Winner must be one of the two participants
      if (winner_player_id !== revive.challenger_player_id && winner_player_id !== revive.opponent_player_id) {
        return json({ error: "invalid_winner" }, 400);
      }

      const loserId = winner_player_id === revive.challenger_player_id
        ? revive.opponent_player_id
        : revive.challenger_player_id;

      // Revive the winner
      await supabase.from("players").update({
        status: "active",
        eliminated_day: null,
        eliminated_at: null,
      }).eq("id", winner_player_id);

      // Mark revive completed
      await supabase.from("revives").update({
        status: "completed",
        winner_player_id,
        loser_player_id: loserId,
        completed_at: now.toISOString(),
      }).eq("id", revive_id);

      await announce(competition.id, latest?.id ?? null, "revive", "REVIVE!",
        `${nameOf(winner_player_id)} won a revive against ${nameOf(loserId)} and is back in the game!`);

      // Award +40 XP for revive win (unique constraint on related_tag_id prevents duplicates;
      // we use revive_id as related_tag_id since revives aren't tags)
      const { error: xpErr } = await supabase.from("player_xp_events").insert({
        player_id: winner_player_id,
        event_type: "REVIVE_WIN",
        xp_amount: 40,
        description: `Revive win vs ${nameOf(loserId)}`,
        related_tag_id: revive_id,
      });
      if (!xpErr) {
        const { data: p } = await supabase.from("players").select("xp").eq("id", winner_player_id).maybeSingle();
        if (p) {
          const newXp = (p.xp ?? 0) + 40;
          await supabase.from("players").update({ xp: newXp, rank: rankFromXp(newXp) }).eq("id", winner_player_id);
        }
      }
      await checkAndUnlockTitles(winner_player_id);

      return json({ ok: true });
    }
    case "cancel_revive": {
      const { revive_id } = body;
      if (!revive_id) return json({ error: "missing_data" }, 400);

      const { data: revive } = await supabase.from("revives").select("*").eq("id", revive_id).maybeSingle();
      if (!revive) return json({ error: "revive_not_found" }, 404);
      if (!["pending", "accepted"].includes(revive.status)) return json({ error: "revive_not_active" }, 400);

      await supabase.from("revives").update({
        status: "cancelled",
        completed_at: now.toISOString(),
      }).eq("id", revive_id);

      return json({ ok: true });
    }
    case "cancel_event": {
      const { event_id } = body;
      if (!event_id) return json({ error: "missing_data" }, 400);
      const { data: ev } = await supabase.from("game_events").select("*").eq("id", event_id).maybeSingle();
      if (!ev) return json({ error: "event_not_found" }, 404);
      if (ev.status === "completed") return json({ error: "event_completed" }, 400);
      await supabase.from("game_events").update({ status: "cancelled" in ev ? "expired" : "failed", completed_at: now.toISOString() }).eq("id", event_id);
      await announce(competition.id, latest?.id ?? null, "event", "EVENT CANCELLED", `Admin cancelled the ${ev.event_type} event.`);
      return json({ ok: true });
    }
    case "force_complete_event": {
      const { event_id, winner_player_id } = body;
      if (!event_id) return json({ error: "missing_data" }, 400);
      const { data: ev } = await supabase.from("game_events").select("*").eq("id", event_id).maybeSingle();
      if (!ev) return json({ error: "event_not_found" }, 404);
      if (ev.status === "completed") return json({ error: "event_completed" }, 400);
      await supabase.from("game_events").update({ status: "completed", winner_player_id: winner_player_id ?? null, completed_at: now.toISOString() }).eq("id", event_id);
      // Award XP if a winner is specified and not already awarded
      if (winner_player_id) {
        const xpMap: Record<string, number> = { "MOST_WANTED": 25, "DOUBLE_BOUNTY": 50, "SURVIVOR": 25, "KING_OF_THE_DAY": 50, "RIVALRY": 30 };
        const xpTypeMap: Record<string, string> = { "MOST_WANTED": "BOUNTY", "DOUBLE_BOUNTY": "DOUBLE_BOUNTY", "SURVIVOR": "SURVIVOR_WIN", "KING_OF_THE_DAY": "KING_OF_THE_DAY", "RIVALRY": "RIVALRY_WIN" };
        const amt = xpMap[ev.event_type] ?? 0;
        const xpType = xpTypeMap[ev.event_type] ?? ev.event_type;
        if (amt > 0) await awardXp(winner_player_id, amt, xpType, `Admin force-complete: ${ev.event_type}`, undefined, ev.id);
      }
      await announce(competition.id, latest?.id ?? null, "event", "EVENT COMPLETED", `Admin completed the ${ev.event_type} event.`);
      return json({ ok: true });
    }
    case "set_rank": {
      // Rank is now auto-determined by XP. Ignore manual rank changes.
      return json({ ok: true });
    }
    case "create_special_event": {
      const { name, date, start_time, end_time, hunter_player_ids, target_player_ids, objective, reward_xp, override_random } = body;
      if (!name || !date) return json({ error: "missing_data" }, 400);
      await supabase.from("special_events").insert({
        name,
        date,
        start_time: start_time || "07:14",
        end_time: end_time || "14:25",
        hunter_player_ids: hunter_player_ids ?? [],
        target_player_ids: target_player_ids ?? [],
        objective: objective ?? "",
        reward_xp: reward_xp ?? 0,
        override_random: override_random !== false,
        status: "scheduled",
      });
      await announce(competition.id, latest?.id ?? null, "event", "SPECIAL EVENT SCHEDULED", `${name} scheduled for ${date}.`);
      return json({ ok: true });
    }
    case "create_update": {
      const { title_en, title_es, description_en, description_es, category, version } = body;
      if (!title_en || !title_es) return json({ error: "missing_data" }, 400);
      await supabase.from("app_updates").insert({
        title_en,
        title_es,
        description_en: description_en ?? "",
        description_es: description_es ?? "",
        category: category ?? "improvement",
        version: version ?? null,
        published: true,
      });
      return json({ ok: true });
    }
    case "delete_update": {
      const { update_id } = body;
      if (!update_id) return json({ error: "missing_data" }, 400);
      await supabase.from("app_updates").delete().eq("id", update_id);
      return json({ ok: true });
    }
    case "delete_chat_msg": {
      const { message_id } = body;
      if (!message_id) return json({ error: "missing_data" }, 400);
      await supabase.from("chat_messages").delete().eq("id", message_id);
      return json({ ok: true });
    }
    case "set_attendance": {
      const { player_id, status, left_at } = body;
      if (!player_id) return json({ error: "missing_data" }, 400);
      if (!validStatuses.includes(status)) return json({ error: "invalid_status" }, 400);
      const dateStr = local.dateStr;
      const { data: existing } = await supabase
        .from("attendance").select("*").eq("player_id", player_id).eq("date", dateStr).maybeSingle();

      const oldStatus = existing?.status ?? null;
      const oldLeftAt = existing?.left_at ?? null;
      const newLeftAt = status === "left_early"
        ? (left_at ? new Date(left_at).toISOString() : new Date().toISOString())
        : null;

      await supabase.from("attendance").upsert({
        player_id,
        date: dateStr,
        status,
        left_at: newLeftAt,
        updated_at: new Date().toISOString(),
        updated_by: "admin",
      }, { onConflict: "player_id,date" });

      await supabase.from("attendance_audit").insert({
        player_id,
        date: dateStr,
        old_status: oldStatus,
        new_status: status,
        old_left_at: oldLeftAt,
        new_left_at: newLeftAt,
        changed_by: "admin",
      });

      // If player is marked absent or left_early, remove them from active special event target pools
      if (status === "absent" || status === "left_early") {
        const { data: activeSpecials } = await supabase.from("special_events").select("*").eq("status", "active");
        for (const se of activeSpecials ?? []) {
          if (se.target_player_ids?.includes(player_id)) {
            // If already tagged, keep them in tagged list — don't remove historical tags
            // Just remove from remaining targets
            const newTargets = se.target_player_ids.filter((id: string) => id !== player_id);
            const taggedIds = se.tagged_player_ids ?? [];
            await supabase.from("special_events").update({
              target_player_ids: newTargets,
            }).eq("id", se.id);
            // Check if completion is now met
            if (taggedIds.length >= newTargets.length && newTargets.length > 0) {
              await supabase.from("special_events").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", se.id);
              await announce(competition.id, latest?.id ?? null, "event", "2 VS EVERYBODY COMPLETED!", "All remaining targets have been tagged!");
            }
          }
        }
      }

      return json({ ok: true });
    }
    case "bulk_attendance": {
      const { updates } = body as { updates: { player_id: string; status: string }[] };
      if (!updates || !Array.isArray(updates)) return json({ error: "missing_data" }, 400);
      const dateStr = local.dateStr;
      for (const u of updates) {
        if (!u.player_id || !validStatuses.includes(u.status)) continue;
        const { data: existing } = await supabase
          .from("attendance").select("*").eq("player_id", u.player_id).eq("date", dateStr).maybeSingle();
        const oldStatus = existing?.status ?? null;
        const oldLeftAt = existing?.left_at ?? null;
        const newLeftAt = u.status === "left_early" ? new Date().toISOString() : null;
        await supabase.from("attendance").upsert({
          player_id: u.player_id,
          date: dateStr,
          status: u.status,
          left_at: newLeftAt,
          updated_at: new Date().toISOString(),
          updated_by: "admin",
        }, { onConflict: "player_id,date" });
        await supabase.from("attendance_audit").insert({
          player_id: u.player_id,
          date: dateStr,
          old_status: oldStatus,
          new_status: u.status,
          old_left_at: oldLeftAt,
          new_left_at: newLeftAt,
          changed_by: "admin",
        });
      }
      return json({ ok: true });
    }
    case "mark_all_present": {
      const dateStr = local.dateStr;
      const activePlayers = (players ?? []).filter((p) => p.status === "active");
      for (const p of activePlayers) {
        const { data: existing } = await supabase
          .from("attendance").select("*").eq("player_id", p.id).eq("date", dateStr).maybeSingle();
        const oldStatus = existing?.status ?? null;
        await supabase.from("attendance").upsert({
          player_id: p.id,
          date: dateStr,
          status: "present",
          left_at: null,
          updated_at: new Date().toISOString(),
          updated_by: "admin",
        }, { onConflict: "player_id,date" });
        if (oldStatus !== "present") {
          await supabase.from("attendance_audit").insert({
            player_id: p.id,
            date: dateStr,
            old_status: oldStatus,
            new_status: "present",
            old_left_at: existing?.left_at ?? null,
            new_left_at: null,
            changed_by: "admin",
          });
        }
      }
      return json({ ok: true });
    }
    default:
      return json({ error: "unknown_admin_action" }, 400);
  }
}

async function handleRequestRevive(body: any) {
  const { challenger_player_id, opponent_player_id } = body;
  if (!challenger_player_id || !opponent_player_id) return json({ error: "missing_ids" }, 400);
  if (challenger_player_id === opponent_player_id) return json({ error: "cannot_challenge_self" }, 400);

  const { data: players } = await supabase.from("players").select("*");
  const challenger = (players ?? []).find((p) => p.id === challenger_player_id);
  const opponent = (players ?? []).find((p) => p.id === opponent_player_id);
  if (!challenger || !opponent) return json({ error: "player_not_found" }, 404);

  // Both must be eliminated
  if (challenger.status !== "eliminated") return json({ error: "not_eliminated" }, 400);
  if (opponent.status !== "eliminated") return json({ error: "opponent_not_eliminated" }, 400);

  // Check neither player has an active or pending revive
  const { data: existing } = await supabase
    .from("revives")
    .select("*")
    .in("status", ["pending", "accepted"])
    .or(`challenger_player_id.eq.${challenger_player_id},opponent_player_id.eq.${challenger_player_id},challenger_player_id.eq.${opponent_player_id},opponent_player_id.eq.${opponent_player_id}`);
  if (existing && existing.length > 0) return json({ error: "revive_already_active" }, 409);

  await supabase.from("revives").insert({
    challenger_player_id,
    opponent_player_id,
    grade: challenger.grade,
    status: "pending",
  });

  return json({ ok: true });
}

async function handleAcceptRevive(body: any) {
  const { revive_id, player_id } = body;
  if (!revive_id || !player_id) return json({ error: "missing_data" }, 400);

  const { data: revive } = await supabase.from("revives").select("*").eq("id", revive_id).maybeSingle();
  if (!revive) return json({ error: "revive_not_found" }, 404);
  if (revive.status !== "pending") return json({ error: "revive_not_pending" }, 400);

  // Only the opponent can accept
  if (player_id !== revive.opponent_player_id) return json({ error: "not_opponent" }, 403);

  await supabase.from("revives")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", revive_id);

  return json({ ok: true });
}

async function handleDeclineRevive(body: any) {
  const { revive_id, player_id } = body;
  if (!revive_id || !player_id) return json({ error: "missing_data" }, 400);

  const { data: revive } = await supabase.from("revives").select("*").eq("id", revive_id).maybeSingle();
  if (!revive) return json({ error: "revive_not_found" }, 404);
  if (revive.status !== "pending") return json({ error: "revive_not_pending" }, 400);

  // Only the opponent can decline
  if (player_id !== revive.opponent_player_id) return json({ error: "not_opponent" }, 403);

  await supabase.from("revives")
    .update({ status: "declined", completed_at: new Date().toISOString() })
    .eq("id", revive_id);

  return json({ ok: true });
}

async function handleRequestJoin(body: any) {
  const name = (body.name ?? "").toString().trim();
  if (!name) return json({ error: "name_required" }, 400);
  const grade = (body.grade ?? "").toString().trim();
  const validGrades = ["Freshman", "Sophomore", "Junior", "Senior"];
  if (!validGrades.includes(grade)) return json({ error: "grade_required" }, 400);
  const device_id = (body.device_id ?? "").toString() || null;

  // Check against existing approved players (case-insensitive)
  const { data: players } = await supabase.from("players").select("name");
  const exists = (players ?? []).some((p: any) => p.name.toLowerCase() === name.toLowerCase());
  if (exists) return json({ error: "name_exists" }, 409);

  // Check against existing pending requests (case-insensitive)
  const { data: pending } = await supabase
    .from("player_join_requests")
    .select("name, status")
    .eq("status", "pending");
  const pendingExists = (pending ?? []).some((r: any) => r.name.toLowerCase() === name.toLowerCase());
  if (pendingExists) return json({ error: "request_pending" }, 409);

  await supabase.from("player_join_requests").insert({
    name,
    grade,
    status: "pending",
    requested_device_id: device_id,
  });

  return json({ ok: true });
}

async function handleSaveSchedule(body: any) {
  const { player_id, schedule } = body;
  if (!player_id || !schedule) return json({ error: "missing_data" }, 400);
  const { data: player } = await supabase.from("players").select("id").eq("id", player_id).maybeSingle();
  if (!player) return json({ error: "player_not_found" }, 404);

  await supabase.from("player_schedules").upsert({
    player_id,
    period1: schedule.period1 ?? "",
    period2: schedule.period2 ?? "",
    period3: schedule.period3 ?? "",
    period4: schedule.period4 ?? "",
    period5_type: schedule.period5Type === "5B" ? "5B" : "5A",
    period5: schedule.period5 ?? "",
    period6: schedule.period6 ?? "",
    period7: schedule.period7 ?? "",
    schedule_completed: true,
    updated_at: new Date().toISOString(),
  });

  return json({ ok: true });
}

async function handleEquipTitle(body: any) {
  const { player_id, title } = body;
  if (!player_id) return json({ error: "missing_data" }, 400);

  // If title is null, just clear it
  if (!title) {
    await supabase.from("players").update({ equipped_title: null }).eq("id", player_id);
    return json({ ok: true });
  }

  // Verify the player has unlocked this title
  const { data: titleRecord } = await supabase
    .from("player_titles")
    .select("*")
    .eq("player_id", player_id)
    .eq("title", title)
    .maybeSingle();
  if (!titleRecord) return json({ error: "title_not_unlocked" }, 403);

  await supabase.from("players").update({ equipped_title: title }).eq("id", player_id);
  return json({ ok: true });
}

async function handleSendChat(body: any) {
  const { player_id, message } = body;
  const msg = (message ?? "").toString().trim();
  if (!msg) return json({ error: "empty_message" }, 400);
  if (msg.length > 300) return json({ error: "message_too_long" }, 400);
  if (!player_id) return json({ error: "missing_data" }, 400);

  const { data: player } = await supabase.from("players").select("name, status").eq("id", player_id).maybeSingle();
  if (!player) return json({ error: "player_not_found" }, 404);

  // Anti-spam: check last message timestamp (3 second cooldown)
  const { data: recent } = await supabase.from("chat_messages")
    .select("created_at").eq("player_id", player_id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (recent) {
    const elapsed = Date.now() - new Date(recent.created_at).getTime();
    if (elapsed < 3000) return json({ error: "spam_cooldown" }, 429);
  }

  await supabase.from("chat_messages").insert({
    player_id,
    player_name: player.name,
    message: msg,
    is_system: false,
  });

  return json({ ok: true });
}

async function handleMarkUpdateViewed(body: any) {
  const { player_id, update_id } = body;
  if (!player_id || !update_id) return json({ error: "missing_data" }, 400);

  await supabase.from("player_update_views").upsert({
    player_id,
    update_id,
    viewed_at: new Date().toISOString(),
  }, { onConflict: "player_id,update_id" });

  return json({ ok: true });
}

async function handleSetLanguage(body: any) {
  const { player_id, language } = body;
  if (!player_id) return json({ error: "missing_data" }, 400);
  const lang = language === "es" ? "es" : "en";
  await supabase.from("players").update({ language: lang }).eq("id", player_id);
  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "state";

    // Every request advances the server-authoritative schedule first.
    if (["state", "tag"].includes(action)) {
      await runSchedule();
    }

    switch (action) {
      case "state": {
        const snap = await getSnapshot();
        if ("error" in snap) return json(snap, 400);
        return json(snap);
      }
      case "claim":
        return await handleClaim(body);
      case "tag":
        return await handleTag(body);
      case "save_schedule":
        return await handleSaveSchedule(body);
      case "equip_title":
        return await handleEquipTitle(body);
      case "request_join":
        return await handleRequestJoin(body);
      case "request_revive":
        return await handleRequestRevive(body);
      case "accept_revive":
        return await handleAcceptRevive(body);
      case "decline_revive":
        return await handleDeclineRevive(body);
      case "send_chat":
        return await handleSendChat(body);
      case "mark_update_viewed":
        return await handleMarkUpdateViewed(body);
      case "set_language":
        return await handleSetLanguage(body);
      default:
        if (action.startsWith("admin_")) {
          return await handleAdmin(action.replace("admin_", ""), body);
        }
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});

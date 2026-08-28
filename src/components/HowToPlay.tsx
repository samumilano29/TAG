import { useState } from 'react';
import {
  HelpCircle, Clock, Hand, Tag, ShieldCheck, Skull, Zap, Trophy, Target,
  Heart, Users, Swords, Crown, MessageSquare, Activity, Bell, ChevronDown,
  Calendar, RefreshCw, AlertCircle, Star,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import type { Language } from '@/lib/i18n';
import type { GameSnapshot } from '@/lib/types';

interface Props {
  snapshot: GameSnapshot;
}

interface Section {
  id: string;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  content: (lang: Language) => React.ReactNode;
}

function scheduleRow(lang: Language, day: string, hours: string) {
  return (
    <div className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-2 text-sm">
      <span className="font-semibold text-white">{day}</span>
      <span className="text-ink-300">{hours}</span>
    </div>
  );
}

const faqs: { q: (lang: Language) => string; a: (lang: Language) => string }[] = [
  {
    q: (l) => l === 'es' ? '¿Por qué no puedo enviar un tag ahora?' : 'Why can\u2019t I submit a tag right now?',
    a: (l) => l === 'es' ? 'El juego solo funciona de lunes a viernes, 7:14 AM a 2:25 PM (1:15 PM los miércoles). Fuera de ese horario, las etiquetas están desactivadas.' : 'The game only runs Monday\u2013Friday, 7:14 AM to 2:25 PM (1:15 PM on Wednesdays). Outside those hours, tagging is disabled.',
  },
  {
    q: (l) => l === 'es' ? '¿Por qué está cerrado el juego?' : 'Why is the game closed?',
    a: (l) => l === 'es' ? 'Los sábados y domingos no hay juego. El juego también se pausa fuera del horario escolar.' : 'Saturdays and Sundays have no game. The game also pauses outside school hours.',
  },
  {
    q: (l) => l === 'es' ? '¿Por qué el miércoles es más corto?' : 'Why is Wednesday shorter?',
    a: (l) => l === 'es' ? 'El miércoles tiene un horario especial que termina a la 1:15 PM en lugar de las 2:25 PM.' : 'Wednesday has a special schedule that ends at 1:15 PM instead of 2:25 PM.',
  },
  {
    q: (l) => l === 'es' ? '¿Por qué no aumentó el progreso del evento?' : 'Why didn\u2019t my event progress increase?',
    a: (l) => l === 'es' ? 'Cada objetivo solo cuenta una vez. Etiquetar al mismo jugador otra vez no aumenta el progreso.' : 'Each target only counts once. Tagging the same player again doesn\u2019t increase progress.',
  },
  {
    q: (l) => l === 'es' ? '¿Puede el mismo jugador contar dos veces en un evento?' : 'Can the same player count twice in an event?',
    a: (l) => l === 'es' ? 'No. Cada jugador objetivo solo cuenta una vez por evento.' : 'No. Each target player only counts once per event.',
  },
  {
    q: (l) => l === 'es' ? '¿Por qué no hubo un Evento Aleatorio hoy?' : 'Why didn\u2019t a Random Event happen today?',
    a: (l) => l === 'es' ? 'Solo hay un 65% de probabilidad de que ocurra un evento aleatorio cada día. También puede ser anulado por un evento especial.' : 'There\u2019s only a 65% chance of a random event each day. It can also be overridden by a special event.',
  },
  {
    q: (l) => l === 'es' ? '¿Puede haber dos eventos en un día?' : 'Can there be two events in one day?',
    a: (l) => l === 'es' ? 'No. Solo puede haber un evento por día (aleatorio o especial).' : 'No. Only one event per day (random or special).',
  },
  {
    q: (l) => l === 'es' ? '¿Cómo cambio el idioma de la app?' : 'How do I change the app language?',
    a: (l) => l === 'es' ? 'Ve a Configuración y selecciona English o Español. El cambio es inmediato.' : 'Go to Settings and select English or Español. The change is immediate.',
  },
];

const sections: Section[] = [
  {
    id: 'objective',
    titleKey: 'howto.objective',
    icon: HelpCircle,
    content: (l) => l === 'es'
      ? 'TAG es un juego de persecución que se juega durante el horario escolar. Un jugador es "IT" y debe etiquetar a otros jugadores. Cada etiqueta válida te da XP. Sube de rango, gana recompensas, completa eventos y evita ser IT al final del día.'
      : 'TAG is a chase game played during school hours. One player is "IT" and must tag other players. Each valid tag earns you XP. Rank up, collect bounties, complete events, and avoid being IT at the end of the day.',
  },
  {
    id: 'schedule',
    titleKey: 'howto.schedule',
    icon: Calendar,
    content: (l) => (
      <div className="space-y-1.5">
        {scheduleRow(l, l === 'es' ? 'Lunes' : 'Monday', '7:14 AM – 2:25 PM')}
        {scheduleRow(l, l === 'es' ? 'Martes' : 'Tuesday', '7:14 AM – 2:25 PM')}
        {scheduleRow(l, l === 'es' ? 'Miércoles' : 'Wednesday', '7:14 AM – 1:15 PM')}
        {scheduleRow(l, l === 'es' ? 'Jueves' : 'Thursday', '7:14 AM – 2:25 PM')}
        {scheduleRow(l, l === 'es' ? 'Viernes' : 'Friday', '7:14 AM – 2:25 PM')}
        {scheduleRow(l, l === 'es' ? 'Sábado' : 'Saturday', l === 'es' ? 'Sin juego' : 'No game')}
        {scheduleRow(l, l === 'es' ? 'Domingo' : 'Sunday', l === 'es' ? 'Sin juego' : 'No game')}
        <p className="pt-2 text-xs text-ink-400">
          {l === 'es' ? 'El juego está desactivado los sábados y domingos.' : 'Gameplay is disabled on Saturday and Sunday.'}
        </p>
      </div>
    ),
  },
  {
    id: 'whatIsIt',
    titleKey: 'howto.whatIsIt',
    icon: Hand,
    content: (l) => l === 'es'
      ? '"IT" es el jugador que tiene que etiquetar a otros. Al principio de cada día, se elige un jugador al azar como IT. Cuando IT etiqueta a alguien, esa persona se convierte en el nuevo IT. El jugador que sea IT al final del día es eliminado.'
      : '"IT" is the player who must tag others. At the start of each day, a random player is chosen as IT. When IT tags someone, that person becomes the new IT. Whoever is IT at the end of the day is eliminated.',
  },
  {
    id: 'validTags',
    titleKey: 'howto.validTags',
    icon: Tag,
    content: (l) => l === 'es'
      ? 'Una etiqueta válida es cuando IT toca a otro jugador activo durante el horario de juego. Después de etiquetar, IT registra la etiqueta en la app. La etiqueta se confirma inmediatamente y el objetivo se convierte en IT.'
      : 'A valid tag is when IT touches another active player during game hours. After tagging, IT logs the tag in the app. The tag is confirmed immediately and the target becomes IT.',
  },
  {
    id: 'tagBack',
    titleKey: 'howto.tagBack',
    icon: RefreshCw,
    content: (l) => l === 'es'
      ? 'No puedes hacer tag back al jugador que te acaba de etiquetar. Esto evita un ciclo infinito de etiquetas. Excepción: durante eventos especiales como "2 vs Everybody", los cazadores no pueden ser tag-backed.'
      : 'You cannot tag back the player who just tagged you. This prevents infinite tag cycles. Exception: during special events like "2 vs Everybody", hunters cannot be tag-backed.',
  },
  {
    id: 'statuses',
    titleKey: 'howto.statuses',
    icon: Users,
    content: (l) => (
      <div className="space-y-2">
        <div className="flex gap-2"><span className="font-bold text-safe-bright">SAFE</span><span className="text-ink-300">{l === 'es' ? 'No eres IT. Eres un objetivo potencial.' : 'You are not IT. You are a potential target.'}</span></div>
        <div className="flex gap-2"><span className="font-bold text-it-bright">IT</span><span className="text-ink-300">{l === 'es' ? 'Eres IT. Debes etiquetar a alguien.' : 'You are IT. You must tag someone.'}</span></div>
        <div className="flex gap-2"><span className="font-bold text-blue-400">ACTIVE</span><span className="text-ink-300">{l === 'es' ? 'Estás en el juego.' : 'You are in the game.'}</span></div>
        <div className="flex gap-2"><span className="font-bold text-ink-400">ELIMINATED</span><span className="text-ink-300">{l === 'es' ? 'Fuiste IT al final del día. Estás en el Cementerio.' : 'You were IT at end of day. You are in the Graveyard.'}</span></div>
      </div>
    ),
  },
  {
    id: 'xp',
    titleKey: 'howto.xpSystem',
    icon: Zap,
    content: (l) => (
      <div className="space-y-1.5">
        <p className="text-ink-300">{l === 'es' ? 'Ganas XP por:' : 'You earn XP for:'}</p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-ink-300">
          <li>{l === 'es' ? 'Etiqueta exitosa: +10 XP' : 'Successful tag: +10 XP'}</li>
          <li>{l === 'es' ? 'Sobrevivir el día: +15 XP' : 'Surviving a day: +15 XP'}</li>
          <li>{l === 'es' ? 'Most Wanted: +35 XP' : 'Most Wanted: +35 XP'}</li>
          <li>{l === 'es' ? 'Double Bounty: +60 XP' : 'Double Bounty: +60 XP'}</li>
          <li>{l === 'es' ? 'Survivor Challenge: +25 XP' : 'Survivor Challenge: +25 XP'}</li>
          <li>{l === 'es' ? 'King of the Day: +50 XP' : 'King of the Day: +50 XP'}</li>
          <li>{l === 'es' ? 'Rivalry: +30 XP' : 'Rivalry: +30 XP'}</li>
          <li>{l === 'es' ? 'Revive ganado: +40 XP' : 'Revive win: +40 XP'}</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'ranks',
    titleKey: 'howto.rankSystem',
    icon: Trophy,
    content: (l) => (
      <div className="space-y-1.5">
        {[
          ['Legend', '1500'],
          ['Champion', '1000'],
          ['Diamond', '750'],
          ['Platinum', '500'],
          ['Gold', '300'],
          ['Silver', '150'],
          ['Bronze', '50'],
          ['Unranked', '0'],
        ].map(([rank, xp]) => (
          <div key={rank} className="flex justify-between rounded-lg bg-ink-900/60 px-3 py-1.5 text-sm">
            <span className="font-bold text-white">{rank}</span>
            <span className="text-ink-400">{xp}+ XP</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'bounty',
    titleKey: 'howto.bountySystem',
    icon: Target,
    content: (l) => l === 'es'
      ? 'Una recompensa (bounty) se otorga cuando completas un evento Most Wanted o Double Bounty. Si IT etiqueta al objetivo del Most Wanted, recibe +35 XP y +1 bounty. Double Bounty otorga +60 XP. Las recompensas se rastrean automáticamente.'
      : 'A bounty is awarded when you complete a Most Wanted or Double Bounty event. If IT tags the Most Wanted target, they get +35 XP and +1 bounty. Double Bounty awards +60 XP. Bounties are tracked automatically.',
  },
  {
    id: 'newPlayer',
    titleKey: 'howto.newPlayer',
    icon: Users,
    content: (l) => l === 'es'
      ? 'Los jugadores nuevos envían una solicitud con su nombre y grado. Un administrador debe aprobar la solicitud antes de que puedan unirse al juego.'
      : 'New players submit a request with their name and grade. An admin must approve the request before they can join the game.',
  },
  {
    id: 'graveyard',
    titleKey: 'howto.graveyard',
    icon: Skull,
    content: (l) => l === 'es'
      ? 'Cuando eres IT al final del día, eres eliminado. Vas al Cementerio. Los jugadores eliminados pueden solicitar un Revive contra otro jugador eliminado del mismo grado.'
      : 'When you are IT at the end of the day, you are eliminated. You go to the Graveyard. Eliminated players can request a Revive against another eliminated player in the same grade.',
  },
  {
    id: 'revives',
    titleKey: 'howto.revives',
    icon: Heart,
    content: (l) => l === 'es'
      ? 'Un Revive es un desafío entre dos jugadores eliminados del mismo grado. Un jugador desafía a otro, el oponente acepta, y el administrador registra al ganador. El ganador vuelve al juego con +40 XP.'
      : 'A Revive is a challenge between two eliminated players in the same grade. One player challenges another, the opponent accepts, and the admin records the winner. The winner returns to the game with +40 XP.',
  },
  {
    id: 'randomEvents',
    titleKey: 'howto.randomEvents',
    icon: Zap,
    content: (l) => (
      <div className="space-y-2">
        <p className="text-sm text-ink-300">{l === 'es' ? 'Eventos aleatorios solo de lunes a viernes. 65% de probabilidad, máximo 1 por día. Todos ven el mismo evento.' : 'Random events only on weekdays. 65% chance, max 1 per day. Everyone sees the same event.'}</p>
        <div className="rounded-lg bg-ink-900/60 p-3"><p className="font-bold text-it-bright">Most Wanted</p><p className="text-xs text-ink-400">{l === 'es' ? 'Un jugador SAFE al azar es el objetivo. Si IT lo etiqueta: +35 XP, +1 bounty.' : 'A random SAFE player is the target. If IT tags them: +35 XP, +1 bounty.'}</p></div>
        <div className="rounded-lg bg-ink-900/60 p-3"><p className="font-bold text-pending-bright">Double Bounty</p><p className="text-xs text-ink-400">{l === 'es' ? 'Más raro. Si IT etiqueta al objetivo: +60 XP.' : 'Rarer. If IT tags the target: +60 XP.'}</p></div>
        <div className="rounded-lg bg-ink-900/60 p-3"><p className="font-bold text-safe-bright">Survivor Challenge</p><p className="text-xs text-ink-400">{l === 'es' ? 'Un jugador SAFE al azar. Si sobrevive hasta el final: +25 XP.' : 'A random SAFE player. If they survive until the end: +25 XP.'}</p></div>
        <div className="rounded-lg bg-ink-900/60 p-3"><p className="font-bold text-pending-bright">King of the Day</p><p className="text-xs text-ink-400">{l === 'es' ? 'El jugador con más etiquetas válidas del día: +50 XP.' : 'Player with the most valid tags that day: +50 XP.'}</p></div>
        <div className="rounded-lg bg-ink-900/60 p-3"><p className="font-bold text-blue-400">Rivalry</p><p className="text-xs text-ink-400">{l === 'es' ? 'Dos jugadores activos compiten. El que tenga más etiquetas: +30 XP.' : 'Two active players compete. Most tags wins: +30 XP.'}</p></div>
      </div>
    ),
  },
  {
    id: 'specialEvents',
    titleKey: 'howto.specialEvents',
    icon: Swords,
    content: (l) => (
      <div className="space-y-2">
        <p className="text-sm text-ink-300">{l === 'es' ? 'Los administradores pueden programar eventos especiales con reglas diferentes. Estos pueden anular el evento aleatorio del día.' : 'Admins can schedule special events with different rules. These can override the random event for that day.'}</p>
        <div className="rounded-lg border border-pending/30 bg-pending/10 p-3">
          <p className="font-display font-black text-pending-bright">2 vs Everybody</p>
          <p className="mt-1 text-xs text-ink-300">{l === 'es' ? 'Peruano y Juanpi trabajan juntos. Deben etiquetar a todos los oponentes activos. El progreso es compartido. No hay tag back contra ellos.' : 'Peruano and Juanpi work together. They must tag every active opponent. Progress is shared. No tag back against them.'}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'eventProgress',
    titleKey: 'howto.eventProgress',
    icon: Activity,
    content: (l) => l === 'es'
      ? 'El progreso del evento se muestra con barras de progreso en vivo, contadores de objetivos, y temporizadores. Todo se actualiza en tiempo real a través de Supabase. Cada objetivo solo cuenta una vez.'
      : 'Event progress is shown with live progress bars, target counters, and timers. Everything updates in real time through Supabase. Each target only counts once.',
  },
  {
    id: 'chat',
    titleKey: 'howto.liveChat',
    icon: MessageSquare,
    content: (l) => l === 'es'
      ? 'Todos los jugadores comparten un chat global. Los mensajes se actualizan en tiempo real. El chat es para comunicación del juego. Los mensajes inapropiados pueden ser eliminados por los administradores.'
      : 'All players share a global chat. Messages update in real time. Chat is for game communication. Inappropriate messages may be removed by admins.',
  },
  {
    id: 'activityFeed',
    titleKey: 'howto.activityFeed',
    icon: Activity,
    content: (l) => l === 'es'
      ? 'El Feed de Actividad registra automáticamente acciones importantes: etiquetas, recompensas, eventos, revives y ganadores de eventos.'
      : 'The Activity Feed automatically records important actions: tags, rewards, events, revives, and event winners.',
  },
  {
    id: 'updates',
    titleKey: 'howto.updates',
    icon: Bell,
    content: (l) => l === 'es'
      ? 'La pestaña Actualizaciones contiene nuevas funciones, cambios de reglas, anuncios de eventos, correcciones y mejoras.'
      : 'The Updates tab contains new features, rule changes, event announcements, bug fixes, and improvements.',
  },
  {
    id: 'fairPlay',
    titleKey: 'howto.fairPlay',
    icon: ShieldCheck,
    content: (l) => (
      <div className="space-y-1.5">
        <ul className="ml-4 list-disc space-y-1 text-sm text-ink-300">
          <li>{l === 'es' ? 'Solo envía etiquetas reales y válidas.' : 'Only submit real, valid tags.'}</li>
          <li>{l === 'es' ? 'No falsifiques el progreso de eventos.' : 'Don\u2019t fake event progress.'}</li>
          <li>{l === 'es' ? 'No envíes spam.' : 'Don\u2019t spam submissions.'}</li>
          <li>{l === 'es' ? 'Respeta las decisiones del juego y los administradores.' : 'Respect game and admin decisions.'}</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'faq',
    titleKey: 'howto.faq',
    icon: HelpCircle,
    content: (l) => (
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-lg bg-ink-900/60 p-3">
            <p className="font-semibold text-white">{faq.q(l)}</p>
            <p className="mt-1 text-sm text-ink-400">{faq.a(l)}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export function HowToPlay({ snapshot }: Props) {
  const { t, lang } = useLang();
  const [openId, setOpenId] = useState<string | null>('objective');

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-6 pt-20">
      <h1 className="font-display text-3xl font-black text-white">{t('howto.title')}</h1>

      {sections.map((section) => {
        const isOpen = openId === section.id;
        const Icon = section.icon;
        return (
          <div key={section.id} className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-800">
            <button
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ink-900/40"
            >
              <Icon className="h-5 w-5 shrink-0 text-blue-400" />
              <span className="flex-1 font-display text-sm font-bold text-white">{t(section.titleKey as any)}</span>
              <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-ink-700 px-4 py-3 text-sm text-ink-300 animate-fade-up">
                {typeof section.content === 'function' ? section.content(lang) : section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

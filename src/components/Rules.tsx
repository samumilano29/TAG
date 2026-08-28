import { Ban, Utensils, Footprints, DoorOpen, Dumbbell, BookOpen, Clock, Shield, Users } from 'lucide-react';

export function Rules() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-20">
      <h1 className="font-display text-4xl font-black text-white">SLEDGE TAG RULES</h1>

      {/* Universal rule */}
      <div className="rounded-2xl border-2 border-it/50 bg-it-deep/20 p-4">
        <div className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-it-bright" />
          <p className="font-display text-lg font-black text-it-bright">UNIVERSAL RULE</p>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">No tag backs</p>
        <p className="mt-0.5 text-sm text-ink-400">You cannot immediately tag the person who just tagged you.</p>
      </div>

      {/* Where tagging is allowed */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Where Tagging Is Allowed</p>
        <div className="space-y-2">
          {[
            { icon: Utensils, label: 'Lunch', allowed: true },
            { icon: Footprints, label: 'Hallways', allowed: true },
            { icon: DoorOpen, label: 'Bathrooms — only if the person is not actively using the bathroom. No camping.', allowed: true },
            { icon: Dumbbell, label: 'Gym', allowed: true },
            { icon: BookOpen, label: 'Media Center', allowed: true },
            { icon: BookOpen, label: 'Classes', allowed: false },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <item.icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.allowed ? 'text-safe-bright' : 'text-it-bright'}`} />
              <span className={`text-sm ${item.allowed ? 'text-white' : 'text-ink-400 line-through'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game time */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-400" />
          <p className="font-display text-lg font-black text-white">GAME TIME</p>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-ink-900/60 px-3 py-2">
            <span className="text-sm font-semibold text-ink-400">Start</span>
            <span className="text-sm font-bold text-white">7:14 AM — as soon as the bell rings</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-ink-900/60 px-3 py-2">
            <span className="text-sm font-semibold text-ink-400">End</span>
            <span className="text-sm font-bold text-white">2:20 PM + 5 minutes to tag</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2">
            <span className="text-sm font-semibold text-blue-400">Wednesday</span>
            <span className="text-sm font-bold text-white">7:14 AM — 1:15 PM</span>
          </div>
        </div>
      </div>

      {/* Safe zones */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-safe-bright" />
          <p className="font-display text-lg font-black text-white">SAFE ZONES</p>
        </div>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-center gap-2 text-sm text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-safe-bright" />
            Inside the 4 pillars of the Media Center
          </li>
          <li className="flex items-center gap-2 text-sm text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-safe-bright" />
            Inside classrooms
          </li>
        </ul>
      </div>

      {/* Revives */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-400" />
          <p className="font-display text-lg font-black text-white">REVIVES</p>
        </div>
        <p className="mt-2 text-sm text-ink-400">Grade-level matchmaking only:</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {['Senior vs Senior', 'Junior vs Junior', 'Sophomore vs Sophomore', 'Freshman vs Freshman'].map((g) => (
            <div key={g} className="rounded-xl bg-ink-900/60 px-3 py-2 text-center text-sm font-semibold text-white">
              {g}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">Do not match different grade levels for a revive.</p>
      </div>
    </div>
  );
}

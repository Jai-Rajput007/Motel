import { ArrowRight, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../../store/useStore'
import { pct } from '../../lib/utils'
import { Badge, PageHeader, Stat } from '../../components/admin/ui'

export default function Automations() {
  const { automations, toggleAutomation } = useStore()
  const runs = automations.reduce((a, x) => a + x.runs, 0)
  const conv = automations.reduce((a, x) => a + x.conversions, 0)
  return (
    <div className="space-y-6">
      <PageHeader title="Automations" sub="Guest journeys that run themselves — before, during and after every stay" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active journeys" value={automations.filter((a) => a.active).length} />
        <Stat label="Messages triggered" value={runs.toLocaleString()} tone="gold" />
        <Stat label="Conversions" value={conv.toLocaleString()} tone="leaf" />
        <Stat label="Hours saved / month" value="~140" hint="vs manual follow-up" tone="sindoor" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {automations.map((a) => (
          <div key={a.id} className={clsx('panel p-5 transition', !a.active && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 font-semibold dark:text-ivory"><Zap size={15} className="text-gold" /> {a.name}</p><Badge className="mt-1">{a.channel}</Badge></div>
              <button onClick={() => toggleAutomation(a.id)} className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', a.active ? 'bg-peacock' : 'bg-kohl/20')} aria-label={`Toggle ${a.name}`}><span className={clsx('absolute top-1 h-4 w-4 rounded-full bg-white transition-all', a.active ? 'left-6' : 'left-1')} /></button>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="flex-1 rounded-lg border border-dashed border-peacock/40 bg-peacock/5 p-3 dark:text-sand"><p className="text-[10px] uppercase tracking-wider text-peacock">When</p>{a.trigger}</div>
              <ArrowRight size={16} className="shrink-0 text-stone" />
              <div className="flex-1 rounded-lg border border-dashed border-gold/50 bg-gold/5 p-3 dark:text-sand"><p className="text-[10px] uppercase tracking-wider text-[#8a6a36] dark:text-gold-2">Then</p>{a.action}</div>
            </div>
            <div className="mt-4 flex gap-6 text-xs text-stone">
              <span><b className="text-kohl dark:text-ivory">{a.runs.toLocaleString()}</b> runs</span>
              <span><b className="text-kohl dark:text-ivory">{a.conversions}</b> conversions</span>
              <span><b className="text-kohl dark:text-ivory">{pct(a.conversions / Math.max(1, a.runs))}</b> rate</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

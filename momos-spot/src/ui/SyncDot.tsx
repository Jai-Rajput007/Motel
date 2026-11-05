import clsx from 'clsx'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOnline, usePending, useSyncStatus } from '../hooks'

export function SyncDot() {
  const st = useSyncStatus()
  const pending = usePending()
  const online = useOnline()
  const nav = useNavigate()
  let tone = 'bg-good'
  let label = 'All saved to cloud'
  const noCloud = st.state === 'off' || st.state === 'signin'
  if (noCloud) {
    tone = 'bg-muted'
    label = st.state === 'signin' ? 'Saved on phone. Sign in once in Settings to back up to the cloud' : 'Saved on phone (cloud not set up)'
  } else if (!online || st.state === 'offline') {
    tone = 'bg-muted'
    label = `Offline. ${pending} change${pending === 1 ? '' : 's'} waiting`
  } else if (st.state === 'error') {
    tone = 'bg-bad'
    label = 'Sync problem'
  } else if (st.state === 'syncing' || pending > 0) {
    tone = 'bg-warn'
    label = `Uploading ${pending}`
  }
  return (
    <button onClick={() => nav('/settings#cloud')} aria-label={label} title={label} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted active:bg-surface-2">
      {st.state === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> : !online && !noCloud ? <CloudOff size={14} /> : <span className={clsx('h-2.5 w-2.5 rounded-full', tone)} />}
      {pending > 0 && !noCloud && <span className="tabular">{pending}</span>}
    </button>
  )
}

import { Capacitor } from '@capacitor/core'
import { autoMarkRecurring } from '../actions/money'
import { db, ensureSeed } from '../db'
import { todayKey } from '../lib/dates'
import { startSync } from '../sync/engine'

export const bootReady: Promise<void> = (async () => {
  await ensureSeed()
})()

export function boot() {
  void (async () => {
    try {
      await bootReady
      // Ask the browser not to clear our data when the phone is low on space.
      if (navigator.storage?.persist) {
        const already = await navigator.storage.persisted?.()
        if (!already) await navigator.storage.persist()
      }
      const s = await db.settings.get('main')
      await autoMarkRecurring(todayKey(s?.dayCutoffHour ?? 0))
    } catch (e) {
      console.error('Startup task failed', e)
    }
    void startSync()
  })()

  if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && import.meta.env.PROD) {
    void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
  }
}

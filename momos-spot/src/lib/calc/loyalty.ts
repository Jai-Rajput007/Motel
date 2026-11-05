import type { CustomerReward, LoyaltyRule, MenuItem, Sale } from '../../db/types'
import { addDays, diffDays } from '../dates'
import { inr } from '../money'

export function ruleActiveOn(rule: LoyaltyRule, day: string): boolean {
  if (rule.deletedAt || !rule.active) return false
  if (rule.startsOn && day < rule.startsOn) return false
  if (rule.endsOn && day > rule.endsOn) return false
  return true
}

/** Sales that count towards a rule. */
export function qualifying(rule: LoyaltyRule, sales: Sale[]): Sale[] {
  return sales
    .filter((s) => !s.deletedAt && s.status === 'done')
    .filter((s) => !rule.minBill || s.total >= rule.minBill)
    .filter((s) => (!rule.startsOn || s.day >= rule.startsOn) && (!rule.endsOn || s.day <= rule.endsOn))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
}

export function lastUnlockAt(rule: LoyaltyRule, rewards: CustomerReward[], beforeAt?: string): string | null {
  let last: string | null = null
  for (const r of rewards) {
    if (r.deletedAt || r.ruleId !== rule.id || r.status === 'cancelled') continue
    if (beforeAt && r.unlockedAt >= beforeAt) continue
    if (!last || r.unlockedAt > last) last = r.unlockedAt
  }
  return last
}

export interface Progress {
  current: number
  target: number
  met: boolean
  /** non-repeating rule already given */
  finished: boolean
  text: string
}

/** Longest run of consecutive days ending on `end` (or the day before, when `allowGap` is set). */
function streakEnding(days: Set<string>, end: string, allowGap: boolean): number {
  let d = end
  if (!days.has(d) && allowGap) d = addDays(d, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/**
 * Progress of one customer on one rule, counting sales up to `uptoAt` (inclusive).
 * `atSaleTime` = evaluating for a sale just made (streak must include that day).
 */
export function progress(
  rule: LoyaltyRule,
  sales: Sale[],
  rewards: CustomerReward[],
  upto: { at: string; day: string },
  atSaleTime = false,
): Progress {
  const target = rule.trigger === 'spend' ? rule.spend ?? 0 : Math.max(1, rule.n)
  const previous = lastUnlockAt(rule, rewards, atSaleTime ? upto.at : undefined)
  if (!rule.repeat && previous) {
    return { current: target, target, met: false, finished: true, text: 'Reward already given' }
  }
  const cand = qualifying(rule, sales).filter((s) => (!previous || s.at > previous) && s.at <= upto.at)
  let current = 0
  switch (rule.trigger) {
    case 'every_n':
      current = cand.length
      break
    case 'n_in_days': {
      const from = addDays(upto.day, -(Math.max(1, rule.days ?? 1) - 1))
      current = cand.filter((s) => s.day >= from).length
      break
    }
    case 'streak':
      current = streakEnding(new Set(cand.map((s) => s.day)), upto.day, !atSaleTime)
      break
    case 'spend':
      current = cand.reduce((s, x) => s + x.total, 0)
      break
  }
  const met = target > 0 && current >= target
  return { current, target, met, finished: false, text: progressText(rule, current, target) }
}

function progressText(rule: LoyaltyRule, current: number, target: number): string {
  const c = Math.min(current, target)
  switch (rule.trigger) {
    case 'every_n':
      return `${c} of ${target} orders`
    case 'n_in_days':
      return `${c} of ${target} orders in the last ${rule.days} days`
    case 'streak':
      return `${c} of ${target} days in a row`
    case 'spend':
      return `${inr(c)} of ${inr(target)} spent`
  }
}

export function triggerText(rule: Pick<LoyaltyRule, 'trigger' | 'n' | 'days' | 'spend' | 'minBill' | 'repeat'>): string {
  let t = ''
  switch (rule.trigger) {
    case 'every_n':
      t = rule.repeat ? `Every ${rule.n} orders` : `After ${rule.n} orders`
      break
    case 'n_in_days':
      t = `${rule.n} orders within ${rule.days} days`
      break
    case 'streak':
      t = `Orders on ${rule.n} days in a row`
      break
    case 'spend':
      t = `Total spend reaches ${inr(rule.spend ?? 0)}`
      break
  }
  if (rule.minBill) t += ` (bills of ${inr(rule.minBill)}+)`
  return t
}

export function rewardLabel(rule: LoyaltyRule, menu: MenuItem[]): string {
  switch (rule.rewardType) {
    case 'free_item': {
      const m = menu.find((x) => x.id === rule.rewardMenuItemId)
      const v = m?.variants.find((x) => x.id === rule.rewardVariantId)
      const name = m ? (v ? `${m.name} (${v.name})` : m.name) : 'item'
      const q = rule.rewardQty ?? 1
      return `Free ${q > 1 ? `${q} × ` : ''}${name}`
    }
    case 'percent':
      return `${rule.rewardValue ?? 0}% off the bill`
    case 'flat':
      return `${inr(rule.rewardValue ?? 0)} off the bill`
    case 'text':
      return rule.rewardText || 'Special gift'
  }
}

/** Rules that this sale completes. One reward per rule per sale. */
export function rulesUnlockedBy(sale: Sale, rules: LoyaltyRule[], customerSales: Sale[], customerRewards: CustomerReward[]): LoyaltyRule[] {
  if (sale.status !== 'done' || !sale.customerId) return []
  const salesUpTo = customerSales.some((s) => s.id === sale.id)
    ? customerSales.map((s) => (s.id === sale.id ? sale : s))
    : [...customerSales, sale]
  const out: LoyaltyRule[] = []
  for (const rule of rules) {
    if (!ruleActiveOn(rule, sale.day)) continue
    if (!qualifying(rule, [sale]).length) continue
    const p = progress(rule, salesUpTo, customerRewards, sale, true)
    if (p.met) out.push(rule)
  }
  return out
}

export type RewardView = CustomerReward & { expired: boolean }

export function rewardState(r: CustomerReward, now = new Date().toISOString()): RewardView {
  return { ...r, expired: r.status === 'waiting' && !!r.expiresAt && r.expiresAt < now }
}

export function usableRewards(rewards: CustomerReward[], now = new Date().toISOString()): CustomerReward[] {
  return rewards.filter((r) => !r.deletedAt && r.status === 'waiting' && !(r.expiresAt && r.expiresAt < now))
}

export function expiryFrom(unlockedAt: string, days?: number): string | undefined {
  if (!days) return undefined
  return new Date(new Date(unlockedAt).getTime() + days * 86400_000).toISOString()
}

/** Days since the customer's last order (for "regulars who stopped coming"). */
export function daysSince(day: string, today: string) {
  return diffDays(day, today)
}

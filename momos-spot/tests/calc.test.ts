import { describe, expect, it } from 'vitest'
import { toPaise, inr, splitEven, paiseToInput } from '../src/lib/money'
import { addDays, dayKey, diffDays, eachDay } from '../src/lib/dates'
import { amountOn, dailyShare, deductionMeter, emiProgress, occurrences, rangeShare } from '../src/lib/calc/recurring'
import { progress, rulesUnlockedBy } from '../src/lib/calc/loyalty'
import { gasStats } from '../src/lib/calc/gas'
import { computeTotals, settle } from '../src/lib/calc/cart'
import { summarize } from '../src/lib/calc/summary'
import type { CustomerReward, Cylinder, Expense, LoyaltyRule, Recurring, Sale } from '../src/db/types'

const T = '2026-01-01T00:00:00.000Z'
const base = { createdAt: T, updatedAt: T }

describe('money', () => {
  it('parses rupee input to paise', () => {
    expect(toPaise('120')).toBe(12000)
    expect(toPaise('120.5')).toBe(12050)
    expect(toPaise('1,200.05')).toBe(120005)
    expect(toPaise('₹ 99')).toBe(9900)
    expect(toPaise('')).toBeNull()
    expect(toPaise('abc')).toBeNull()
    expect(toPaise('1.234')).toBeNull()
    expect(toPaise('0.1')! + toPaise('0.2')!).toBe(30)
  })
  it('formats with Indian grouping', () => {
    expect(inr(12000000)).toBe('₹1,20,000')
    expect(inr(9950)).toBe('₹99.50')
    expect(inr(-500)).toBe('−₹5')
    expect(paiseToInput(12050)).toBe('120.5')
  })
  it('splits evenly without losing paise', () => {
    expect(splitEven(1001, 2)).toEqual([501, 500])
    expect(splitEven(100000, 3).reduce((a, b) => a + b)).toBe(100000)
  })
})

describe('dates', () => {
  it('does day arithmetic across months and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(diffDays('2026-12-30', '2027-01-02')).toBe(3)
    expect(eachDay('2026-01-30', '2026-02-02')).toHaveLength(4)
  })
  it('applies the business-day cut-off', () => {
    const late = new Date(2026, 10, 6, 1, 30) // 6 Nov 1:30 AM local
    expect(dayKey(late, 0)).toBe('2026-11-06')
    expect(dayKey(late, 2)).toBe('2026-11-05')
  })
})

const rec = (o: Partial<Recurring>): Recurring => ({
  id: 'r1', name: 'Rent', categoryId: 'exp-rent', frequency: 'monthly', startsOn: '2026-01-05',
  amounts: [{ from: '2026-01-05', amount: 900000 }], autoPaid: false, payMode: 'online', ...base, ...o,
})

describe('recurring costs', () => {
  it('monthly due day clamps to short months', () => {
    const r = rec({ startsOn: '2026-01-31', dueDay: 31, amounts: [{ from: '2026-01-01', amount: 100 }] })
    expect(occurrences(r, '2026-01-01', '2026-04-30').map((o) => o.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('due day before the start day begins next month', () => {
    const r = rec({ startsOn: '2026-01-20', dueDay: 5 })
    expect(occurrences(r, '2026-01-01', '2026-03-31').map((o) => o.date)).toEqual(['2026-02-05', '2026-03-05'])
  })
  it('stops after the last EMI instalment', () => {
    const r = rec({ startsOn: '2026-01-10', installments: 3 })
    expect(occurrences(r, '2026-01-01', '2026-12-31')).toHaveLength(3)
  })
  it('daily, weekly and every-N-days schedules', () => {
    expect(occurrences(rec({ frequency: 'daily', startsOn: '2026-03-01' }), '2026-03-10', '2026-03-12')).toHaveLength(3)
    expect(occurrences(rec({ frequency: 'weekly', startsOn: '2026-03-02' }), '2026-03-01', '2026-03-31').map((o) => o.date))
      .toEqual(['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30'])
    expect(occurrences(rec({ frequency: 'every_n_days', intervalN: 10, startsOn: '2026-03-01' }), '2026-03-05', '2026-03-31').map((o) => o.date))
      .toEqual(['2026-03-11', '2026-03-21', '2026-03-31'])
  })
  it('keeps amount history', () => {
    const r = rec({ amounts: [{ from: '2026-01-01', amount: 800000 }, { from: '2026-06-01', amount: 900000 }] })
    expect(amountOn(r, '2026-05-31')).toBe(800000)
    expect(amountOn(r, '2026-06-05')).toBe(900000)
  })
  it('skips paused periods', () => {
    const r = rec({ pauses: [{ from: '2026-02-01', to: '2026-02-28' }] })
    expect(occurrences(r, '2026-01-01', '2026-03-31').map((o) => o.date)).toEqual(['2026-01-05', '2026-03-05'])
  })
  it('spreads monthly rent over the days of the month', () => {
    const r = rec({ amounts: [{ from: '2026-01-01', amount: 3100000 }] })
    expect(dailyShare(r, '2026-01-15')).toBeCloseTo(100000)
    expect(Math.round(rangeShare([r], '2026-01-01', '2026-01-31'))).toBe(3100000)
    expect(dailyShare(r, '2025-12-15')).toBe(0)
  })
  it('deduction meter and EMI progress', () => {
    const r = rec({ installments: 12 })
    const ex: Expense[] = [{ id: 'e', name: 'Rent', categoryId: 'exp-rent', amount: 900000, at: T, day: '2026-01-05', payMode: 'cash', recurringId: 'r1', dueDate: '2026-01-05', ...base }]
    const m = deductionMeter([r], ex, '2026-01-20')
    expect(m).toMatchObject({ dueSoFar: 900000, paidSoFar: 900000, pending: 0 })
    expect(deductionMeter([r], [], '2026-01-20').pending).toBe(900000)
    expect(emiProgress(r, ex)).toMatchObject({ done: 1, total: 12, endDate: '2026-12-05' })
  })
})

const sale = (id: string, day: string, total = 10000, status: 'done' | 'void' = 'done'): Sale => ({
  id, billNo: id, day, at: `${day}T12:00:00.000Z`, customerId: 'c1', isDelivery: false, lines: [], subtotal: total,
  deliveryFee: 0, discount: 0, total, cash: total, cashTendered: total, change: 0, online: 0, credit: 0, status, ...base,
})
const rule = (o: Partial<LoyaltyRule>): LoyaltyRule => ({
  id: 'L', name: '5th free', trigger: 'every_n', n: 5, rewardType: 'text', rewardText: 'gift', repeat: true, active: true, ...base, ...o,
})

describe('loyalty', () => {
  it('every N orders, repeating after each reward, ignoring voided sales', () => {
    const r = rule({})
    const s = ['01', '02', '03', '04'].map((d, i) => sale(`s${i}`, `2026-01-${d}`))
    s.push(sale('void', '2026-01-04', 10000, 'void'))
    const fifth = sale('s5', '2026-01-06')
    expect(rulesUnlockedBy(s[3], [r], s, [])).toHaveLength(0)
    expect(rulesUnlockedBy(fifth, [r], s, [])).toHaveLength(1)
    const reward: CustomerReward = { id: 'w', customerId: 'c1', ruleId: 'L', ruleName: '', rewardLabel: '', unlockedBySaleId: 's5', unlockedAt: fifth.at, status: 'waiting', ...base }
    const p = progress(r, [...s, fifth], [reward], { at: '2026-01-07T00:00:00.000Z', day: '2026-01-07' })
    expect(p.current).toBe(0)
  })
  it('non-repeating rule is given once', () => {
    const r = rule({ repeat: false, n: 1 })
    const reward: CustomerReward = { id: 'w', customerId: 'c1', ruleId: 'L', ruleName: '', rewardLabel: '', unlockedBySaleId: 'a', unlockedAt: '2026-01-01T12:00:00.000Z', status: 'redeemed', ...base }
    expect(rulesUnlockedBy(sale('b', '2026-01-02'), [r], [sale('a', '2026-01-01')], [reward])).toHaveLength(0)
  })
  it('N orders within D days', () => {
    const r = rule({ trigger: 'n_in_days', n: 3, days: 7 })
    const s = [sale('a', '2026-01-01'), sale('b', '2026-01-05')]
    expect(rulesUnlockedBy(sale('c', '2026-01-07'), [r], s, [])).toHaveLength(1)
    expect(rulesUnlockedBy(sale('c', '2026-01-09'), [r], s, [])).toHaveLength(0)
  })
  it('days in a row', () => {
    const r = rule({ trigger: 'streak', n: 3 })
    expect(rulesUnlockedBy(sale('c', '2026-01-03'), [r], [sale('a', '2026-01-01'), sale('b', '2026-01-02')], [])).toHaveLength(1)
    expect(rulesUnlockedBy(sale('c', '2026-01-04'), [r], [sale('a', '2026-01-01'), sale('b', '2026-01-02')], [])).toHaveLength(0)
  })
  it('total spend and minimum bill', () => {
    const r = rule({ trigger: 'spend', spend: 50000, minBill: 10000 })
    const s = [sale('a', '2026-01-01', 30000), sale('small', '2026-01-02', 5000)]
    expect(rulesUnlockedBy(sale('c', '2026-01-03', 15000), [r], s, [])).toHaveLength(0)
    expect(rulesUnlockedBy(sale('c', '2026-01-03', 20000), [r], s, [])).toHaveLength(1)
  })
})

describe('gas', () => {
  it('average life, prediction and spare warning', () => {
    const c = (id: string, con: string, emp?: string): Cylinder => ({
      id, price: 100000, boughtAt: con, connectedAt: con, emptiedAt: emp, status: emp ? 'empty' : 'in_use', ...base,
    })
    const st = gasStats([c('a', '2026-01-01T10:00:00Z', '2026-01-11T10:00:00Z'), c('b', '2026-01-11T10:00:00Z', '2026-01-25T10:00:00Z'), c('cur', '2026-01-25T10:00:00Z')], new Date('2026-02-04T10:00:00Z'))
    expect(st.avgLifeDays).toBe(12)
    expect(st.currentDays).toBe(10)
    expect(st.daysLeft).toBe(2)
    expect(st.warnNoSpare).toBe(true)
  })
})

describe('cart & payment', () => {
  const lines = [{ key: '1', name: 'Steam', price: 6000, qty: 2 }]
  it('adds the flat delivery fee and clamps discount', () => {
    expect(computeTotals({ lines, isDelivery: true, deliveryFee: 2000, discount: 0 }).total).toBe(14000)
    expect(computeTotals({ lines, isDelivery: true, deliveryFee: 2000, freeDeliveryAbove: 10000, discount: 0 }).total).toBe(12000)
    expect(computeTotals({ lines, isDelivery: false, deliveryFee: 2000, discount: 99999 }).total).toBe(0)
  })
  it('works out change, split and shortfall', () => {
    expect(settle(12000, 20000, 0)).toMatchObject({ cash: 12000, change: 8000, shortfall: 0 })
    expect(settle(12000, 5000, 7000)).toMatchObject({ cash: 5000, online: 7000, shortfall: 0 })
    expect(settle(12000, 5000, 0)).toMatchObject({ shortfall: 7000 })
    expect(settle(12000, 0, 15000).error).toBeTruthy()
  })
})

describe('summary', () => {
  it('daily profit in spread and cash modes', () => {
    const r = rec({ amounts: [{ from: '2026-01-01', amount: 3100000 }] })
    const m = summarize('2026-01-05', '2026-01-05', {
      sales: [sale('a', '2026-01-05', 500000), sale('v', '2026-01-05', 99999, 'void')],
      purchases: [{ id: 'p', itemId: 'i', qty: 1, unit: 'kg', amount: 100000, at: T, day: '2026-01-05', payMode: 'cash', ...base }],
      expenses: [{ id: 'e', name: 'Rent', categoryId: 'x', amount: 3100000, at: T, day: '2026-01-05', payMode: 'cash', recurringId: 'r1', dueDate: '2026-01-05', ...base }],
      recurring: [r],
      creditPayments: [],
    }).get('2026-01-05')!
    expect(m.sales).toBe(500000)
    expect(m.voided).toBe(1)
    expect(Math.round(m.profitSpread)).toBe(500000 - 100000 - 100000)
    expect(m.profitCash).toBe(500000 - 100000 - 3100000)
  })
})

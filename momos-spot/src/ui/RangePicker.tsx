import { useState } from 'react'
import { addDays, addMonths, formatDay, monthBounds, monthKey } from '../lib/dates'
import { Button, Chip, ChipRow, DateInput, Field } from './kit'
import { Sheet } from './Sheet'

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'lastmonth' | 'custom'

export interface Range {
  preset: RangePreset
  from: string
  to: string
}

export function rangeFor(preset: RangePreset, today: string, custom?: { from: string; to: string }): Range {
  switch (preset) {
    case 'today':
      return { preset, from: today, to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { preset, from: y, to: y }
    }
    case '7d':
      return { preset, from: addDays(today, -6), to: today }
    case '30d':
      return { preset, from: addDays(today, -29), to: today }
    case 'month': {
      const [a] = monthBounds(monthKey(today))
      return { preset, from: a, to: today }
    }
    case 'lastmonth': {
      const [a, b] = monthBounds(addMonths(monthKey(today), -1))
      return { preset, from: a, to: b }
    }
    case 'custom':
      return { preset, from: custom?.from ?? addDays(today, -6), to: custom?.to ?? today }
  }
}

const LABELS: Record<RangePreset, string> = {
  today: 'Today', yesterday: 'Yesterday', '7d': '7 days', '30d': '30 days', month: 'This month', lastmonth: 'Last month', custom: 'Custom',
}

export function rangeLabel(r: Range): string {
  if (r.preset !== 'custom') return LABELS[r.preset]
  return r.from === r.to ? formatDay(r.from) : `${formatDay(r.from)} – ${formatDay(r.to)}`
}

export function RangeChips({ value, onChange, today, presets = ['today', 'yesterday', '7d', '30d', 'month', 'lastmonth', 'custom'] }: {
  value: Range
  onChange: (r: Range) => void
  today: string
  presets?: RangePreset[]
}) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(value.from)
  const [to, setTo] = useState(value.to)
  return (
    <>
      <ChipRow>
        {presets.map((p) => (
          <Chip
            key={p}
            active={value.preset === p}
            onClick={() => {
              if (p === 'custom') {
                setFrom(value.from)
                setTo(value.to)
                setOpen(true)
              } else onChange(rangeFor(p, today))
            }}
          >
            {p === 'custom' && value.preset === 'custom' ? rangeLabel(value) : LABELS[p]}
          </Chip>
        ))}
      </ChipRow>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Choose dates"
        footer={
          <Button
            block
            onClick={() => {
              const a = from <= to ? from : to
              const b = from <= to ? to : from
              onChange({ preset: 'custom', from: a, to: b })
              setOpen(false)
            }}
          >
            Show
          </Button>
        }
      >
        <Field label="From">
          <DateInput value={from} onChange={setFrom} max={today} />
        </Field>
        <Field label="To">
          <DateInput value={to} onChange={setTo} max={today} />
        </Field>
      </Sheet>
    </>
  )
}

import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { inHotel } from './selectors'

export function useScoped() {
  const property = useStore((s) => s.property)
  const bookings = useStore((s) => s.bookings)
  const rooms = useStore((s) => s.rooms)
  const staff = useStore((s) => s.staff)
  const inventory = useStore((s) => s.inventory)
  const tickets = useStore((s) => s.tickets)
  const reviews = useStore((s) => s.reviews)
  const leads = useStore((s) => s.leads)
  return useMemo(() => {
    const f = inHotel(property)
    return {
      property,
      bookings: bookings.filter(f),
      rooms: rooms.filter(f),
      staff: staff.filter(f),
      inventory: inventory.filter(f),
      tickets: tickets.filter(f),
      reviews: reviews.filter(f),
      leads: leads.filter(f),
    }
  }, [property, bookings, rooms, staff, inventory, tickets, reviews, leads])
}

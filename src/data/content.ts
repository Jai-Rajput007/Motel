import type { AddOn, RatePlan } from '../types'

export const RATE_PLANS: RatePlan[] = [
  { id: 'bb', name: 'Bed & Breakfast', description: 'Our best flexible rate with breakfast at the all-day diner.', modifier: 1, refundable: true, includes: ['Daily breakfast for two', 'Free cancellation up to 48 hrs', 'Welcome drink & tilak ceremony'] },
  { id: 'ro', name: 'Room Only', description: 'Flexible, room only.', modifier: 0.9, refundable: true, includes: ['Free cancellation up to 48 hrs', 'Welcome drink & tilak ceremony'] },
  { id: 'hb', name: 'Royal Half Board', description: 'Breakfast and a degustation dinner at our signature restaurant.', modifier: 1.28, refundable: true, includes: ['Breakfast & dinner for two', 'Heritage walk', 'Free cancellation up to 72 hrs'] },
  { id: 'nr', name: 'Advance Purchase', description: 'Save 15% when you pay in full at booking. Non‑refundable.', modifier: 0.85, refundable: false, includes: ['Daily breakfast for two', 'Pay now & save 15%', 'Non‑refundable'] },
]

export const ADD_ONS: AddOn[] = [
  { id: 'transfer', name: 'Airport transfer in a vintage car', price: 6500, per: 'stay', description: 'A chauffeured 1950s classic meets you on arrival.' },
  { id: 'dinner', name: 'Candlelit dinner for two', price: 14000, per: 'stay', description: 'A private dinner set among a hundred diyas.' },
  { id: 'spa', name: 'Abhyanga massage (60 min)', price: 7500, per: 'guest', description: 'Warm herbal-oil massage in our Ayurveda pavilion.' },
  { id: 'celebration', name: 'Celebration décor', price: 5500, per: 'stay', description: 'Rose petals, a cake and a bottle of sparkling wine.' },
  { id: 'earlycheckin', name: 'Guaranteed early check‑in', price: 4000, per: 'stay', description: 'Your room ready from 9:00 am.' },
  { id: 'heritage', name: 'Private heritage walk', price: 3500, per: 'guest', description: 'Our resident historian guides you through the old city.' },
]

export const PROMOS: Record<string, { pct: number; label: string }> = {
  VIRASAT10: { pct: 10, label: '10% off — welcome offer' },
  MONSOON25: { pct: 25, label: '25% off — monsoon escape' },
  CIRCLE15: { pct: 15, label: '15% off — Virasat Circle members' },
}

export const OFFERS = [
  { id: 'monsoon', title: 'Monsoon Palaces', subtitle: 'Save 25% on stays of three nights or more', code: 'MONSOON25', image: 'udaipurLake', hotels: 'All palaces', valid: 'Valid June – September', perks: ['25% off best available rate', 'Daily breakfast', 'Complimentary spa ritual'] },
  { id: 'honeymoon', title: 'A Royal Honeymoon', subtitle: 'Petals, private dinners and a barge at sunset', code: 'VIRASAT10', image: 'poolDusk', hotels: 'Udaipur · Jaipur · Goa', valid: 'Valid all year', perks: ['Suite upgrade on availability', 'Candlelit dinner for two', 'Couple’s Abhyanga'] },
  { id: 'ayurveda', title: 'Ayurveda Immersion', subtitle: 'Seven days of classical rejuvenation', code: 'CIRCLE15', image: 'spaOil', hotels: 'Kettuvallam Retreat', valid: 'Valid all year', perks: ['Consultation with our vaidya', 'Daily treatments', 'Sattvic full board'] },
  { id: 'family', title: 'Heritage Family Holiday', subtitle: 'Kids stay and eat free', code: 'VIRASAT10', image: 'amerFort', hotels: 'Jaipur · Shimla', valid: 'Valid school holidays', perks: ['Connecting rooms', 'Kids eat free', 'Young historians’ club'] },
]

export const SPA_THERAPIES = [
  { name: 'Abhyanga', duration: '60 / 90 min', price: 7500, description: 'Synchronised four-hand massage with warm herbal oil chosen for your dosha.', image: 'spaOil' },
  { name: 'Shirodhara', duration: '75 min', price: 9500, description: 'A continuous stream of warm oil poured over the forehead to quiet the mind.', image: 'spaDrop' },
  { name: 'Pinda Sweda', duration: '60 min', price: 8500, description: 'Warm poultices of rice cooked in milk and herbs to restore joints and muscles.', image: 'spaStones' },
  { name: 'Mukhalepa Facial', duration: '60 min', price: 6500, description: 'Sandalwood, saffron and rose facial from the royal beauty rituals of Mewar.', image: 'spaTowel' },
]

export const LOYALTY_TIERS = [
  { name: 'Silver', nights: '0+', earn: 5, perks: ['Member rates (up to 10% off)', 'Early check‑in on availability', 'Welcome amenity'] },
  { name: 'Gold', nights: '10+', earn: 8, perks: ['All Silver benefits', 'Room upgrade on availability', 'Late checkout till 2 pm', 'Spa credit ₹2,500 per stay'] },
  { name: 'Platinum', nights: '25+', earn: 10, perks: ['All Gold benefits', 'Guaranteed suite upgrade twice a year', 'Complimentary airport transfers', 'Dedicated concierge'] },
  { name: 'Maharaja', nights: 'By invitation', earn: 15, perks: ['All Platinum benefits', 'Private butler at every palace', 'Birthday stay on us', 'Access to royal family events'] },
]

export const PRESS = [
  { quote: 'The most romantic hotel in India, and quite possibly the world.', source: 'Travel + Leisure' },
  { quote: 'A masterclass in how to restore a palace without embalming it.', source: 'Condé Nast Traveller' },
  { quote: 'Service so intuitive it feels like an inheritance.', source: 'The Financial Times' },
  { quote: 'Heritage hospitality at its most soulful.', source: 'Vogue India' },
]

export const TESTIMONIALS = [
  { name: 'Eleanor & James Whitfield', from: 'London', text: 'Arriving at Jal Mahal Niwas by barge at dusk, with shehnai drifting across the water, is a memory we will carry forever. Every member of staff knew our names by the second morning.' },
  { name: 'Ananya Deshmukh', from: 'Mumbai', text: 'We held our wedding at Amer Bagh — 400 guests, three days, not a single thing out of place. The sales team treated it like their own family’s celebration.' },
  { name: 'Kenji Watanabe', from: 'Tokyo', text: 'The dawn yoga on the roof of Ghat House as the city woke up was the most peaceful hour I have spent anywhere.' },
]

export const JOURNAL = [
  { slug: 'the-art-of-the-thali', title: 'The Art of the Royal Thali', category: 'Cuisine', date: '12 Sep 2026', read: '6 min', image: 'thali', excerpt: 'Why a silver plate of twenty-six dishes tells the story of a kingdom — and how our chefs recovered forgotten Mewar recipes.', body: ['In the royal kitchens of Mewar, a thali was never merely a meal. It was a map of the kingdom — millet from the desert, river fish from the lakes, wild greens from the Aravalli forests.', 'When our executive chef began restoring the menu at Neel Kamal, she spent two years in the homes of former palace cooks, recording recipes that had only ever been passed from father to son.', 'The result is a thali of twenty-six preparations, served in the order prescribed by an eighteenth-century manuscript: the sweet first, to settle the mind; the sour and the salty next; the bitter to close.'] },
  { slug: 'restoring-a-lake-palace', title: 'Ten Years, One Palace', category: 'Heritage', date: '28 Aug 2026', read: '8 min', image: 'whiteArches', excerpt: 'Inside the decade-long restoration of Jal Mahal Niwas, from lime plaster to hand-ground mineral pigments.', body: ['When restoration began, the monsoon had claimed most of the eastern wing. Rather than rebuild in concrete, we assembled a team of 140 craftsmen — masons, painters, inlay artists — many from families that had served the palace for generations.', 'Lime plaster was mixed the traditional way, with jaggery and fenugreek, and polished with agate stones to achieve the mirror finish called araish.', 'Today the palace is certified by INTACH, and its craftsmen continue to maintain it — a living workshop rather than a museum.'] },
  { slug: 'diwali-in-the-palaces', title: 'Diwali in the Palaces', category: 'Festivals', date: '02 Aug 2026', read: '5 min', image: 'amerLake', excerpt: 'Ten thousand diyas, rangoli from dawn and fireworks over the lake — how each Virasat palace celebrates the festival of lights.', body: ['For a week each autumn, our palaces are transformed. At Amer Bagh, ten thousand clay diyas are lit along the ramparts; at Jal Mahal Niwas, floating lamps drift across Lake Pichola.', 'Guests are invited to join our families in the Lakshmi puja, to make rangoli with our housekeeping artists, and to share sweets from the royal halwai.'] },
  { slug: 'ayurveda-myths', title: 'Five Myths About Ayurveda', category: 'Wellness', date: '19 Jul 2026', read: '7 min', image: 'spaOil', excerpt: 'Our resident vaidya on what classical Ayurveda really is — and what it is not.', body: ['Ayurveda is often reduced to massages and herbal oils. In truth it is a complete system of medicine, with its own diagnostics, pharmacology and surgery.', 'At Kettuvallam, every programme begins with a consultation in which our vaidya reads the pulse — nadi pariksha — to understand your constitution.'] },
]

export const TIMELINE = [
  { year: '1746', title: 'A summer palace on the lake', text: 'Jal Mahal Niwas is built as a monsoon retreat for the Mewar court.' },
  { year: '1835', title: 'Amer Bagh is commissioned', text: 'A hunting lodge beneath Amer Fort becomes the Kachwaha family’s garden palace.' },
  { year: '1911', title: 'The Virasat family opens its doors', text: 'Ridge Lodge welcomes its first paying guests — the founding of Virasat Hotels.' },
  { year: '1972', title: 'Heritage hospitality is born', text: 'Our palaces are among the first in India to be restored as heritage hotels.' },
  { year: '2016', title: 'Ten years of restoration', text: 'Jal Mahal Niwas reopens after a decade-long restoration by 140 artisans.' },
  { year: 'Today', title: 'Six homes, one legacy', text: 'From the Himalaya to the backwaters, six houses carry the same spirit of welcome.' },
]

export const WEDDING_VENUES = [
  { hotel: 'Amer Bagh Palace', venue: 'Mughal Garden Lawns', capacity: 800, type: 'Outdoor', image: 'amerLake' },
  { hotel: 'Amer Bagh Palace', venue: 'Suvarna Durbar Hall', capacity: 300, type: 'Indoor', image: 'banquet' },
  { hotel: 'Jal Mahal Niwas', venue: 'Mewar Terrace', capacity: 250, type: 'Outdoor', image: 'udaipurLake' },
  { hotel: 'Kettuvallam Retreat', venue: 'Lakeside Pavilion', capacity: 180, type: 'Outdoor', image: 'keralaBackwater' },
  { hotel: 'Casa Fontainhas', venue: 'Agonda Beach', capacity: 150, type: 'Outdoor', image: 'goaBeach' },
  { hotel: 'Ridge Lodge', venue: 'The Conservatory', capacity: 90, type: 'Indoor', image: 'himalayaRange' },
]

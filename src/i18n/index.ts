import { useStore } from '../store/useStore'

const hi: Record<string, string> = {
  Destinations: 'गंतव्य',
  Experiences: 'अनुभव',
  Dining: 'भोजन',
  Weddings: 'विवाह',
  Wellness: 'स्वास्थ्य',
  Offers: 'ऑफ़र',
  'Virasat Circle': 'विरासत सर्कल',
  Journal: 'पत्रिका',
  'Book a Stay': 'बुक करें',
  'Check availability': 'उपलब्धता देखें',
  Destination: 'गंतव्य',
  'Check-in': 'चेक‑इन',
  'Check-out': 'चेक‑आउट',
  Guests: 'अतिथि',
  'Promo code': 'प्रोमो कोड',
  'Discover more': 'और जानें',
  'Explore the palace': 'महल देखें',
  'Our Legacy': 'हमारी विरासत',
  'Where India’s legacy lives on': 'जहाँ भारत की विरासत जीवित है',
  'Manage booking': 'बुकिंग प्रबंधित करें',
  Contact: 'संपर्क',
  'Rooms & Suites': 'कमरे और सुइट्स',
  'Signature Experiences': 'विशेष अनुभव',
  'For Hoteliers': 'होटल व्यवसायियों के लिए',
}

export function useT() {
  const lang = useStore((s) => s.lang)
  return (s: string) => (lang === 'hi' ? hi[s] ?? s : s)
}

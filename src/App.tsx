import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import GuestLayout from './components/guest/Layout'
import Home from './pages/guest/Home'
import HotelPage from './pages/guest/Hotel'
import RoomPage from './pages/guest/Room'
import Book from './pages/guest/Book'
import Confirmation from './pages/guest/Confirmation'
import { Destinations, Dining, Experiences, NotFound, Offers, Wellness } from './pages/guest/Discover'
import { Article, Circle, Contact, GiftCards, Journal, ManageBooking, MyStays, Weddings } from './pages/guest/More'

const ForHoteliers = lazy(() => import('./pages/pitch/ForHoteliers'))
const BehindTheBuild = lazy(() => import('./pages/pitch/BehindTheBuild'))
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

function Loader() {
  return (
    <div className="grid min-h-screen place-items-center bg-ivory">
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 64 32" className="w-14 animate-pulse text-gold" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M32 4c5 6 7 12 0 24-7-12-5-18 0-24z" /><path d="M32 28C27 20 19 16 10 16c4 7 12 12 22 12zM32 28c5-8 13-12 22-12-4 7-12 12-22 12z" /></svg>
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone">Virasat</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route element={<GuestLayout />}>
          <Route index element={<Home />} />
          <Route path="destinations" element={<Destinations />} />
          <Route path="hotels/:slug" element={<HotelPage />} />
          <Route path="hotels/:slug/rooms/:roomId" element={<RoomPage />} />
          <Route path="book" element={<Book />} />
          <Route path="booking/:ref" element={<Confirmation />} />
          <Route path="experiences" element={<Experiences />} />
          <Route path="dining" element={<Dining />} />
          <Route path="wellness" element={<Wellness />} />
          <Route path="offers" element={<Offers />} />
          <Route path="weddings" element={<Weddings />} />
          <Route path="circle" element={<Circle />} />
          <Route path="journal" element={<Journal />} />
          <Route path="journal/:slug" element={<Article />} />
          <Route path="gift-cards" element={<GiftCards />} />
          <Route path="contact" element={<Contact />} />
          <Route path="manage-booking" element={<ManageBooking />} />
          <Route path="my-stays" element={<MyStays />} />
          <Route path="for-hoteliers" element={<ForHoteliers />} />
          <Route path="behind-the-build" element={<BehindTheBuild />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

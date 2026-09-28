import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import type { Hotel } from '../../types'

const icon = (active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${active ? 22 : 16}px;height:${active ? 22 : 16}px;border-radius:50%;background:${active ? '#9E3B2A' : '#1C1A17'};border:3px solid #F6F1E7;box-shadow:0 0 0 1px #B08D57,0 6px 14px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

export default function IndiaMap({ hotels, active, onHover, center, zoom = 5, className = 'h-[560px]' }: { hotels: Hotel[]; active?: string; onHover?: (id: string) => void; center?: [number, number]; zoom?: number; className?: string }) {
  return (
    <MapContainer center={center ?? [22.5, 79]} zoom={zoom} scrollWheelZoom={false} className={`${className} w-full`} attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      {hotels.map((h) => (
        <Marker key={h.id} position={h.coords} icon={icon(active === h.id)} eventHandlers={{ mouseover: () => onHover?.(h.id) }}>
          <Popup>
            <div style={{ fontFamily: 'Jost' }}>
              <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#B08D57' }}>{h.city}</div>
              <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 20 }}>{h.name}</div>
              <Link to={`/hotels/${h.slug}`}>Explore →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SearchBox } from "@mapbox/search-js-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { AlertCircle } from "lucide-react"

type LngLatTuple = [number, number]

// Libmanan, Camarines Sur bounding box
// Format: [minLng, minLat, maxLng, maxLat]
// Approximate boundaries covering Libmanan municipality
const LIBMANAN_BBOX: [number, number, number, number] = [122.95, 13.6, 123.15, 13.8]

/**
 * Check if coordinates are within Libmanan boundaries
 * @param coords - Coordinates in [lng, lat] format
 * @returns true if coordinates are within Libmanan, false otherwise
 */
function isWithinLibmanan(coords: LngLatTuple | null): boolean {
  if (!coords) return false
  const [lng, lat] = coords
  const [minLng, minLat, maxLng, maxLat] = LIBMANAN_BBOX
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
}

interface AddressMapPickerProps {
  // Current address text value (controlled by parent)
  address: string
  // Called whenever address text should change
  onAddressChange: (value: string) => void

  // Current coordinates value (controlled by parent). Format: [lng, lat]
  coordinates: LngLatTuple | null
  // Called whenever coordinates change (due to click/drag/search)
  onCoordinatesChange: (value: LngLatTuple | null) => void

  // Optional height for the map container
  mapHeightPx?: number
  
  // Whether the map should be interactive (default: true)
  interactive?: boolean
  
  // Whether the address input field should be disabled (default: false)
  disabled?: boolean

  // Called when location validation status changes (true = within Libmanan, false = outside)
  onLocationValid?: (isValid: boolean) => void
}

/**
 * AddressMapPicker encapsulates Mapbox search and an interactive map with a draggable marker.
 * - Parent controls `address` and `coordinates` state; this component emits changes via callbacks.
 * - Coordinates are represented as [lng, lat].
 */
export function AddressMapPicker({
  address,
  onAddressChange,
  coordinates,
  onCoordinatesChange,
  mapHeightPx = 300,
  interactive = true,
  disabled = false,
  onLocationValid,
}: AddressMapPickerProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

  // Local map/marker refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  
  // Track if current location is within Libmanan
  const [isWithinBounds, setIsWithinBounds] = useState<boolean | null>(null)

  // Helper: Check if coordinates are within Libmanan and notify parent
  const validateLocation = (coords: LngLatTuple | null) => {
    if (!coords) {
      setIsWithinBounds(null)
      // Don't notify parent when coordinates are null - let parent handle that
      return
    }
    const isValid = isWithinLibmanan(coords)
    setIsWithinBounds(isValid)
    onLocationValid?.(isValid)
  }

  // Helper: reverse geocode coordinates -> address via Mapbox Geocoding API
  const reverseTimerRef = useRef<number | null>(null)
  const scheduleReverseGeocode = (lng: number, lat: number) => {
    if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current)
    reverseTimerRef.current = window.setTimeout(async () => {
      try {
        if (!accessToken) return
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}`
        const res = await fetch(url)
        if (!res.ok) return
        const data: any = await res.json()
        const place = data?.features?.[0]?.place_name as string | undefined
        if (place) onAddressChange(place)
      } catch {
        // best-effort only
      }
    }, 400)
  }

  // Initialize map once
  useEffect(() => {
    if (!accessToken) return
    if (mapRef.current || !mapContainerRef.current) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      // Default center: Libmanan, Camarines Sur, Bicol (approximate)
      center: coordinates ?? [123.05, 13.7],
      zoom: coordinates ? 14 : 12,
      style: "mapbox://styles/mapbox/streets-v12",
      interactive: interactive,
    })

    map.on("load", () => setMapLoaded(true))

    // Click to set/move marker (only when interactive)
    if (interactive) {
      map.on("click", (e) => {
        const newCoords: LngLatTuple = [e.lngLat.lng, e.lngLat.lat]
        ensureMarker(map, newCoords)
        onCoordinatesChange(newCoords)
        validateLocation(newCoords)
        scheduleReverseGeocode(newCoords[0], newCoords[1])
      })
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [accessToken])

  // If parent provides coordinates later, reflect them in the map/marker and fly
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    if (!coordinates) return
    ensureMarker(mapRef.current, coordinates)
    mapRef.current.flyTo({ center: coordinates, zoom: Math.max(mapRef.current.getZoom(), 14) })
    validateLocation(coordinates)
  }, [mapLoaded, coordinates])

  // Ensure marker exists and attach drag handlers
  const ensureMarker = (map: mapboxgl.Map, lngLat: LngLatTuple) => {
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: interactive })
        .setLngLat(lngLat)
        .addTo(map)

      if (interactive) {
        markerRef.current.on("drag", () => {
          const m = markerRef.current
          if (!m) return
          const pos = m.getLngLat()
          const tuple: LngLatTuple = [pos.lng, pos.lat]
          onCoordinatesChange(tuple)
          validateLocation(tuple)
          scheduleReverseGeocode(pos.lng, pos.lat)
        })

        markerRef.current.on("dragend", () => {
          const m = markerRef.current
          if (!m) return
          const pos = m.getLngLat()
          const tuple: LngLatTuple = [pos.lng, pos.lat]
          onCoordinatesChange(tuple)
          validateLocation(tuple)
        })
      }
    } else {
      markerRef.current.setLngLat(lngLat)
    }
  }

  const coordsText = coordinates ? `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}` : ""

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          placeholder="123 Main St, City, State 12345"
          value={address}
          readOnly
          disabled={disabled}
          className="text-gray-500 focus:outline-none focus:ring-0 focus:border-input focus-visible:outline-none focus-visible:ring-0 focus-visible:border-input"
        />
        {/* Show error indicator when location is outside Libmanan */}
        {isWithinBounds === false && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Address is out of scope!</span>
          </div>
        )}
      </div>

      {accessToken ? (
        <div className="space-y-2">
          {interactive && (
            <SearchBox
              accessToken={accessToken}
              map={mapRef.current as unknown as mapboxgl.Map}
              mapboxgl={mapboxgl as unknown as any}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onRetrieve={(res) => {
                const feature = (res as any)?.features?.[0]
                const coords = feature?.geometry?.coordinates as LngLatTuple | undefined
                const props = (feature?.properties as any) || {}
                const placeName = props.full_address || props.name || props.place_formatted || props.formatted_address
                if (coords && mapRef.current) {
                  mapRef.current.flyTo({ center: coords, zoom: 14 })
                  ensureMarker(mapRef.current, coords)
                  onCoordinatesChange(coords)
                  validateLocation(coords)
                }
                if (placeName) onAddressChange(String(placeName))
              }}
              options={{ 
                language: "en",
                // Limit search results to Libmanan bounding box
                // Format: [minLng, minLat, maxLng, maxLat]
                bbox: LIBMANAN_BBOX,
                // Bias results towards Libmanan center
                proximity: [123.05, 13.7]
              }}
            />
          )}
          <div
            id="map-container"
            ref={mapContainerRef}
            style={{ height: mapHeightPx }}
            className="rounded-md border"
          />
        </div>
      ) : (
        <p className="text-xs text-red-600">Map is unavailable. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable.</p>
      )}

    </div>
  )
}

export default AddressMapPicker



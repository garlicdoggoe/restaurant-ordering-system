"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type LngLatTuple = [number, number]

// Default center: Libmanan, Camarines Sur, Bicol (approximate)
const DEFAULT_CENTER: LngLatTuple = [123.05, 13.7]
const DEFAULT_ZOOM = 12

interface DeliveryMapProps {
  // Delivery address text
  address?: string | null
  // Delivery coordinates (optional). Format: [lng, lat]
  coordinates?: LngLatTuple | null
  // Optional height for the map container (default: 200px)
  mapHeightPx?: number
}

/**
 * DeliveryMap displays a read-only Mapbox map with a marker at the delivery location.
 * - If coordinates are provided, they are used directly
 * - If coordinates are not provided but address exists, reverse geocoding is attempted
 * - If neither is available, the map centers on the default location (Libmanan)
 * - Map is non-interactive (read-only display)
 */
export function DeliveryMap({
  address,
  coordinates,
  mapHeightPx = 200,
}: DeliveryMapProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

  // Local map/marker refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [resolvedCoordinates, setResolvedCoordinates] = useState<LngLatTuple | null>(coordinates ?? null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Reverse geocode address to coordinates if coordinates not provided
  useEffect(() => {
    // If coordinates are already provided, use them
    if (coordinates) {
      setResolvedCoordinates(coordinates)
      return
    }

    // If no coordinates but address exists, try to reverse geocode
    if (!coordinates && address && accessToken && !isGeocoding) {
      setIsGeocoding(true)
      const geocodeAddress = async () => {
        try {
          // Use Mapbox Geocoding API to convert address to coordinates
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${accessToken}&limit=1`
          const res = await fetch(url)
          if (!res.ok) {
            setIsGeocoding(false)
            return
          }
          const data = await res.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> }
          const feature = data?.features?.[0]
          if (feature?.geometry?.coordinates) {
            const coords: LngLatTuple = [
              feature.geometry.coordinates[0],
              feature.geometry.coordinates[1],
            ]
            setResolvedCoordinates(coords)
          }
        } catch (error) {
          console.error("Failed to geocode address:", error)
        } finally {
          setIsGeocoding(false)
        }
      }
      geocodeAddress()
    }

    // If neither coordinates nor address, use default location
    if (!coordinates && !address) {
      setResolvedCoordinates(DEFAULT_CENTER)
    }
  }, [coordinates, address, accessToken, isGeocoding])

  // Initialize map once
  useEffect(() => {
    if (!accessToken) return
    if (mapRef.current || !mapContainerRef.current) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: resolvedCoordinates ?? DEFAULT_CENTER,
      zoom: resolvedCoordinates ? 14 : DEFAULT_ZOOM,
      style: "mapbox://styles/mapbox/streets-v12",
      interactive: false, // Read-only, no interaction
    })

    map.on("load", () => setMapLoaded(true))

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Map initialization should only run once when accessToken changes
    // resolvedCoordinates is handled in a separate useEffect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Update map when coordinates change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    
    const coordsToUse = resolvedCoordinates ?? DEFAULT_CENTER
    
    // Ensure marker exists
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: false }) // Non-draggable marker
        .setLngLat(coordsToUse)
        .addTo(mapRef.current)
    } else {
      markerRef.current.setLngLat(coordsToUse)
    }

    // Fly to the coordinates
    mapRef.current.flyTo({ 
      center: coordsToUse, 
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 1000,
    })
  }, [mapLoaded, resolvedCoordinates])

  // Don't render if no access token
  if (!accessToken) {
    return null
  }

  return (
    <div className="space-y-2">
      {address && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Delivery Address:</span> {address}
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{ height: mapHeightPx }}
        className="rounded-md border w-full"
      />
      {isGeocoding && (
        <p className="text-xs text-muted-foreground">Loading map location...</p>
      )}
    </div>
  )
}

export default DeliveryMap


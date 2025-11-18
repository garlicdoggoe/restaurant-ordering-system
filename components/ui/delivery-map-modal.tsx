"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type LngLatTuple = [number, number]

// Default center: Libmanan, Camarines Sur, Bicol (approximate)
const DEFAULT_CENTER: LngLatTuple = [123.05, 13.7]
const DEFAULT_ZOOM = 12

interface DeliveryMapModalProps {
  // Whether the modal is open
  open: boolean
  // Callback when modal open state changes
  onOpenChange: (open: boolean) => void
  // Delivery address text
  address?: string | null
  // Delivery coordinates (optional). Format: [lng, lat]
  coordinates?: LngLatTuple | null
}

/**
 * DeliveryMapModal displays an enlarged, interactive Mapbox map with zoom controls
 * in a modal dialog. The map is fully interactive, allowing users to zoom in/out and pan.
 * - If coordinates are provided, they are used directly
 * - If coordinates are not provided but address exists, reverse geocoding is attempted
 * - If neither is available, the map centers on the default location (Libmanan)
 */
export function DeliveryMapModal({
  open,
  onOpenChange,
  address,
  coordinates,
}: DeliveryMapModalProps) {
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

  // Initialize map when modal opens and container is ready
  useEffect(() => {
    if (!open || !accessToken) {
      // Clean up map when modal closes
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        setMapLoaded(false)
      }
      return
    }

    if (mapRef.current) return // Map already exists

    let retryCount = 0
    const maxRetries = 20 // Max 2 seconds of retries

    // Wait for container to be available (modal animation might delay rendering)
    const initMap = () => {
      if (!mapContainerRef.current) {
        retryCount++
        if (retryCount < maxRetries) {
          // Retry after a short delay if container isn't ready
          setTimeout(initMap, 100)
        } else {
          console.error("Map container not available after retries")
        }
        return
      }

      if (mapRef.current) return // Map was initialized while waiting

      try {
        mapboxgl.accessToken = accessToken
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          center: resolvedCoordinates ?? DEFAULT_CENTER,
          zoom: resolvedCoordinates ? 15 : DEFAULT_ZOOM, // Higher zoom for modal view
          style: "mapbox://styles/mapbox/streets-v12",
          interactive: true, // Fully interactive with zoom and pan
        })

        // Add zoom controls
        const nav = new mapboxgl.NavigationControl()
        map.addControl(nav, "top-right")

        map.on("load", () => setMapLoaded(true))

        mapRef.current = map
      } catch (error) {
        console.error("Failed to initialize map:", error)
      }
    }

    // Small delay to ensure modal is fully rendered
    const timeoutId = setTimeout(initMap, 100)

    return () => {
      clearTimeout(timeoutId)
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (error) {
          console.error("Error removing map:", error)
        }
        mapRef.current = null
        markerRef.current = null
        setMapLoaded(false)
      }
    }
  }, [open, accessToken, resolvedCoordinates])

  // Update map when coordinates change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !open) return
    
    const coordsToUse = resolvedCoordinates ?? DEFAULT_CENTER
    
    // Ensure marker exists
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: false })
        .setLngLat(coordsToUse)
        .addTo(mapRef.current)
    } else {
      markerRef.current.setLngLat(coordsToUse)
    }

    // Fly to the coordinates
    mapRef.current.flyTo({ 
      center: coordsToUse, 
      zoom: Math.max(mapRef.current.getZoom(), 15),
      duration: 1000,
    })
  }, [mapLoaded, resolvedCoordinates, open])


  // Don't render if no access token
  if (!accessToken) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Delivery Location</DialogTitle>
        </DialogHeader>
        {address && (
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Address:</span> {address}
          </div>
        )}
        <div className="space-y-2">
          <div
            ref={mapContainerRef}
            style={{ height: "70vh", minHeight: "500px" }}
            className="rounded-md border w-full"
          />
          {isGeocoding && (
            <p className="text-xs text-muted-foreground">Loading map location...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeliveryMapModal


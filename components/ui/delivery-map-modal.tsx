"use client"

import { useEffect, useRef, useState, useCallback } from "react"
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
  // Optional restaurant coordinates to display route from restaurant to customer
  restaurantCoordinates?: { lng: number; lat: number } | null
  // Whether to show the route from restaurant to customer (default: true)
  showRoute?: boolean
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
  restaurantCoordinates,
  showRoute = true,
}: DeliveryMapModalProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

  // Local map/marker refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const restaurantMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [resolvedCoordinates, setResolvedCoordinates] = useState<LngLatTuple | null>(coordinates ?? null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Fetch route geometry from Mapbox Directions API
  const fetchRoute = useCallback(async (
    restaurantCoords: { lng: number; lat: number },
    customerCoords: LngLatTuple
  ) => {
    if (!accessToken || !showRoute) return null

    try {
      // Format coordinates for Mapbox Directions API
      // Format: {lng},{lat};{lng},{lat} (semicolon-separated)
      // Start from restaurant, end at customer
      const coordinates = `${restaurantCoords.lng},${restaurantCoords.lat};${customerCoords[0]},${customerCoords[1]}`
      
      // Use driving profile for route calculation
      const profile = "mapbox/driving"
      
      // Build API URL with geometries=geojson to get route geometry
      const url = `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?access_token=${accessToken}&geometries=geojson`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`Mapbox Directions API error: ${response.status} ${response.statusText}`)
        return null
      }
      
      const data = await response.json() as {
        code?: string
        routes?: Array<{ geometry?: GeoJSON.LineString }>
      }
      
      // Check if route was found
      if (data.code === "NoRoute" || !data.routes || data.routes.length === 0) {
        console.warn("No route found between restaurant and customer coordinates")
        return null
      }
      
      // Extract route geometry from first route
      const geometry = data.routes[0]?.geometry
      
      if (!geometry || geometry.type !== "LineString") {
        console.error("Invalid route geometry in API response")
        return null
      }
      
      return geometry
    } catch (error) {
      console.error("Error fetching route via Mapbox Directions API:", error instanceof Error ? error.message : "Unknown error")
      return null
    }
  }, [accessToken, showRoute])

  // Ensure restaurant marker exists
  const ensureRestaurantMarker = useCallback((map: mapboxgl.Map, lngLat: { lng: number; lat: number }) => {
    if (!restaurantMarkerRef.current) {
      // Create a custom restaurant marker with different color
      const el = document.createElement("div")
      el.className = "restaurant-marker"
      el.style.width = "20px"
      el.style.height = "20px"
      el.style.borderRadius = "50%"
      el.style.backgroundColor = "#ef4444" // Red color for restaurant
      el.style.border = "3px solid white"
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)"
      el.style.cursor = "pointer"
      
      restaurantMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: false })
        .setLngLat([lngLat.lng, lngLat.lat])
        .addTo(map)
    } else {
      restaurantMarkerRef.current.setLngLat([lngLat.lng, lngLat.lat])
    }
  }, [])

  // Add or update route layer on map
  const updateRouteLayer = useCallback((map: mapboxgl.Map, geometry: GeoJSON.LineString | null) => {
    if (!map.getSource("route")) {
      // Add route source if it doesn't exist
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: geometry || { type: "LineString", coordinates: [] },
        },
      })
    } else {
      // Update existing route source
      const source = map.getSource("route") as mapboxgl.GeoJSONSource
      source.setData({
        type: "Feature",
        properties: {},
        geometry: geometry || { type: "LineString", coordinates: [] },
      })
    }

    // Add route layer if it doesn't exist
    if (!map.getLayer("route")) {
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#fbbf24", // Yellow color for route
          "line-width": 4,
          "line-opacity": 0.75,
        },
      })
    }
  }, [])

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
        try {
          // Clean up route layer if it exists
          if (mapRef.current.getSource("route")) {
            if (mapRef.current.getLayer("route")) {
              mapRef.current.removeLayer("route")
            }
            mapRef.current.removeSource("route")
          }
          // Remove markers
          if (markerRef.current) {
            markerRef.current.remove()
          }
          if (restaurantMarkerRef.current) {
            restaurantMarkerRef.current.remove()
          }
          mapRef.current.remove()
        } catch (error) {
          console.error("Error cleaning up map:", error)
        }
        mapRef.current = null
        markerRef.current = null
        restaurantMarkerRef.current = null
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

        map.on("load", () => {
          setMapLoaded(true)
          // Initialize route layer when map loads (empty initially)
          updateRouteLayer(map, null)
        })

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
          // Clean up route layer if it exists
          if (mapRef.current.getSource("route")) {
            if (mapRef.current.getLayer("route")) {
              mapRef.current.removeLayer("route")
            }
            mapRef.current.removeSource("route")
          }
          // Remove markers
          if (markerRef.current) {
            markerRef.current.remove()
          }
          if (restaurantMarkerRef.current) {
            restaurantMarkerRef.current.remove()
          }
          mapRef.current.remove()
        } catch (error) {
          console.error("Error removing map:", error)
        }
        mapRef.current = null
        markerRef.current = null
        restaurantMarkerRef.current = null
        setMapLoaded(false)
      }
    }
  }, [open, accessToken, resolvedCoordinates, updateRouteLayer])

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

  // Fetch and display route when both restaurant and customer coordinates are available
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !open) return
    
    // If showRoute is disabled or coordinates are missing, clear route and restaurant marker
    if (!showRoute || !restaurantCoordinates || !resolvedCoordinates) {
      // Clear route if coordinates are missing or route display is disabled
      if (mapRef.current.getSource("route")) {
        updateRouteLayer(mapRef.current, null)
      }
      // Remove restaurant marker if coordinates are missing or route is disabled
      if (restaurantMarkerRef.current) {
        restaurantMarkerRef.current.remove()
        restaurantMarkerRef.current = null
      }
      return
    }

    // Add restaurant marker
    ensureRestaurantMarker(mapRef.current, restaurantCoordinates)

    // Fetch route
    const loadRoute = async () => {
      const geometry = await fetchRoute(restaurantCoordinates, resolvedCoordinates)
      if (mapRef.current) {
        updateRouteLayer(mapRef.current, geometry)
        
        // Fit map to show both restaurant and customer with route
        if (geometry && geometry.coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend([restaurantCoordinates.lng, restaurantCoordinates.lat])
          bounds.extend(resolvedCoordinates)
          // Extend bounds to include all route points
          // Position can be [lng, lat] or [lng, lat, elevation], we only need first two
          geometry.coordinates.forEach((coord) => {
            if (Array.isArray(coord) && coord.length >= 2) {
              bounds.extend([coord[0] as number, coord[1] as number])
            }
          })
          mapRef.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 16,
          })
        } else {
          // If no route, just fit to show both markers
          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend([restaurantCoordinates.lng, restaurantCoordinates.lat])
          bounds.extend(resolvedCoordinates)
          mapRef.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 16,
          })
        }
      }
    }

    loadRoute()
  }, [mapLoaded, restaurantCoordinates, resolvedCoordinates, showRoute, fetchRoute, updateRouteLayer, ensureRestaurantMarker, open])


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


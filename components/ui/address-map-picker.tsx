"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SearchBox } from "@mapbox/search-js-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { AlertCircle, ZoomIn, MapPin, Info } from "lucide-react"

type LngLatTuple = [number, number]

// Delivery coverage areas: Libmanan, Sipocot, and Cabusao, Camarines Sur bounding boxes
// Format: [minLng, minLat, maxLng, maxLat]
// Approximate boundaries covering these municipalities
const LIBMANAN_BBOX: [number, number, number, number] = [122.95, 13.6, 123.15, 13.8]
const SIPOCOT_BBOX: [number, number, number, number] = [122.9, 13.75, 123.0, 13.85]
const CABUSAO_BBOX: [number, number, number, number] = [122.85, 13.65, 122.95, 13.75]

/**
 * Check if coordinates are within delivery coverage (Libmanan, Sipocot, or Cabusao)
 * @param coords - Coordinates in [lng, lat] format
 * @returns true if coordinates are within delivery coverage, false otherwise
 */
function isWithinDeliveryCoverage(coords: LngLatTuple | null): boolean {
  if (!coords) return false
  const [lng, lat] = coords
  
  // Check Libmanan
  const [minLng1, minLat1, maxLng1, maxLat1] = LIBMANAN_BBOX
  if (lng >= minLng1 && lng <= maxLng1 && lat >= minLat1 && lat <= maxLat1) return true
  
  // Check Sipocot
  const [minLng2, minLat2, maxLng2, maxLat2] = SIPOCOT_BBOX
  if (lng >= minLng2 && lng <= maxLng2 && lat >= minLat2 && lat <= maxLat2) return true
  
  // Check Cabusao
  const [minLng3, minLat3, maxLng3, maxLat3] = CABUSAO_BBOX
  if (lng >= minLng3 && lng <= maxLng3 && lat >= minLat3 && lat <= maxLat3) return true
  
  return false
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

  // Whether to show the address search box (defaults to true for backward compatibility)
  showSearchBox?: boolean

  // Optional restaurant coordinates to display route from restaurant to customer
  restaurantCoordinates?: { lng: number; lat: number } | null

  // Whether to show the route from restaurant to customer (default: true)
  showRoute?: boolean
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
  showSearchBox = true,
  restaurantCoordinates,
  showRoute = true,
}: AddressMapPickerProps) {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

  // Local map/marker refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const restaurantMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  
  // Track if current location is within Libmanan
  const [isWithinBounds, setIsWithinBounds] = useState<boolean | null>(null)

  // Helper: Check if coordinates are within delivery coverage and notify parent
  const validateLocation = useCallback((coords: LngLatTuple | null) => {
    if (!coords) {
      setIsWithinBounds(null)
      // Don't notify parent when coordinates are null - let parent handle that
      return
    }
    const isValid = isWithinDeliveryCoverage(coords)
    setIsWithinBounds(isValid)
    onLocationValid?.(isValid)
  }, [onLocationValid])

  // Helper: reverse geocode coordinates -> address via Mapbox Geocoding API
  const reverseTimerRef = useRef<number | null>(null)
  const scheduleReverseGeocode = useCallback((lng: number, lat: number) => {
    if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current)
    reverseTimerRef.current = window.setTimeout(async () => {
      try {
        if (!accessToken) return
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json() as { features?: Array<{ place_name?: string }> }
        const place = data?.features?.[0]?.place_name as string | undefined
        if (place) onAddressChange(place)
      } catch {
        // best-effort only
      }
    }, 400)
  }, [accessToken, onAddressChange])

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

  // Ensure marker exists and attach drag handlers
  const ensureMarker = useCallback((map: mapboxgl.Map, lngLat: LngLatTuple) => {
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
  }, [interactive, onCoordinatesChange, validateLocation, scheduleReverseGeocode])

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

    map.on("load", () => {
      setMapLoaded(true)
      // Initialize route layer when map loads (empty initially)
      updateRouteLayer(map, null)
    })

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
      // Clean up route layer if it exists
      if (map.getSource("route")) {
        if (map.getLayer("route")) {
          map.removeLayer("route")
        }
        map.removeSource("route")
      }
      // Remove markers
      if (markerRef.current) {
        markerRef.current.remove()
      }
      if (restaurantMarkerRef.current) {
        restaurantMarkerRef.current.remove()
      }
      map.remove()
      mapRef.current = null
      markerRef.current = null
      restaurantMarkerRef.current = null
    }
    // Map initialization should only run once when accessToken changes
    // The callbacks (ensureMarker, validateLocation, etc.) are stable due to useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, updateRouteLayer])

  // If parent provides coordinates later, reflect them in the map/marker and fly
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    if (!coordinates) return
    ensureMarker(mapRef.current, coordinates)
    mapRef.current.flyTo({ center: coordinates, zoom: Math.max(mapRef.current.getZoom(), 14) })
    validateLocation(coordinates)
  }, [mapLoaded, coordinates, ensureMarker, validateLocation])

  // Fetch and display route when both restaurant and customer coordinates are available
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    
    // If showRoute is disabled or coordinates are missing, clear route and restaurant marker
    if (!showRoute || !restaurantCoordinates || !coordinates) {
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
      const geometry = await fetchRoute(restaurantCoordinates, coordinates)
      if (mapRef.current) {
        updateRouteLayer(mapRef.current, geometry)
        
        // Fit map to show both restaurant and customer with route
        if (geometry && geometry.coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend([restaurantCoordinates.lng, restaurantCoordinates.lat])
          bounds.extend(coordinates)
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
          bounds.extend(coordinates)
          mapRef.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 16,
          })
        }
      }
    }

    loadRoute()
  }, [mapLoaded, restaurantCoordinates, coordinates, showRoute, fetchRoute, updateRouteLayer, ensureRestaurantMarker])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        {/* Show warning indicator when location is outside delivery coverage */}
        {isWithinBounds === false && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-yellow-600">Warning! Address is outside delivery coverage (Libmanan, Sipocot, Cabusao only).</span>
          </div>
        )}
      </div>

      {accessToken ? (
        <div className="space-y-2">
          {/* Search box - only show if both interactive and showSearchBox are true */}
          {interactive && showSearchBox && (
            <SearchBox
              accessToken={accessToken}
              map={mapRef.current as unknown as mapboxgl.Map}
              mapboxgl={mapboxgl as unknown as typeof mapboxgl}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onRetrieve={(res) => {
                const feature = (res as unknown as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }> })?.features?.[0]
                const coords = feature?.geometry?.coordinates as LngLatTuple | undefined
                const props = feature?.properties || {}
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
                // Limit search results to delivery coverage areas
                // Format: [minLng, minLat, maxLng, maxLat]
                // Combined bounding box covering all three municipalities
                bbox: [122.85, 13.6, 123.15, 13.85],
                // Bias results towards center of coverage area
                proximity: [123.0, 13.7]
              }}
            />
          )}
          
          {/* Map instructions - show when interactive and search box is disabled, or always as helpful hint when interactive */}
          {interactive && (
            <div className="p-3 rounded-md border bg-muted/50 border-border flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex-1 space-y-2">
                {!showSearchBox ? (
                  <>
                    <p className="text-xs font-medium text-foreground">How to select your address:</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                        <span>Zoom in or out to find your location</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Click on the map to pin your address</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    <span className="font-semibold text-yellow-600">Tip:</span> You can also zoom in/out and click on the map directly to pin your address location.
                  </p>
                )}
              </div>
            </div>
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



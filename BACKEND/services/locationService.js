import axios from "axios";

export const validateCoordinates = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const reverseGeocode = async (lat, lng) => {
  try {
    // Using OpenStreetMap (Nominatim) for free reverse geocoding
    // In production, you might want Google Maps API
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'AttendanceApp/1.0' }
    });

    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }
    return "Unknown Location";
  } catch (error) {
    console.error("Geocoding error:", error.message);
    return `Lat: ${lat}, Lng: ${lng}`;
  }
};
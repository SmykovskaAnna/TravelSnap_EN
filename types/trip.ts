export interface TripCoordinates {
  latitude: number;
  longitude: number;
}

export interface TripData {
  title: string;
  destination: string;
  date: string;
  rating: number;
  imageUri?: string;
  galleryUris?: string[];
  coordinates?: TripCoordinates;
}

export interface Trip extends TripData {
  id: string;
}

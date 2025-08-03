import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  async getCurrentPosition() {
    const pos = await Geolocation.getCurrentPosition();
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
  }

  watchPosition(
    success: (position: any) => void,
    error?: (err: any) => void
  ): Promise<string> {
    if (true) {
      let lat = 52.2297;
      let lng = 21.0122;
      let step = 0.0001;

      const intervalId = setInterval(() => {
        // losowy kierunek w zakresie -1, 0, 1
        lat += (Math.floor(Math.random() * 3) - 1) * step;
        lng += (Math.floor(Math.random() * 3) - 1) * step;

        success({
          coords: {
            latitude: lat,
            longitude: lng,
            accuracy: 1,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now(),
          // @ts-ignore
          toJSON: () => {}
        } as GeolocationPosition);
      }, 2000);

      return Promise.resolve(intervalId.toString());
    }


    const watchId = Geolocation.watchPosition({}, (position, err) => {
      if (err) {
        if (error) error(err);
        return;
      }
      if (position) {
        success(position);
      }
    });
    return watchId;
  }

  clearWatch(watchId: string) {
    Geolocation.clearWatch({ id: watchId });
  }
}

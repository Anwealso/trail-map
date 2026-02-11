export interface GPSPosition {
  latitude: number;
  longitude: number;
}

export function getUserGPSLocation(): Promise<GPSPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let message = "Unknown GPS error";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "GPS Permission Denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "GPS Position Unavailable";
            break;
          case error.TIMEOUT:
            message = "GPS Request Timed Out";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import * as L from 'leaflet';
import { LocationService } from './services/location.service';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/icon/marker.svg',
  iconUrl: 'assets/icon/marker.svg',
  shadowUrl: '',
});

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonicModule],
})
export class AppComponent {
  private map!: L.Map;
  private userMarker!: L.Marker;
  private step = 0.0001;
  private discoveredAreas: { lat: number; lng: number; radius: number }[] = [];
  private fogCanvas!: HTMLCanvasElement;
  private fogCtx!: CanvasRenderingContext2D;
  private watchId: string | null = null;

  constructor(private locationService: LocationService) {}

  async ngAfterViewInit() {
    try {
      const { lat, lng } = await this.locationService.getCurrentPosition();
      this.initMap(lat, lng);

      // await na watchPosition, żeby dostać string ID
      this.watchId = await this.locationService.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.updateUserPosition(lat, lng);
        },
        (err) => {
          console.error('Błąd obserwacji pozycji:', err);
        }
      );
    } catch (err) {
      console.error('Błąd lokalizacji:', err);
      this.initMap(52.2297, 21.0122);
    }
  }

  updateUserPosition(lat: number, lng: number) {
    if (!this.userMarker || !this.map) return;

    const newLatLng = L.latLng(lat, lng);
    this.userMarker.setLatLng(newLatLng);
    this.map.panTo(newLatLng);
    this.discover(lat, lng, 20);
    this.drawFog();
  }

  ngOnDestroy() {
    if (this.watchId) {
      this.locationService.clearWatch(this.watchId);
    }
  }

  initMap(lat: number, lng: number) {
    this.map = L.map('map', {
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false
    }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.discover(lat, lng, 20);

    this.userMarker = L.marker([lat, lng]).addTo(this.map);

    this.fogCanvas = document.getElementById('fog-canvas') as HTMLCanvasElement;
    this.fogCtx = this.fogCanvas.getContext('2d')!;
    this.resizeFogCanvas();

    // Rysuj mgłę początkowo
    this.drawFog();

    // Aktualizuj mgłę przy przesunięciu i zoomie
    this.map.on('move zoom resize', () => {
      this.resizeFogCanvas();
      this.drawFog();
    });
  }

  resizeFogCanvas() {
    const mapContainer = document.getElementById('map')!;
    this.fogCanvas.width = mapContainer.clientWidth;
    this.fogCanvas.height = mapContainer.clientHeight;
  }

  drawFog() {
    const ctx = this.fogCtx;
    ctx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);

    this.discoveredAreas.forEach(area => {
      // przelicz geolokacje na punkt na canvasie względem aktualnego viewportu mapy
      const point = this.map.latLngToContainerPoint([area.lat, area.lng]);
      const radius = area.radius;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  discover(lat: number, lng: number, radius: number) {
    this.discoveredAreas.push({ lat, lng, radius });
  }

  moveMarker(direction: 'up' | 'down' | 'left' | 'right') {
    if (!this.userMarker || !this.map) return;

    const currentLatLng = this.userMarker.getLatLng();

    let newLat = currentLatLng.lat;
    let newLng = currentLatLng.lng;

    switch (direction) {
      case 'up':
        newLat += this.step;
        break;
      case 'down':
        newLat -= this.step;
        break;
      case 'left':
        newLng -= this.step;
        break;
      case 'right':
        newLng += this.step;
        break;
    }

    const newLatLng = L.latLng(newLat, newLng);
    this.userMarker.setLatLng(newLatLng);
    this.map.panTo(newLatLng);
    this.discover(newLat, newLng, 20);
  }
}

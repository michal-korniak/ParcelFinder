import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as proj4 from 'proj4';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { Parcel } from '../models/parcel.model';
import { Region } from '../models/region.model';


@Injectable({
    providedIn: 'root'
})
export class GeoportalService {
    private baseUrl = 'https://uldk.gugik.gov.pl/';

    constructor(private http: HttpClient) { }

    getRegionsById(id: string): Observable<Region[]> {
        const cacheKey = `regions_${id}`;
        const cachedData = localStorage.getItem(cacheKey);
      
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            // Recreate Region instances if necessary.
            const regions = parsed.map((item: any) => new Region(item.name, item.code));
            // Return cached result as an Observable.
            return of(regions);
          } catch (error) {
            console.error('Error parsing cached data:', error);
            localStorage.removeItem(cacheKey);
          }
        }
      
        // Build query parameters if no valid cache exists.
        const params = new HttpParams()
          .set('request', 'GetRegionById')
          .set('id', id)
          .set('result', 'teryt,region');
      
        return this.http.get(this.baseUrl, { params, responseType: 'text' })
          .pipe(
            map(response => {
              const trimmedResponse = response.trim();
              if (trimmedResponse.startsWith('-1')) {
                throw new Error('Brak wyników');
              }
              const lines = trimmedResponse.split('\n').map(line => line.trim());
              const dataLines = lines[0] === '0' ? lines.slice(1) : lines;
              return dataLines.filter(line => line !== '')
                .map(line => {
                  const [code, name] = line.split('|');
                  return new Region(name, code);
                });
            }),
            // Cache the result in localStorage and share the replayed result for subscribers.
            tap(regions => {
              localStorage.setItem(cacheKey, JSON.stringify(regions));
            }),
            shareReplay(1)
          );
      }
      

    getParcelById(id: string): Observable<Parcel> {
        // Build query parameters
        const params = new HttpParams()
            .set('request', 'GetParcelByIdOrNr')
            .set('id', id)
            .set('result', 'teryt,parcel,geom_wkt');

        return this.http.get(this.baseUrl, { params, responseType: 'text' })
            .pipe(
                map(response => {
                    const trimmedResponse = response.trim();
                    if (trimmedResponse.startsWith('-1')) {
                        // Throw an error with a message indicating no results were found.
                        throw new Error('Brak wyników');
                    }
                    const lines = trimmedResponse.split('\n').map(line => line.trim());
                    // The first line is a status code ("1") so skip it if present.
                    const dataLines = lines[0] === '1' ? lines.slice(1) : lines;
                    const dataLine = dataLines.find(line => line !== '');
                    if (!dataLine) {
                        throw new Error('No parcel data found');
                    }

                    // Expected format: Id|ParcelNumber|Geometry
                    const parts = dataLine.split('|');
                    if (parts.length < 3) {
                        throw new Error('Invalid parcel data format');
                    }
                    const parcelId = parts[0];
                    const parcelNumber = parts[1];
                    const geometry = parts[2];

                    // Extract the polygon coordinate string
                    // Example geometry: "SRID=2180;POLYGON((741707.500655396 382851.119919077,741738.088213869 382892.88607995, ... ))"
                    const polygonMatch = geometry.match(/POLYGON\(\((.+)\)\)/);
                    if (!polygonMatch) {
                        throw new Error('Invalid geometry format');
                    }
                    const coordinatesStr = polygonMatch[1];
                    // Split on comma and take the first coordinate pair
                    const firstCoordinatePair = coordinatesStr.split(',')[0].trim();
                    const coordParts = firstCoordinatePair.split(' ').filter(part => part !== '');
                    if (coordParts.length < 2) {
                        throw new Error('Invalid coordinate pair');
                    }
                    const sourceCoord = [Number(coordParts[0]), Number(coordParts[1])];

                    // Define the coordinate systems
                    proj4.default.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
                    proj4.default.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs +type=crs");

                    const convertedCoord = proj4.default("EPSG:2180", "EPSG:4326", sourceCoord);
                    const googleMapsLink = `https://www.google.com/maps?q=${convertedCoord[1]},${convertedCoord[0]}`;

                    return {
                        Id: parcelId,
                        ParcelNumber: parcelNumber,
                        GoogleMapsLink: `https://www.google.com/maps?q=${convertedCoord[1]},${convertedCoord[0]}`,
                        GeoportalLink: `https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=${parcelId}`
                    } as Parcel;
                })
            );
    }
}

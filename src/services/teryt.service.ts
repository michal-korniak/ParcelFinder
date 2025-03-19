import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { Voivodeship } from '../models/voivodeship.model';
import { County } from '../models/county.model';
import { Municipality } from '../models/municipality.model';

@Injectable({
  providedIn: 'root'
})
export class TerytService {

  constructor(private http: HttpClient) { }

  getData(): Observable<Voivodeship[]> {
    return this.http.get('assets/teryt.csv', { responseType: 'text' })
      .pipe(
        map(data => this.parseCSV(data))
      );
  }

  private parseCSV(data: string): Voivodeship[] {
    // Split into lines and remove any empty lines
    const lines = data.split('\n').filter(line => line.trim() !== '');
    // Remove header line
    const header = lines.shift();

    // We use maps to keep track of voivodeships and counties by their codes.
    const voivodeshipMap: { [woj: string]: Voivodeship } = {};
    const countyMap: { [key: string]: County } = {};

    lines.forEach(line => {
      const cols = line.split(';');
      // Columns: 0 - WOJ, 1 - POW, 2 - GMI, 3 - RODZ, 4 - NAZWA, 5 - Nazwa Obszaru (others not used)
      const woj = cols[0].trim();
      const pow = cols[1].trim();
      const gmi = cols[2].trim();
      const rodz = cols[3].trim();
      const nazwa = cols[4].trim();
      const nazwaObszaru = cols[5].trim();

      // Row with only WOJ filled -> voivodeship row
      if (pow === '' && gmi === '') {
        if (!voivodeshipMap[woj]) {
          voivodeshipMap[woj] = new Voivodeship(nazwa, woj);
        }
      }
      // Row with POW filled but no GMI -> county row
      else if (gmi === '') {
        if (woj && pow && nazwa) {
          const countyKey = `${woj}-${pow}`;
          if (!countyMap[countyKey]) {
            countyMap[countyKey] = new County(nazwa, pow);
            voivodeshipMap[woj].counties.push(countyMap[countyKey]);
          }
        }
      }
      // Row with GMI filled -> municipality row
      else {
        if (woj && pow && gmi && nazwa) {
          const countyKey = `${woj}-${pow}`;
          countyMap[countyKey].municipalities.push(new Municipality(`${nazwa} (${nazwaObszaru})`, gmi, rodz));
        }
      }
    });

    // Return an array of voivodeships.
    return Object.values(voivodeshipMap);
  }
}
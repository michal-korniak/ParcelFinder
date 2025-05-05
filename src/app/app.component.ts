import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, EMPTY, of, switchMap, tap } from 'rxjs';
import { County } from '../models/county.model';
import { Municipality } from '../models/municipality.model';
import { Parcel } from '../models/parcel.model';
import { Region } from '../models/region.model';
import { SearchForm } from '../models/search-form.model';
import { Voivodeship } from '../models/voivodeship.model';
import { OrderByPipe } from '../pipes/order-by.pipe';
import { GeoportalService } from '../services/geoportal.service';
import { TerytService } from '../services/teryt.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [CommonModule, ButtonModule, DropdownModule, InputTextModule, FormsModule, ReactiveFormsModule, OrderByPipe, ClipboardModule]
})
export class AppComponent implements OnInit {
  availableVoivodeships: Voivodeship[] = [];
  availableCounties: County[] = [];
  availableMunicipalities: Municipality[] = [];
  availableRegions: Region[] = [];
  form: FormGroup;

  parcels: Parcel[];
  isLoading: boolean = false;


  constructor(private terytService: TerytService,
    private geoportalService: GeoportalService,
    private formBuilder: FormBuilder,
    private clipboard: Clipboard) {
  }

  ngOnInit(): void {
    this.terytService.getData().pipe(
      tap(result => this.availableVoivodeships = result),
    ).subscribe();

    this.initForm();

    const queryParams = new URLSearchParams(window.location.search);
    const queryParamsId = queryParams.get('id');
    if (queryParamsId != null) {
      this.form.get("number").patchValue(queryParamsId);
      this.onSubmit();
    }
  }

  initForm() {
    this.form = this.formBuilder.nonNullable.group<SearchForm>({
      voivodeship: null,
      county: null,
      municipality: null,
      region: null,
      number: null
    });

    this.form.get('voivodeship').valueChanges.pipe(
      tap(selectedVoivodeship => {
        this.loadCounties(selectedVoivodeship);
        this.form.get('county').reset();
        this.form.get('municipality').reset();
        this.form.get('region').reset();
        this.parcels = null;
      })).subscribe();

    this.form.get('county').valueChanges.pipe(
      tap(selectedCounty => {
        this.loadMunicipalities(selectedCounty);
        this.form.get('municipality').reset();
        this.form.get('region').reset();
        this.parcels = null;
      })).subscribe();

    this.form.get('municipality').valueChanges.pipe(
      tap(selectedMunicipality => {
        this.form.get('region').reset();
        this.parcels = null;
      }),
      switchMap(selectedMunicipality => {
        if (!selectedMunicipality) {
          return EMPTY;
        }
        this.isLoading = true;
        const searchFormValue = this.form.value as SearchForm;
        const municipalityId = `${searchFormValue.voivodeship.code}${searchFormValue.county.code}${selectedMunicipality.code}_${selectedMunicipality.type}`;
        return this.geoportalService.getRegionsById(municipalityId);
      }),
      tap(result => console.log(result)),
      tap(result => this.availableRegions = result),
      tap(() => this.isLoading = false),
      catchError(error => {
        this.isLoading = false;
        this.form.get('municipality').setErrors({ cannotFindRegions: true });
        return of(error);
      })
    ).subscribe();

    this.form.get('region').valueChanges.pipe(
      tap(_ => {
        this.parcels = null;
      })).subscribe();
  }

  loadCounties(voivodeship: Voivodeship) {
    if (voivodeship) {
      this.availableCounties = voivodeship.counties;
    } else {
      this.availableCounties = [];
    }
  }

  loadMunicipalities(county: County) {
    if (county) {
      this.availableMunicipalities = county.municipalities;
    } else {
      this.availableMunicipalities = [];
    }
  }

  onCopyLink(parcel: Parcel) {
    const url = new URL(window.location.href);
    url.searchParams.set('id', parcel.Id);
    const urlString = url.toString();

    this.clipboard.copy(urlString);
    window.history.pushState({}, '', urlString);
  }

  onSubmit() {
    const searchFormValue = this.form.value as SearchForm;
    let id;
    if (this.isFullIdentifier(searchFormValue.number)) {
      id = searchFormValue.number;
    } else if (searchFormValue.region?.code != null) {
      id = `${searchFormValue.region.code}.${searchFormValue.number}`;
    } else {
      this.form.get('number').setErrors({ notEnoughData: true });
    }

    this.isLoading = true;
    this.geoportalService.getParcelById(id).pipe(
      tap(result => this.parcels = result),
      tap(() => this.isLoading = false),
      catchError(error => {
        this.isLoading = false;
        this.form.get('number').setErrors({ parcelNotFound: true });
        return of(error);
      })
    ).subscribe();
  }

  isFullIdentifier(value: string): boolean {
    return /^\d+_\d.*$/.test(value);
  }
}

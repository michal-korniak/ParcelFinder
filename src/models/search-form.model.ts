import { County } from "./county.model";
import { Municipality } from "./municipality.model";
import { Region } from "./region.model";
import { Voivodeship } from "./voivodeship.model";

export interface SearchForm {
  voivodeship: Voivodeship | null;
  county: County | null;
  municipality: Municipality | null;
  region: Region | null;
  number: string
}
import { Municipality } from "./municipality.model";

export class County {
  name: string;
  code: string;
  municipalities: Municipality[];

  constructor(name: string, code: string) {
    this.name = name;
    this.code = code;
    this.municipalities = [];
  }
}

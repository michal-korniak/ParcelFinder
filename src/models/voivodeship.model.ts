import { County } from "./county.model";

export class Voivodeship {
    name: string;
    code: string;
    counties: County[];

    constructor(name: string, code: string) {
        this.name = name;
        this.code = code;
        this.counties = [];
    }
}
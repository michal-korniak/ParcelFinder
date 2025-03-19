export class Municipality {
  name: string;
  code: string
  type: string;

  constructor(name: string, code: string, type: string) {
    this.name = name;
    this.code = code;
    this.type = type;
  }
}
import { LanguageType } from "../language";

export function isLanguageType(value: any): value is LanguageType {
  return Object.values(LanguageType).includes(value);
}

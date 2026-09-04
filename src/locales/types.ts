import type { vi } from './vi';

export type SupportedLocale = 'vi' | 'en';

export type DeepStringDictionary<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepStringDictionary<T[K]>
    : string;
};

export type LocaleDictionary = DeepStringDictionary<typeof vi>;

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & string];

export type I18nKeyPath = NestedKeyOf<typeof vi>;

export type I18nParams = Record<string, string | number>;

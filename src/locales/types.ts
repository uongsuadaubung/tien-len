import type { vi } from './vi';

export type SupportedLocale = 'vi' | 'en';

export type LocaleDictionary = {
  readonly [K in keyof typeof vi]: {
    readonly [P in keyof (typeof vi)[K]]: string;
  };
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & string];

export type I18nKeyPath = NestedKeyOf<typeof vi>;

export type I18nParams = Record<string, string | number>;

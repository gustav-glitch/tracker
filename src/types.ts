import { z } from 'zod';
import {
  BaseSchema,
  TextMatchSchema,
  SelectorPresenceSchema,
  SelectorAbsenceSchema,
  ShopifyJsonSchema,
  MagentoGraphqlSchema,
  CatalogWatchSchema,
  KeywordWatchSchema,
  TrackerSchema,
  ConfigSchema,
} from './config.js';

export type BaseConfig = z.infer<typeof BaseSchema>;
export type TextMatchConfig = z.infer<typeof TextMatchSchema>;
export type SelectorPresenceConfig = z.infer<typeof SelectorPresenceSchema>;
export type SelectorAbsenceConfig = z.infer<typeof SelectorAbsenceSchema>;
export type ShopifyJsonConfig = z.infer<typeof ShopifyJsonSchema>;
export type MagentoGraphqlConfig = z.infer<typeof MagentoGraphqlSchema>;
export type CatalogWatchConfig = z.infer<typeof CatalogWatchSchema>;
export type KeywordWatchConfig = z.infer<typeof KeywordWatchSchema>;
export type TrackerConfig = z.infer<typeof TrackerSchema>;
export type Config = z.infer<typeof ConfigSchema>;

import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { z } from 'zod';

export const BaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, dashes only'),
  name: z.string().min(1),
  url: z.string().url(),
  ntfyTopic: z.string().min(1).optional(),
  cooldownMinutes: z.number().int().positive().default(360),
  enabled: z.boolean().default(true),
});

export const TextMatchSchema = BaseSchema.extend({
  strategy: z.literal('text-match'),
  with: z
    .object({
      selector: z.string().optional(),
      inStockPattern: z.string().optional(),
      outOfStockPattern: z.string().optional(),
      flags: z.string().default('i'),
    })
    .refine((v) => v.inStockPattern || v.outOfStockPattern, {
      message: 'at least one of inStockPattern / outOfStockPattern is required',
    }),
});

export const SelectorPresenceSchema = BaseSchema.extend({
  strategy: z.literal('selector-presence'),
  with: z.object({ selector: z.string().min(1) }),
});

export const SelectorAbsenceSchema = BaseSchema.extend({
  strategy: z.literal('selector-absence'),
  with: z.object({ selector: z.string().min(1) }),
});

export const ShopifyJsonSchema = BaseSchema.extend({
  strategy: z.literal('shopify-json'),
  with: z.object({}).default({}),
});

export const MagentoGraphqlSchema = BaseSchema.extend({
  strategy: z.literal('magento-graphql'),
  with: z.object({
    graphqlUrl: z.string().url(),
    urlKey: z.string().min(1),
  }),
});

export const CatalogWatchSchema = BaseSchema.extend({
  strategy: z.literal('catalog-watch'),
  with: z.object({
    type: z.enum(['shopify', 'html', 'sitemap']),
    // html only: regex to extract product identifiers from page
    itemPattern: z.string().optional(),
  }),
});

export const TrackerSchema = z.discriminatedUnion('strategy', [
  TextMatchSchema,
  SelectorPresenceSchema,
  SelectorAbsenceSchema,
  ShopifyJsonSchema,
  MagentoGraphqlSchema,
  CatalogWatchSchema,
]);

export const ConfigSchema = z
  .object({
    ntfy: z.object({
      server: z.string().url().default('https://ntfy.sh'),
      defaultTopic: z.string().min(1),
    }),
    trackers: z.array(TrackerSchema),
  })
  .superRefine((cfg, ctx) => {
    const ids = new Set<string>();
    cfg.trackers.forEach((t, i) => {
      if (ids.has(t.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['trackers', i, 'id'],
          message: `duplicate id: ${t.id}`,
        });
      }
      ids.add(t.id);
    });
  });

export async function loadConfig(path: string): Promise<z.infer<typeof ConfigSchema>> {
  const text = await readFile(path, 'utf8');
  const raw = load(text);
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => i.path.join('.') + ': ' + i.message)
      .join('\n');
    throw new Error(`Config validation failed:\n${message}`);
  }
  return result.data;
}

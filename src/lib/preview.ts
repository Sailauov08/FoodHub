/**
 * Preview mode: when no DATABASE_URL is configured the storefront renders the seed menu
 * read-only from memory, so the design can be viewed locally. Ordering, sign-in and
 * staff pages require a real database and are disabled in this mode.
 */
export const isPreview = !process.env.DATABASE_URL;

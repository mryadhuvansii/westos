declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    WESTOS_OWNER_EMAIL?: string;
    WESTOS_INVENTORY_INTERNAL_KEY?: string;
  }
}

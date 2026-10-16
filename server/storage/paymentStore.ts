import { Redis } from "@upstash/redis";

export const UNPAID_RETENTION_SECONDS = 30 * 24 * 60 * 60;
let client: Redis | undefined;
let clientConfig = "";

export function isDurableStorageConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim() &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim()
  );
}

export function paymentStore(): Redis {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) throw new Error("PAYMENT_STORAGE_NOT_CONFIGURED");
  if (!client || clientConfig !== `${url}:${token}`) {
    client = new Redis({ url, token, retry: { retries: 1 }, signal: () => AbortSignal.timeout(10000) });
    clientConfig = `${url}:${token}`;
  }
  return client;
}

export const reportKey = (reportId: string) => `sl:v1:report:${reportId}`;
export const orderKey = (orderId: string) => `sl:v1:order:${orderId}`;
export const orderIndexKey = (environment: string, reportId: string) => `sl:v1:order-for:${environment}:${reportId}`;
export const paymentKey = (environment: string, paymentId: string) => `sl:v1:payment:${environment}:${paymentId}`;

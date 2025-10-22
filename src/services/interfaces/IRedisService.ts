import type { Redis } from "ioredis";

export interface IRedisService {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string | null>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  connect(): Promise<string>;
  on(event: string, listener: (...args: any[]) => void): Redis;
  close(): Promise<string>;
}

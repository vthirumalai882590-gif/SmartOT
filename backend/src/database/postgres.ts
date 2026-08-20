import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

export interface IDatabaseClient {
  query<R extends QueryResultRow = any, I extends any[] = any[]>(
    text: string,
    params?: I
  ): Promise<QueryResult<R>>;
  getClient(): Promise<PoolClient>;
  isConnected(): boolean;
  close(): Promise<void>;
}

export class PostgresClient implements IDatabaseClient {
  private static instance: PostgresClient;
  private pool: Pool | null = null;
  private connected: boolean = false;
  private isConnecting: boolean = false;

  private constructor() {
    this.initPool();
  }

  public static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  private initPool(): void {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
    const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
    const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';
    const database = process.env.PGDATABASE || process.env.DB_NAME || 'smartot';

    try {
      if (connectionString) {
        this.pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });
      } else {
        this.pool = new Pool({
          host,
          port,
          user,
          password,
          database,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        });
      }

      this.pool.on('error', (err) => {
        console.warn('[PostgreSQL Pool Warning]', err.message);
        this.connected = false;
      });
    } catch (err: any) {
      console.warn('[PostgreSQL Init]', err.message);
      this.pool = null;
    }
  }

  public async connectAndMigrate(): Promise<boolean> {
    if (!this.pool || this.isConnecting) return false;
    this.isConnecting = true;

    try {
      const client = await this.pool.connect();
      this.connected = true;
      client.release();
      console.log('✓ Connected to PostgreSQL Database');

      // Run SQL migrations automatically
      await this.runMigrations();
      this.isConnecting = false;
      return true;
    } catch (err: any) {
      console.warn(`[PostgreSQL] Connection skipped or unavailable (${err.message}). Using local JSON/SQLite persistence adapter.`);
      this.connected = false;
      this.isConnecting = false;
      return false;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.pool) return;
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        await this.query(sql);
        console.log(`✓ Migration executed: ${file}`);
      } catch (err: any) {
        console.error(`Migration error on ${file}:`, err.message);
      }
    }
  }

  public async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    text: string,
    params?: I
  ): Promise<QueryResult<R>> {
    if (!this.pool) {
      throw new Error('PostgreSQL Pool is not initialized');
    }
    return this.pool.query<R>(text, params);
  }

  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('PostgreSQL Pool is not initialized');
    }
    return this.pool.connect();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
    }
  }
}

export const postgresClient = PostgresClient.getInstance();

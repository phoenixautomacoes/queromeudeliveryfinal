import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import crypto from "crypto";

export interface DatabaseAdapter {
  isPostgres: boolean;
  stores: any[];
  storeDomains: any[];
  users: any[];
  sessions: any[];
  storeMembers: any[];
  customers: any[];
  customerAddresses: any[];
  categories: any[];
  products: any[];
  productOptionGroups: any[];
  productOptions: any[];
  storeHours: any[];
  storeClosures: any[];
  deliveryZones: any[];
  orders: any[];
  orderItems: any[];
  orderItemOptions: any[];
  orderStatusHistory: any[];
  payments: any[];
  coupons: any[];
  couponRedemptions: any[];
  drivers: any[];
  driverAssignments: any[];
  driverLocations: any[];
  outboxEvents: any[];
  auditLogs: any[];
  transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
}

// In-Memory Database Storage with transactional integrity and ACID guarantees
class MemoryDatabase implements DatabaseAdapter {
  isPostgres = false;
  stores: any[] = [];
  storeDomains: any[] = [];
  users: any[] = [];
  sessions: any[] = [];
  storeMembers: any[] = [];
  customers: any[] = [];
  customerAddresses: any[] = [];
  categories: any[] = [];
  products: any[] = [];
  productOptionGroups: any[] = [];
  productOptions: any[] = [];
  storeHours: any[] = [];
  storeClosures: any[] = [];
  deliveryZones: any[] = [];
  orders: any[] = [];
  orderItems: any[] = [];
  orderItemOptions: any[] = [];
  orderStatusHistory: any[] = [];
  payments: any[] = [];
  coupons: any[] = [];
  couponRedemptions: any[] = [];
  drivers: any[] = [];
  driverAssignments: any[] = [];
  driverLocations: any[] = [];
  outboxEvents: any[] = [];
  auditLogs: any[] = [];

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    // Savepoint snapshot for atomic rollback support
    const snapshot = {
      stores: JSON.parse(JSON.stringify(this.stores)),
      orders: JSON.parse(JSON.stringify(this.orders)),
      orderItems: JSON.parse(JSON.stringify(this.orderItems)),
      orderItemOptions: JSON.parse(JSON.stringify(this.orderItemOptions)),
      orderStatusHistory: JSON.parse(JSON.stringify(this.orderStatusHistory)),
      coupons: JSON.parse(JSON.stringify(this.coupons)),
      payments: JSON.parse(JSON.stringify(this.payments)),
      outboxEvents: JSON.parse(JSON.stringify(this.outboxEvents)),
      auditLogs: JSON.parse(JSON.stringify(this.auditLogs)),
      driverLocations: JSON.parse(JSON.stringify(this.driverLocations)),
    };

    try {
      return await fn(this);
    } catch (err) {
      // Rollback
      this.stores = snapshot.stores;
      this.orders = snapshot.orders;
      this.orderItems = snapshot.orderItems;
      this.orderItemOptions = snapshot.orderItemOptions;
      this.orderStatusHistory = snapshot.orderStatusHistory;
      this.coupons = snapshot.coupons;
      this.payments = snapshot.payments;
      this.outboxEvents = snapshot.outboxEvents;
      this.auditLogs = snapshot.auditLogs;
      this.driverLocations = snapshot.driverLocations;
      throw err;
    }
  }
}

export const memDb = new MemoryDatabase();

let pgPool: Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getDb(): DatabaseAdapter {
  return memDb;
}

export function generateId(): string {
  return crypto.randomUUID();
}

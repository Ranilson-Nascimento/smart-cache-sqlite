import { ISqliteAdapter, Params } from '../../../dist/index';
import QuickSQLite from 'react-native-quick-sqlite';

export class ReactNativeQuickAdapter implements ISqliteAdapter {
  private dbName: string;
  private id: string;
  constructor(dbName: string, id?: string){ this.dbName = dbName; this.id = id ?? dbName; QuickSQLite.open(this.dbName); }
  getDatabaseId(){ return this.id; }
  async execute<T=any>(sql: string, params?: Params): Promise<T[]>{
    const p = Array.isArray(params) ? params : (params && typeof params === 'object' ? Object.values(params) : []);
    const r = await QuickSQLite.executeAsync(this.dbName, sql, p);
    return (r?.rows ?? r?.rowsArray ?? []) as T[];
  }
  async exec(sql: string): Promise<void>{
    await QuickSQLite.executeAsync(this.dbName, sql, []);
  }
}

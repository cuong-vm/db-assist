import Column from "./column"
import Table from "./table"
import { RecordType } from "./types"

export default abstract class DBAbstract {

  readonly type: string

  protected constructor(type: string) {
    this.type = type
  }

  abstract commit(): Promise<void>

  abstract close(): any

  abstract getConnection(): any

  abstract getTables(): Promise<Table[]>

  abstract getColumns(tableName: string): Promise<Column[]>

  abstract selectRaw(sql: string): Promise<any>

  abstract select(tableName: string, limit: number, where?: string): Promise<any>

  abstract exist(tableName: string, columns: Column[], record: RecordType): Promise<boolean>

  abstract insert(tableName: string, columns: Column[], record: RecordType): Promise<any>

  abstract update(tableName: string, columns: Column[], record: RecordType): Promise<any>

  async save(tableName: string, columns: Column[], record: RecordType) {
    const found = await this.exist(tableName, columns, record)
    if (found) {
      return this.update(tableName, columns, record)
    } else {
      return this.insert(tableName, columns, record)
    }
  }

  protected verifyColumns(tableName: string, colRows: []) {
    if (colRows.length) {
      return colRows
    } else {
      throw new Error(`Table '${tableName}' does not exist or has no columns`)
    }
  }

}
import Column from "./column"
import DBAbstract from "./db-abstract"
import SqlBuilder from "./sql-builder"
import Table from "./table"
import { PoolConnection } from "mariadb"
import { RecordType } from "./types"
import { sortTables } from "./utils"

export default class BDMaria extends DBAbstract {

  private conn: PoolConnection
  private helper: SqlBuilder

  constructor(type: string, conn: PoolConnection) {
    super(type)
    this.conn = conn
    this.helper = new SqlBuilder(type)
  }

  commit() {
    return this.conn.commit()
  }

  close() {
    if (this.conn) {
      this.conn.release()
      this.conn = null
    }
  }

  getConnection() {
    return this.conn
  }

  getTables() {
    return this.conn.query('SHOW TABLES')
      .then(res => res.map((item: any) => new Table(item[Object.keys(item)[0]])))
      .then(sortTables)
  }

  getColumns(tableName: string) {
    return this.conn.query(`SHOW FULL COLUMNS FROM ${tableName}`)
      .then(res => this.verifyColumns(tableName, res))
      .then(res => res.map((item: any) => this.buildColumn(item)))
  }

  selectRaw(sql: string) {
    return this.conn.query(sql)
  }

  select(tableName: string, limit: number, where?: string) {
    const swhere = where ? where : '1=1'
    return this.selectRaw(`SELECT * FROM ${tableName} WHERE ${swhere} LIMIT ${limit}`)
  }

  exist(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forExist(tableName, columns, record)
    if (!info.sql) {
      return Promise.resolve(false)
    } else {
      return this.conn.query(info.sql, info.values).then(res => res[0].total > 0)
    }
  }

  insert(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forInsert(tableName, columns, record)
    return this.conn.query(info.sql, info.values)
  }

  update(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forUpdate(tableName, columns, record)
    return this.conn.query(info.sql, info.values)
  }

  private buildColumn(item: any) {
    const column = new Column()
    column.name = item.Field
    column.type = item.Type
    column.primary = item.Key === 'PRI'
    column.unique = item.Key === 'UNI'
    column.foreign = item.Key === 'MUL'
    column.nullable = item.Null === 'YES'
    column.autoInc = item.Extra === 'auto_increment'
    return column
  }

}
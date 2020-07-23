import Column from "./column"
import DBAbstract from "./db-abstract"
import SqlBuilder from "./sql-builder"
import Table from "./table"
import { RecordType } from "./types"
import { sortTables } from "./utils"

export default class DBOracle extends DBAbstract {

  private conn: any
  private helper: SqlBuilder

  constructor(type: string, conn: any) {
    super(type)
    this.conn = conn
    this.helper = new SqlBuilder(type)
  }

  commit() {
    return this.conn.commit()
  }

  close() {
    if (this.conn) {
      this.conn.close()
      this.conn = null
    }
  }

  getConnection() {
    return this.conn
  }

  getTables() {
    return this.conn.execute('SELECT * FROM user_tables')
      .then((res: any) => res.rows)
      .then((rows: []) => rows.map((item: any) => new Table(item[0])))
      .then(sortTables)
  }

  getColumns(tableName: string) {
    return Promise.all([
      this.getPrimaryUniqueKeys(tableName),
      this.getForeignKeys(tableName)
    ]).then(meta => {
      const primaryUniqKeys = meta[0]
      const foreignKeys = meta[1]
      return this.conn.execute(`SELECT distinct column_id, column_name, data_type, data_precision, data_scale, data_length, nullable FROM all_tab_columns WHERE table_name = '${tableName}' ORDER BY column_id`)
        .then((res: any) => res.rows)
        .then((rows: []) => this.verifyColumns(tableName, rows))
        .then((rows: []) => rows.map(item => this.buildColumn(item, primaryUniqKeys, foreignKeys)))
    })
  }

  selectRaw(sql: string) {
    return this.conn.execute(sql)
  }

  select(tableName: string, limit: number, where?: string) {
    const swhere = where ? where : '1=1'
    return this.selectRaw(`SELECT * FROM ${tableName} WHERE ${swhere} AND rownum <= ${limit}`)
      .then((res: any) => {
        const { metaData, rows } = res
        const fields = metaData.map((item: any) => item.name)
        return rows.map((item: any) => {
            const data = {}
            item.forEach((value: any, i: number) => {
              data[fields[i]] = value
            })
            return data
          })
      })
  }

  exist(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forExist(tableName, columns, record)
    if (!info.sql) {
      return Promise.resolve(false)
    } else {
      return this.conn.execute(info.sql, info.values).then(res => res[0].total > 0)
    }
  }

  insert(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forInsert(tableName, columns, record)
    return this.conn.execute(info.sql, info.values)
  }

  update(tableName: string, columns: Column[], record: RecordType) {
    const info = this.helper.forUpdate(tableName, columns, record)
    return this.conn.execute(info.sql, info.values)
  }

  private async getPrimaryUniqueKeys(tableName: string): Promise<any[]> {
    return this.conn.execute(`SELECT a.column_name, c.constraint_type FROM all_constraints c, all_cons_columns a WHERE a.table_name = '${tableName}' AND c.constraint_name = a.constraint_name AND c.owner = a.owner AND c.constraint_type IN ('P','U') AND c.status = 'ENABLED'`)
      .then((res: any) => res.rows)
      .then((rows: any[]) => {
        const obj = {}
        rows.forEach(item => {
          if (item[1] === 'P' || !obj[item[0]]) {
            obj[item[0]] = item[1]
          }
        })
        return obj
      })
  }

  private getForeignKeys(tableName: string) {
    return this.conn.execute(`SELECT a.column_name, c2.table_name r_table_name FROM all_cons_columns a JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name JOIN all_constraints c2 ON c.owner = c2.owner AND c.constraint_name = c2.constraint_name WHERE a.table_name = '${tableName}' AND c.constraint_type = 'R' AND c.status = 'ENABLED'`)
      .then((res: any) => res.rows)
      .then((rows: any[]) => {
        const obj = {}
        rows.forEach(item => {
          obj[item[0]] = item[1]
        })
        return obj
      })
  }

  private buildColumn(item: any[], primaryUniqKeys: any, foreignKeys: any) {
    const name = item[1]
    const primaryUniq = primaryUniqKeys[name]
    const primary = primaryUniq === 'P'
    const foreignTable = foreignKeys[name]

    const column = new Column()
    column.name = name
    column.type = this.buildType(item)
    column.primary = primary
    column.unique = primaryUniq === 'U'
    column.foreign = foreignTable != null
    column.foreignTable = foreignTable || null
    column.nullable = item[6] === 'Y'
    return column
  }

  private buildType(item: any[]) {
    const type = item[2].toUpperCase()
    const buf = []
    if (type === 'NUMBER') {
      if (item[3] != null) {
        buf.push(item[3])
      }
      if (item[4] != null) {
        buf.push(item[4])
      }
    } else if (type === 'VARCHAR' || type === 'VARCHAR2') {
      if (item[5] != null) {
        const v = item[5] / 4
        buf.push(`${v} CHAR`)
      }
    } else if (type === 'CHAR') {
      buf.push(item[5])
    }
    return buf.length ? `${type}(${buf.join(',')})` : type
  }

}
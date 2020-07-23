import Column from "./column"
import { RecordType } from "./types"

export default class SqlBuilder {

  private type: string

  constructor(type: string) {
    this.type = type
  }

  forExist(tableName: string, columns: Column[], record: RecordType) {
    const primaryKeys = this.getPrimaryNames(columns)
    const uniqueKeys = this.getUniqueNames(columns)
    const compositePrimary = (primaryKeys.length >= 2)
    const where = []
    const values = []
    let primaryCount = 0
    let uniqueCount = 0
    let i = 0

    Object.keys(record).forEach(key => {
      const { special, value } = record[key]
      let param = ''
      if (primaryKeys.includes(key) && !special && (compositePrimary || value != null)) {
        param = this.createParam(i++)
        where.push(`${key}=${param}`)
        values.push(value)
        ++primaryCount
      } else if (uniqueKeys.includes(key)) {
        param = this.createParam(i++)
        where.push(`${key}=${param}`)
        values.push(value)
        ++uniqueCount
      }
    })

    if (uniqueCount > 0 || (primaryCount > 0 && primaryCount === primaryKeys.length)) {
      const _where = where.join(' AND ')
      const sql = `SELECT count(*) as total FROM ${tableName} WHERE ${_where}`
      return { sql, values }
    } else {
      return { sql: null, values: null }
    }
  }

  forUpdate(tableName: string, columns: Column[], record: RecordType) {
    const primaryKeys = this.getPrimaryNames(columns)
    const uniqueKeys = this.getUniqueNames(columns)
    const compositePrimary = (primaryKeys.length >= 2)
    const fields = []
    const where = []
    const values = []
    let i = 0

    Object.keys(record).forEach(key => {
      const { special, value } = record[key]
      let param = ''
      if (special) {
        fields.push(`${key}=${value}`)
      } else if (primaryKeys.includes(key)) {
        if (value != null) {
          param = this.createParam(i++)
          where.push(`${key}=${param}`)
          values.push(value)
        } else if (compositePrimary) {
          param = this.createParam(i++)
          fields.push(`${key}=${param}`)
          values.push(null)
        }
      } else if (uniqueKeys.includes(key)) {
        param = this.createParam(i++)
        where.push(`${key}=${param}`)
        values.push(value)
      } else {
        param = this.createParam(i++)
        fields.push(`${key}=${param}`)
        values.push(value)
      }
    })

    const _fields = fields.join(',')
    const _where = where.join(' AND ')
    const sql = `UPDATE ${tableName} SET ${_fields} WHERE ${_where}`
    return { sql, values }
  }

  forInsert(tableName: string, columns: Column[], record: RecordType) {
    const primaryKeys = this.getPrimaryNames(columns)
    const compositePrimary = (primaryKeys.length >= 2)
    const fields = []
    const places = []
    const values = []
    let i = 0

    columns.forEach(item => {
      if (record[item.name]) {
        const { special, value } = record[item.name]
        if (compositePrimary || special || !(item.primary && value == null)) {
          fields.push(item.name)
          if (special) {
            places.push(value)
          } else {
            places.push(this.createParam(i++))
            values.push(value)
          }
        }
      }
    })

    const _fields = fields.join(',')
    const _places = places.join(',')
    const sql = `INSERT INTO ${tableName} (${_fields}) VALUES (${_places})`
    return { sql, values }
  }

  private getPrimaryNames(columns: Column[]) {
    return columns.filter(item => item.primary).map(item => item.name)
  }

  private getUniqueNames(columns: Column[]) {
    return columns.filter(item => item.unique).map(item => item.name)
  }

  private createParam(i: number) {
    if (this.type === 'oracle') {
      return `:${i}`
    } else {
      return '?'
    }
  }

}
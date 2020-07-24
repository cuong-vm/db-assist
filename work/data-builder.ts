import * as Excel from "exceljs"
import * as PromiseExt from "./promise-ext"
import DBAbstract from "./db-abstract"
import { HeaderType, RecordType, RecordValue, CustomFunction, SqlCache } from "./types"

export default class DataBuilder {

  readonly db: DBAbstract

  private readonly alphabet: string
  private readonly alphabetSize: number
  private readonly numericAlphabet: string
  private readonly numericAlphabetSize: number
  private cache: SqlCache[]
  private readonly cacheSize: number = 20

  constructor(db: DBAbstract) {
    this.db = db
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    this.alphabetSize = this.alphabet.length
    this.numericAlphabet = this.alphabet + '0123456789'
    this.numericAlphabetSize = this.numericAlphabet.length
    this.cache = []
  }

  reset() {
    this.cache = []
  }

  async build(sheet: Excel.Worksheet, headers: HeaderType, rowIndex: number): Promise<RecordType> {
    const data: RecordType = {}
    const row = sheet.getRow(rowIndex)
    return PromiseExt.each(Object.keys(headers), async (field: string) => {
      const cellIndex = headers[field]
      const cell = row.getCell(cellIndex)

      if (cell.formula) {
        throw new Error(`Invalid value at ${cell.address}: formula is not supported`)
      }

      return this.parseCellValue(cell).then(value => {
        if (value) {
          data[field] = value
        }
        return data
      })
    })
    .then(() => Promise.resolve(Object.keys(data).length ? data : null))
  }

  private async parseCellValue(cell: Excel.Cell): Promise<RecordValue> {
    let res: RecordValue = {
      special: false,
      value: null
    }
    const cellValue = cell.value

    // Check special cell value that starts with asignment prefix ':='
    if (typeof cellValue === 'string') {
      const st = cellValue.trim()
      if (st.length) {
        const parts = st.split(/:=(.+)/)
        if (parts.length >= 2) {
          const asignment = parts[1].trim()
          const cmd = asignment.toLowerCase()

          if (cmd.startsWith('insert ') || cmd.startsWith('update ')) {
            throw new Error(`Invalid asignment at ${cell.address}: ${asignment}`)
          } else if (cmd.startsWith('select ')) {
            return this.fetchAssignment(cmd, asignment, cell)
              .then(value => {
                res.value = value
                return res
              })
          } else {
            try {
              const value = this.checkRandomFunctions(cmd)
              if (value != null) {
                res.value = value
              } else if (cmd === 'ignored') {
                res = null
              } else {
                res.special = true
                res.value = asignment
              }
            } catch (err) {
              throw new Error(`Invalid custom function at ${cell.address}: ${asignment}`)
            }
          }
        } else {
          res.value = cellValue
        }
      }
    }
    // Ignore null value
    else if (cellValue != null) {
      res.value = cellValue
    }

    return Promise.resolve(res)
  }

  private checkRandomFunctions(cmd: string) {
    let value = null
    if (cmd.startsWith('randombool')) {
      value = (Math.random() >= 0.5) ? 1 : 0
    } else if (cmd.startsWith('randomchars')) {
      const info = this.parseRandomFunction(cmd, 1)
      const { name, args, valid } = info
      if (valid && name === 'randomchars') {
        if (args[0] > 0) {
          const chars = [this.randomChar(this.alphabet, this.alphabetSize)]
          for (let i = 1, max = args[0]; i < max; i++) {
            chars.push(this.randomChar(this.numericAlphabet, this.numericAlphabetSize))
          }
          value = chars.join('')
        }
      } else {
        throw new Error(`Invalid custom function: ${cmd}`)
      }
    } else if (cmd.startsWith('randomint')) {
      const info = this.parseRandomFunction(cmd, 2)
      const { name, args, valid } = info
      if (valid && name === 'randomint') {
        value = this.randomInt(args[0], args[1])
      } else {
        throw new Error(`Invalid custom function: ${cmd}`)
      }
    } else if (cmd.startsWith('randomdecimal') || cmd.startsWith('randomfloat')) {
      const info = this.parseRandomFunction(cmd, 3)
      const { name, args, valid } = info
      if (valid && (name === 'randomdecimal' || name === 'randomfloat')) {
        const fraction = Math.round(args[2])
        value = this.randomFloat(args[0], args[1]).toFixed(fraction)
      } else {
        throw new Error(`Invalid custom function: ${cmd}`)
      }
    }
    return value
  }

  private randomChar(st: string, size: number) {
    return st.charAt(Math.floor(Math.random() * size))
  }

  private randomInt(n1: number, n2: number) {
    const range = this.checkMinMax(n1, n2)
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  }

  private randomFloat(n1: number, n2: number) {
    const range = this.checkMinMax(n1, n2)
    return Math.random() * (range.max - range.min) + range.min
  }

  private checkMinMax(n1: number, n2: number) {
    let min: number
    let max: number
    if (n1 > n2) {
      min = Math.ceil(n2)
      max = Math.floor(n1)
    } else {
      min = Math.ceil(n1)
      max = Math.floor(n2)
    }
    return { min, max }
  }

  private parseRandomFunction(cmd: string, argsCount: number) {
    const res: CustomFunction = {
      name: null,
      args: [],
      valid: false
    }
    const info = cmd.match(/\(([^)]+)\)/)
    if (info && info.length >= 2) {
      const { index } = info
      const parts = info[1].split(',')
      res.name = cmd.substr(0, index)
      res.valid = true
      parts.forEach(v => {
        if (Number.isNaN(v)) {
          res.valid = false
        } else {
          res.args.push(Number.parseFloat(v))
        }
      })
      if (res.args.length !== argsCount) {
        res.valid = false
      } else if (cmd.length !== (res.name.length + info[0].length)) {
        res.valid = false
      }
    }
    return res
  }

  private async fetchAssignment(sql: string, asignment: string, cell: Excel.Cell): Promise<RecordValue> {
    let keepErr = false
    return this.queryAssignment(sql)
      .then(row => {
        if (row) {
          const keys = Object.keys(row)
          return row[keys[0]]
        } else {
          keepErr = true
          throw new Error(`After running SELECT command, no results found at ${cell.address}: ${asignment}`)
        }
      })
      .catch(err => {
        if (keepErr) {
          throw err
        } else {
          throw new Error(`SELECT command failed at ${cell.address}: ${asignment} (${err.message})`)
        }
      })
  }

  private queryAssignment(sql: string) {
    const value = this.cache.find(item => item.sql === sql)
    if (value) {
      return Promise.resolve(value.row)
    } else {
      return this.db.selectRaw(sql)
        .then(res => this.pickFirstRow(res))
        .then(row => {
          if (this.cache.length >= this.cacheSize) {
            this.cache.shift()
            this.cache.push({ sql, row })
          }
          return row
        })
    }
  }

  private pickFirstRow(res: any): any[] {
    let rows: any[] = []
    if (this.db.type === 'oracle') {
      rows = res.rows
    } else {
      rows = res
    }
    return rows.length ? rows[0] : null
  }

}
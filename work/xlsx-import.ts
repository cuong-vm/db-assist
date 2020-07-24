import * as Excel from "exceljs"
import * as PromiseExt from "../work/promise-ext"
import Column from "./column"
import DBAbstract from "./db-abstract"
import DataBuilder from "./data-builder"
import TableColumns from "./table-columns"
import { HeaderType } from "./types"

export default class XlsxImport {

  private db: DBAbstract
  private dataBuilder: DataBuilder
  private sheet: Excel.Worksheet

  constructor(db: DBAbstract) {
    this.db = db
    this.dataBuilder = new DataBuilder(db)
  }

  async import(filePath: string) {
    this.dataBuilder.reset()
    const sheet = await this.readWorkbook(filePath)
    const tableColumns = await this.readTableColumns(sheet)
    await this.scanRows(tableColumns)
    return await this.db.commit()
  }

  private async readWorkbook(filePath: string) {
    const workbook = await new Excel.Workbook().xlsx.readFile(filePath)
    this.sheet = workbook.getWorksheet(1)
    return this.sheet
  }

  private async readTableColumns(sheet: Excel.Worksheet) {
    const columns = await this.db.getColumns(sheet.name)
    return new TableColumns(columns, this.readHeaders(sheet, columns))
  }

  private readHeaders(sheet: Excel.Worksheet, columns: Column[]) {
    const headers: HeaderType = {}
    const hrow = sheet.getRow(1)
    for (let i = sheet.columnCount; i > 0; i--) {
      const { value } = hrow.getCell(i)
      const field = (value == null) ? null : value.toString()
      if (columns.find(item => item.name === field)) {
        headers[field] = i
      }
    }
    return headers
  }

  private scanRows(tableColumns: TableColumns) {
    const { columns, headers } = tableColumns
    const start = 3
    const size = this.sheet.rowCount - (start - 1)
    return PromiseExt.loop(size, i => this.saveRow(columns, headers, start + i))
  }

  private async saveRow(columns: Column[], headers: HeaderType, rowIndex: number) {
    const record = await this.dataBuilder.build(this.sheet, headers, rowIndex)
    if (record) {
      return this.db.save(this.sheet.name, columns, record)
    } else {
      return Promise.resolve()
    }
  }

}
import * as Excel from "exceljs"
import Column from "./column"

export default class XlsxExport {

  write(filePath: string, tableName: string, columns: Column[], records: any[]) {
    const workbook = this.createWorkbook()
    const sheet = this.addWorkSheet(workbook, tableName)
    const rowIndex = this.writeHeaders(sheet, columns, 0)
    this.writeData(sheet, columns, records, rowIndex)
    return workbook.xlsx.writeFile(filePath)
  }

  
  private createWorkbook() {
    const workbook = new Excel.Workbook()
    workbook.creator = 'db-assist'
    workbook.lastModifiedBy = 'db-assist'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.properties.date1904 = true
    return workbook
  }

  private addWorkSheet(workbook: Excel.Workbook, sheetName: string) {
    return workbook.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToWidth: 7
      }
    })
  }

  private writeHeaders(sheet: Excel.Worksheet, columns: Column[], rowIndex: number) {
    const row1 = sheet.getRow(++rowIndex)
    const row2 = sheet.getRow(++rowIndex)
    columns.forEach((column, i) => {
      const j = i + 1
      const row1Cell = row1.getCell(j)
      const row2Cell = row2.getCell(j)
      row1Cell.value = column.name
      row1Cell.font = { bold: true }
      row2Cell.value = this.collectAttrs(column)
      row2Cell.font = { bold: true }
    })
    row1.commit()
    row2.commit()
    return rowIndex
  }

  private writeData(sheet: Excel.Worksheet, columns: Column[], records: any[], rowIndex: number) {
    records && records.forEach(record => {
      const row = sheet.getRow(++rowIndex)
      columns.forEach((column, i) => {
        row.getCell(i + 1).value = record[column.name]
      })
      row.commit()
    })
    return rowIndex
  }

  private collectAttrs(column: Column) {
    const attrs = []
    if (column.primary) {
      attrs.push('pkey')
      if (column.autoInc) {
        attrs.push('auto_inc')
      }
    }
    if (column.foreign) {
      attrs.push('fkey')
    }
    if (column.unique) {
      attrs.push('unique')
    }
    if (!column.nullable && !column.primary && !column.autoInc) {
      attrs.push('notnull')
    }
    attrs.push(column.type)
    return attrs.join('|')
  }

}
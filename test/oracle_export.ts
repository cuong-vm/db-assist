import * as PromiseExt from "../work/promise-ext"
import Column from "../work/column"
import DBStarter from "../work/db-starter"
import Table from "../work/table"
import XlsxExport from "../work/xlsx-export"
import config from "./config/oracle"
import { mkdir, exists } from "fs"
import { resolve } from "path"

function testOracle(dir: string) {
  new DBStarter('oracle', config).start().then(
    db => db.getTables()
    .then((tables: Table[]) => PromiseExt.each(
      tables,
      // Export 100 rows for each table
      (table: Table) => db.select(table.name, 100).then(
        (records: any[]) => db.getColumns(table.name).then(
          (columns: Column[]) => new XlsxExport()
            .write(`${dir}/${table.name}.xlsx`, table.name, columns, records)))
    ))
    .catch(console.error)
    .finally(() => {
      db.close()
      process.exit()
    })
  )
}

const dir = resolve(`${__dirname}/../output`)

exists(dir, existed => {
  if (existed) {
    testOracle(dir)
  } else {
    mkdir(dir, err => {
      if (err) {
        console.error(err)
      } else {
        testOracle(dir)
      }
    })
  }
})
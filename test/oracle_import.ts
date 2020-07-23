import * as PromiseExt from "../work/promise-ext"
import DBStarter from "../work/db-starter"
import XlsxImport from "../work/xlsx-import"
import config from "./config/oracle"
import { mkdir, exists } from "fs"
import { resolve } from "path"

function testOracle(dir: string) {
  new DBStarter('oracle', config).start().then(db => {
    const imp = new XlsxImport(db)
    // Import data for multiple tables one by one
    return PromiseExt.each([
      'tableA.xlsx',
      'tableB.xlsx',
      'tableC.xlsx'
    ], (fileName: string) => {
      const filePath = resolve(`${dir}/${fileName}`)
      console.log(`Import file: ${filePath}`)
      return imp.import(filePath)
    })
    .catch(console.error)
    .finally(() => {
      db.close()
      process.exit()
    })
  })
}

const dir = resolve(`${__dirname}/../input`)

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
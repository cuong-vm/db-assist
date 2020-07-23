import * as Excel from "exceljs"
import Column from "./column"
import { HeaderType } from "./types"

export default class TableColumns {

  columns: Column[]
  headers: HeaderType

  constructor(columns: Column[], headers: HeaderType) {
    this.columns = columns
    this.headers = headers
  }

}
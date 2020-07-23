export default class Column {

  name: string
  type: string
  primary: boolean = false
  unique: boolean = false
  foreign: boolean = false
  foreignTable: string
  nullable: boolean = true
  autoInc: boolean = false

}
export type DBConfig = {
  host: string,
  port: number,
  database: string,
  user: string,
  password: string,
  connectionLimit?: number
}

export type HeaderType = Record<string, number>

export type RecordValue = {
  special: boolean,
  value: any
}

export type RecordType = Record<string, RecordValue>

export type CustomFunction = {
  name: string,
  args: number[],
  valid: boolean
}
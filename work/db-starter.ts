import * as mariadb from "mariadb"
import * as oracledb from "oracledb"
import BDMaria from "./db-maria"
import DBAbstract from "./db-abstract"
import DBOracle from "./db-oracle"
import { DBConfig } from "./types"

export default class DBStarter {

  readonly type: string
  readonly config: DBConfig

  constructor(type: string, config: DBConfig) {
    this.type = type
    this.config = config
  }

  async start(): Promise<DBAbstract> {
    if (this.type === 'oracle') {
      return await this.startOracle()
    } else if (this.type === 'mariadb') {
      return await this.startMariadb()
    } else {
      throw new Error(`Database type '${this.type}' is not supported yet`)
    }
  }

  private async startOracle() {
    const conn = await oracledb.getConnection(this.adaptOracleConfig(this.config))
    return new DBOracle(this.type, conn)
  }

  private async startMariadb() {
    const conn = await mariadb.createPool(this.config).getConnection()
    return new BDMaria(this.type, conn)
  }

  private adaptOracleConfig(config: DBConfig) {
    const { host, port, database, user, password } = config
    return {
      connectString: `${host}:${port}/${database}`,
      user,
      password
    }
  }

}
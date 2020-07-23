import Table from "./table"

export function sortTables(tables: Table[]) {
  return tables.sort((a, b) => {
    if (a.name < b.name) return -1
    if (a.name > b.name) return 1
    return 0
  })
}
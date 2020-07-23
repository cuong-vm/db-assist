export async function each(items: any[], callback: (item: any) => any) {
  let res = null
  for (const item of items) {
    res = await callback(item)
  }
  return res
}

export async function loop(size: number, callback: (index: number) => any) {
  let res = null
  for (let i = 0; i < size; i++) {
    res = await callback(i)
  }
  return res
}
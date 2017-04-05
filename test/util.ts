export const createMockFile = (
  filename: string,
  content: string,
  type: string = 'text/plain'
): File => {
  const blob = new Blob([content], { type })
  blob['lastModifiedDate'] = new Date().valueOf()
  blob['name'] = filename
  return <File>blob
}

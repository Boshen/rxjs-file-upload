const userAgent = window.navigator.userAgent
const safari = /safari\//i.test(userAgent)

// http://stackoverflow.com/questions/8856628/detecting-folders-directories-in-javascript-filelist-objects
export const removeDirectory = (file: File) => {
  return !(!file.type && (safari || (file.size % 4096) === 0 && file.size <= 102400))
}

export const createAction = (action: string) => (payload) => ({ action: `upload/${action}`, payload })

import { Observable } from 'rxjs/Observable'

// http://stackoverflow.com/questions/8856628/detecting-folders-directories-in-javascript-filelist-objects
export const getFile = (file: File) => {
  return Observable.create((obs) => {
    const reader = new FileReader()
    reader.onload = () => {
      obs.next(file)
      obs.complete()
    }
    reader.onerror = () => {
      obs.complete()
    }
    reader.readAsText(<Blob>file)
  })
}

export const createAction = (action: string) => (payload) => ({ action: `upload/${action}`, payload })

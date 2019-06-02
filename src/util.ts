import { Observable, Observer, empty, of } from 'rxjs'
import { take, timeout, catchError } from 'rxjs/operators'

// http://stackoverflow.com/questions/8856628/detecting-folders-directories-in-javascript-filelist-objects
export const excludeFolder = (file: File) => {
  if (file.size > 1048576) {
    return of(file)
  }
  return Observable.create((obs: Observer<File>) => {
    const reader = new FileReader()
    reader.onload = () => {
      obs.next(file)
    }
    reader.onerror = (e) => {
      obs.error(e)
    }
    reader.readAsArrayBuffer(<Blob>file)
  }).pipe(
    take(1),
    timeout(1000), // file reader will read files into memory, so it is going be really sloooooow
    catchError(() => empty())
  )
}

export const createAction = (action: string) => (payload: {}) => ({ action: `upload/${action}`, payload })

import { Observable } from 'rxjs/Observable'

import 'rxjs/add/observable/empty'

import 'rxjs/add/operator/timeout'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/catch'

// http://stackoverflow.com/questions/8856628/detecting-folders-directories-in-javascript-filelist-objects
export const excludeFolder = (file: File) => {
  if (file.size > 1048576) {
    return Observable.of(file)
  }
  return Observable.create((obs) => {
    const reader = new FileReader()
    reader.onload = () => {
      obs.next(file)
    }
    reader.onerror = (e) => {
      obs.error(e)
    }
    reader.readAsArrayBuffer(<Blob>file)
  })
  .take(1)
  .timeout(1000) // file reader will read files into memory, so it is going be really sloooooow
  .catch(() => {
    return Observable.empty()
  })
}

export const createAction = (action: string) => (payload) => ({ action: `upload/${action}`, payload })

import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi/dist/FileAPI.html5'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/switchMapTo'

interface HandleClickConfig {
  multiple?: boolean
  accept?: string
  directory?: boolean
}

let globalInputButton

export const handleClick = (clickElement: HTMLElement, config: HandleClickConfig = {}): Observable<File[]> => {

  if (!globalInputButton) {
    globalInputButton = document.createElement('input')
    globalInputButton.type = 'file'
  }

  const file$ = Observable.create((obs) => {
    globalInputButton.multiple = config.multiple || true
    globalInputButton.accept = config.accept || ''
    globalInputButton.webkitdirectory = config.directory || false
    globalInputButton.value = null
    globalInputButton.onchange = (e) => {
      obs.next(FileAPI.getFiles(e))
      obs.complete()
    }
    globalInputButton.click()
    return () => {
      globalInputButton.value = null
    }
  })

  return Observable.fromEvent(clickElement, 'click')
    .switchMapTo(file$)
}

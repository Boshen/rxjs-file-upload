import { Observable } from 'rxjs/Observable'

import 'rxjs/add/observable/from'
import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/switchMapTo'
import 'rxjs/add/operator/toArray'

import { getFile } from './util'

export interface HandleClickConfig {
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
    globalInputButton.accept = config.accept || ''
    globalInputButton.multiple = config.directory || config.multiple || false
    globalInputButton.webkitdirectory = config.directory || false
    globalInputButton.value = null
    globalInputButton.onchange = () => {
      const files = Array.prototype.slice.call(globalInputButton.files)
      files.forEach((file) => {
        file.path = file.webkitRelativePath
      })
      obs.next(files)
      obs.complete()
    }
    globalInputButton.click()
    return () => {
      globalInputButton.value = null
    }
  })
  .concatMap((files) => {
    return Observable.from(files).concatMap(getFile).toArray()
  })

  return Observable.fromEvent(clickElement, 'click')
    .switchMapTo(file$)
}

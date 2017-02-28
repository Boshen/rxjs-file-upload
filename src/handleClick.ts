import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import * as FileAPI from 'fileapi'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/do'

interface HandleClickConfig {
  multiple?: boolean
  accept?: string
}

let globalInputButton

export const handleClick = (clickElement: HTMLElement, config: HandleClickConfig = {}) => {

  if (!globalInputButton) {
    globalInputButton = document.createElement('input')
    globalInputButton.type = 'file'
  }

  const files$ = new Subject<File[]>()

  globalInputButton.multiple = config.multiple || true
  globalInputButton.accept = config.accept || ''
  globalInputButton.onchange = (event) => {
    files$.next(FileAPI.getFiles(event))
  }

  Observable.fromEvent(clickElement, 'click')
    .subscribe(() => {
      globalInputButton.click()
    })

  return files$
    .concatMap((files) => {
      return Observable.from(files)
    })
    .do(() => {
      globalInputButton.value = null
    }, () => {
      globalInputButton.value = null
    })

}

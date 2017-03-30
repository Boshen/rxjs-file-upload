import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/take'

interface HandleClickConfig {
  multiple?: boolean
  accept?: string
}

let globalInputButton

export const handleClick = (clickElement: HTMLElement, config: HandleClickConfig = {}): Observable<File[]> => {

  if (!globalInputButton) {
    globalInputButton = document.createElement('input')
    globalInputButton.type = 'file'
  }

  globalInputButton.multiple = config.multiple || true
  globalInputButton.accept = config.accept || ''

  return Observable.fromEvent(clickElement, 'click')
    .switchMap(() => {
      const files$ = Observable.fromEvent(globalInputButton, 'change')
      globalInputButton.value = null
      globalInputButton.click()
      return files$
        .take(1)
        .map((event) => {
          return FileAPI.getFiles(event)
        })
    })

}

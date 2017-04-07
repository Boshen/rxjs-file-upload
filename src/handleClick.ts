import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/observable/fromEventPattern'
import 'rxjs/add/operator/map'
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

  return Observable.fromEvent(clickElement, 'click')
    .switchMap(() => {
      const files$ = Observable.fromEventPattern(
        (handler) => {
          globalInputButton.multiple = config.multiple || true
          globalInputButton.accept = config.accept || ''
          globalInputButton.value = null
          globalInputButton.onchange = handler
        },
        () => globalInputButton.onchange = null
      )
      globalInputButton.click()
      return files$
        .map((event) => {
          return FileAPI.getFiles(event)
        })
        .take(1)
    })

}

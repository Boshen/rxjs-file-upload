import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/concatMap'

export const handlePaste = (pasteElement: HTMLElement): Observable<File[]> => {
  return Observable.fromEvent(pasteElement, 'paste')
    .concatMap((e: ClipboardEvent) => {
      const items = e.clipboardData.items
      const files = []
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const file = items[i].getAsFile()
          if (FileAPI.isBlob(file)) {
            files.push(file)
          }
        }
      }
      if (files.length) {
        e.preventDefault()
      }
      return files
    })
}

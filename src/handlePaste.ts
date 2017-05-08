import { Observable } from 'rxjs/Observable'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/map'

let uid = 0
const image = 'image/png'

const isBlob = (blob: Blob | null) => {
  if (!blob) {
    return false
  }
  const s = {}.toString.call(blob)
  return s === '[object Blob]' || s === '[object File]'
}

export const handlePaste = (pasteElement: HTMLElement): Observable<File[]> => {
  return Observable.fromEvent(pasteElement, 'paste')
    .map((e: ClipboardEvent) => {
      const items = e.clipboardData.items
      const files: File[] = []
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const blob = items[i].getAsFile()
          if (isBlob(blob)) {
            let file
            const name = `Screenshot-${uid++}.png`
            try {
              file = new File([blob!], name, { type: image })
            } catch (_) {
              file = <any>blob // tslint:disable-line
              file.lastModifiedDate = new Date()
              file.name = name
              file.type = image
            }
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

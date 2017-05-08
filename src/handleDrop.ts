// tslint:disable:no-any
import { Observable } from 'rxjs/Observable'

import 'rxjs/add/operator/reduce'
import 'rxjs/add/operator/switch'
import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/toArray'

import { excludeFolder } from './util'

export interface HandleDropOptions {
  directory: boolean
  onHover: (e: HTMLElement, hover: boolean) => void
  onDrop: (e: HTMLElement, files: File[]) => void
}

const scanFiles = (entry) => {
  if (entry.isFile) {
    return Observable.create((observer) => {
      entry.file((file) => {
        observer.next({ file, entry })
        observer.complete()
      })
    })
  } else if (entry.isDirectory) {
    return Observable.create((observer) => {
      entry.createReader().readEntries((entries) => {
        if (entries.length === 0) {
          observer.complete()
        } else {
          observer.next(Observable.from(entries).concatMap(scanFiles))
          observer.complete()
        }
      })
    }).switch()
  }
}

export const handleDrop = (
  dropElement: HTMLElement,
  options: Partial<HandleDropOptions> = {}
): Observable<File[]> => {

  const onDrop = options.onDrop || (() => {}) // tslint:disable-line
  const onHover = options.onHover || (() => {}) // tslint:disable-line

  return Observable.create((obs) => {
    let enterCount = 0

    dropElement.ondragenter = (e) => {
      enterCount += 1
      e.preventDefault()
      onHover(dropElement, true)
    }

    dropElement.ondragleave = (e) => {
      enterCount -= 1
      if (enterCount === 0) {
        e.preventDefault()
        onHover(dropElement, false)
      }
    }

    dropElement.ondragover = (e) => {
      e.preventDefault()
    }

    dropElement.ondrop = (e) => {
      onHover(dropElement, false)

      if (!e.dataTransfer) {
        return
      }

      e.preventDefault()

      const items = e.dataTransfer.items
      const files = e.dataTransfer.files
      let files$
      if (items && items.length) {
        files$ = Observable.from(Array.prototype.slice.call(items))
          .filter((item: any) => {
            return item && item.kind === 'file' && !!(item.webkitGetAsEntry || item.getAsEntry)
          })
          .map((item: any) => {
            return item.webkitGetAsEntry ? item.webkitGetAsEntry() : item.getAsEntry()
          })
          .concatMap(scanFiles)
          .map(({ file, entry }) => {
            const relativePath = entry.fullPath.slice(1) // e.g. fullPath = `/README.md` or `/dir/README.md`
            // dropping a single file should give no path info
            // file object is read only, property assignment may fail
            try {
              file.path = (options.directory && relativePath !== file.name) ? relativePath : ''
            } catch (_) {} // tslint:disable-line:no-empty
            return file
          })
      } else if (files && files.length) {
        files$ = Observable.from(Array.prototype.slice.call(files))
          .concatMap(excludeFolder)
          .map((file: any) => {
            file.path = ''
            return file
          })
      }
      if (files$) {
        files$.toArray()
          .subscribe((fs: File[]) => {
            obs.next(fs)
            onDrop(dropElement, fs)
          })
      }
    }
  })

}

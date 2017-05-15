// tslint:disable:no-any
import { Observable } from 'rxjs/Observable'
import { Observer } from 'rxjs/Observer'

import { excludeFolder } from './util'

export interface HandleDropOptions {
  directory: boolean
  onHover: (e: HTMLElement, hover: boolean) => void
  onDrop: (e: HTMLElement, files: File[]) => void
}

const scanFiles = (entry: any) => {
  if (entry.isFile) {
    return Observable.create((observer: Observer<any>) => {
      (<WebKitFileEntry>entry).file((file: Event) => {
        observer.next({ file, entry })
        observer.complete()
      })
    })
  } else if (entry.isDirectory) {
    return Observable.create((observer: Observer<Observable<any>>) => {
      (<WebKitDirectoryEntry>entry).createReader().readEntries((entries: any) => {
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

  return Observable.create((obs: Observer<File[]>) => {
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
          .filter((item: DataTransferItem) => {
            return item && item.kind === 'file' && !!item.webkitGetAsEntry
          })
          .map((item: DataTransferItem) => {
            return item.webkitGetAsEntry()
          })
          .concatMap(scanFiles)
          .map(({ file, entry }) => {
            const relativePath = entry.fullPath.slice(1) // e.g. fullPath = `/README.md` or `/dir/README.md`
            // dropping a single file should give no path info
            // file object is read only, property assignment may fail
            try {
              (<any>file).path = (options.directory && relativePath !== file.name) ? relativePath : ''
            } catch (_) {} // tslint:disable-line:no-empty
            return file
          })
      } else if (files && files.length) {
        files$ = Observable.from(Array.prototype.slice.call(files))
          .concatMap(excludeFolder)
          .map((file: File) => {
            (<any>file).path = ''
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

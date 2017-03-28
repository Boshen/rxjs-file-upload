import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi'

import 'rxjs/add/operator/concatAll'

export const handleDrop = (dropElement: HTMLElement, onHover?: Function): Observable<File[]> => {

  onHover = onHover || (() => {}) // tslint:disable-line

  return Observable.create((observer) => {
    FileAPI.event.dnd(dropElement, onHover, (files) => {
      observer.next(files)
    })
  })
  .concatAll()

}

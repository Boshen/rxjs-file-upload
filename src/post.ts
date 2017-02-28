import { Observable } from 'rxjs/Observable'
import { Subscriber } from 'rxjs/Subscriber'
import { AjaxRequest, AjaxResponse } from 'rxjs/observable/dom/AjaxObservable'

import 'rxjs/add/observable/dom/ajax'
import 'rxjs/add/operator/map'

export const post = (
  url: string,
  body: {} = {},
  headers: {} = {},
  progressSubscriber: AjaxRequest['progressSubscriber'] = null
) => {
  return Observable.ajax({
    url,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    method: 'POST',
    crossDomain: true,
    progressSubscriber
  })
  .map((r: AjaxResponse) => r.response)
}

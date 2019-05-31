import { ajax, AjaxRequest, AjaxResponse } from 'rxjs/ajax'
import { map } from 'rxjs/operators'

export interface PostConfig {
  url: string
  body?: {}
  headers?: {}
  progressSubscriber?: AjaxRequest['progressSubscriber']
}

export const post = ({
  url,
  body,
  headers,
  progressSubscriber
}: PostConfig) => {
  return ajax({
    url,
    body,
    headers,
    method: 'POST',
    crossDomain: true,
    progressSubscriber
  })
    .pipe(
      map((r: AjaxResponse) => r.response)
    )
}

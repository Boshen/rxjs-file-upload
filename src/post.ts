import { ajax, AjaxConfig } from 'rxjs/ajax'
import { map } from 'rxjs/operators'

export const post = ({
  url,
  body,
  headers,
  progressSubscriber,
}: Pick<AjaxConfig, 'url' | 'body' | 'headers' | 'progressSubscriber'>) => {
  return ajax({
    url,
    body,
    headers,
    method: 'POST',
    crossDomain: true,
    progressSubscriber,
  }).pipe(map((r) => r.response))
}

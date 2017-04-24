export const createAction = (action: string) => (payload) => ({ action: `upload/${action}`, payload })


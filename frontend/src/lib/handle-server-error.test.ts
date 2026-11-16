import { AxiosError } from 'axios'
import { id } from '@/locales/id'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleServerError } from './handle-server-error'

const toastError = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}))

function apiError(status: number, body: unknown) {
  const error = new AxiosError('Request failed')
  error.response = { status, data: body } as AxiosError['response']
  return error
}

beforeEach(() => {
  vi.mocked(toastError).mockClear()
})

describe('handleServerError', () => {
  it('shows the generic Indonesian message when the error is not recognised', () => {
    handleServerError(new Error('network'))

    expect(toastError).toHaveBeenCalledWith(id.errors.unknown)
  })

  it('maps a plain object with status 204 to the no-content message', () => {
    handleServerError({ status: 204 })

    expect(toastError).toHaveBeenCalledWith(id.errors.noContent)
  })

  it('shows the network message when the request never reached the server', () => {
    handleServerError(new AxiosError('Network Error'))

    expect(toastError).toHaveBeenCalledWith(id.errors.network)
  })

  it.each([
    ['forbidden', 403, id.errors.forbidden],
    ['not_found', 404, id.errors.notFound],
    ['conflict', 409, id.errors.conflict],
    ['validation_error', 422, id.errors.validation],
    ['bad_request', 400, id.errors.validation],
    ['rate_limited', 429, id.errors.rateLimited],
    ['internal_error', 500, id.errors.server],
    ['service_unavailable', 503, id.errors.unavailable],
  ] as const)(
    'maps the %s code to its Indonesian message',
    (code, status, message) => {
      handleServerError(apiError(status, { error: { code } }))

      expect(toastError).toHaveBeenCalledWith(message)
    }
  )

  it('never shows the developer message sent by the API', () => {
    handleServerError(
      apiError(422, {
        error: {
          code: 'something_new',
          message: 'ph must be between 0 and 14',
        },
      })
    )

    expect(toastError).toHaveBeenCalledWith(id.errors.unknown)
  })

  it('falls back to the generic message when the response has no error body', () => {
    handleServerError(apiError(500, {}))

    expect(toastError).toHaveBeenCalledWith(id.errors.unknown)
  })

  it('logs the error to the console in development', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = new Error('logged')

    handleServerError(err)

    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(err)

    log.mockRestore()
  })

  it('does not log the error to the console in production', () => {
    vi.stubEnv('DEV', false)

    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = new Error('not logged')

    handleServerError(err)

    expect(log).not.toHaveBeenCalled()

    log.mockRestore()
  })
})

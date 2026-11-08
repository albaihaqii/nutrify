import { AxiosError, type AxiosResponse } from 'axios'
import { id } from '@/locales/id'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const { navigate, setSessionMock, loginMock } = vi.hoisted(() => ({
  navigate: vi.fn(),
  setSessionMock: vi.fn(),
  loginMock: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { setSession: setSessionMock } }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../login', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../login')>()),
  login: loginMock,
}))

const session = {
  accessToken: 'token-1',
  user: {
    id: 1,
    name: 'Admin',
    email: 'admin@nutrify.id',
    role: 'admin' as const,
  },
  expiresAt: 1_900_000_000_000,
}

function apiError(status: number, code: string) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status, data: { error: { code, message: code } } } as AxiosResponse
  )
}

async function setup(redirectTo?: string) {
  const screen = await render(<UserAuthForm redirectTo={redirectTo} />)
  return {
    screen,
    email: screen.getByRole('textbox', { name: /^Email$/i }),
    password: screen.getByLabelText(/^Password$/i),
    submit: screen.getByRole('button', { name: /^Masuk$/i }),
  }
}

async function signIn(
  form: Awaited<ReturnType<typeof setup>>,
  email = 'a@b.com',
  password = '1234567'
) {
  await userEvent.fill(form.email, email)
  await userEvent.fill(form.password, password)
  await userEvent.click(form.submit)
}

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the fields and the submit button', async () => {
    const form = await setup()

    await expect.element(form.email).toBeInTheDocument()
    await expect.element(form.password).toBeInTheDocument()
    await expect.element(form.submit).toBeInTheDocument()
  })

  it('shows validation messages when submitting an empty form', async () => {
    const form = await setup()

    await userEvent.click(form.submit)

    await expect
      .element(form.screen.getByText(id.auth.errors.emailRequired))
      .toBeInTheDocument()
    await expect
      .element(form.screen.getByText(id.auth.errors.passwordRequired))
      .toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('stores the session and goes to the dashboard on success', async () => {
    loginMock.mockResolvedValue(session)
    const form = await setup()

    await signIn(form)

    await vi.waitFor(() => expect(setSessionMock).toHaveBeenCalledOnce())
    expect(loginMock).toHaveBeenCalledWith('a@b.com', '1234567')
    expect(setSessionMock).toHaveBeenCalledWith(session)
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true })
    )
  })

  it('goes to redirectTo when it is a same-site path', async () => {
    loginMock.mockResolvedValue(session)
    const form = await setup('/history')

    await signIn(form)

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/history', replace: true })
    )
  })

  it('ignores an external redirectTo', async () => {
    loginMock.mockResolvedValue(session)
    const form = await setup('//evil.example')

    await signIn(form)

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', replace: true })
    )
  })

  it('shows an alert for wrong credentials', async () => {
    loginMock.mockRejectedValue(apiError(401, 'invalid_credentials'))
    const form = await setup()

    await signIn(form)

    await expect
      .element(form.screen.getByRole('alert'))
      .toHaveTextContent(id.auth.errors.invalidCredentials)
    expect(setSessionMock).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows an alert when too many attempts were made', async () => {
    loginMock.mockRejectedValue(apiError(429, 'rate_limited'))
    const form = await setup()

    await signIn(form)

    await expect
      .element(form.screen.getByRole('alert'))
      .toHaveTextContent(id.auth.errors.tooManyAttempts)
  })

  it('shows an alert when the server cannot be reached', async () => {
    loginMock.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    const form = await setup()

    await signIn(form)

    await expect
      .element(form.screen.getByRole('alert'))
      .toHaveTextContent(id.auth.errors.network)
  })
})

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '@/api/errors'
import { signIn, signUp } from '@/api/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BrandMark } from '../shell/BrandMark'

// Sign in, or create a shop. Either way, success is announced by the session module and
// the app switches to the signed-in screens on its own - this screen never navigates.
export function AuthScreen() {
  const { t } = useTranslation()
  const [mode, setMode] = useState('sign-in')

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold">{t('app.name')}</span>
        </div>

        <div className="grid gap-5 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-2 rounded-full bg-muted p-0.5 text-sm font-medium">
            {['sign-in', 'sign-up'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={cn(
                  'h-8 rounded-full transition-colors',
                  mode === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {option === 'sign-in' ? t('auth.signInTab') : t('auth.signUpTab')}
              </button>
            ))}
          </div>

          {mode === 'sign-in' ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </div>
  )
}

function SignInForm() {
  const { t } = useTranslation()
  const id = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ busy: false, problem: null })

  async function submit(event) {
    event.preventDefault()
    setState({ busy: true, problem: null })

    try {
      await signIn(email, password)
    } catch (error) {
      setState({ busy: false, problem: errorMessage(t, error) })
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t('auth.signInTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.signInHint')}</p>
      </div>
      <Field id={`${id}-email`} label={t('auth.email')}>
        <Input id={`${id}-email`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-9" />
      </Field>
      <Field id={`${id}-password`} label={t('auth.password')}>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-9"
        />
      </Field>
      <Problem text={state.problem} />
      <Button type="submit" className="h-9" disabled={state.busy}>
        {t('auth.signIn')}
      </Button>
    </form>
  )
}

function SignUpForm() {
  const { t } = useTranslation()
  const id = useId()
  const [fields, setFields] = useState({ shopName: '', ownerName: '', email: '', password: '' })
  const [state, setState] = useState({ busy: false, problem: null })

  // The field name comes from the input itself - `event.target.name` - so one handler
  // serves the four inputs. `[name]: value` is a computed property name.
  const change = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setState({ busy: true, problem: null })

    try {
      await signUp(fields)
    } catch (error) {
      setState({ busy: false, problem: errorMessage(t, error) })
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{t('auth.signUpTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth.signUpHint')}</p>
      </div>
      <Field id={`${id}-shop`} label={t('auth.shopName')}>
        <Input id={`${id}-shop`} name="shopName" autoComplete="organization" required value={fields.shopName} onChange={change} className="h-9" />
      </Field>
      <Field id={`${id}-owner`} label={t('auth.ownerName')}>
        <Input id={`${id}-owner`} name="ownerName" autoComplete="name" required value={fields.ownerName} onChange={change} className="h-9" />
      </Field>
      <Field id={`${id}-email`} label={t('auth.email')}>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required value={fields.email} onChange={change} className="h-9" />
      </Field>
      <Field id={`${id}-password`} label={t('auth.password')} hint={t('auth.passwordHint')}>
        <Input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={fields.password}
          onChange={change}
          className="h-9"
        />
      </Field>
      <Problem text={state.problem} />
      <Button type="submit" className="h-9" disabled={state.busy}>
        {t('auth.signUp')}
      </Button>
    </form>
  )
}

function Field({ id, label, hint, children }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Problem({ text }) {
  return text ? (
    <p role="alert" className="text-sm text-destructive">
      {text}
    </p>
  ) : null
}

import { useEffect, useRef, useState } from 'react'
import { Camera, User, AtSign, FileText, Twitter, Linkedin, Globe, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'https://meta-backend-i9hs.onrender.com/api').replace(/\/api\/?$/, '')
const BIO_MAX = 160

function SettingsCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(222 60% 5%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 3 }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)' }}>{sub}</p>}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(240 5% 55%)', marginBottom: 7, letterSpacing: '0.03em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, paddingLeft: 14, paddingRight: 14,
  borderRadius: 10, fontSize: 13, fontWeight: 500,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: 'hsl(40 6% 90%)', outline: 'none', boxSizing: 'border-box',
}

const iconStyle: React.CSSProperties = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(240 5% 45%)', pointerEvents: 'none' }

type Form = {
  firstName: string
  lastName:  string
  username:  string
  bio:       string
  twitter:   string
  linkedin:  string
  website:   string
}

const EMPTY: Form = { firstName: '', lastName: '', username: '', bio: '', twitter: '', linkedin: '', website: '' }

function avatarSrc(url?: string | null) {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

export function ProfileSettings() {
  const navigate = useNavigate()
  const { user, isLoading, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm]       = useState<Form>(EMPTY)
  const [theme, setTheme]     = useState('dark')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMsg, setAvatarMsg]   = useState('')

  // Fill the form with the logged-in user's saved details (blank where not set)
  useEffect(() => {
    if (!user) return
    setForm({
      firstName: user.firstName ?? '',
      lastName:  user.lastName  ?? '',
      username:  user.username  ?? '',
      bio:       user.bio       ?? '',
      twitter:   user.twitter   ?? '',
      linkedin:  user.linkedin  ?? '',
      website:   user.website   ?? '',
    })
    setTheme(user.dashboardTheme ?? 'dark')
  }, [user])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setError('')
    setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave() {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return }
    if (form.bio.length > BIO_MAX) { setError(`Bio must be ${BIO_MAX} characters or fewer.`); return }
    setSaving(true)
    try {
      await api.patch('/user/profile', { ...form, dashboardTheme: theme })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarMsg('')
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setAvatarMsg('Use a JPG, PNG or WebP image.'); return }
    if (file.size > 2 * 1024 * 1024) { setAvatarMsg('Image must be 2MB or smaller.'); return }
    const fd = new FormData()
    fd.append('avatar', file)
    setAvatarBusy(true)
    try {
      await api.upload('/user/profile/avatar', fd)
      await refreshUser()
    } catch (err: any) {
      setAvatarMsg(err?.message ?? 'Upload failed.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleAvatarRemove() {
    setAvatarMsg('')
    setAvatarBusy(true)
    try {
      await api.delete('/user/profile/avatar')
      await refreshUser()
    } catch (err: any) {
      setAvatarMsg(err?.message ?? 'Could not remove photo.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const THEMES = [
    { id: 'dark',    label: 'Dark',    color: '#0d0b1e' },
    { id: 'darker',  label: 'Darker',  color: '#060410' },
    { id: 'purple',  label: 'Purple',  color: '#1a0d2e' },
  ]

  const initials = `${form.firstName.trim()[0] ?? ''}${form.lastName.trim()[0] ?? ''}`.toUpperCase()
  const photo    = avatarSrc(user?.avatarUrl)

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center" style={{ color: 'hsl(240 5% 55%)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[760px] mx-auto overflow-x-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(240 5% 60%)', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(40 10% 96%)', lineHeight: 1.2 }}>Profile Settings</h1>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 52%)' }}>Update your display name, avatar and public profile</p>
        </div>
      </div>

      {/* Avatar */}
      <SettingsCard title="Profile Picture" sub="Upload a photo that represents you">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarPick} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              background: photo ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#050505',
            }}>
              {photo
                ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (initials || <User size={30} />)}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              aria-label="Change photo"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'hsl(222 87% 8%)', border: '2px solid hsl(222 87% 5%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarBusy ? 'default' : 'pointer',
              }}>
              {avatarBusy ? <Loader2 size={12} className="animate-spin" style={{ color: '#93c5fd' }} /> : <Camera size={12} style={{ color: '#93c5fd' }} />}
            </button>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'hsl(40 6% 85%)', marginBottom: 6 }}>Upload a new avatar</p>
            <p style={{ fontSize: 11, color: 'hsl(240 5% 48%)', marginBottom: 12 }}>JPG, PNG or WebP. Max size 2MB.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 8, background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.3)', color: '#93c5fd', cursor: avatarBusy ? 'default' : 'pointer', opacity: avatarBusy ? 0.6 : 1 }}>
                {avatarBusy ? 'Uploading…' : 'Upload Photo'}
              </button>
              {photo && (
                <button onClick={handleAvatarRemove} disabled={avatarBusy} style={{ fontSize: 12, fontWeight: 500, padding: '7px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', cursor: avatarBusy ? 'default' : 'pointer' }}>Remove</button>
              )}
            </div>
            {avatarMsg && <p style={{ fontSize: 11, color: '#f87171', marginTop: 8 }}>{avatarMsg}</p>}
          </div>
        </div>
      </SettingsCard>

      {/* Basic Info */}
      <SettingsCard title="Name & Username" sub="This is how you appear across the platform">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="FIRST NAME">
            <div style={{ position: 'relative' }}>
              <User size={14} style={iconStyle} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={form.firstName} onChange={set('firstName')} maxLength={50} />
            </div>
          </Field>
          <Field label="LAST NAME">
            <div style={{ position: 'relative' }}>
              <User size={14} style={iconStyle} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={form.lastName} onChange={set('lastName')} maxLength={50} />
            </div>
          </Field>
        </div>
        <Field label="USERNAME">
          <div style={{ position: 'relative' }}>
            <AtSign size={14} style={iconStyle} />
            <input style={{ ...inputStyle, paddingLeft: 34 }} value={form.username} onChange={set('username')} maxLength={30} />
          </div>
        </Field>
        <Field label="BIO">
          <div style={{ position: 'relative' }}>
            <FileText size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'hsl(240 5% 45%)', pointerEvents: 'none' }} />
            <textarea
              rows={3}
              value={form.bio}
              onChange={set('bio')}
              maxLength={BIO_MAX}
              style={{ ...inputStyle, height: 'auto', paddingLeft: 34, paddingTop: 10, paddingBottom: 10, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'hsl(240 5% 45%)', marginTop: 5 }}>{form.bio.length}/{BIO_MAX} characters</p>
        </Field>
      </SettingsCard>

      {/* Social Links */}
      <SettingsCard title="Social Links" sub="Add links to your public profiles">
        {([
          { key: 'twitter',  label: 'TWITTER / X',  icon: Twitter  },
          { key: 'linkedin', label: 'LINKEDIN',      icon: Linkedin },
          { key: 'website',  label: 'WEBSITE',       icon: Globe    },
        ] as const).map(({ key, label, icon: Icon }) => (
          <Field key={key} label={label}>
            <div style={{ position: 'relative' }}>
              <Icon size={14} style={iconStyle} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={form[key]} onChange={set(key)} maxLength={200} />
            </div>
          </Field>
        ))}
      </SettingsCard>

      {/* Theme */}
      <SettingsCard title="Dashboard Theme" sub="Choose your preferred colour scheme">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                border: theme === t.id ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.07)',
                background: theme === t.id ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 48, height: 32, borderRadius: 8, background: t.color, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme === t.id ? '#93c5fd' : 'hsl(240 5% 55%)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Save */}
      {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'right', marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 22px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, background: saved ? 'rgba(96,165,250,0.15)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: saved ? '1px solid rgba(96,165,250,0.3)' : 'none', color: saved ? '#60a5fa' : '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

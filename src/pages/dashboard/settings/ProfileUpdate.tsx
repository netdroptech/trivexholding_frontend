import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Mail, Phone, MapPin, Flag, Calendar, User, Briefcase, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, paddingLeft: 38, paddingRight: 14,
  borderRadius: 10, fontSize: 13, fontWeight: 500,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: 'hsl(40 6% 90%)', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(222 60% 5%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: sub ? 2 : 16 }}>{title}</p>
      {sub && <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginBottom: 16 }}>{sub}</p>}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
      {children}
    </div>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(240 5% 50%)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(240 5% 42%)', pointerEvents: 'none' }} />
        {children}
      </div>
    </div>
  )
}

// Same list used on the registration page, so a user's saved country always matches
const COUNTRIES = [
  'United States','United Kingdom','Canada','Australia','Germany','France',
  'Netherlands','Switzerland','Japan','Singapore','United Arab Emirates',
  'South Africa','Nigeria','Kenya','Ghana','India','Brazil','Mexico',
  'Argentina','Spain','Italy','Portugal','Sweden','Norway','Denmark','Other',
]
const OCCUPATIONS = ['Investor', 'Trader', 'Engineer', 'Business Owner', 'Finance Professional', 'Student', 'Other']

type Form = {
  firstName: string; lastName: string; phone: string; dateOfBirth: string
  nationality: string; occupation: string
  address: string; city: string; state: string; postalCode: string; country: string
}

const EMPTY: Form = {
  firstName: '', lastName: '', phone: '', dateOfBirth: '', nationality: '', occupation: '',
  address: '', city: '', state: '', postalCode: '', country: '',
}

/** Options list that always contains the user's current value, plus a blank choice. */
function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [current, ...list] : list
}

export function ProfileUpdate() {
  const navigate = useNavigate()
  const { user, isLoading, refreshUser } = useAuth()

  const [form, setForm]     = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')

  // Load the user's saved information; anything they never filled in stays blank
  useEffect(() => {
    if (!user) return
    setForm({
      firstName:   user.firstName   ?? '',
      lastName:    user.lastName    ?? '',
      phone:       user.phone       ?? '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
      nationality: user.nationality ?? '',
      occupation:  user.occupation  ?? '',
      address:     user.address     ?? '',
      city:        user.city        ?? '',
      state:       user.state       ?? '',
      postalCode:  user.postalCode  ?? '',
      country:     user.country     ?? '',
    })
  }, [user])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError('')
    setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave() {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return }
    setSaving(true)
    try {
      await api.patch('/user/profile', form)
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const }
  const optionStyle: React.CSSProperties = { background: 'hsl(222 87% 6%)' }
  const today = new Date().toISOString().slice(0, 10)

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center" style={{ color: 'hsl(240 5% 55%)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[760px] mx-auto overflow-x-hidden">
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(240 5% 60%)', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(40 10% 96%)', lineHeight: 1.2 }}>Profile Update</h1>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 52%)' }}>Edit your personal and contact information</p>
        </div>
      </div>

      {/* Personal Info */}
      <Card title="Personal Information" sub="Your legal name and personal details">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First Name" icon={User}>
            <input style={inputStyle} value={form.firstName} onChange={set('firstName')} maxLength={50} />
          </Field>
          <Field label="Last Name" icon={User}>
            <input style={inputStyle} value={form.lastName} onChange={set('lastName')} maxLength={50} />
          </Field>
          <Field label="Date of Birth" icon={Calendar}>
            <input type="date" style={inputStyle} value={form.dateOfBirth} onChange={set('dateOfBirth')} max={today} />
          </Field>
          <Field label="Nationality" icon={Flag}>
            <select style={selectStyle} value={form.nationality} onChange={set('nationality')}>
              <option value="" style={optionStyle}></option>
              {withCurrent(COUNTRIES, form.nationality).map(c => <option key={c} value={c} style={optionStyle}>{c}</option>)}
            </select>
          </Field>
          <Field label="Occupation" icon={Briefcase}>
            <select style={selectStyle} value={form.occupation} onChange={set('occupation')}>
              <option value="" style={optionStyle}></option>
              {withCurrent(OCCUPATIONS, form.occupation).map(o => <option key={o} value={o} style={optionStyle}>{o}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* Contact Info */}
      <Card title="Contact Information" sub="How we'll reach you">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email Address" icon={Mail}>
            <input style={{ ...inputStyle, color: 'hsl(240 5% 50%)' }} value={user?.email ?? ''} readOnly />
          </Field>
          <Field label="Phone Number" icon={Phone}>
            <input type="tel" style={inputStyle} value={form.phone} onChange={set('phone')} maxLength={30} />
          </Field>
        </div>
        <p style={{ fontSize: 11, color: 'hsl(240 5% 42%)', marginTop: -8 }}>Email cannot be changed directly. Contact support to update it.</p>
      </Card>

      {/* Address */}
      <Card title="Residential Address" sub="Required for KYC verification">
        <Field label="Street Address" icon={MapPin}>
          <input style={inputStyle} value={form.address} onChange={set('address')} maxLength={200} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="City" icon={MapPin}>
            <input style={inputStyle} value={form.city} onChange={set('city')} maxLength={80} />
          </Field>
          <Field label="State / Province" icon={MapPin}>
            <input style={inputStyle} value={form.state} onChange={set('state')} maxLength={80} />
          </Field>
          <Field label="Postal Code" icon={MapPin}>
            <input style={inputStyle} value={form.postalCode} onChange={set('postalCode')} maxLength={20} />
          </Field>
        </div>
        <Field label="Country" icon={Flag}>
          <select style={selectStyle} value={form.country} onChange={set('country')}>
            <option value="" style={optionStyle}></option>
            {withCurrent(COUNTRIES, form.country).map(c => <option key={c} value={c} style={optionStyle}>{c}</option>)}
          </select>
        </Field>
      </Card>

      {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'right', marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 22px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, background: saved ? 'rgba(96,165,250,0.15)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: saved ? '1px solid rgba(96,165,250,0.3)' : 'none', color: saved ? '#60a5fa' : '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

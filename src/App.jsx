import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [address, setAddress] = useState('')
  const [reps, setReps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [normalizedAddress, setNormalizedAddress] = useState(null)
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  const CICERO_API_KEY = import.meta.env.VITE_CICERO_API_KEY
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let isMounted = true

    const initAutocomplete = () => {
      if (!isMounted || !inputRef.current || autocompleteRef.current) return

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        })

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.formatted_address) {
            setAddress(place.formatted_address)
          }
        })
      } catch (err) {
        console.error('Autocomplete init error:', err)
      }
    }

    const loadGoogleMaps = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete()
        return
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkGoogle)
            initAutocomplete()
          }
        }, 100)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`
      script.async = true
      script.onload = () => {
        // Small delay to ensure Places library is ready
        setTimeout(initAutocomplete, 100)
      }
      document.head.appendChild(script)
    }

    // Wait for DOM to be ready
    if (inputRef.current) {
      loadGoogleMaps()
    } else {
      // If ref not ready, wait a tick
      setTimeout(loadGoogleMaps, 0)
    }

    return () => {
      isMounted = false
    }
  }, [])

  const fetchReps = async () => {
    if (!address.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Use Vercel serverless function in production, dev proxy locally
      const apiUrl = import.meta.env.PROD
        ? `/api/cicero?search_loc=${encodeURIComponent(address)}`
        : `/api/cicero/v3.1/official?search_loc=${encodeURIComponent(address)}&key=${CICERO_API_KEY}`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error('Could not find representatives for that address. Double-check it and try again.')
      }

      const data = await response.json()

      if (data.response.errors && data.response.errors.length > 0) {
        throw new Error(data.response.errors[0])
      }

      const candidates = data.response.results.candidates
      if (!candidates || candidates.length === 0 || !candidates[0].officials) {
        throw new Error('No representatives found for this address.')
      }

      // Get the matched address from the first candidate
      if (candidates[0].match_addr) {
        setNormalizedAddress(candidates[0].match_addr)
      } else {
        setNormalizedAddress(address)
      }

      setReps(candidates[0].officials)
    } catch (err) {
      setError(err.message)
      setReps(null)
      setNormalizedAddress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchReps()
  }

  const getPartyClass = (party) => {
    if (!party) return 'party-unknown'
    const p = party.toLowerCase()
    if (p.includes('democrat')) return 'party-dem'
    if (p.includes('republican')) return 'party-rep'
    if (p.includes('libertarian')) return 'party-lib'
    if (p.includes('green')) return 'party-green'
    return 'party-other'
  }

  const getPartyEmoji = (party) => {
    if (!party) return '🤷'
    const p = party.toLowerCase()
    if (p.includes('democrat')) return '🔵'
    if (p.includes('republican')) return '🔴'
    if (p.includes('libertarian')) return '🟡'
    if (p.includes('green')) return '🟢'
    return '⚪'
  }

  const groupByLevel = (officials) => {
    const levels = {
      local: { name: 'Local', icon: '🏙️', officials: [] },
      county: { name: 'County', icon: '🏘️', officials: [] },
      state: { name: 'State', icon: '🏢', officials: [] },
      federal: { name: 'Federal', icon: '🏛️', officials: [] },
      other: { name: 'Other', icon: '📍', officials: [] }
    }

    officials.forEach((official) => {
      const districtType = official.office?.district?.district_type || ''
      const title = (official.office?.title || '').toLowerCase()

      let level = 'other'

      if (districtType.includes('LOCAL')) {
        level = 'local'
      } else if (districtType.includes('COUNTY') || title.includes('county') || title.includes('sheriff')) {
        level = 'county'
      } else if (districtType.includes('STATE') || title.includes('governor') || title.includes('state')) {
        level = 'state'
      } else if (districtType.includes('NATIONAL') || title.includes('president') ||
                 title.includes('senator') || title.includes('representative') ||
                 title.includes('secretary') || title.includes('congress')) {
        level = 'federal'
      }

      levels[level].officials.push(official)
    })

    // Return in order: local first (most important), then up to federal
    return ['local', 'county', 'state', 'federal', 'other']
      .map(key => levels[key])
      .filter(l => l.officials.length > 0)
  }

  const getOfficialName = (official) => {
    const parts = [official.first_name]
    if (official.middle_initial) parts.push(official.middle_initial)
    parts.push(official.last_name)
    if (official.name_suffix) parts.push(official.name_suffix)
    return parts.join(' ')
  }

  const getPhotoUrl = (official) => {
    return official.photo_origin_url || null
  }

  const getWebsiteUrl = (official) => {
    if (official.urls && official.urls.length > 0) {
      return official.urls[0]
    }
    return null
  }

  const getPhone = (official) => {
    if (official.addresses && official.addresses.length > 0) {
      return official.addresses[0].phone_1 || null
    }
    return null
  }

  const getEmail = (official) => {
    if (official.email_addresses && official.email_addresses.length > 0) {
      return official.email_addresses[0]
    }
    return null
  }

  const getSocialLinks = (official) => {
    const socials = []
    if (official.identifiers) {
      official.identifiers.forEach(id => {
        const type = id.identifier_type?.toUpperCase()
        if (type?.includes('TWITTER')) {
          socials.push({ type: 'Twitter', url: `https://twitter.com/${id.identifier_value}`, icon: '🐦' })
        } else if (type?.includes('FACEBOOK') && !socials.find(s => s.type === 'Facebook')) {
          const val = id.identifier_value
          const url = val.startsWith('http') ? val : `https://facebook.com/${val}`
          socials.push({ type: 'Facebook', url, icon: '📘' })
        } else if (type?.includes('INSTAGRAM') && !socials.find(s => s.type === 'Instagram')) {
          socials.push({ type: 'Instagram', url: `https://instagram.com/${id.identifier_value}`, icon: '📷' })
        } else if (type?.includes('YOUTUBE')) {
          socials.push({ type: 'YouTube', url: `https://youtube.com/${id.identifier_value}`, icon: '📺' })
        }
      })
    }
    return socials
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Check Yo Rep</h1>
        <p className="tagline">Know your squad. From City Hall to Capitol Hill.</p>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your address..."
              className="address-input"
            />
            <button type="submit" disabled={loading} className="search-btn">
              {loading ? '🔍' : '🎯'} {loading ? 'Looking...' : 'Check It'}
            </button>
          </div>
          <p className="hint">Full address works best (123 Main St, City, State ZIP)</p>
        </form>

        {error && (
          <div className="error">
            <span>😬</span> {error}
          </div>
        )}

        {reps && (
          <div className="results">
            {normalizedAddress && (
              <div className="location-badge">
                📍 {normalizedAddress}
              </div>
            )}

            {groupByLevel(reps).map((level, levelIdx) => (
              <section key={levelIdx} className="level-section">
                <h2 className="level-header">
                  <span>{level.icon}</span> {level.name}
                </h2>

                <div className="reps-grid">
                  {level.officials.map((official, idx) => (
                    <div key={idx} className={`rep-card ${getPartyClass(official.party)}`}>
                      <div className="rep-photo-wrapper">
                        {getPhotoUrl(official) ? (
                          <img src={getPhotoUrl(official)} alt={getOfficialName(official)} className="rep-photo" />
                        ) : (
                          <div className="rep-photo-placeholder">
                            {official.first_name?.[0]}{official.last_name?.[0]}
                          </div>
                        )}
                        <span className="party-badge">{getPartyEmoji(official.party)}</span>
                      </div>

                      <div className="rep-info">
                        <h3 className="rep-name">{getOfficialName(official)}</h3>
                        <p className="rep-office">{official.office?.title || 'Official'}</p>
                        <p className="rep-district">{official.office?.district?.label || official.office?.district?.city || ''}</p>
                        <p className="rep-party">{official.party || 'Party not listed'}</p>

                        <div className="rep-links">
                          {getWebsiteUrl(official) && (
                            <a href={getWebsiteUrl(official)} target="_blank" rel="noopener noreferrer" className="rep-link">
                              🌐 Website
                            </a>
                          )}
                          {getPhone(official) && (
                            <a href={`tel:${getPhone(official)}`} className="rep-link">
                              📞 {getPhone(official)}
                            </a>
                          )}
                          {getEmail(official) && (
                            <a href={`mailto:${getEmail(official)}`} className="rep-link">
                              ✉️ Email
                            </a>
                          )}
                          {getSocialLinks(official).map((social, i) => (
                            <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className="rep-link">
                              {social.icon} {social.type}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!reps && !error && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🗳️</div>
            <p>Enter your address to see who represents you</p>
            <p className="empty-sub">From City Hall to Capitol Hill</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Check Yo Rep - Democracy stays on beat</p>
        <p className="footer-sub">Data powered by Cicero</p>
      </footer>
    </div>
  )
}

export default App

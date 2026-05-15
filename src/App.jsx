import { useEffect, useRef, useState } from 'react'
import translations from './translations'

const isMobile = () => window.innerWidth < 768
const getBrowserLang = () =>
  (navigator.language || navigator.languages?.[0] || 'en').toLowerCase().startsWith('es') ? 'es' : 'en'

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, visible]
}

function StarField({ dark }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const mobile = isMobile()
    const count = mobile ? 80 : 160

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      baseOpacity: Math.random() * 0.5 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.4 + 0.2,
    }))

    let animId
    const draw = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const color = dark ? '255,255,255' : '30,50,80'
      stars.forEach(s => {
        const opacity = s.baseOpacity * (0.4 + 0.6 * Math.abs(Math.sin(t * s.speed + s.phase)))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color},${opacity})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [dark])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

function WarpTransition({ transitioning, targetDark, onMidpoint, onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!transitioning) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height / 2

    const starCount = isMobile() ? 120 : 300
    const stars = Array.from({ length: starCount }, () => {
      const angle = Math.random() * Math.PI * 2
      return {
        angle,
        initDist: Math.random() * 80 + 5,
        speed: Math.random() * 0.7 + 0.4,
        thickness: Math.random() * 1.8 + 0.3,
      }
    })

    const DURATION = 1100
    const MIDPOINT = 0.62
    let midpointFired = false
    let startTime = null
    let animId = null

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const t = Math.min((timestamp - startTime) / DURATION, 1)

      if (t >= MIDPOINT && !midpointFired) {
        midpointFired = true
        onMidpoint()
      }

      if (t >= 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onComplete()
        return
      }

      // warpPhase: accelerates going dark, decelerates going light
      const warpPhase = targetDark
        ? Math.pow(t, 1.6)
        : Math.pow(1 - t, 1.6)

      // trailing bg to create motion blur feel
      const trailAlpha = targetDark
        ? 0.18 + warpPhase * 0.25
        : 0.18 + warpPhase * 0.25
      ctx.fillStyle = targetDark
        ? `rgba(0, 0, 10, ${trailAlpha})`
        : `rgba(240, 245, 255, ${trailAlpha})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const maxDim = Math.sqrt(cx * cx + cy * cy) * 1.5

      stars.forEach(star => {
        const dist = star.initDist + warpPhase * 900 * star.speed
        if (dist > maxDim) return

        const tail = warpPhase * 280 * star.speed + 1
        const x1 = cx + Math.cos(star.angle) * dist
        const y1 = cy + Math.sin(star.angle) * dist
        const x2 = cx + Math.cos(star.angle) * (dist + tail)
        const y2 = cy + Math.sin(star.angle) * (dist + tail)

        const alpha = Math.min(warpPhase * 2.5, 1) * star.speed
        const grad = ctx.createLinearGradient(x1, y1, x2, y2)
        grad.addColorStop(0, `rgba(180, 210, 255, 0)`)
        grad.addColorStop(0.5, `rgba(210, 228, 255, ${alpha * 0.5})`)
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`)

        ctx.beginPath()
        ctx.strokeStyle = grad
        ctx.lineWidth = star.thickness * (1 + warpPhase)
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })

      // flash at midpoint (only for light mode transition)
      if (!targetDark) {
        const flashDist = Math.abs(t - MIDPOINT)
        if (flashDist < 0.14) {
          const flashAlpha = ((0.14 - flashDist) / 0.14) * 0.75
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [transitioning])

  if (!transitioning) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}
    />
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  )
}

function Navbar({ dark, toggleTheme, lang, setLang, t }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    ['#servicios', t.nav.services],
    ['#portafolio', t.nav.portfolio],
    ['#precios', t.nav.pricing],
    ['#nosotros', t.nav.about],
    ['#contacto', t.nav.contact],
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'nav-blur bg-white/80 dark:bg-black/80 shadow-lg shadow-slate-200/50 dark:shadow-black/30' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#hero">
          <img src={dark ? '/logo-light.png' : '/logo-dark.png'} alt="Palacios Solutions" className="h-10 object-contain" />
        </a>

        <ul className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-gray-300">
          {links.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="hover:text-[#2563EB] transition-colors duration-200">{label}</a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
            className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:border-[#2563EB]/50 hover:text-[#2563EB] transition-all duration-200 text-xs font-bold w-9 h-9 flex items-center justify-center"
            aria-label="Toggle language"
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <button onClick={toggleTheme} className="p-2.5 rounded-full border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:border-[#2563EB]/50 hover:text-[#2563EB] transition-all duration-200" aria-label="Toggle theme">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <a href="#contacto" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 glow-blue-hover">
            {t.nav.cta}
          </a>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
            className="text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 w-8 h-8 rounded-full flex items-center justify-center"
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-full border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="text-slate-900 dark:text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className={`w-6 h-0.5 bg-slate-900 dark:bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-6 h-0.5 bg-slate-900 dark:bg-white mt-1.5 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-slate-900 dark:bg-white mt-1.5 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden nav-blur bg-white/95 dark:bg-black/90 px-6 py-4 space-y-4 border-t border-slate-200 dark:border-white/10">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block text-slate-600 dark:text-gray-300 hover:text-[#2563EB] transition-colors">{label}</a>
          ))}
          <a href="#contacto" onClick={() => setMenuOpen(false)} className="block bg-[#2563EB] text-white text-center py-2.5 rounded-full font-semibold mt-2">{t.nav.cta}</a>
        </div>
      )}
    </nav>
  )
}

function Hero({ t }) {
  const [ref, visible] = useInView(0.1)
  const h = t.hero

  return (
    <section id="hero" ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hidden sm:block absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#2563EB]/10 blur-[100px]" />
        <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#2563EB]/5 blur-[80px]" />
        <div className="absolute top-20 left-10 w-2 h-2 rounded-full bg-[#2563EB] animate-float opacity-60" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-float opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-1/4 w-1 h-1 rounded-full bg-[#2563EB] animate-float opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-[#2563EB]/30 animate-float opacity-30" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className={`${visible ? 'animate-scale-in' : 'opacity-0'} mb-8`}>
          <img src="/icon.png" alt="Palacios Solutions" className="h-24 w-24 mx-auto object-contain animate-float" />
        </div>

        <div className={`${visible ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
          <span className="inline-block bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#1D4ED8] dark:text-[#93c5fd] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            {h.badge}
          </span>
        </div>

        <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-6 text-slate-900 dark:text-white ${visible ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
          {h.title1}{' '}
          <span className="gradient-text">{h.titleHighlight}</span>
          <br />
          {h.title2}
        </h1>

        <p className={`text-lg md:text-xl text-slate-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed ${visible ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
          {h.subtitle}
        </p>

        <div className={`flex flex-col sm:flex-row gap-4 justify-center ${visible ? 'animate-fade-up delay-500' : 'opacity-0'}`}>
          <a href="#contacto" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-8 py-4 rounded-full text-base transition-all duration-200 glow-blue glow-blue-hover">
            {h.ctaPrimary}
          </a>
          <a href="#portafolio" className="border border-slate-300 dark:border-white/20 hover:border-[#2563EB]/50 text-slate-900 dark:text-white font-semibold px-8 py-4 rounded-full text-base transition-all duration-200 hover:bg-[#2563EB]/10">
            {h.ctaSecondary}
          </a>
        </div>

        <div className={`mt-20 ${visible ? 'animate-fade-up delay-600' : 'opacity-0'}`}>
          <p className="text-xs text-slate-400 dark:text-gray-600 mb-4 uppercase tracking-widest">{h.techLabel}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['React', 'Next.js', 'Node.js', 'Tailwind', 'TypeScript', 'Figma'].map(tech => (
              <span key={tech} className="text-xs text-slate-500 dark:text-gray-500 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-full bg-white dark:bg-white/5">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-5 h-8 border-2 border-slate-300 dark:border-white/20 rounded-full flex justify-center pt-1.5">
          <div className="w-1 h-2 bg-[#2563EB] rounded-full" />
        </div>
      </div>
    </section>
  )
}

function Services({ t }) {
  const [ref, visible] = useInView(0.1)
  const s = t.services
  const icons = ['🖥️', '🌐', '🎨']

  return (
    <section id="servicios" ref={ref} className="py-28 bg-slate-50 dark:bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{s.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{s.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto">{s.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {s.items.map((item, i) => (
            <div
              key={item.title}
              className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 card-hover ${visible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <div className="text-4xl mb-5">{icons[i]}</div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{item.desc}</p>
              <ul className="space-y-2">
                {item.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Portfolio({ t }) {
  const [ref, visible] = useInView(0.1)
  const p = t.portfolio
  const gradients = ['from-orange-500 to-rose-600', 'from-violet-500 to-purple-700', 'from-sky-500 to-blue-700', 'from-emerald-500 to-teal-700']
  const tags = [['React', 'Tailwind'], ['Branding', 'Next.js'], ['React', 'Node.js'], ['Next.js', 'Stripe']]

  return (
    <section id="portafolio" ref={ref} className="py-28 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{p.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{p.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto">{p.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {p.items.map((item, i) => (
            <div
              key={item.title}
              className={`group rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 card-hover bg-white dark:bg-white/5 ${visible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
            >
              <div className={`h-48 bg-gradient-to-br ${gradients[i]} relative overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="grid grid-cols-3 gap-3 p-6 w-full">
                    <div className="col-span-3 h-3 bg-white rounded-full" />
                    <div className="col-span-2 h-2 bg-white/60 rounded-full" />
                    <div className="h-2 bg-white/40 rounded-full" />
                    <div className="col-span-3 h-20 bg-white/20 rounded-xl" />
                    <div className="h-2 bg-white/50 rounded-full" />
                    <div className="h-2 bg-white/30 rounded-full" />
                    <div className="h-2 bg-white/40 rounded-full" />
                  </div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">{item.desc}</p>
                <div className="flex gap-2">
                  {tags[i].map(tag => (
                    <span key={tag} className="text-xs text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-1 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Process({ t }) {
  const [ref, visible] = useInView(0.1)
  const p = t.process
  const nums = ['01', '02', '03', '04']

  return (
    <section id="proceso" ref={ref} className="py-28 bg-slate-50 dark:bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{p.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{p.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto">{p.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {p.steps.map((step, i) => (
            <div key={nums[i]} className={`relative ${visible ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
              {i < p.steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#2563EB]/40 to-transparent z-0" />
              )}
              <div className="relative z-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 card-hover h-full">
                <span className="text-[#2563EB] text-3xl font-black">{nums[i]}</span>
                <h3 className="text-lg font-bold mt-3 mb-2 text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing({ t }) {
  const [ref, visible] = useInView(0.1)
  const p = t.pricing
  const prices = ['$299', '$599', '$999']
  const highlighted = [false, true, false]

  return (
    <section id="precios" ref={ref} className="py-28 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{p.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{p.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto">{p.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {p.plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 card-hover ${visible ? 'animate-fade-up' : 'opacity-0'} ${
                highlighted[i]
                  ? 'bg-[#2563EB] border-2 border-[#2563EB] shadow-2xl shadow-[#2563EB]/30 scale-105'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10'
              }`}
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              {highlighted[i] && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-[#2563EB] text-xs font-bold px-4 py-1.5 rounded-full shadow">
                  {p.badge}
                </div>
              )}
              <div className={`text-sm font-semibold uppercase tracking-widest mb-2 ${highlighted[i] ? 'text-blue-100' : 'text-[#2563EB]'}`}>
                {plan.name}
              </div>
              <div className={`text-5xl font-black mb-1 ${highlighted[i] ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {prices[i]}
                <span className={`text-base font-normal ml-1 ${highlighted[i] ? 'text-blue-100' : 'text-slate-400 dark:text-gray-500'}`}>USD</span>
              </div>
              <p className={`text-sm mb-6 mt-2 leading-relaxed ${highlighted[i] ? 'text-blue-100' : 'text-slate-500 dark:text-gray-400'}`}>
                {plan.desc}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className={`flex items-center gap-2.5 text-sm ${highlighted[i] ? 'text-white' : 'text-slate-600 dark:text-gray-300'}`}>
                    <svg className={`w-4 h-4 flex-shrink-0 ${highlighted[i] ? 'text-blue-200' : 'text-[#2563EB]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#contacto" className={`block text-center font-bold py-3 rounded-xl transition-all duration-200 ${highlighted[i] ? 'bg-white text-[#2563EB] hover:bg-blue-50' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white glow-blue-hover'}`}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className={`text-center text-sm text-slate-400 dark:text-gray-600 mt-10 ${visible ? 'animate-fade-up delay-500' : 'opacity-0'}`}>
          {p.custom} <a href="#contacto" className="text-[#2563EB] hover:underline">{p.customLink}</a>
        </p>
      </div>
    </section>
  )
}

function Testimonials({ t }) {
  const [ref, visible] = useInView(0.1)
  const s = t.testimonials
  const colors = ['from-pink-500 to-rose-500', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600']
  const initials = ['MG', 'CR', 'AM']

  return (
    <section ref={ref} className="py-28 bg-slate-50 dark:bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{s.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{s.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto">{s.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {s.items.map((item, i) => (
            <div
              key={item.name}
              className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 card-hover ${visible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed mb-6 italic">"{item.text}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {initials[i]}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 dark:text-gray-500">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ({ t }) {
  const [ref, visible] = useInView(0.1)
  const [open, setOpen] = useState(null)
  const f = t.faq

  return (
    <section ref={ref} className="py-28 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-6">
        <div className={`text-center mb-16 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{f.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{f.title}</h2>
          <p className="text-slate-500 dark:text-gray-400">{f.subtitle}</p>
        </div>

        <div className={`space-y-3 ${visible ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
          {f.items.map((faq, i) => (
            <div
              key={i}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left group"
              >
                <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base pr-4">
                  {faq.q}
                </span>
                <svg
                  className={`w-5 h-5 flex-shrink-0 text-[#2563EB] transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open === i ? 'max-h-48' : 'max-h-0'}`}>
                <p className="px-6 pb-6 text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function About({ dark, t }) {
  const [ref, visible] = useInView(0.1)
  const a = t.about

  return (
    <section id="nosotros" ref={ref} className="py-28 bg-slate-50 dark:bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className={`${visible ? 'animate-slide-left' : 'opacity-0'}`}>
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{a.label}</span>
            <h2 className="text-4xl md:text-5xl font-black mt-3 mb-6 leading-tight text-slate-900 dark:text-white">
              {a.title1}<br />
              <span className="gradient-text">{a.titleHighlight}</span>
            </h2>
            <p className="text-slate-500 dark:text-gray-400 leading-relaxed mb-6">{a.p1}</p>
            <p className="text-slate-500 dark:text-gray-400 leading-relaxed mb-8">{a.p2}</p>
            <div className="grid grid-cols-3 gap-4">
              {a.stats.map(([num, label]) => (
                <div key={label} className="text-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                  <div className="text-2xl font-black text-[#2563EB]">{num}</div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${visible ? 'animate-slide-right' : 'opacity-0'} flex justify-center`}>
            <div className="relative">
              <div className="hidden sm:block absolute -inset-4 rounded-3xl bg-[#2563EB]/20 blur-2xl" />
              <div className="relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-10 text-center">
                <img src={dark ? '/logo-light.png' : '/logo-dark.png'} alt="Palacios Solutions" className="h-32 object-contain mx-auto mb-6" />
                <div className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">{a.quote}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Contact({ t }) {
  const [ref, visible] = useInView(0.1)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const c = t.contact

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Proyecto web - ${form.name}`)
    const body = encodeURIComponent(`Hola! Me llamo ${form.name}.\n\n${form.message}\n\nEmail: ${form.email}`)
    window.open(`mailto:iamdante43@gmail.com?subject=${subject}&body=${body}`)
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <section id="contacto" ref={ref} className="py-28 bg-white dark:bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2563EB]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6">
        <div className={`text-center mb-14 ${visible ? 'animate-fade-up' : 'opacity-0'}`}>
          <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">{c.label}</span>
          <h2 className="text-4xl md:text-5xl font-black mt-3 mb-4 text-slate-900 dark:text-white">{c.title}</h2>
          <p className="text-slate-500 dark:text-gray-400 max-w-lg mx-auto">{c.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className={`bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 md:p-12 space-y-6 ${visible ? 'animate-fade-up delay-200' : 'opacity-0'}`}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-500 dark:text-gray-400 mb-2 font-medium">{c.name}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={c.namePlaceholder} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all duration-200" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-gray-400 mb-2 font-medium">{c.email}</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={c.emailPlaceholder} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all duration-200" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-gray-400 mb-2 font-medium">{c.message}</label>
            <textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={c.messagePlaceholder} rows={5} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all duration-200 resize-none" />
          </div>
          <button type="submit" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-4 rounded-xl text-base transition-all duration-200 glow-blue glow-blue-hover">
            {sent ? c.sent : c.send}
          </button>
        </form>
      </div>
    </section>
  )
}

function Footer({ t }) {
  const nav = t.nav
  return (
    <footer className="bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-white/10 py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="Palacios Solutions" className="h-8 w-8 object-contain" />
          <span className="text-slate-500 dark:text-gray-400 text-sm">Palacios Solutions</span>
        </div>
        <p className="text-slate-400 dark:text-gray-600 text-sm text-center">
          © {new Date().getFullYear()} Palacios Solutions. {t.footer.rights}
        </p>
        <div className="flex gap-6 text-sm text-slate-400 dark:text-gray-500">
          {[['#servicios', nav.services], ['#portafolio', nav.portfolio], ['#precios', nav.pricing], ['#contacto', nav.contact]].map(([href, label]) => (
            <a key={href} href={href} className="hover:text-[#2563EB] transition-colors">{label}</a>
          ))}
        </div>
      </div>
    </footer>
  )
}

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/1234567890?text=Hola!%20Me%20interesa%20cotizar%20un%20proyecto%20web."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/40 transition-all duration-200 hover:scale-110"
      aria-label="Contactar por WhatsApp"
    >
      <WhatsAppIcon />
    </a>
  )
}

export default function App() {
  const [dark, setDark] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [targetDark, setTargetDark] = useState(true)
  const [lang, setLang] = useState('es')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) setDark(savedTheme === 'dark')
    const savedLang = localStorage.getItem('lang')
    if (savedLang) setLang(savedLang)
    else setLang(getBrowserLang())
  }, [])

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  const toggleTheme = () => {
    if (transitioning) return
    setTargetDark(!dark)
    setTransitioning(true)
  }

  const handleMidpoint = () => {
    setDark(d => !d)
    localStorage.setItem('theme', targetDark ? 'dark' : 'light')
  }

  const t = translations[lang]

  return (
    <div className={dark ? 'dark' : ''}>
      <WarpTransition
        transitioning={transitioning}
        targetDark={targetDark}
        onMidpoint={handleMidpoint}
        onComplete={() => setTransitioning(false)}
      />
      <div className="bg-slate-50 dark:bg-black min-h-screen">
        <div className={`transition-opacity duration-500 ${dark ? 'opacity-100' : 'opacity-10'}`}>
          <StarField dark={dark} />
        </div>
        <Navbar dark={dark} toggleTheme={toggleTheme} lang={lang} setLang={setLang} t={t} />
        <Hero t={t} />
        <Services t={t} />
        <Portfolio t={t} />
        <Process t={t} />
        <Pricing t={t} />
        <Testimonials t={t} />
        <FAQ t={t} />
        <About dark={dark} t={t} />
        <Contact t={t} />
        <Footer t={t} />
        <WhatsAppButton />
      </div>
    </div>
  )
}

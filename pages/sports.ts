/**
 * GolPlay — Catálogo canónico de deportes y países LATAM
 * ─────────────────────────────────────────────────────────────────────────────
 * ÚNICA fuente de verdad. Importar desde acá en TODOS los archivos.
 * NO duplicar estas listas en ningún otro archivo.
 */

// ─── Deportes ─────────────────────────────────────────────────────────────────

export type SportValue =
  | 'futbol5' | 'futbol7' | 'futbol11'
  | 'padel' | 'tenis'
  | 'basquet' | 'voleibol'
  | 'beisbol' | 'softball'
  | 'multiuso' | 'otro'

export interface SportConfig {
  value:  SportValue
  label:  string
  emoji:  string
  color:  string
}

export const SPORT_CATALOG: SportConfig[] = [
  { value: 'futbol5',  label: 'Fútbol 5',   emoji: '⚽', color: '#16a34a' },
  { value: 'futbol7',  label: 'Fútbol 7',   emoji: '⚽', color: '#16a34a' },
  { value: 'futbol11', label: 'Fútbol 11',  emoji: '⚽', color: '#15803d' },
  { value: 'padel',    label: 'Pádel',      emoji: '🎾', color: '#2563eb' },
  { value: 'tenis',    label: 'Tenis',      emoji: '🎾', color: '#0891b2' },
  { value: 'basquet',  label: 'Básquet',    emoji: '🏀', color: '#ea580c' },
  { value: 'voleibol', label: 'Voleibol',   emoji: '🏐', color: '#7c3aed' },
  { value: 'beisbol',  label: 'Béisbol',    emoji: '⚾', color: '#b45309' },
  { value: 'softball', label: 'Softball',   emoji: '🥎', color: '#d97706' },
  { value: 'multiuso', label: 'Multiuso',   emoji: '🏟️', color: '#64748b' },
  { value: 'otro',     label: 'Otro',       emoji: '🏅', color: '#475569' },
]

export const SPORT_MAP: Record<string, SportConfig> = Object.fromEntries(
  SPORT_CATALOG.map(s => [s.value, s])
)

export const getSportEmoji  = (v?: string | null) => SPORT_MAP[v ?? '']?.emoji  ?? '🏟️'
export const getSportLabel  = (v?: string | null) => SPORT_MAP[v ?? '']?.label  ?? 'Otro'
export const getSportColor  = (v?: string | null) => SPORT_MAP[v ?? '']?.color  ?? '#64748b'

// ─── Países LATAM ─────────────────────────────────────────────────────────────

/** Type alias — string para no romper imports dinámicos */
export type CountryCode = string

export interface CountryConfig {
  code:           string   // ISO 3166-1 alpha-2
  flag:           string   // emoji
  name:           string   // nombre en español
  currency:       string   // ISO 4217
  symbol:         string   // símbolo de moneda (legacy)
  currencySymbol: string   // alias de symbol — usar en código nuevo
  locale:         string   // BCP 47 para Intl
  phone:          string   // prefijo internacional (legacy)
  phonePrefix:    string   // alias de phone — usar en código nuevo
  regionLabel:    string   // Provincia / Estado / Departamento / Región…
}

export const LATAM_COUNTRIES: CountryConfig[] = [
  { code:'CR', flag:'🇨🇷', name:'Costa Rica',       currency:'CRC', symbol:'₡',  currencySymbol:'₡',  locale:'es-CR', phone:'+506', phonePrefix:'+506', regionLabel:'Provincia'   },
  { code:'MX', flag:'🇲🇽', name:'México',           currency:'MXN', symbol:'$',  currencySymbol:'$',  locale:'es-MX', phone:'+52',  phonePrefix:'+52',  regionLabel:'Estado'      },
  { code:'CO', flag:'🇨🇴', name:'Colombia',         currency:'COP', symbol:'$',  currencySymbol:'$',  locale:'es-CO', phone:'+57',  phonePrefix:'+57',  regionLabel:'Departamento'},
  { code:'AR', flag:'🇦🇷', name:'Argentina',        currency:'ARS', symbol:'$',  currencySymbol:'$',  locale:'es-AR', phone:'+54',  phonePrefix:'+54',  regionLabel:'Provincia'   },
  { code:'CL', flag:'🇨🇱', name:'Chile',            currency:'CLP', symbol:'$',  currencySymbol:'$',  locale:'es-CL', phone:'+56',  phonePrefix:'+56',  regionLabel:'Región'      },
  { code:'PE', flag:'🇵🇪', name:'Perú',             currency:'PEN', symbol:'S/', currencySymbol:'S/', locale:'es-PE', phone:'+51',  phonePrefix:'+51',  regionLabel:'Departamento'},
  { code:'EC', flag:'🇪🇨', name:'Ecuador',          currency:'USD', symbol:'$',  currencySymbol:'$',  locale:'es-EC', phone:'+593', phonePrefix:'+593', regionLabel:'Provincia'   },
  { code:'BO', flag:'🇧🇴', name:'Bolivia',          currency:'BOB', symbol:'Bs', currencySymbol:'Bs', locale:'es-BO', phone:'+591', phonePrefix:'+591', regionLabel:'Departamento'},
  { code:'PY', flag:'🇵🇾', name:'Paraguay',         currency:'PYG', symbol:'₲',  currencySymbol:'₲',  locale:'es-PY', phone:'+595', phonePrefix:'+595', regionLabel:'Departamento'},
  { code:'UY', flag:'🇺🇾', name:'Uruguay',          currency:'UYU', symbol:'$',  currencySymbol:'$',  locale:'es-UY', phone:'+598', phonePrefix:'+598', regionLabel:'Departamento'},
  { code:'VE', flag:'🇻🇪', name:'Venezuela',        currency:'USD', symbol:'$',  currencySymbol:'$',  locale:'es-VE', phone:'+58',  phonePrefix:'+58',  regionLabel:'Estado'      },
  { code:'PA', flag:'🇵🇦', name:'Panamá',           currency:'PAB', symbol:'B/', currencySymbol:'B/', locale:'es-PA', phone:'+507', phonePrefix:'+507', regionLabel:'Provincia'   },
  { code:'GT', flag:'🇬🇹', name:'Guatemala',        currency:'GTQ', symbol:'Q',  currencySymbol:'Q',  locale:'es-GT', phone:'+502', phonePrefix:'+502', regionLabel:'Departamento'},
  { code:'HN', flag:'🇭🇳', name:'Honduras',         currency:'HNL', symbol:'L',  currencySymbol:'L',  locale:'es-HN', phone:'+504', phonePrefix:'+504', regionLabel:'Departamento'},
  { code:'SV', flag:'🇸🇻', name:'El Salvador',      currency:'USD', symbol:'$',  currencySymbol:'$',  locale:'es-SV', phone:'+503', phonePrefix:'+503', regionLabel:'Departamento'},
  { code:'NI', flag:'🇳🇮', name:'Nicaragua',        currency:'NIO', symbol:'C$', currencySymbol:'C$', locale:'es-NI', phone:'+505', phonePrefix:'+505', regionLabel:'Departamento'},
  { code:'DO', flag:'🇩🇴', name:'Rep. Dominicana',  currency:'DOP', symbol:'$',  currencySymbol:'$',  locale:'es-DO', phone:'+1',   phonePrefix:'+1',   regionLabel:'Provincia'   },
  { code:'CU', flag:'🇨🇺', name:'Cuba',             currency:'CUP', symbol:'$',  currencySymbol:'$',  locale:'es-CU', phone:'+53',  phonePrefix:'+53',  regionLabel:'Provincia'   },
  { code:'PR', flag:'🇵🇷', name:'Puerto Rico',      currency:'USD', symbol:'$',  currencySymbol:'$',  locale:'es-PR', phone:'+1',   phonePrefix:'+1',   regionLabel:'Municipio'   },
]

export const COUNTRY_MAP: Record<string, CountryConfig> = Object.fromEntries(
  LATAM_COUNTRIES.map(c => [c.code, c])
)

// ─── Divisas ──────────────────────────────────────────────────────────────────
/**
 * Tasas de cambio aproximadas respecto a 1 USD.
 * PRODUCCIÓN: reemplazar con lectura de tabla `exchange_rates` en Supabase.
 * Cron diario: fetch('https://open.er-api.com/v6/latest/USD') → upsert.
 */
export const USD_RATES: Record<string, number> = {
  CRC: 540,  MXN: 17.2, COP: 3900, ARS: 900,
  CLP: 920,  PEN: 3.75, USD: 1,    BOB: 6.9,
  PYG: 7400, UYU: 38.5, PAB: 1,    GTQ: 7.8,
  HNL: 24.7, NIO: 36.5, DOP: 57,   CUP: 24,
}

// ─── Helpers de moneda ────────────────────────────────────────────────────────

/**
 * Formatea un número en la moneda local del owner.
 * @param amount   - Monto a formatear
 * @param currency - Código ISO de moneda (viene de profiles.currency)
 */
export function formatMoney(amount: number, currency = 'CRC'): string {
  const c = LATAM_COUNTRIES.find(x => x.currency === currency)
  const symbol = c?.symbol ?? '$'
  const locale = c?.locale  ?? 'es-CR'
  const formatted = Math.round(amount).toLocaleString(locale, { maximumFractionDigits: 0 })
  return `${symbol}${formatted}`
}

/**
 * Formatea monto abreviado para dashboards (₡540K, $1.2M, etc.)
 */
export function formatMoneyShort(amount: number, currency = 'CRC'): string {
  const c      = LATAM_COUNTRIES.find(x => x.currency === currency)
  const symbol = c?.symbol ?? '$'
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(0)}K`
  return formatMoney(amount, currency)
}

/**
 * Convierte un monto entre monedas usando USD como pivote.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  const rateFrom = USD_RATES[from] ?? 1
  const rateTo   = USD_RATES[to]   ?? 1
  return (amount / rateFrom) * rateTo
}

// ─── Regiones por país ────────────────────────────────────────────────────────

export const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  CR: ['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'],
  MX: ['Ciudad de México','Jalisco','Nuevo León','Puebla','Guanajuato','Querétaro','Yucatán','Veracruz','Estado de México','Chihuahua','Sonora','Baja California','Sinaloa','Tamaulipas','Coahuila'],
  CO: ['Bogotá','Antioquia','Valle del Cauca','Cundinamarca','Atlántico','Santander','Bolívar','Córdoba','Nariño','Tolima','Meta','Risaralda','Caldas','Cauca'],
  AR: ['Buenos Aires','Córdoba','Santa Fe','Mendoza','Tucumán','Entre Ríos','Salta','Neuquén','Río Negro','Chaco','Misiones','Corrientes','Santiago del Estero','San Juan'],
  CL: ['Región Metropolitana','Valparaíso','Biobío','La Araucanía','Los Lagos',"O'Higgins",'Maule','Coquimbo','Antofagasta','Los Ríos','Atacama','Ñuble','Tarapacá','Arica y Parinacota'],
  PE: ['Lima','Arequipa','La Libertad','Cusco','Piura','Lambayeque','Junín','Áncash','Loreto','Callao','Ica','Cajamarca','Tacna','Puno'],
  EC: ['Pichincha','Guayas','Azuay','Manabí','El Oro','Los Ríos','Tungurahua','Loja','Esmeraldas','Imbabura','Chimborazo','Santa Elena','Santo Domingo'],
  GT: ['Guatemala','Quetzaltenango','Escuintla','Sacatepéquez','Petén','Alta Verapaz','Chiquimula','Jutiapa','Huehuetenango'],
  PA: ['Ciudad de Panamá','Chiriquí','Veraguas','Bocas del Toro','Coclé','Colón','Los Santos','Herrera','Darién'],
  HN: ['Francisco Morazán','Cortés','Atlántida','Choluteca','Comayagua','Santa Bárbara','Olancho'],
  SV: ['San Salvador','Santa Ana','San Miguel','La Libertad','Sonsonate','Usulután','La Paz'],
  NI: ['Managua','Granada','León','Masaya','Matagalpa','Jinotega','Estelí','Chinandega'],
  DO: ['Santo Domingo','Santiago','La Vega','San Cristóbal','La Altagracia','Espaillat','Puerto Plata'],
  UY: ['Montevideo','Canelones','Maldonado','Salto','Paysandú','Rivera','Colonia','Tacuarembó'],
}

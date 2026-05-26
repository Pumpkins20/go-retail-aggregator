# UI/UX Design Specification
## Multi-Source Retail Command Center
**Version:** 1.0 — Google Stitch Ready
**Stack:** Next.js · shadcn/ui · Tailwind CSS v3
**Last Updated:** May 2026

---

## 1. Design Philosophy

### Vibe & Persona
> *"A Bloomberg Terminal that went to therapy."*

Data-dense tapi tidak anxious. Premium tapi tidak dingin. Setiap elemen ada di sana karena punya tujuan — tidak ada ornamen, tidak ada gradien yang teriak. Ini adalah tool yang **operator percaya**, bukan tool yang mereka kagumi dari jauh.

### Tiga Prinsip Utama

| Prinsip | Artinya dalam praktik |
|---------|----------------------|
| **Breathe** | White-space adalah fitur. Padding generous di mana-mana. Jangan takut kosong. |
| **Whisper** | Border tipis. Shadow hanya `shadow-sm`. Warna semantic dipakai dengan hemat — kalau semua merah, tidak ada yang merah. |
| **Anchor** | Hierarki tipografi kuat. User tahu dalam 2 detik: angka terbesar = paling penting. |

---

## 2. Design Tokens

### 2.1 Color System

```css
/* Base Palette */
--color-bg:           #FAFAFA;   /* Page background — off-white, bukan pure white */
--color-surface:      #FFFFFF;   /* Card, dialog, popover */
--color-surface-2:    #F4F4F5;   /* Hover state, input background, subtle divider */
--color-border:       #E4E4E7;   /* zinc-200 — default border semua komponen */
--color-border-strong:#D4D4D8;   /* zinc-300 — border saat hover/focus */

/* Typography */
--color-text-primary: #18181B;   /* zinc-900 — semua heading dan body */
--color-text-muted:   #71717A;   /* zinc-500 — label sekunder, description */
--color-text-subtle:  #A1A1AA;   /* zinc-400 — placeholder, disabled */

/* Accent — digunakan hemat, hanya untuk CTA dan active state */
--color-accent:       #2563EB;   /* blue-600 */
--color-accent-light: #EFF6FF;   /* blue-50 — background highlight */
--color-accent-muted: #DBEAFE;   /* blue-100 — hover on accent-light */

/* Semantic — HANYA untuk status, bukan dekorasi */
--color-success:      #16A34A;   /* green-600 */
--color-success-bg:   #F0FDF4;   /* green-50 */
--color-success-border:#BBF7D0;  /* green-200 */

--color-warning:      #D97706;   /* amber-600 */
--color-warning-bg:   #FFFBEB;   /* amber-50 */
--color-warning-border:#FDE68A;  /* amber-200 */

--color-error:        #DC2626;   /* red-600 */
--color-error-bg:     #FEF2F2;   /* red-50 */
--color-error-border: #FECACA;   /* red-200 */
```

**Aturan pemakaian warna:**
- Accent (`blue-600`) hanya pada: tombol primary, active nav, focus ring
- Success/Warning/Error hanya pada: status badge, alert, toast — **tidak untuk dekorasi**
- Tidak ada elemen dekoratif berwarna (card border tidak boleh biru tanpa alasan semantic)

### 2.2 Typography Scale

```css
/* Font Families */
--font-display: 'Playfair Display', Georgia, serif;   /* Heading, branding, hero label */
--font-body:    'Manrope', system-ui, sans-serif;     /* Semua teks UI, angka, tabel */

/* Scale (Mobile → Desktop) */
--text-hero:    clamp(2.5rem, 5vw, 4rem);     /* 40–64px — total stok utama */
--text-h1:      clamp(1.5rem, 3vw, 2rem);     /* 24–32px — page title */
--text-h2:      1.25rem;                       /* 20px — section title */
--text-h3:      1rem;                          /* 16px — card title */
--text-body:    0.9375rem;                     /* 15px — body text */
--text-small:   0.875rem;                      /* 14px — label, badge */
--text-xs:      0.75rem;                       /* 12px — caption, meta */

/* Weight */
--weight-regular: 400;
--weight-medium:  500;
--weight-semibold:600;
```

**Aturan tipografi:**
- `font-display` HANYA pada: hero number label, page title, aplikasi nama di sidebar
- `font-body` untuk segalanya: angka stok, tabel, button, label, form
- Angka stok besar menggunakan `font-body` (Manrope) dengan `font-variant-numeric: tabular-nums` agar lebar konsisten
- Tidak ada font-weight di atas 600

### 2.3 Spacing System

```
Menggunakan Tailwind spacing scale — semua spacing kelipatan 4px:
4px   = gap/padding micro        → p-1
8px   = padding compact          → p-2
12px  = gap antara elements      → gap-3
16px  = padding card default     → p-4
20px  = section padding          → p-5
24px  = padding card comfortable → p-6
32px  = section gap              → gap-8
48px  = section margin           → my-12
64px  = page section gap         → py-16
```

### 2.4 Border Radius

```
4px  = badge, chip kecil          → rounded
6px  = input, button small        → rounded-md (custom: 6px)
8px  = button default, card inner → rounded-lg
12px = card container             → rounded-xl
16px = dialog, modal              → rounded-2xl
```

### 2.5 Shadow System

```css
/* Hanya 3 level shadow yang diizinkan */
--shadow-card:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-dialog: 0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.08);
--shadow-none:   none;

/* Tidak ada drop-shadow tebal, tidak ada glow, tidak ada colored shadow */
```

### 2.6 Animation Tokens

```css
--duration-instant: 100ms;  /* Toggle, checkbox */
--duration-fast:    150ms;  /* Button hover, badge change */
--duration-normal:  200ms;  /* Card hover, menu open */
--duration-slow:    300ms;  /* Dialog open, skeleton fade */
--duration-counter: 800ms;  /* Hero number counter animation */

--ease-default: cubic-bezier(0.4, 0, 0.2, 1);   /* ease-in-out standard */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* slight overshoot untuk pop effect */
```

---

## 3. Global Layout

### 3.1 App Shell

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (220px fixed, desktop only)                    │
│  ┌─────────────────────────────────────────────────┐   │  ← border-r border-zinc-200
│  │  Logo / App Name                                │   │
│  │  ─────────────────                              │   │
│  │  ◉ Dashboard          ← active: bg-accent-light │   │
│  │  ○ Supplier Management                          │   │
│  │                                                 │   │
│  │  [bottom] version tag                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  MAIN CONTENT AREA                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  TOP BAR (sticky, h-14)                         │   │  ← border-b backdrop-blur-sm
│  │  Page title           [controls area]            │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  PAGE CONTENT                                   │   │
│  │  max-w-6xl mx-auto px-6 py-8                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Sidebar spec:**
- Width: `w-[220px]` fixed, tidak collapsible di v1.0
- Background: `bg-white border-r border-zinc-200`
- Logo area: `h-14 flex items-center px-5 border-b border-zinc-100`
- Nav item height: `h-9`
- Nav item padding: `px-3`
- Nav item active: `bg-blue-50 text-blue-700 font-medium rounded-lg`
- Nav item inactive: `text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg`
- Nav icon size: `16px`, warna inherit dari text
- Bottom area: `absolute bottom-0 w-full p-4`

**Top bar spec:**
- Height: `h-14`
- Background: `bg-white/80 backdrop-blur-sm border-b border-zinc-200`
- Position: `sticky top-0 z-30`
- Content: `flex items-center justify-between px-6`
- Page title: `font-display text-lg font-medium text-zinc-900`

**Main content:**
- Container: `max-w-6xl mx-auto px-6 py-8`
- Semua page content ada di dalam container ini

### 3.2 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| `< 768px` (mobile) | Sidebar hilang → top navigation bar full-width; hamburger menu untuk nav |
| `768px–1023px` (tablet) | Sidebar collapse jadi icon-only (lebar `w-14`); label nav hilang |
| `≥ 1024px` (desktop) | Full sidebar 220px + label |

---

## 4. Page: Dashboard

### 4.1 Page Structure

```
[TOP BAR]
  Page title: "Command Center"  ← font-display
  Controls: [Auto-refresh toggle] [Sync Now button]

[HERO SECTION]  ← py-10 border-b border-zinc-100
  Label:  "Total Stock Across All Sources"
  Number: [animated counter — huge]
  Sub:    "3 of 4 sources online · Last synced 2 min ago"

[SUPPLIER GRID]  ← pt-8
  Grid: 3-col desktop, 2-col tablet, 1-col mobile
  [SupplierCard] [SupplierCard] [SupplierCard] ...
```

### 4.2 Hero Section

```
Padding:    py-10 px-0
Alignment:  left-aligned (bukan center — terasa lebih enterprise)
Border:     border-b border-zinc-100

Label (atas angka):
  font-body, text-sm, font-medium, text-zinc-500, tracking-widest, uppercase
  Text: "TOTAL INVENTORY"

Hero Number:
  font-display, text-[clamp(3rem,6vw,5rem)], font-medium, text-zinc-900
  tabular-nums, leading-none
  Animasi: counter dari 0 → nilai aktual, duration 800ms, ease-out
  Contoh: "12,480"

Sub-label (bawah angka):
  font-body, text-sm, text-zinc-500
  Layout: inline flex gap-1 items-center
  "3 of 4 sources online" → angka sukses pakai text-green-600 font-medium
  Separator: "·"
  "Last synced 2 minutes ago"

Warning banner (kondisional — BL-03):
  mt-4, p-3 rounded-lg bg-amber-50 border border-amber-200
  Icon: ⚠ amber-600
  Text: "No active suppliers configured." + link "Go to Supplier Management →"
```

### 4.3 SupplierCard Component

**Card anatomy:**
```
┌──────────────────────────────────────────┐
│  [Badge: SUCCESS]              [⋯ menu]  │  ← CardHeader, flex justify-between
│  Tokopedia Store                         │  ← font-body font-medium text-zinc-900
│  Official store di Tokopedia             │  ← text-sm text-zinc-400 mt-0.5
├──────────────────────────────────────────┤
│                                          │
│  1,240                                   │  ← huge number, font-body
│  units in stock                          │  ← text-xs text-zinc-400
│                                          │
├──────────────────────────────────────────┤
│  312 ms latency     [mock: success]      │  ← CardFooter
└──────────────────────────────────────────┘
```

**Card Tailwind spec:**
```
Container:
  bg-white rounded-xl border border-zinc-200
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]
  p-5
  transition-all duration-200
  hover:border-zinc-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]

Header:
  flex items-start justify-between mb-4

Supplier name:
  text-base font-medium text-zinc-900 leading-tight

Description:
  text-sm text-zinc-400 mt-0.5 leading-relaxed

Stock number:
  font-body text-4xl font-semibold text-zinc-900
  tabular-nums leading-none mt-4
  (jika TIMEOUT/ERROR: tampilkan "—" text-zinc-300 text-4xl)

Unit label:
  text-xs text-zinc-400 mt-1 uppercase tracking-wider

Footer:
  flex items-center justify-between mt-4 pt-3
  border-t border-zinc-100

Latency:
  text-xs text-zinc-400 font-body
  (jika > 1000ms: text-amber-500)

Mock behavior badge:
  text-xs font-medium px-1.5 py-0.5 rounded
  subtle — bg-zinc-100 text-zinc-500 (hanya untuk demo mode)
```

**Card state variants:**

| State | Visual Changes |
|-------|---------------|
| `SUCCESS` | opacity-100, border-zinc-200, angka normal |
| `SUCCESS` + stock=0 | opacity-100, border-zinc-200, angka "0" hijau, badge "Empty" amber |
| `TIMEOUT` | opacity-60, border-amber-200 bg-amber-50/30, angka "—" |
| `ERROR` | opacity-60, border-red-200 bg-red-50/30, angka "—" |
| Loading | Skeleton shimmer, bukan opacity |

**Status Badge spec:**
```
SUCCESS: bg-green-50 text-green-700 border border-green-200
TIMEOUT: bg-amber-50 text-amber-700 border border-amber-200
ERROR:   bg-red-50   text-red-700   border border-red-200

Size: text-xs font-medium px-2 py-0.5 rounded-full
```

### 4.4 SupplierCard Skeleton

```
Identik dengan card layout tapi menggunakan Skeleton:
- Header area: Skeleton h-4 w-16 (badge) + Skeleton h-4 w-6 (menu)
- Name: Skeleton h-5 w-36 mt-2
- Description: Skeleton h-3 w-48 mt-1
- Number: Skeleton h-10 w-24 mt-4
- Label: Skeleton h-3 w-16 mt-1
- Footer: Skeleton h-3 w-20 mt-4

Shimmer arah: kiri ke kanan
Duration: 1.5s loop
```

### 4.5 Sync Controls

```
[Auto-refresh]  [Sync Now]

Auto-refresh:
  Layout: flex items-center gap-2
  Label: text-sm text-zinc-500 font-body
  Toggle: shadcn Switch (default OFF)

Sync Now button:
  variant="outline"
  size="sm"
  Icon: RefreshCw (lucide) 16px, margin-right 6px
  Text: "Sync Now"
  Loading state: icon berputar (animate-spin), button disabled
  Cooldown: 3 detik setelah sync — button disabled + opacity-50
```

### 4.6 Empty Dashboard State

```
Container: py-20 flex flex-col items-center text-center

Icon: kotak dengan panah masuk (lucide PackageOpen) 48px text-zinc-300

Title: "No active suppliers"
  text-xl font-medium text-zinc-700 mt-4

Description: "Add at least one supplier to start aggregating stock data."
  text-sm text-zinc-400 mt-2 max-w-xs

Button: "Go to Supplier Management"
  variant="default" mt-6 (tombol biru primary)
```

---

## 5. Page: Supplier Management

### 5.1 Page Structure

```
[TOP BAR]
  Page title: "Supplier Management"
  Action: [+ Add Supplier button]

[PAGE CONTENT]
  Section header: "Registered Suppliers" + count badge
  [SupplierTable]
  [Pagination]
```

### 5.2 Section Header

```
flex items-center justify-between mb-6

Left:
  "Registered Suppliers"
  text-lg font-medium text-zinc-900

  Count badge (di kanan teks):
  bg-zinc-100 text-zinc-600 text-xs font-medium px-2 py-0.5 rounded-full ml-2
  Contoh: "4"

Right:
  (kosong di desktop — button Add ada di top bar)
  (di mobile: button Add ada di sini)
```

### 5.3 SupplierTable

**Table spec:**
```
Container:
  bg-white rounded-xl border border-zinc-200
  overflow-hidden  ← agar border radius terapply ke tabel
  shadow-[0_1px_3px_rgba(0,0,0,0.06)]

Table header row:
  bg-zinc-50 border-b border-zinc-200
  text-xs font-medium text-zinc-500 uppercase tracking-wider
  h-10 px-4

Table body row:
  border-b border-zinc-100 last:border-0
  h-14
  hover:bg-zinc-50/70 transition-colors duration-100
  px-4

Column layout (desktop):
  Order  | Name & Description | Status | Mock  | Timeout | Created  | Actions
  40px   | flex-1             | 100px  | 120px | 90px    | 120px    | 80px
```

**Column specs:**

```
[Order column]
  text-sm text-zinc-400 font-mono text-center
  Nilai: display_order dari DB

[Name & Description column]
  Name: text-sm font-medium text-zinc-900
  Description: text-xs text-zinc-400 mt-0.5
  Layout: flex flex-col

[Status column]
  shadcn Switch — inline, langsung toggle
  Di samping switch: text-xs text-zinc-500
  "Active" (jika on) / "Inactive" (jika off)
  Optimistic update: switch langsung berubah, revert jika API gagal

[Mock Behavior column]
  Badge kecil per behavior:
  success:      bg-green-50 text-green-700 border-green-200 "Success"
  random_error: bg-amber-50 text-amber-700 border-amber-200 "Random Error"
  timeout:      bg-red-50   text-red-700   border-red-200   "Timeout"

[Timeout column]
  text-sm font-mono text-zinc-600
  Format: "2,000 ms"

[Created column]
  text-sm text-zinc-400
  Format: "May 16, 2026" atau relative "3 days ago"

[Actions column]
  flex items-center gap-1

  Edit button:
    variant="ghost" size="icon" h-8 w-8
    Icon: Pencil 14px text-zinc-400 hover:text-zinc-700

  Delete button:
    variant="ghost" size="icon" h-8 w-8
    Icon: Trash2 14px text-zinc-400 hover:text-red-600
```

### 5.4 Empty Table State

```
Container: py-16 text-center (di dalam tbody sebagai full-width row)

Icon: DatabaseZap (lucide) 40px text-zinc-300

Title: "No suppliers yet"
  text-base font-medium text-zinc-600 mt-3

Description: "Register your first supplier to start aggregating stock."
  text-sm text-zinc-400 mt-1

Button: "Add your first supplier"
  variant="outline" mt-4
```

### 5.5 Add / Edit Supplier — Dialog (Desktop)

```
Dialog spec:
  sm:max-w-[560px]
  rounded-2xl
  p-6

Header:
  DialogTitle: font-display text-xl font-medium text-zinc-900
    Add: "Add Supplier"
    Edit: "Edit Supplier"
  DialogDescription: text-sm text-zinc-500 mt-1
    Add: "Register a new inventory source to monitor."
    Edit: "Update supplier configuration."
  Separator mt-4 mb-5

Form layout:
  flex flex-col gap-5

[Field: Name]
  Label: "Supplier Name" — text-sm font-medium text-zinc-700
  Input: placeholder="e.g. Tokopedia Official Store"
  Error: text-xs text-red-600 mt-1 (dari Zod validation)

[Field: Description]
  Label: "Description"
    Badge kanan label: "Optional" — text-xs bg-zinc-100 text-zinc-400 px-1.5 rounded
  Textarea: rows=2, placeholder="Short description of this supplier..."
  resize-none

[Field: Endpoint URL]
  Label: "Endpoint URL"
  Input: type="url", placeholder="https://api.supplier.com/stock"
  Helper: text-xs text-zinc-400 mt-1
    "The URL that will be called to fetch stock data."

[Field: Auth Type]
  Label: "Authentication"
  Select (shadcn):
    Option "None" — aktif, bisa dipilih
    Option "API Key" — disabled, di-render dengan opacity-40
      Di kanan label: Badge "Coming in v1.1" bg-blue-50 text-blue-600 text-xs

[Field: Timeout]
  Label: "Request Timeout"
  Layout: flex items-center gap-4
  Slider: min=500 max=10000 step=100, flex-1
  Value display: text-sm font-mono font-medium text-zinc-700 w-20 text-right
    Format: "2,000 ms"
  Helper: text-xs text-zinc-400 mt-1
    "Max wait time before marking this supplier as timed out."

[Field: Mock Behavior]
  Label: "Mock Behavior"
    Badge kanan: "Demo only" bg-zinc-100 text-zinc-400 text-xs
  Select (shadcn):
    "Always Success"
    "Random Error (20%)"
    "Always Timeout"
  Helper: text-xs text-zinc-400 mt-1
    "Controls how this supplier responds in mock mode."

[Field: Display Order]
  Label: "Display Order"
  Input: type="number" min="0" w-24
  Helper: text-xs text-zinc-400 mt-1
    "Lower numbers appear first in the dashboard."

Separator mb-1

Footer:
  flex justify-end gap-3
  Button "Cancel": variant="ghost"
  Button "Save Supplier" (Add) / "Save Changes" (Edit): variant="default"
  Loading state: button disabled + spinner icon di kiri teks
```

### 5.6 Add / Edit Supplier — Sheet (Mobile)

```
Sheet dari bottom (side="bottom"):
  rounded-t-2xl
  max-h-[92dvh]
  overflow-y-auto

Header identik dengan Dialog tapi tanpa dialog chrome.
Form identik.
Footer: position sticky bottom-0 bg-white pt-3 border-t border-zinc-100
```

### 5.7 Delete Confirmation Dialog

```
AlertDialog spec:
  max-w-[400px]
  rounded-2xl
  p-6

Icon: di atas title
  Container: w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4
  Icon: Trash2 20px text-red-600

Title: "Delete supplier?"
  font-display text-xl text-center text-zinc-900

Description: text-sm text-zinc-500 text-center mt-2
  "This will permanently remove [nama supplier] and cannot be undone."
  Nama supplier: font-medium text-zinc-900

Footer: flex gap-3 mt-6
  Button "Cancel": variant="outline" flex-1
  Button "Delete": variant="destructive" flex-1
    bg-red-600 hover:bg-red-700 text-white
```

### 5.8 Pagination

```
Container: flex items-center justify-between mt-4 px-1

Left:
  text-sm text-zinc-500
  "Showing 1–20 of 47 suppliers"

Right (shadcn Pagination):
  Prev button: disabled jika page=1
  Page numbers: maks 5 page number tampil, ellipsis di tengah
  Next button: disabled jika last page

Button size: h-8 w-8 text-sm
Active page: bg-zinc-900 text-white (bukan biru — lebih subtle)
```

---

## 6. Component Specs: Global Elements

### 6.1 Primary Button

```
Default (variant="default"):
  bg-zinc-900 text-white
  hover:bg-zinc-700
  h-9 px-4 text-sm font-medium rounded-lg
  transition-colors duration-150
  focus-visible:ring-2 ring-zinc-900 ring-offset-2

  Loading state:
    opacity-70 cursor-not-allowed
    Icon Loader2 animate-spin mr-2 h-4 w-4

Destructive (variant="destructive"):
  bg-red-600 text-white hover:bg-red-700

Outline (variant="outline"):
  border border-zinc-200 bg-white text-zinc-700
  hover:bg-zinc-50 hover:border-zinc-300

Ghost (variant="ghost"):
  bg-transparent text-zinc-600
  hover:bg-zinc-100 hover:text-zinc-900

CATATAN: Primary button pakai zinc-900 (hitam), BUKAN biru.
Biru hanya dipakai untuk accent/highlight state, bukan CTA utama.
Ini memberi kesan lebih premium dan tidak "template-like".
```

### 6.2 Input

```
Base:
  h-9 px-3 text-sm font-body
  bg-white border border-zinc-200 rounded-lg
  text-zinc-900 placeholder:text-zinc-400
  transition-colors duration-150

Focus:
  outline-none ring-2 ring-zinc-900/20 border-zinc-400

Error state:
  border-red-400 ring-red-400/20
  + text-xs text-red-600 mt-1 (pesan error)

Disabled:
  opacity-50 cursor-not-allowed bg-zinc-50
```

### 6.3 Select

```
Trigger: identik styling dengan Input
  h-9 text-sm

Dropdown (SelectContent):
  bg-white border border-zinc-200 rounded-lg
  shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.08)]
  p-1

Item (SelectItem):
  h-8 px-2 text-sm rounded-md
  hover:bg-zinc-100 cursor-pointer
  font-body text-zinc-700

  Disabled item:
    opacity-40 cursor-not-allowed pointer-events-none
```

### 6.4 Toast (Sonner)

```
Position: bottom-right
offset: 16px dari tepi

Success toast:
  bg-white border border-green-200 text-zinc-900
  Icon: CheckCircle2 16px text-green-600 di kiri
  Title: text-sm font-medium
  Description (opsional): text-xs text-zinc-500
  Duration: 3000ms

Error toast:
  bg-white border border-red-200 text-zinc-900
  Icon: XCircle 16px text-red-600 di kiri
  Duration: 5000ms

CATATAN: Background toast = white, BUKAN hitam/dark.
Lebih premium, tidak blocking, sesuai dengan estetika keseluruhan.
```

### 6.5 Skeleton

```
Base: bg-zinc-200 rounded animate-pulse
Dark mode aware: bg-zinc-700/50

Shimmer arah: pakai animasi gradient slide kiri ke kanan
Duration: 1.5s ease-in-out infinite
```

### 6.6 Sidebar Nav Item

```
Base:
  flex items-center gap-2.5 h-9 px-3 rounded-lg
  text-sm font-body text-zinc-600
  transition-colors duration-150
  cursor-pointer w-full

Hover:
  bg-zinc-100 text-zinc-900

Active:
  bg-blue-50 text-blue-700 font-medium

Icon:
  h-4 w-4, color inherit
  Stroke-width: 1.5 (lucide default)
```

### 6.7 Switch (untuk toggle supplier aktif/nonaktif)

```
Track:
  OFF: bg-zinc-200
  ON:  bg-green-500  ← bukan biru, pakai hijau (semantic: "active")

Thumb: bg-white shadow-sm

Transition: 150ms ease-in-out

CATATAN: Switch untuk aktif/nonaktif pakai green, bukan blue accent.
Green = semantically "running/alive". Lebih intuitif untuk operator.
```

---

## 7. Micro-interactions & Animation

### 7.1 Counter Animation (Hero Number)

```javascript
// Prinsip: easeOutExpo — cepat di awal, melambat di akhir
// Terasa natural seperti angka "settling"

function animateCounter(from, to, duration = 800) {
  const startTime = performance.now()
  const update = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)  // easeOutQuart
    const current = Math.floor(from + (to - from) * eased)
    setDisplayValue(current.toLocaleString('id-ID'))
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}
```

### 7.2 Card Entrance Animation

```css
/* Cards masuk satu per satu dengan stagger */
.supplier-card {
  animation: cardEntrance 300ms ease-out forwards;
  opacity: 0;
}

/* Stagger per card: nth-child × 50ms */
.supplier-card:nth-child(1) { animation-delay: 0ms; }
.supplier-card:nth-child(2) { animation-delay: 50ms; }
.supplier-card:nth-child(3) { animation-delay: 100ms; }

@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 7.3 Sync Button Rotation

```css
.sync-icon-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Pada click: icon mulai spin, button disabled */
/* Setelah data kembali: spin stop, cooldown 3 detik */
```

### 7.4 Status Badge Transition

```css
/* Saat status berubah (misal setelah re-sync) */
.status-badge {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

### 7.5 Optimistic Toggle (Supplier aktif/nonaktif)

```
1. User klik Switch → switch langsung flip visual (0ms)
2. Kirim PATCH ke backend (async)
3. Jika sukses: tidak ada perubahan tambahan
4. Jika gagal: flip balik switch + toast error (revert)
   Revert animation: switch bounce kembali dengan spring easing
```

---

## 8. Dark Mode (Siap untuk v1.1)

Sistem tidak wajib dark mode di v1.0, tapi semua token harus menggunakan CSS variables sehingga dark mode bisa ditambahkan dengan override satu file:

```css
/* Semua nilai di atas dalam :root {} */
/* Dark mode override — mudah ditambahkan nanti */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #09090B;  /* zinc-950 */
    --color-surface:      #18181B;  /* zinc-900 */
    --color-surface-2:    #27272A;  /* zinc-800 */
    --color-border:       #3F3F46;  /* zinc-700 */
    --color-border-strong:#52525B;  /* zinc-600 */
    --color-text-primary: #FAFAFA;  /* zinc-50 */
    --color-text-muted:   #A1A1AA;  /* zinc-400 */
    --color-text-subtle:  #71717A;  /* zinc-500 */
  }
}
```

---

## 9. Accessibility Checklist

```
[ ] Semua interactive element accessible via keyboard (Tab order logis)
[ ] Focus ring visible pada semua button, input, link (ring-2 ring-offset-2)
[ ] Status badge memiliki aria-label: "Status: Success", bukan hanya warna
[ ] Switch memiliki label yang ter-associate (htmlFor atau aria-labelledby)
[ ] Angka besar (hero counter) memiliki aria-live="polite" agar screen reader announce
[ ] Icon-only button (edit, delete) memiliki aria-label
[ ] Dialog/AlertDialog menggunakan shadcn built-in (sudah ARIA compliant)
[ ] Error message di form ter-associate dengan input via aria-describedby
[ ] Color tidak satu-satunya penanda status (ada teks di dalam badge)
[ ] Contrast ratio: semua teks ≥ 4.5:1 (WCAG AA)
```

---

## 10. shadcn/ui Configuration

### `components.json` (shadcn init)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Base color: `zinc`** — bukan `slate` atau `gray`.
Zinc lebih warm, lebih premium di layar, lebih cocok dengan Playfair Display.

### Komponen yang di-install

```bash
npx shadcn@latest add \
  card badge button skeleton switch \
  table dialog alert-dialog sheet \
  select input textarea slider tooltip \
  separator navigation-menu pagination \
  sonner
```

### `tailwind.config.ts` — Tambahan

```typescript
import { fontFamily } from "tailwindcss/defaultTheme"

export default {
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", ...fontFamily.serif],
        body:    ["var(--font-manrope)",  ...fontFamily.sans],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
      },
    },
  },
}
```

### `app/globals.css` — Font + CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Manrope:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn variables — base zinc */
    --background: 0 0% 98%;          /* #FAFAFA */
    --foreground: 240 10% 3.9%;      /* #09090B */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --border: 240 5.9% 90%;          /* zinc-200 */
    --input: 240 5.9% 90%;
    --primary: 240 5.9% 10%;         /* zinc-900 — primary button hitam */
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 72.2% 50.6%;   /* red-600 */
    --ring: 240 5.9% 10%;            /* zinc-900 — focus ring */
    --radius: 0.5rem;                /* 8px default */
  }

  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-manrope), system-ui, sans-serif;
    font-feature-settings: "cv11", "ss01";  /* Manrope stylistic alternates */
    -webkit-font-smoothing: antialiased;
  }
}

@layer utilities {
  .font-display { font-family: var(--font-playfair), Georgia, serif; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

---

## 11. Screen Reference Descriptions (untuk Google Stitch)

> Gunakan deskripsi di bawah ini sebagai prompt ke Google Stitch untuk generate tiap screen.

### Screen 1: Dashboard — Loaded State

```
Clean enterprise dashboard with white background (#FAFAFA page bg).
Left sidebar 220px wide with app logo "CommandCenter" in Playfair Display serif font,
two nav links: "Dashboard" (active, blue-50 background, blue-700 text) and
"Supplier Management" (inactive, zinc-600 text).
Sidebar has thin right border.

Main content area:
- Sticky top bar with "Command Center" title in serif font,
  right side has auto-refresh toggle (off) and "Sync Now" outline button with refresh icon.
- Hero section: label "TOTAL INVENTORY" in small uppercase zinc-500,
  below it huge number "12,480" in Playfair Display ~64px zinc-900,
  below that "3 of 4 sources online · Last synced 2 min ago" in small zinc-500.
  Thin bottom border separates hero from cards.
- Card grid: 3 columns, 4 supplier cards visible.

Card 1 (SUCCESS): white bg, thin zinc-200 border, rounded-xl.
  Top: green badge "SUCCESS" + 3-dot menu. Name "Tokopedia Store", desc "Official store di Tokopedia" (muted).
  Center: big number "1,240" (zinc-900, ~40px), below "units in stock" uppercase tiny zinc-400.
  Footer: "312 ms latency" zinc-400 | "success" gray chip.

Card 2 (SUCCESS): similar. Name "Lazada Partner". Stock "3,990".

Card 3 (TIMEOUT): 60% opacity, amber-50/30 subtle background tint, amber-200 border.
  Top: amber badge "TIMEOUT". Name "Gudang Jakarta".
  Center: "—" in zinc-300 ~40px (no stock number).
  Footer: "2,001 ms latency" amber-500.

Card 4 (ERROR): 60% opacity, red-50/30 tint, red-200 border.
  Top: red badge "ERROR". Name "Shopee Official".
  Center: "—" zinc-300.
```

### Screen 2: Dashboard — Loading / Skeleton State

```
Same layout as Screen 1 but all 4 supplier cards show skeleton loading state.
Each card has animated shimmer placeholders:
- Badge area: short gray rectangle shimmer (w-16 h-4)
- Name: wider rectangle shimmer (w-36 h-5)
- Description: narrower rectangle shimmer (w-48 h-3)
- Stock number: large rectangle shimmer (w-24 h-10)
- Unit label: small rectangle shimmer (w-16 h-3)
- Footer: thin rectangle shimmer (w-20 h-3)
Hero section is still visible but "—" for the counter.
Sync Now button shows spinning refresh icon, disabled state.
```

### Screen 3: Supplier Management — Table View

```
Same sidebar. Top bar title "Supplier Management", right side "+ Add Supplier" black button.

Main content:
- Section header "Registered Suppliers" with gray count badge "4".
- White rounded-xl card with data table inside.
- Table header row: light gray bg (#F4F4F5), small uppercase zinc-500 labels:
  "#" | "Name" | "Status" | "Mock" | "Timeout" | "Created" | ""
- 4 data rows, each h-14, hover shows very subtle gray.

Row 1: "1" | "Tokopedia Store / Official store di Tokopedia" | green Switch ON + "Active" text |
  green badge "Success" | "2,000 ms" mono | "May 16, 2026" | pencil icon + trash icon.
Row 2: similar with "Shopee Official", amber badge "Random Error".
Row 3: "Gudang Jakarta", Switch ON, red badge "Timeout".
Row 4: "Lazada Partner", Switch ON, green badge "Success".

Pagination bar below: "Showing 1–4 of 4 suppliers" left | page buttons right (no pagination needed for 4 rows).
```

### Screen 4: Add Supplier Dialog

```
Same dashboard background, dimmed with dark overlay.
Centered dialog: white bg, rounded-2xl, shadow-lg, 560px wide.
  Header: "Add Supplier" in Playfair Display serif 20px + close X button top-right.
  Subtitle: "Register a new inventory source to monitor." zinc-500 small.
  Thin separator line.

Form fields (stacked vertically, gap-5):
  - "Supplier Name" label + text input "e.g. Tokopedia Official Store" placeholder
  - "Description" label + "Optional" gray chip + short textarea
  - "Endpoint URL" label + url input + helper text below
  - "Authentication" label + Select showing "None" selected
  - "Request Timeout" label + horizontal slider (value: 2,000 ms shown on right) + helper
  - "Mock Behavior" label + "Demo only" gray chip + Select showing "Always Success"
  - "Display Order" label + small number input showing "0"

Thin separator.
Footer: "Cancel" ghost button | "Save Supplier" black primary button.
```

### Screen 5: Mobile View — Dashboard

```
Mobile viewport ~390px.
No sidebar — top navigation bar instead: full width white bar with hamburger menu icon left,
"CommandCenter" center (serif), sync icon right.

Hero section: same content but text smaller, centered alignment.
"TOTAL INVENTORY" label, "12,480" large serif number, sub-label.

Cards: 1 column stack, full width.
Card 1: SUCCESS green — same content but full width.
Card 2: TIMEOUT amber — full width.
Cards scroll vertically.
```

---

## 12. Design Checklist untuk Developer

```
[ ] Fonts dimuat via next/font/google (Playfair Display + Manrope)
[ ] CSS variables terdefinisi di globals.css
[ ] shadcn baseColor = "zinc" (bukan slate/gray)
[ ] Primary button warna zinc-900 (hitam), bukan biru
[ ] Active supplier Switch warna green-500, bukan biru
[ ] Status badge pakai bg-{color}-50 + text-{color}-700 + border-{color}-200
[ ] Hero number pakai font-display (Playfair) + tabular-nums
[ ] Semua angka stok pakai font-body (Manrope) + tabular-nums
[ ] Card border default zinc-200; TIMEOUT amber-200; ERROR red-200
[ ] TIMEOUT/ERROR card opacity-60 dengan subtle bg tint
[ ] SUCCESS + stock=0 tetap opacity-100 + badge hijau
[ ] Page background #FAFAFA (bukan #FFFFFF)
[ ] Card background #FFFFFF
[ ] Tidak ada drop shadow tebal (max shadow-sm)
[ ] Tidak ada gradient dekoratif (hanya hero section boleh subtle)
[ ] Focus ring: ring-2 ring-zinc-900/20 (bukan biru)
[ ] Toast: white background, bukan dark
[ ] Counter animation menggunakan easeOutQuart
[ ] Card entrance menggunakan stagger animation (50ms per card)
```

---

*Dokumen ini adalah single source of truth untuk semua keputusan visual.*
*Setiap keputusan yang tidak ada di sini → tanya ke PRD v3.0 untuk konteks bisnis.*

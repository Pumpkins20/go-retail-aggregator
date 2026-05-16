# Product Requirements Document
## Multi-Source Retail Command Center v1.0
**Role:** Fullstack Developer (Go & React)
**Version:** 1.1 (Refined)
**Last Updated:** May 2026

---

## 1. Business Context & Value

Klien ritel sering kali memiliki stok barang yang tersebar di berbagai gudang dan platform e-commerce (Tokopedia, Shopee, Gudang Internal). Mengeceknya satu per satu membuang waktu dan rawan human error. Sistem ini membangun satu **Command Center terpusat** yang menarik seluruh data tersebut secara konkuren dalam hitungan milidetik.

**Target Audience:** Manajer gudang dan operasional ritel skala menengah-besar.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────┐
│           React Frontend (Next.js)       │
│         Port 3000 / Vercel Deploy        │
└──────────────────┬──────────────────────┘
                   │ HTTP (REST)
                   ▼
┌─────────────────────────────────────────┐
│         Go Backend API Server           │
│              Port 8080                  │
│                                         │
│  /api/stock  ──► Goroutine Fan-Out      │
│  /health     ──► Health Check           │
│                    │                    │
│        ┌───────────┼───────────┐        │
│        ▼           ▼           ▼        │
│  Mock Tokopedia  Mock Shopee  Mock WH   │
│  (Supplier A)  (Supplier B) (Supplier C)│
└─────────────────────────────────────────┘
```

---

## 3. Functional Requirements

### 3.1 Backend (Go — Port 8080)

#### F1. Concurrent Data Fetching
- Sistem memanggil **minimal 3 sumber API supplier** secara bersamaan menggunakan **Goroutines dan Channels**.
- Pattern yang digunakan: **Fan-Out / Fan-In** — satu goroutine per supplier, hasilnya di-collect via channel.

#### F2. Graceful Timeout Handling
- Setiap request ke supplier dibungkus dengan `context.WithTimeout(ctx, 2*time.Second)`.
- Jika supplier tidak merespons dalam 2 detik → request dibatalkan, status = `"TIMEOUT"`.
- Supplier yang berhasil **tetap dikembalikan**, tidak menunggu yang timeout.
- Response selalu dikembalikan dengan `HTTP 200` meskipun ada supplier yang timeout (partial success is success).

#### F3. Standardized Response Format

Setiap supplier item dalam response mengikuti schema ini:

```json
{
  "supplier_id": "tokopedia",
  "supplier_name": "Tokopedia Store",
  "stock": 1240,
  "status": "SUCCESS",
  "latency_ms": 312,
  "fetched_at": "2026-05-16T10:30:00Z",
  "error_message": null
}
```

Status enum: `"SUCCESS"` | `"TIMEOUT"` | `"ERROR"`

Jika status bukan `SUCCESS`, maka `stock` = `0` dan `error_message` diisi.

#### F4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/stock` | Fetch semua data stok dari semua supplier secara konkuren |
| `GET` | `/health` | Health check endpoint — return `{"status": "ok"}` |

**Full Response `/api/v1/stock`:**
```json
{
  "total_stock": 3480,
  "successful_sources": 3,
  "failed_sources": 0,
  "fetched_at": "2026-05-16T10:30:00Z",
  "suppliers": [
    { "supplier_id": "tokopedia", ... },
    { "supplier_id": "shopee", ... },
    { "supplier_id": "warehouse_internal", ... }
  ]
}
```

#### F5. CORS Policy
- Mengizinkan origin dari `http://localhost:3000` (development) dan domain produksi.
- Header yang di-set: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: GET`, `Access-Control-Allow-Headers: Content-Type`.

#### F6. Mock Supplier Behavior (Simulasi Realistis)
Karena ini adalah sistem demo/portfolio, supplier API disimulasikan di dalam backend sendiri dengan perilaku realistis:

| Supplier | Endpoint Internal | Simulasi |
|----------|-------------------|----------|
| Tokopedia | `/mock/tokopedia` | Latency random 100–600ms, selalu sukses |
| Shopee | `/mock/shopee` | Latency random 200–800ms, 20% chance error |
| Warehouse Internal | `/mock/warehouse` | Latency **2500ms** (selalu timeout untuk demo) |

> **Catatan:** Supplier "Warehouse Internal" sengaja di-set timeout untuk mendemokan F2 kepada klien.

---

### 3.2 Frontend (Next.js App Router + TypeScript)

#### F7. Hero Metric (Total Stock)
- Menampilkan **total stok gabungan** dari semua supplier yang `status = "SUCCESS"`.
- Menggunakan counter animation (angka bertambah dari 0 ke nilai aktual).
- Sumber data yang gagal tidak dihitung ke total, tapi ditampilkan dengan jelas.

#### F8. Supplier Grid / Cards
- Menampilkan tiap supplier dalam card terpisah.
- Setiap card menampilkan: nama supplier, jumlah stok, status badge, dan latency.
- **Status badge visual:**
  - `SUCCESS` → hijau subtle
  - `TIMEOUT` → amber/kuning
  - `ERROR` → merah subtle

#### F9. Loading & Skeleton State
- Saat fetch berlangsung: tampilkan **skeleton UI** (bukan spinner generik) menggunakan `shadcn/ui Skeleton`.
- Skeleton berbentuk menyerupai layout card agar tidak ada layout shift saat data masuk.

#### F10. Manual Refresh
- Tombol **"Sync Data"** di header dengan ikon refresh.
- Saat diklik: tombol disable + animasi rotate pada ikon, skeleton muncul, data di-fetch ulang.
- Cooldown 3 detik setelah sync untuk mencegah spam.

#### F11. Last Synced Timestamp
- Menampilkan waktu terakhir data di-fetch, contoh: *"Last synced 2 minutes ago"*.
- Diperbarui setiap kali sync berhasil.

#### F12. Auto-Refresh (Opsional — Toggle)
- Toggle di header untuk mengaktifkan/menonaktifkan **auto-refresh setiap 30 detik**.
- Default: **OFF** (on-demand saja).

---

## 4. UI/UX & Design System

### 4.1 Aesthetic Direction
**Vibe:** Clean, Minimalist, Humanist — kesan premium tanpa ornamen berlebihan.
- Banyak white-space
- Border tipis (`border` Tailwind default, bukan tebal)
- Hindari drop shadow tebal; maksimal `shadow-sm`
- Tidak ada gradient yang mencolok; subtle saja jika perlu

### 4.2 Typography

| Font | Penggunaan |
|------|-----------|
| **Playfair Display** | Page title, branding headline, hero label |
| **Manrope** | Angka stok, tabel, body text, UI label |

Import via `next/font/google`.

### 4.3 Color Palette

```
Background:  #FAFAFA  (off-white, bukan pure white)
Surface:     #FFFFFF  (card background)
Border:      #E4E4E7  (zinc-200)
Text Primary: #18181B (zinc-900)
Text Muted:  #71717A  (zinc-500)
Accent:      #2563EB  (blue-600) — untuk CTA dan highlight
Success:     #16A34A  (green-600)
Warning:     #D97706  (amber-600)
Error:       #DC2626  (red-600)
```

### 4.4 Component Library: shadcn/ui

Komponen shadcn/ui yang digunakan:

| Komponen | Digunakan Untuk |
|----------|-----------------|
| `Card`, `CardHeader`, `CardContent` | Supplier cards |
| `Badge` | Status indicator (SUCCESS/TIMEOUT/ERROR) |
| `Button` | Sync Data button |
| `Skeleton` | Loading state |
| `Switch` | Auto-refresh toggle |
| `Separator` | Visual divider |
| `Tooltip` | Info tambahan saat hover pada latency |

### 4.5 Layout & Responsiveness

```
Desktop (≥1024px): 3-column grid untuk supplier cards
Tablet (768–1023px): 2-column grid
Mobile (<768px): 1-column stack
```

Header: sticky top, backdrop blur, border bottom tipis.

---

## 5. Technical Stack

### Backend
| Layer | Choice | Alasan |
|-------|--------|--------|
| Language | Go 1.22+ | Performance, concurrency primitives |
| HTTP Server | `net/http` (stdlib) | Showcase fundamental mastery, no framework |
| JSON | `encoding/json` (stdlib) | Cukup untuk kebutuhan ini |
| Context | `context` (stdlib) | Timeout handling |
| CORS | Manual middleware | Kontrol penuh, no dependency |

### Frontend
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Components | shadcn/ui |
| HTTP Client | Native `fetch` + SWR atau React Query untuk caching/revalidation |
| Fonts | `next/font/google` (Playfair Display + Manrope) |

---

## 6. Project Structure

### Backend
```
/backend
├── main.go              # Server entry point, routing
├── handlers/
│   ├── stock.go         # /api/v1/stock handler (fan-out logic)
│   └── health.go        # /health handler
├── suppliers/
│   ├── supplier.go      # Interface & shared types
│   ├── tokopedia.go     # Tokopedia mock fetcher
│   ├── shopee.go        # Shopee mock fetcher
│   └── warehouse.go     # Warehouse mock fetcher (timeout demo)
├── middleware/
│   └── cors.go          # CORS middleware
└── models/
    └── response.go      # Shared response structs
```

### Frontend
```
/frontend
├── app/
│   ├── layout.tsx        # Root layout (fonts, metadata)
│   ├── page.tsx          # Dashboard page
│   └── globals.css       # Tailwind base styles
├── components/
│   ├── dashboard/
│   │   ├── HeroMetric.tsx       # Total stock display
│   │   ├── SupplierCard.tsx     # Individual supplier card
│   │   ├── SupplierGrid.tsx     # Grid wrapper
│   │   └── SyncButton.tsx      # Refresh button + cooldown
│   └── ui/                      # shadcn/ui components (auto-generated)
├── lib/
│   ├── api.ts            # fetch wrapper untuk /api/v1/stock
│   └── types.ts          # TypeScript interfaces matching backend response
└── hooks/
    └── useStockData.ts   # Custom hook: fetch, loading, error, auto-refresh
```

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API Response Time | < 2.5 detik (dibatasi oleh timeout supplier terlamban) |
| Frontend First Paint | < 1.5 detik (skeleton langsung tampil) |
| Concurrent Supplier Calls | Semua supplier dipanggil **paralel**, bukan sekuensial |
| Code Quality | No external Go framework; zero-dependency backend |
| Browser Support | Chrome 100+, Firefox 100+, Safari 15+ |
| Accessibility | Semantic HTML, ARIA labels pada badge status |

---

## 8. Definition of Done

- [ ] Backend berjalan di port 8080, semua endpoint merespons
- [ ] Goroutine fan-out terbukti (lihat log: semua 3 goroutine start hampir bersamaan)
- [ ] Timeout handling terbukti: warehouse timeout tidak memblokir response
- [ ] Frontend menampilkan skeleton saat loading
- [ ] Hero number menampilkan total stok yang benar (exclude timeout supplier)
- [ ] Supplier card menampilkan status badge yang akurat
- [ ] Tombol Sync bekerja dengan cooldown
- [ ] Responsive di mobile, tablet, desktop
- [ ] README.md berisi: cara menjalankan backend & frontend, penjelasan arsitektur concurrency

---

## 9. Portfolio Showcase Notes

Poin-poin yang perlu di-highlight di README dan demo untuk klien internasional:

1. **"Zero external dependency backend"** — menunjukkan pemahaman mendalam terhadap Go stdlib
2. **"Sub-2.5s aggregated response"** — meski ada supplier yang slow/timeout
3. **"Graceful partial failure"** — sistem tetap berfungsi meski ada sumber yang down
4. **"Production-ready patterns"** — context cancellation, structured logging, CORS, health check
5. **"Type-safe full-stack"** — TypeScript di frontend, strict types di Go

---

*PRD ini adalah dokumen hidup. Update sesuai feedback klien atau perubahan scope.*

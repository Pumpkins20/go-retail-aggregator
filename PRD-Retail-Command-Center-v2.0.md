# Product Requirements Document
## Multi-Source Retail Command Center v2.0
**Role:** Fullstack Developer (Go & React)
**Version:** 2.0 (Dynamic Supplier Architecture)
**Last Updated:** May 2026
**Supersedes:** v1.1

### Changelog v1.1 → v2.0
| # | Perubahan | Alasan |
|---|-----------|--------|
| 1 | Supplier dari hardcoded → dynamic (DB-driven) | Scalability; tambah supplier tanpa redeploy |
| 2 | Tambah PostgreSQL sebagai persistence layer | Enterprise-grade storage untuk supplier registry |
| 3 | Tambah CRUD endpoint `/api/v1/suppliers` | Backend siap untuk supplier management UI |
| 4 | Tambah `Supplier` interface di Go | Architecture pluggable; mock ↔ real bisa swap tanpa ubah core |
| 5 | Auth supplier: mock di v1.0, API key di v1.1 | Progressive; demo dulu, production-ready next |
| 6 | Tambah Supplier Management UI | Register/edit/delete supplier dari dashboard |
| 7 | Revisi project structure | Mencerminkan layer baru (db, repository, config) |

---

## 1. Business Context & Value

Klien ritel sering kali memiliki stok barang yang tersebar di berbagai gudang dan platform e-commerce (Tokopedia, Shopee, Lazada, Gudang Internal, dll). Jumlah supplier bisa bertambah kapan saja tanpa perlu keterlibatan developer.

Sistem ini membangun satu **Command Center terpusat** yang:
- Menarik seluruh data stok secara **konkuren** dalam hitungan milidetik
- Memungkinkan **operator non-teknis** mendaftarkan supplier baru langsung dari UI
- Dirancang dengan **pluggable architecture** sehingga siap upgrade ke supplier API nyata tanpa refactor besar

**Target Audience:** Manajer gudang dan operasional ritel skala menengah-besar.

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js Frontend (Port 3000)            │
│                                                          │
│   [Dashboard]  ←──────────────  [Supplier Management]   │
│   Total stock, per-supplier    Register / Edit / Delete  │
│   cards, sync button           supplier endpoints        │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP REST
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Go Backend (Port 8080)                  │
│                                                          │
│  GET  /api/v1/stock          → Dynamic Fan-Out Engine    │
│  GET  /api/v1/suppliers      → List registered suppliers │
│  POST /api/v1/suppliers      → Register new supplier     │
│  PUT  /api/v1/suppliers/:id  → Update supplier config    │
│  DEL  /api/v1/suppliers/:id  → Remove supplier           │
│  GET  /health                → Health check              │
│                                                          │
│  SupplierFetcher interface                               │
│  ├── MockFetcher (v1.0) ← used now                       │
│  └── HttpFetcher  (v1.1) ← plug in later, no refactor   │
└──────────────────────────┬───────────────────────────────┘
                           │ pgx / database/sql
                           ▼
┌──────────────────────────────────────────────────────────┐
│                PostgreSQL (Port 5432)                    │
│                                                          │
│   Table: suppliers                                       │
│   id | name | endpoint_url | auth_type | timeout_ms      │
│   is_active | mock_behavior | created_at | updated_at    │
└──────────────────────────────────────────────────────────┘
                           │ goroutine per row
                    ┌──────┴───────┐
                    ▼              ▼
             MockFetcher     MockFetcher
             (Tokopedia)     (Shopee)  ...N suppliers
```

### Prinsip Arsitektur Kunci

> **"The core engine doesn't know or care whether data comes from a mock or a real API."**

Seluruh logika fan-out bekerja terhadap `SupplierFetcher` interface. Swap mock → real HTTP fetcher = **satu baris kode** di dependency injection, bukan refactor.

---

## 3. Data Model

### 3.1 PostgreSQL — Tabel `suppliers`

```sql
CREATE TABLE suppliers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    auth_type    VARCHAR(20)  NOT NULL DEFAULT 'none',
    -- v1.0: 'none' | v1.1: 'api_key' | v1.2+: 'oauth2'
    auth_token   TEXT,
    -- v1.0: NULL (mock tidak butuh token)
    -- v1.1: API key aktual, di-encrypt at rest
    timeout_ms   INTEGER      NOT NULL DEFAULT 2000,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    mock_behavior VARCHAR(20) NOT NULL DEFAULT 'success',
    -- 'success' | 'timeout' | 'random_error'
    -- Field ini HANYA relevan di v1.0 (mock mode)
    -- Di v1.1 diabaikan; fetcher langsung hit endpoint_url
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index untuk query aktif saja
CREATE INDEX idx_suppliers_active ON suppliers (is_active) WHERE is_active = true;
```

### 3.2 Seed Data (untuk demo v1.0)

```sql
INSERT INTO suppliers (name, endpoint_url, auth_type, timeout_ms, mock_behavior) VALUES
  ('Tokopedia Store',    'https://mock.tokopedia.com/stock',   'none', 2000, 'success'),
  ('Shopee Official',    'https://mock.shopee.com/stock',      'none', 2000, 'random_error'),
  ('Gudang Internal',    'https://mock.warehouse.internal/stock','none', 2000, 'timeout'),
  ('Lazada Partner',     'https://mock.lazada.com/stock',      'none', 2000, 'success');
-- Supplier ke-4 (Lazada) menunjukkan sistem bisa N supplier, bukan hanya 3
```

> **Catatan:** `endpoint_url` pada v1.0 tidak benar-benar di-call. Backend membaca `mock_behavior` dari DB dan mensimulasikan respons. Di v1.1, `endpoint_url` dipakai sungguhan.

---

## 4. Functional Requirements

### 4.1 Backend — Core Engine

#### F1. Dynamic Concurrent Data Fetching
- Backend **membaca daftar supplier aktif dari PostgreSQL** saat `/api/v1/stock` dipanggil.
- Untuk setiap supplier dalam daftar, spawn **satu goroutine** secara paralel (fan-out).
- Jumlah goroutine = jumlah supplier aktif di DB. Bisa 3, bisa 30 — engine tidak peduli.
- Hasil dikumpulkan via **buffered channel** (fan-in).

```go
// Pseudocode — engine tidak berubah antara v1.0 dan v1.1
suppliers, _ := repo.GetActiveSuppliers(ctx)
results := make(chan FetchResult, len(suppliers))

for _, s := range suppliers {
    go func(sup Supplier) {
        fetcher := factory.GetFetcher(sup) // mock atau http, dari factory
        results <- fetcher.Fetch(ctx, sup)
    }(s)
}
```

#### F2. Graceful Timeout Handling
- Setiap goroutine dibungkus `context.WithTimeout(ctx, time.Duration(supplier.TimeoutMs)*time.Millisecond)`.
- Timeout per-supplier diambil dari kolom `timeout_ms` di DB — bisa dikonfigurasi per supplier.
- Supplier timeout → status `"TIMEOUT"`, goroutine lain tidak terpengaruh.
- Response HTTP selalu `200 OK` meskipun ada partial failure.

#### F3. SupplierFetcher Interface (Pluggable Architecture)

```go
// /internal/fetcher/fetcher.go
type SupplierFetcher interface {
    Fetch(ctx context.Context, supplier models.Supplier) FetchResult
}

// v1.0: digunakan sekarang
type MockFetcher struct{}
func (m *MockFetcher) Fetch(ctx context.Context, s models.Supplier) FetchResult {
    // Baca s.MockBehavior dari DB → simulasi latency + response
}

// v1.1: tinggal implement, tidak ada perubahan di handler/engine
type HttpFetcher struct {
    client *http.Client
}
func (h *HttpFetcher) Fetch(ctx context.Context, s models.Supplier) FetchResult {
    // Hit s.EndpointURL dengan s.AuthToken di header
}
```

#### F4. Mock Behavior Engine (v1.0)

Perilaku mock dikendalikan oleh kolom `mock_behavior` di DB:

| `mock_behavior` | Simulasi | Latency |
|-----------------|----------|---------|
| `success` | Selalu sukses, stok random 500–2000 | 100–600ms random |
| `random_error` | 20% chance HTTP error | 200–800ms random |
| `timeout` | Tidak pernah respond | 2500ms (melebihi timeout) |

> Operator bisa mengubah `mock_behavior` via UI tanpa deploy ulang.

#### F5. Standardized Response Format

```json
// GET /api/v1/stock
{
  "total_stock": 5230,
  "successful_sources": 3,
  "failed_sources": 1,
  "fetched_at": "2026-05-16T10:30:00Z",
  "suppliers": [
    {
      "supplier_id": "uuid-v4",
      "supplier_name": "Tokopedia Store",
      "stock": 1240,
      "status": "SUCCESS",
      "latency_ms": 312,
      "fetched_at": "2026-05-16T10:30:00Z",
      "error_message": null
    },
    {
      "supplier_id": "uuid-v4",
      "supplier_name": "Gudang Internal",
      "stock": 0,
      "status": "TIMEOUT",
      "latency_ms": 2001,
      "fetched_at": "2026-05-16T10:30:00Z",
      "error_message": "request exceeded timeout of 2000ms"
    }
  ]
}
```

Status enum: `"SUCCESS"` | `"TIMEOUT"` | `"ERROR"`

#### F6. Supplier CRUD API

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/suppliers` | — | List semua supplier (aktif + nonaktif) |
| `POST` | `/api/v1/suppliers` | Lihat F6.1 | Daftarkan supplier baru |
| `PUT` | `/api/v1/suppliers/:id` | Lihat F6.1 | Update konfigurasi supplier |
| `PATCH` | `/api/v1/suppliers/:id/toggle` | — | Toggle aktif/nonaktif |
| `DELETE` | `/api/v1/suppliers/:id` | — | Hapus supplier |
| `GET` | `/health` | — | `{"status":"ok","db":"connected"}` |

**F6.1 — Request body `POST`/`PUT /api/v1/suppliers`:**
```json
{
  "name": "Lazada Partner",
  "endpoint_url": "https://mock.lazada.com/stock",
  "auth_type": "none",
  "auth_token": null,
  "timeout_ms": 2000,
  "mock_behavior": "success"
}
```

**Validasi:**
- `name`: required, max 100 char
- `endpoint_url`: required, harus valid URL format
- `auth_type`: enum `none` | `api_key` (v1.0 hanya terima `none`)
- `timeout_ms`: integer, 500–10000
- `mock_behavior`: enum `success` | `random_error` | `timeout`

#### F7. CORS Policy
- Origin diizinkan: `http://localhost:3000`, `https://<production-domain>`
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `Content-Type, Authorization`
- Preflight `OPTIONS` request ditangani oleh middleware

---

### 4.2 Frontend — Pages & Components

#### Page 1: Dashboard (route `/`)

**F8. Hero Metric — Total Stock**
- Menampilkan total stok dari semua supplier `status = "SUCCESS"`.
- Counter animation: angka bertambah dari 0 ke nilai aktual saat data masuk.
- Sub-label: "X of Y sources online" — misal "3 of 4 sources online".

**F9. Supplier Cards Grid**
- Satu card per supplier dari response API.
- Konten card: nama supplier, stok (angka besar), status badge, latency, `mock_behavior` label (subtle, untuk demo).
- Status badge: `SUCCESS` → green, `TIMEOUT` → amber, `ERROR` → red.
- Card dengan status error/timeout tetap ditampilkan dengan visual degraded (opacity lebih rendah, border amber/red).

**F10. Loading & Skeleton State**
- Saat fetch: skeleton UI (shadcn `Skeleton`) berbentuk persis seperti card → tidak ada layout shift.
- Skeleton count = jumlah supplier yang terdaftar (diketahui dari state sebelumnya), atau default 4.

**F11. Sync Controls (Header)**
- Tombol **"Sync Now"** — trigger fetch ulang, cooldown 3 detik.
- Toggle **Auto-Refresh** (shadcn `Switch`) — default OFF, interval 30 detik jika ON.
- Label **"Last synced X minutes ago"** — diperbarui tiap sync sukses.

#### Page 2: Supplier Management (route `/suppliers`)

**F12. Supplier List Table**
- Tabel (shadcn `Table`) menampilkan semua supplier: nama, URL, status aktif, mock behavior, timeout, tanggal dibuat.
- Toggle aktif/nonaktif inline di baris tabel (shadcn `Switch`).
- Tombol Edit dan Delete per baris.

**F13. Add / Edit Supplier Form**
- Dialog/Sheet (shadcn `Dialog` atau `Sheet`) dengan form field:
  - Nama supplier (text input)
  - Endpoint URL (text input)
  - Auth type (select: `none` | `api_key` — `api_key` disabled dengan label "Coming in v1.1")
  - Timeout ms (number input, slider)
  - Mock behavior (select: `success` | `random_error` | `timeout`)
- Validasi inline sebelum submit.
- Setelah simpan: tabel refresh, toast notifikasi sukses.

**F14. Delete Confirmation**
- Dialog konfirmasi sebelum delete (shadcn `AlertDialog`).
- Menampilkan nama supplier yang akan dihapus.

**F15. Navigation**
- Header/sidebar dengan link: **Dashboard** | **Suppliers**.
- Active state jelas pada link aktif.

---

## 5. UI/UX & Design System

### 5.1 Aesthetic Direction
**Vibe:** Clean, Minimalist, Humanist — enterprise-grade tanpa terasa korporat dingin.
- Banyak white-space, border tipis
- Drop shadow: maksimal `shadow-sm`, hindari `shadow-md` ke atas
- Subtle gradient hanya untuk hero section, tidak di komponen lain

### 5.2 Typography

| Font | Penggunaan |
|------|-----------|
| **Playfair Display** | Page title, branding headline, hero number label |
| **Manrope** | Angka stok, tabel, body text, semua UI label |

Import via `next/font/google`.

### 5.3 Color Palette

```
Background:   #FAFAFA  — off-white page background
Surface:      #FFFFFF  — card, dialog, table background
Border:       #E4E4E7  — zinc-200, semua border
Text Primary: #18181B  — zinc-900
Text Muted:   #71717A  — zinc-500, label sekunder
Accent:       #2563EB  — blue-600, CTA, active nav
Success:      #16A34A  — green-600
Warning:      #D97706  — amber-600
Error:        #DC2626  — red-600
```

### 5.4 shadcn/ui Component Inventory

| Komponen | Digunakan Di |
|----------|-------------|
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | Supplier cards (Dashboard) |
| `Badge` | Status indicator, mock behavior tag |
| `Button` | Sync Now, Add Supplier, Save, Delete |
| `Skeleton` | Loading state cards |
| `Switch` | Auto-refresh toggle, aktif/nonaktif supplier |
| `Table`, `TableHeader`, `TableRow`, `TableCell` | Supplier Management list |
| `Dialog` | Add/Edit supplier form |
| `AlertDialog` | Delete confirmation |
| `Sheet` | Alternatif form di mobile (slide-in dari kanan) |
| `Select` | Auth type, mock behavior dropdown |
| `Input` | Form fields |
| `Slider` | Timeout ms input |
| `Tooltip` | Keterangan latency, info "Coming in v1.1" |
| `Separator` | Visual divider |
| `Toast` / `Sonner` | Notifikasi sukses/gagal operasi CRUD |
| `NavigationMenu` | Header navigation |

### 5.5 Layout & Responsiveness

```
Desktop  (≥1024px) : sidebar nav + 3-column supplier card grid
Tablet   (768–1023): top nav + 2-column grid
Mobile   (<768px)  : top nav + 1-column stack
```

Header: sticky top, `backdrop-blur-sm`, border bottom tipis `border-b`.

---

## 6. Technical Stack

### Backend
| Layer | Choice | Catatan |
|-------|--------|---------|
| Language | Go 1.22+ | — |
| HTTP Server | `net/http` stdlib | No framework — showcase fundamentals |
| JSON | `encoding/json` stdlib | — |
| Context/Timeout | `context` stdlib | — |
| Database Driver | `pgx/v5` | Idiomatic Postgres driver untuk Go |
| DB Migration | `golang-migrate/migrate` | SQL file migration, bukan ORM |
| CORS | Manual middleware | `middleware/cors.go` |
| Config | `os.Getenv` + `.env` file | Tidak perlu library eksternal |

> **Catatan `pgx/v5`:** Ini adalah satu-satunya external dependency yang diizinkan. Postgres driver bukan "framework" — ini infrastruktur. Keputusan ini masih menunjukkan penguasaan Go stdlib untuk semua hal lain.

### Frontend
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Components | shadcn/ui |
| Data Fetching | SWR (untuk Dashboard auto-refresh) |
| Form | React Hook Form + Zod (validasi schema) |
| Fonts | `next/font/google` |
| Notifications | Sonner (sudah bundled di shadcn) |

### Infrastructure (Local Dev)
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: retail_command_center
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
```

---

## 7. Project Structure

### Backend
```
/backend
├── main.go                    # Server entry point, dependency injection
├── .env.example               # DATABASE_URL, PORT, ALLOWED_ORIGIN
├── migrations/
│   ├── 001_create_suppliers.up.sql
│   └── 001_create_suppliers.down.sql
├── internal/
│   ├── config/
│   │   └── config.go          # Load env vars, validate
│   ├── db/
│   │   └── postgres.go        # pgx connection pool, ping
│   ├── models/
│   │   └── supplier.go        # Supplier struct (matches DB schema)
│   ├── repository/
│   │   └── supplier_repo.go   # GetActive, Create, Update, Delete, Toggle
│   ├── fetcher/
│   │   ├── fetcher.go         # SupplierFetcher interface + FetchResult type
│   │   ├── mock_fetcher.go    # MockFetcher — reads mock_behavior from Supplier
│   │   └── http_fetcher.go    # HttpFetcher — stub, tidak dipakai di v1.0
│   ├── engine/
│   │   └── stock_engine.go    # Fan-out/fan-in logic, bekerja pada interface
│   ├── handlers/
│   │   ├── stock.go           # GET /api/v1/stock
│   │   ├── suppliers.go       # CRUD /api/v1/suppliers
│   │   └── health.go          # GET /health
│   └── middleware/
│       └── cors.go            # CORS middleware
└── docker-compose.yml
```

### Frontend
```
/frontend
├── app/
│   ├── layout.tsx             # Root layout (fonts, metadata, nav)
│   ├── page.tsx               # Dashboard — redirect ke /dashboard
│   ├── dashboard/
│   │   └── page.tsx           # Dashboard page
│   └── suppliers/
│       └── page.tsx           # Supplier Management page
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # Sticky header + nav links
│   │   └── NavLink.tsx        # Active-aware nav link
│   ├── dashboard/
│   │   ├── HeroMetric.tsx     # Total stock + counter animation
│   │   ├── SourcesSummary.tsx # "X of Y sources online"
│   │   ├── SupplierCard.tsx   # Individual supplier card
│   │   ├── SupplierGrid.tsx   # Responsive grid wrapper
│   │   └── SyncControls.tsx   # Sync Now + Auto-refresh toggle
│   ├── suppliers/
│   │   ├── SupplierTable.tsx  # Full table with toggle/edit/delete
│   │   ├── SupplierForm.tsx   # Add/Edit form (used in Dialog & Sheet)
│   │   ├── AddSupplierDialog.tsx
│   │   └── DeleteConfirmDialog.tsx
│   └── ui/                    # shadcn/ui auto-generated components
├── hooks/
│   ├── useStockData.ts        # SWR hook: fetch stock, loading, error, auto-refresh
│   └── useSuppliers.ts        # CRUD hooks untuk supplier management
├── lib/
│   ├── api.ts                 # Typed fetch wrappers untuk semua endpoint
│   └── types.ts               # TypeScript interfaces (mirror Go structs)
└── public/
    └── ...
```

---

## 8. API — Auth Strategy Roadmap

| Version | `auth_type` | Implementasi |
|---------|-------------|--------------|
| **v1.0 (sekarang)** | `none` | MockFetcher — tidak hit URL, baca `mock_behavior` dari DB |
| **v1.1 (next)** | `api_key` | HttpFetcher — hit `endpoint_url`, tambahkan `Authorization: Bearer {auth_token}` di header |
| **v1.2 (future)** | `oauth2` | HttpFetcher dengan token refresh logic |

Perubahan dari v1.0 → v1.1 **hanya terjadi di:**
1. `fetcher/http_fetcher.go` — implement `Fetch()` yang sebenarnya
2. `main.go` — ganti `MockFetcher{}` → `HttpFetcher{}` di factory/DI
3. Frontend form — enable `api_key` option di `auth_type` select

**Tidak ada perubahan pada:** `stock_engine.go`, `handlers/stock.go`, `repository/`, `models/` — karena semua bekerja via interface.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API Response Time | < 2.5 detik (bounded by max timeout_ms) |
| Frontend First Paint | < 1.5 detik (skeleton langsung tampil) |
| Concurrent Fetching | Semua supplier dipanggil paralel, bukan sekuensial |
| DB Query Time | < 20ms untuk `GetActiveSuppliers` (simple SELECT + index) |
| Code Quality | No Go framework; `pgx` satu-satunya ext. dependency backend |
| Browser Support | Chrome 100+, Firefox 100+, Safari 15+ |
| Accessibility | Semantic HTML, ARIA labels pada badge dan form |

---

## 10. Definition of Done

### Backend
- [ ] Postgres berjalan via Docker, migration sukses
- [ ] Seed data 4 supplier ter-insert
- [ ] `GET /api/v1/stock` menjalankan goroutine per supplier dari DB (bukan hardcoded)
- [ ] Timeout handling terbukti: supplier `mock_behavior=timeout` tidak memblokir response
- [ ] Semua CRUD `/api/v1/suppliers` berjalan dan tervalidasi
- [ ] `SupplierFetcher` interface ada; `MockFetcher` dan `HttpFetcher` (stub) keduanya ada
- [ ] CORS berfungsi dari localhost:3000

### Frontend
- [ ] Dashboard menampilkan hero metric dengan counter animation
- [ ] Supplier cards muncul dengan status badge yang akurat
- [ ] Skeleton muncul saat loading, tidak ada layout shift
- [ ] Sync Now + cooldown berfungsi; Auto-refresh toggle berfungsi
- [ ] Halaman `/suppliers` menampilkan tabel semua supplier dari DB
- [ ] Add supplier via form → muncul di tabel → langsung bisa di-sync di dashboard
- [ ] Toggle aktif/nonaktif supplier → berpengaruh ke hasil `/api/v1/stock`
- [ ] Delete dengan konfirmasi dialog
- [ ] Responsive di mobile, tablet, desktop

### Documentation
- [ ] `README.md`: setup lokal (Docker + Go + Next.js), penjelasan arsitektur concurrency + pluggable interface
- [ ] `.env.example` terdokumentasi

---

## 11. Portfolio Showcase Notes

Poin yang di-highlight untuk klien internasional:

| Talking Point | Bukti Teknis |
|---------------|-------------|
| "Dynamic, not hardcoded" | Supplier dari Postgres; tambah/hapus via UI langsung efektif |
| "Zero-framework backend" | `net/http` stdlib; `pgx` satu-satunya dependency |
| "Pluggable architecture" | `SupplierFetcher` interface; mock ↔ real HTTP = 1 baris perubahan |
| "Graceful partial failure" | Timeout supplier tidak blok yang lain; partial data tetap return |
| "Sub-2.5s aggregated response" | Fan-out konkuren; semua goroutine jalan paralel |
| "Production-ready patterns" | Context cancellation, DB connection pool, migration files, health check |
| "Type-safe full-stack" | TypeScript + Go strict types; interface contract dijamin compiler |

---

## 12. Out of Scope (v1.0)

- Real supplier API calls (v1.1)
- Authentication/authorization untuk dashboard user
- Supplier-level stock history / time series
- Alerting jika supplier down terlalu lama
- Multi-tenant support

---

*PRD ini adalah dokumen hidup. Update sesuai feedback atau perubahan scope.*

# Product Requirements Document
## Multi-Source Retail Command Center v3.0
**Role:** Fullstack Developer (Go & React)
**Version:** 3.0 — Production-Ready Spec
**Last Updated:** May 2026
**Supersedes:** v2.0

### Changelog v2.0 → v3.0
| # | Area | Perubahan |
|---|------|-----------|
| 1 | Architecture | Kembalikan `services/` layer; definisikan `FetcherFactory` + DI pattern |
| 2 | Architecture | Tambah goroutine leak guard dan structured logging spec |
| 3 | Business Logic | Definisikan 6 business rules eksplisit (BL-01 s/d BL-06) |
| 4 | Data Model | Tambah `UNIQUE constraint`, kolom `description`, `display_order`; spec `updated_at` trigger |
| 5 | API Contract | Definisikan error response format, HTTP status codes lengkap, pagination spec |
| 6 | API Contract | Tambah idempotency consideration untuk POST |
| 7 | Frontend | Definisikan empty state, optimistic update policy, error toast spec |
| 8 | Non-Functional | Tambah goroutine concurrency limit, DB pool size, request ID spec |

---

## 1. Business Context & Value

Klien ritel memiliki stok barang tersebar di berbagai gudang dan platform e-commerce. Jumlah supplier bisa bertambah kapan saja tanpa keterlibatan developer. Sistem ini membangun satu **Command Center terpusat** yang:

- Menarik seluruh data stok secara **konkuren** dalam hitungan milidetik
- Memungkinkan **operator non-teknis** mendaftarkan supplier baru langsung dari UI
- Dirancang dengan **pluggable architecture** sehingga siap upgrade ke supplier API nyata tanpa refactor besar
- **Graceful dalam kegagalan parsial** — satu supplier down tidak membekukan seluruh dashboard

**Target Audience:** Manajer gudang dan operasional ritel skala menengah-besar.

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js Frontend (Port 3000)            │
│   [Dashboard]              [Supplier Management]         │
│   Hero metric, cards,      Register, edit, delete,       │
│   sync controls            toggle active supplier        │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP REST + JSON
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Go Backend (Port 8080)                  │
│                                                          │
│  handlers/     → HTTP concern only (parse, respond)      │
│  services/     → Business logic & orchestration  [NEW]   │
│  engine/       → Goroutine fan-out / fan-in              │
│  fetcher/      → SupplierFetcher interface               │
│  repository/   → DB concern only (CRUD)                  │
│  middleware/   → CORS, logging, request ID               │
│                                                          │
│  FetcherFactory → returns MockFetcher (v1.0)             │
│                    or HttpFetcher (v1.1)  [NEW]          │
└──────────────────────────┬───────────────────────────────┘
                           │ pgx/v5
                           ▼
┌──────────────────────────────────────────────────────────┐
│          PostgreSQL (Port 5432) — Docker                 │
│   suppliers table: registry semua supplier               │
└──────────────────────────────────────────────────────────┘
```

### Prinsip Layer

| Layer | Tanggung Jawab Tunggal | Boleh Akses |
|-------|------------------------|-------------|
| `handlers/` | Parse HTTP req, call service, write HTTP resp | `services/` |
| `services/` | Business rules, orchestrate engine + repo | `engine/`, `repository/`, `models/` |
| `engine/` | Goroutine fan-out, fan-in, timeout | `fetcher/` |
| `fetcher/` | Interface + implementasi fetch per supplier | `models/` |
| `repository/` | SQL query ke Postgres | `models/`, `db/` |

> **Aturan keras:** `handlers/` tidak boleh langsung panggil `repository/` atau `engine/`. Semua melalui `services/`.

---

## 3. Business Logic Rules

Ini adalah keputusan produk yang harus diimplementasikan di `services/` layer dan dijaga oleh validasi, bukan asumsi.

### BL-01 — Minimum Supplier Aktif
- **Rule:** Sistem harus memiliki minimal **1 supplier aktif** setiap saat.
- **Implementasi:** `DELETE /api/v1/suppliers/:id` dan `PATCH .../toggle` (nonaktifkan) harus dicek terlebih dahulu.
- **Jika dilanggar:** Return `HTTP 409 Conflict` dengan pesan `"cannot deactivate or delete the last active supplier"`.

### BL-02 — Uniqueness Supplier
- **Rule:** Kombinasi `name` harus unik (case-insensitive). `endpoint_url` boleh sama (misal dua gudang dari platform yang sama).
- **Implementasi:** UNIQUE index di DB pada `LOWER(name)`. Cek duplikat di service sebelum INSERT/UPDATE.
- **Jika dilanggar:** Return `HTTP 409 Conflict` dengan pesan `"supplier name already exists"`.

### BL-03 — Respons Saat Tidak Ada Supplier Aktif
- **Kondisi ini seharusnya tidak terjadi** karena BL-01, tapi perlu guard sebagai defensive programming.
- **Implementasi:** Jika `GetActiveSuppliers` return array kosong, service return response valid dengan `total_stock: 0`, `suppliers: []`, dan tambahkan field `"warning": "no active suppliers configured"`.
- **HTTP status:** Tetap `200 OK`. Ini bukan error sistem, ini kondisi konfigurasi.

### BL-04 — Kalkulasi `total_stock`
- **Rule:** `total_stock` = jumlah `stock` dari semua supplier dengan `status = "SUCCESS"` saja.
- Supplier dengan status `TIMEOUT` atau `ERROR` dikontribusikan sebagai `0` dan **tidak dihitung** ke total.
- `stock` value boleh `0` dengan status `SUCCESS` — ini artinya stok habis, bukan error.

### BL-05 — Nilai `stock` Nol yang Valid
- **Rule:** Supplier mengembalikan `stock: 0` dengan `status: "SUCCESS"` adalah kondisi valid (stok habis di platform tersebut).
- Ini berbeda dari `stock: 0` dengan `status: "ERROR"` atau `"TIMEOUT"`.
- Frontend harus menampilkan card dengan angka `0` dan badge `SUCCESS` (hijau), bukan dianggap error.

### BL-06 — Urutan Supplier dalam Response
- **Rule:** Supplier dalam array response `/api/v1/stock` diurutkan berdasarkan `display_order ASC`, lalu `created_at ASC` sebagai tiebreaker.
- Alasan: urutan konsisten penting untuk UX — card tidak berpindah posisi setiap kali sync.

---

## 4. Data Model

### 4.1 PostgreSQL — Tabel `suppliers`

```sql
CREATE TABLE suppliers (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    description    VARCHAR(255),
    -- Konteks tambahan: "Gudang Jakarta Pusat", "Official Store Shopee"
    endpoint_url   VARCHAR(500) NOT NULL,
    auth_type      VARCHAR(20)  NOT NULL DEFAULT 'none',
    -- Enum: 'none' | 'api_key' | 'oauth2'
    -- v1.0 hanya terima 'none'; nilai lain disimpan tapi fetcher tidak pakai
    auth_token     TEXT,
    -- v1.0: NULL
    -- v1.1: nilai aktual; di-encrypt at rest di production
    timeout_ms     INTEGER      NOT NULL DEFAULT 2000 CHECK (timeout_ms BETWEEN 500 AND 10000),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    mock_behavior  VARCHAR(20)  NOT NULL DEFAULT 'success',
    -- Enum: 'success' | 'random_error' | 'timeout'
    -- HANYA relevan di v1.0 (MockFetcher). Di v1.1 field ini diabaikan.
    display_order  INTEGER      NOT NULL DEFAULT 0,
    -- Urutan tampil di dashboard dan response API. Lower = lebih dulu.
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_supplier_name UNIQUE (LOWER(name))
    -- Case-insensitive uniqueness: "Tokopedia" dan "tokopedia" dianggap sama
);

-- Index: query supplier aktif (dipakai setiap GET /api/v1/stock)
CREATE INDEX idx_suppliers_active ON suppliers (is_active, display_order)
    WHERE is_active = true;

-- Trigger: auto-update updated_at saat row dimodifikasi
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.2 Seed Data (Demo v1.0)

```sql
INSERT INTO suppliers
    (name, description, endpoint_url, auth_type, timeout_ms, mock_behavior, display_order)
VALUES
    ('Tokopedia Store',
     'Official store di Tokopedia',
     'https://mock.tokopedia.com/stock',
     'none', 2000, 'success', 1),

    ('Shopee Official',
     'Official store di Shopee',
     'https://mock.shopee.com/stock',
     'none', 2000, 'random_error', 2),

    ('Gudang Jakarta',
     'Gudang utama Jakarta Pusat',
     'https://mock.warehouse-jkt.internal/stock',
     'none', 2000, 'timeout', 3),

    ('Lazada Partner',
     'Authorized reseller di Lazada',
     'https://mock.lazada.com/stock',
     'none', 2000, 'success', 4);
```

> Supplier ke-3 sengaja `timeout` untuk mendemokan graceful timeout handling kepada klien.
> `endpoint_url` pada v1.0 tidak di-hit; hanya disimpan untuk kesiapan v1.1.

---

## 5. Functional Requirements — Backend

### F1. Dynamic Concurrent Data Fetching
- Saat `GET /api/v1/stock` dipanggil, `StockService` memanggil `repo.GetActiveSuppliers(ctx)`.
- Untuk setiap supplier, `StockEngine` spawn satu goroutine (fan-out).
- Goroutine count = jumlah supplier aktif di DB; engine tidak peduli jumlahnya.
- **Concurrency limit:** Maksimal **50 goroutine concurrent** menggunakan semaphore channel. Jika supplier aktif > 50, sisanya antri (tidak di-drop). Ini mencegah resource exhaustion.
- Hasil dikumpulkan via buffered channel (fan-in).

```go
// Pseudocode StockEngine — tidak berubah antara v1.0 dan v1.1
func (e *StockEngine) FanOut(ctx context.Context, suppliers []models.Supplier) []FetchResult {
    sem := make(chan struct{}, 50)  // max 50 concurrent goroutines
    results := make(chan FetchResult, len(suppliers))

    for _, s := range suppliers {
        go func(sup models.Supplier) {
            sem <- struct{}{}        // acquire
            defer func() { <-sem }() // release
            tCtx, cancel := context.WithTimeout(ctx, time.Duration(sup.TimeoutMs)*time.Millisecond)
            defer cancel()
            results <- e.fetcher.Fetch(tCtx, sup)
        }(s)
    }

    out := make([]FetchResult, 0, len(suppliers))
    for range suppliers {
        out = append(out, <-results)
    }
    close(results)
    return out
}
```

### F2. Graceful Timeout Handling
- Timeout per-supplier diambil dari `timeout_ms` di DB — bisa dikonfigurasi berbeda per supplier.
- Supplier timeout → `status: "TIMEOUT"`, goroutine lain tidak terpengaruh.
- `cancel()` dipanggil via `defer` untuk memastikan tidak ada goroutine leak.
- Response HTTP selalu `200 OK` (partial success = success).

### F3. SupplierFetcher Interface & FetcherFactory

```go
// /internal/fetcher/fetcher.go
type FetchResult struct {
    SupplierID   string
    SupplierName string
    Stock        int
    Status       string  // "SUCCESS" | "TIMEOUT" | "ERROR"
    LatencyMs    int64
    FetchedAt    time.Time
    ErrorMessage *string
}

type SupplierFetcher interface {
    Fetch(ctx context.Context, supplier models.Supplier) FetchResult
}

// /internal/fetcher/factory.go — FetcherFactory [NEW]
type FetcherFactory struct {
    mode string  // "mock" atau "http", dari config/env
}

func (f *FetcherFactory) GetFetcher(s models.Supplier) SupplierFetcher {
    if f.mode == "mock" {
        return &MockFetcher{}
    }
    return &HttpFetcher{client: http.DefaultClient}
}
// Di main.go: factory := &FetcherFactory{mode: os.Getenv("FETCHER_MODE")}
// FETCHER_MODE=mock (v1.0) atau FETCHER_MODE=http (v1.1)
```

### F4. MockFetcher Behavior (v1.0)
Perilaku dikontrol oleh `mock_behavior` dari DB:

| `mock_behavior` | Simulasi | Latency |
|-----------------|----------|---------|
| `success` | Stok random 500–2000, status SUCCESS | 100–600ms random |
| `random_error` | 20% chance error (stok=0), 80% success | 200–800ms random |
| `timeout` | Tidak respond — context deadline exceeded | Melebihi `timeout_ms` |

### F5. Services Layer — Business Logic

```
/internal/services/
├── stock_service.go      # GetAggregatedStock, kalkulasi total, sorting
└── supplier_service.go   # CRUD business rules: BL-01, BL-02, validasi
```

**`StockService.GetAggregatedStock(ctx)`:**
1. Panggil `repo.GetActiveSuppliers(ctx)` → sort by `display_order`
2. Jika empty → return response dengan warning (BL-03)
3. Panggil `engine.FanOut(ctx, suppliers)`
4. Hitung `total_stock` = sum stock dari status `SUCCESS` saja (BL-04)
5. Sort hasil by `display_order` (BL-06)
6. Return `StockResponse`

**`SupplierService.CreateSupplier(ctx, req)`:**
1. Validasi field (name, endpoint_url, timeout_ms range, enum values)
2. Check duplikat `LOWER(name)` di DB → jika ada, return error BL-02
3. INSERT ke DB

**`SupplierService.DeleteSupplier(ctx, id)`:**
1. Check apakah supplier ini adalah satu-satunya yang aktif (BL-01)
2. Jika ya → return error, jangan DELETE
3. Jika tidak → DELETE

**`SupplierService.ToggleSupplier(ctx, id)`:**
1. Ambil supplier saat ini
2. Jika akan di-nonaktifkan: check apakah satu-satunya aktif (BL-01)
3. Jika ya → return error
4. Jika tidak → UPDATE `is_active`

### F6. Standardized Response Format

```json
// GET /api/v1/stock — sukses normal
{
  "total_stock": 5230,
  "successful_sources": 3,
  "failed_sources": 1,
  "fetched_at": "2026-05-16T10:30:00Z",
  "warning": null,
  "suppliers": [
    {
      "supplier_id": "uuid-v4",
      "supplier_name": "Tokopedia Store",
      "description": "Official store di Tokopedia",
      "stock": 1240,
      "status": "SUCCESS",
      "latency_ms": 312,
      "fetched_at": "2026-05-16T10:30:00.123Z",
      "error_message": null
    },
    {
      "supplier_id": "uuid-v4",
      "supplier_name": "Gudang Jakarta",
      "description": "Gudang utama Jakarta Pusat",
      "stock": 0,
      "status": "TIMEOUT",
      "latency_ms": 2001,
      "fetched_at": "2026-05-16T10:30:00.123Z",
      "error_message": "request exceeded timeout of 2000ms"
    }
  ]
}

// GET /api/v1/stock — tidak ada supplier aktif (BL-03)
{
  "total_stock": 0,
  "successful_sources": 0,
  "failed_sources": 0,
  "fetched_at": "2026-05-16T10:30:00Z",
  "warning": "no active suppliers configured",
  "suppliers": []
}
```

Status enum: `"SUCCESS"` | `"TIMEOUT"` | `"ERROR"`

### F7. Error Response Format (Standar)

**Semua error dari backend mengikuti format ini:**

```json
// HTTP 4xx / 5xx
{
  "error": {
    "code": "SUPPLIER_NAME_EXISTS",
    "message": "supplier name already exists",
    "field": "name",
    "request_id": "req_abc123"
  }
}
```

| Field | Keterangan |
|-------|-----------|
| `code` | Machine-readable error code (string constant) |
| `message` | Human-readable, aman ditampilkan ke UI |
| `field` | Field yang menyebabkan error (hanya untuk validation errors, `null` untuk errors lain) |
| `request_id` | ID request untuk tracing di log |

**Error codes yang terdefinisi:**

| `code` | HTTP Status | Situasi |
|--------|------------|---------|
| `VALIDATION_ERROR` | 422 | Field tidak valid (format, range) |
| `SUPPLIER_NAME_EXISTS` | 409 | BL-02: nama supplier sudah ada |
| `LAST_ACTIVE_SUPPLIER` | 409 | BL-01: tidak bisa hapus/nonaktifkan satu-satunya |
| `SUPPLIER_NOT_FOUND` | 404 | ID supplier tidak ditemukan |
| `INTERNAL_ERROR` | 500 | Server error, detail di log |

### F8. API Endpoints — Lengkap

#### Stock

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/v1/stock` | None | `200` StockResponse |

#### Suppliers

| Method | Path | Body | Response | Error |
|--------|------|------|----------|-------|
| `GET` | `/api/v1/suppliers` | — | `200` SupplierListResponse | — |
| `POST` | `/api/v1/suppliers` | CreateSupplierRequest | `201` SupplierResponse | `409`, `422` |
| `GET` | `/api/v1/suppliers/:id` | — | `200` SupplierResponse | `404` |
| `PUT` | `/api/v1/suppliers/:id` | UpdateSupplierRequest | `200` SupplierResponse | `404`, `409`, `422` |
| `PATCH` | `/api/v1/suppliers/:id/toggle` | — | `200` SupplierResponse | `404`, `409` |
| `DELETE` | `/api/v1/suppliers/:id` | — | `204` No Content | `404`, `409` |

#### System

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/health` | `200` `{"status":"ok","db":"connected","version":"1.0.0"}` |

**Pagination `GET /api/v1/suppliers`:**

Query params: `?page=1&limit=20` (default: page=1, limit=20, max limit=100)

```json
{
  "data": [ ...SupplierResponse array... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "total_pages": 3
  }
}
```

**CreateSupplierRequest / UpdateSupplierRequest:**

```json
{
  "name": "Lazada Partner",
  "description": "Authorized reseller di Lazada",
  "endpoint_url": "https://mock.lazada.com/stock",
  "auth_type": "none",
  "auth_token": null,
  "timeout_ms": 2000,
  "mock_behavior": "success",
  "display_order": 5
}
```

**Validasi field:**

| Field | Rule |
|-------|------|
| `name` | Required, 3–100 char, unik case-insensitive |
| `description` | Optional, max 255 char |
| `endpoint_url` | Required, valid URL (http/https), max 500 char |
| `auth_type` | Enum: `none` \| `api_key` |
| `timeout_ms` | Integer 500–10000, default 2000 |
| `mock_behavior` | Enum: `success` \| `random_error` \| `timeout` |
| `display_order` | Integer ≥ 0, default 0 |

### F9. CORS Policy
- Origins: `http://localhost:3000` (dev), `https://<ALLOWED_ORIGIN>` dari env
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `Content-Type, X-Request-ID`
- Preflight `OPTIONS` ditangani di middleware CORS

### F10. Request ID / Tracing
- Setiap request masuk di-generate `request_id` (format: `req_` + 8 char random hex)
- Jika client kirim header `X-Request-ID`, gunakan itu
- `request_id` di-log di setiap log entry dan dikembalikan di response error
- Ini memungkinkan korelasi log untuk debugging concurrent requests

---

## 6. Functional Requirements — Frontend

### Page 1: Dashboard (`/`)

**F11. Hero Metric — Total Stock**
- Tampilkan `total_stock` dari response.
- Counter animation: 0 → nilai aktual dalam 800ms.
- Sub-label: `"X of Y sources online"` menggunakan `successful_sources` dan `successful_sources + failed_sources`.
- Jika `warning` field ada di response, tampilkan info banner subtle di bawah hero.

**F12. Supplier Cards Grid**
- Satu card per item dalam `suppliers` array, urutan sesuai response (sudah di-sort by `display_order`).
- Konten card: `supplier_name`, `description` (subtle, muted), `stock` (angka besar), status badge, `latency_ms`, `mock_behavior` label (untuk demo — bisa di-hide via toggle di settings).
- Status badge: `SUCCESS` → green, `TIMEOUT` → amber, `ERROR` → red.
- Card `TIMEOUT`/`ERROR`: opacity 70%, border amber/red, angka stok ditampilkan `-` bukan `0`.
- Card `SUCCESS` dengan `stock: 0`: opacity 100%, badge hijau, angka `0` ditampilkan (stok habis valid — BL-05).

**F13. Empty State Dashboard**
- Jika `suppliers` array kosong (karena `warning: "no active suppliers configured"`):
  - Tampilkan ilustrasi empty state (ikon + teks)
  - Pesan: *"No active suppliers. Go to Supplier Management to add one."*
  - Tombol shortcut ke `/suppliers`

**F14. Loading & Skeleton State**
- Saat fetch: skeleton UI (shadcn `Skeleton`) berbentuk persis seperti card.
- Skeleton count = jumlah dari state sebelumnya, atau 4 jika belum ada data.
- Tidak ada layout shift saat data masuk.

**F15. Sync Controls (Header)**
- Tombol **"Sync Now"** — trigger fetch ulang, cooldown 3 detik, ikon rotate saat loading.
- Toggle **Auto-Refresh** (shadcn `Switch`) — default OFF, interval 30 detik jika ON.
- Label **"Last synced X minutes ago"** — diperbarui tiap sync sukses.

---

### Page 2: Supplier Management (`/suppliers`)

**F16. Supplier List Table**
- Tabel menampilkan: `display_order`, nama, `description`, status aktif (Switch), `mock_behavior` badge, `timeout_ms`, tanggal dibuat.
- Kolom `display_order` bisa di-edit inline (click to edit, Enter to save).
- Tombol Edit dan Delete per baris.
- Pagination: tampilkan 20 per halaman, navigasi halaman di bawah tabel.

**F17. Empty State Tabel**
- Jika belum ada supplier sama sekali:
  - Teks: *"No suppliers registered yet."*
  - Tombol **"Add your first supplier"** yang langsung buka form Add.

**F18. Add / Edit Supplier Form**
- Dialog (desktop) atau Sheet (mobile):
  - Nama (text input)
  - Description (textarea, optional)
  - Endpoint URL (text input)
  - Auth type (Select — `api_key` disabled, tooltip: *"Available in v1.1"*)
  - Timeout ms (Slider 500–10000, step 100, dengan angka display di kanan)
  - Mock behavior (Select: success / random_error / timeout)
  - Display order (number input)
- Form Edit: semua field pre-filled dari data supplier.
- `auth_token` field di Edit: tidak ditampilkan (v1.0 tidak butuh). Di v1.1 akan ditampilkan masked.
- Validasi inline (via Zod + React Hook Form) sebelum submit.
- Error dari server (409, 422) ditampilkan di field yang relevan atau sebagai form-level error.

**F19. Toggle Aktif/Nonaktif — Optimistic Update**
- Saat user klik Switch:
  1. UI langsung update (optimistic) — Switch berubah visual
  2. PATCH request dikirim ke backend
  3. Jika sukses: nothing (state sudah benar)
  4. Jika gagal (misal BL-01 — last active supplier): revert Switch, tampilkan toast error dengan pesan dari `error.message`
- Alasan optimistic: UX terasa instan, gagal adalah edge case.

**F20. Delete Confirmation**
- AlertDialog: *"Delete [nama supplier]? This action cannot be undone."*
- Tombol **"Delete"** (destructive merah) dan **"Cancel"**.
- Setelah delete sukses: row hilang dari tabel, toast sukses.
- Jika gagal (BL-01): AlertDialog tutup, toast error.

**F21. Error Toast Spec**
- Error message yang ditampilkan di toast = `error.message` dari response body (sudah human-readable dari backend).
- Tidak expose `error.code` atau `request_id` ke user (hanya di console.log untuk debugging).
- Toast durasi: sukses = 3 detik, error = 5 detik (lebih lama agar user sempat baca).

**F22. Navigation**
- Header sticky dengan link: **Dashboard** | **Supplier Management**.
- Active state dengan underline atau background subtle.
- Di mobile: hamburger menu atau bottom nav.

---

## 7. UI/UX & Design System

### 7.1 Aesthetic Direction
**Vibe:** Clean, Minimalist, Humanist — enterprise-grade tanpa terasa korporat dingin.
- White-space yang lega; border tipis (`border` Tailwind default)
- Drop shadow: maksimal `shadow-sm`
- Subtle gradient hanya di hero section, tidak di tempat lain

### 7.2 Typography

| Font | Penggunaan |
|------|-----------|
| **Playfair Display** | Page title, hero number label, branding |
| **Manrope** | Angka stok, tabel, body text, semua UI label |

Import via `next/font/google`.

### 7.3 Color Palette

```
Background:   #FAFAFA  — off-white page background
Surface:      #FFFFFF  — card, dialog, table background
Border:       #E4E4E7  — zinc-200
Text Primary: #18181B  — zinc-900
Text Muted:   #71717A  — zinc-500
Accent:       #2563EB  — blue-600, CTA, active nav
Success:      #16A34A  — green-600
Warning:      #D97706  — amber-600
Error:        #DC2626  — red-600
```

### 7.4 shadcn/ui Component Inventory

| Komponen | Digunakan Di |
|----------|-------------|
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | Supplier cards |
| `Badge` | Status (SUCCESS/TIMEOUT/ERROR), mock behavior |
| `Button` | Sync Now, Add Supplier, Save, Delete |
| `Skeleton` | Loading state |
| `Switch` | Auto-refresh toggle, aktif/nonaktif supplier |
| `Table`, `TableHeader`, `TableRow`, `TableCell` | Supplier list |
| `Dialog` | Add/Edit form (desktop) |
| `Sheet` | Add/Edit form (mobile) |
| `AlertDialog` | Delete confirmation |
| `Select` | Auth type, mock behavior |
| `Input` | Form text fields |
| `Textarea` | Description field |
| `Slider` | Timeout ms |
| `Tooltip` | Latency info, "Coming in v1.1" |
| `Separator` | Visual divider |
| `Sonner` (Toast) | Notifikasi sukses/error |
| `NavigationMenu` | Header nav |
| `Pagination` | Supplier table pagination |

### 7.5 Layout & Responsiveness

```
Desktop  (≥1024px) : sidebar nav (lebar 220px) + konten main
Tablet   (768–1023): top nav + konten full width
Mobile   (<768px)  : top nav + 1-column stack + Sheet untuk form
```

Supplier card grid: 3-col desktop, 2-col tablet, 1-col mobile.
Header: sticky top, `backdrop-blur-sm`, `border-b`.

---

## 8. Technical Stack

### Backend
| Layer | Choice | Catatan |
|-------|--------|---------|
| Language | Go 1.22+ | — |
| HTTP Server | `net/http` stdlib | No framework — showcase fundamentals |
| JSON | `encoding/json` stdlib | — |
| Context/Timeout | `context` stdlib | — |
| Database Driver | `pgx/v5` | Satu-satunya external dependency |
| DB Migration | `golang-migrate/migrate` | SQL file migration, bukan ORM |
| CORS + Logging | Manual middleware | Zero external dependency |
| Config | `os.Getenv` + `.env` | — |

### Frontend
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 |
| Components | shadcn/ui |
| Data Fetching | SWR |
| Form | React Hook Form + Zod |
| Fonts | `next/font/google` |
| Notifications | Sonner |

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  pgdata:
```

### Environment Variables

```bash
# .env.example
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/retail_command_center?sslmode=disable
ALLOWED_ORIGIN=http://localhost:3000
FETCHER_MODE=mock        # "mock" untuk v1.0, "http" untuk v1.1
DB_POOL_MAX_CONNS=10     # pgx connection pool size
DB_POOL_MIN_CONNS=2
```

---

## 9. Project Structure

### Backend
```
/backend
├── main.go                        # Entry point: init config, db, DI, server
├── .env.example
├── docker-compose.yml
├── migrations/
│   ├── 001_create_suppliers.up.sql
│   └── 001_create_suppliers.down.sql
└── internal/
    ├── config/
    │   └── config.go              # Load & validate env vars
    ├── db/
    │   └── postgres.go            # pgx pool setup, ping, pool config
    ├── models/
    │   └── supplier.go            # Supplier struct, FetchResult struct
    ├── repository/
    │   └── supplier_repo.go       # GetActive, GetAll (paginated), GetByID,
    │                              # Create, Update, Delete, Toggle, CountActive
    ├── fetcher/
    │   ├── fetcher.go             # SupplierFetcher interface
    │   ├── factory.go             # FetcherFactory — mode dari env
    │   ├── mock_fetcher.go        # MockFetcher — reads mock_behavior
    │   └── http_fetcher.go        # HttpFetcher — stub untuk v1.1
    ├── engine/
    │   └── stock_engine.go        # Fan-out/fan-in + semaphore limit
    ├── services/
    │   ├── stock_service.go       # GetAggregatedStock, kalkulasi, sorting
    │   └── supplier_service.go    # CRUD + BL-01, BL-02, BL-03
    ├── handlers/
    │   ├── stock.go               # GET /api/v1/stock
    │   ├── suppliers.go           # CRUD /api/v1/suppliers
    │   └── health.go              # GET /health
    └── middleware/
        ├── cors.go                # CORS headers + preflight
        ├── logging.go             # Structured request logging
        └── request_id.go          # X-Request-ID injection
```

### Frontend
```
/frontend
├── app/
│   ├── layout.tsx                 # Root layout (fonts, nav, metadata)
│   ├── page.tsx                   # Redirect → /dashboard
│   ├── dashboard/
│   │   └── page.tsx
│   └── suppliers/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx           # Sidebar + header wrapper
│   │   ├── Header.tsx
│   │   └── NavLink.tsx
│   ├── dashboard/
│   │   ├── HeroMetric.tsx         # Total stock + counter animation
│   │   ├── SourcesSummary.tsx     # "X of Y sources online"
│   │   ├── WarningBanner.tsx      # Warning dari BL-03
│   │   ├── SupplierCard.tsx       # Card per supplier
│   │   ├── SupplierCardSkeleton.tsx
│   │   ├── SupplierGrid.tsx       # Grid wrapper
│   │   ├── EmptyDashboard.tsx     # Empty state BL-03
│   │   └── SyncControls.tsx       # Sync Now + auto-refresh toggle
│   ├── suppliers/
│   │   ├── SupplierTable.tsx
│   │   ├── SupplierTableRow.tsx   # Row dengan optimistic toggle
│   │   ├── EmptySupplierTable.tsx # Empty state tabel
│   │   ├── SupplierForm.tsx       # Form (dipakai di Dialog & Sheet)
│   │   ├── SupplierFormSchema.ts  # Zod schema — single source of truth
│   │   ├── AddSupplierDialog.tsx
│   │   ├── EditSupplierDialog.tsx
│   │   └── DeleteSupplierDialog.tsx
│   └── ui/                        # shadcn/ui components
├── hooks/
│   ├── useStockData.ts            # SWR: fetch, loading, error, auto-refresh
│   └── useSuppliers.ts            # CRUD: list, create, update, delete, toggle
├── lib/
│   ├── api.ts                     # Typed fetch wrappers (dengan request_id)
│   ├── types.ts                   # TS interfaces mirroring Go structs
│   └── utils.ts                   # cn(), formatRelativeTime(), dll
└── public/
```

---

## 10. Non-Functional Requirements

| Requirement | Target | Implementasi |
|-------------|--------|-------------|
| API Response Time | < 2.5 detik | Bounded oleh `timeout_ms` terbesar di supplier aktif |
| Frontend First Paint | < 1.5 detik | Skeleton langsung muncul, fetch async |
| Concurrent Fetch | Semua supplier paralel | Goroutine fan-out |
| Goroutine Limit | Max 50 concurrent | Semaphore channel di `stock_engine.go` |
| DB Query Time | < 20ms | Partial index pada `is_active = true` |
| DB Connection Pool | Min 2, Max 10 | Dari `DB_POOL_MAX_CONNS` env |
| Code Quality | Zero Go framework | `pgx` satu-satunya external dep backend |
| Browser Support | Chrome 100+, Firefox 100+, Safari 15+ | — |
| Accessibility | Semantic HTML, ARIA labels | Pada badge, Switch, form fields |

---

## 11. Definition of Done

### Backend
- [ ] PostgreSQL berjalan via Docker, semua migration berjalan
- [ ] Seed data 4 supplier ter-insert dengan benar
- [ ] `GET /api/v1/stock` menjalankan goroutine per supplier dari DB
- [ ] Timeout handling terbukti: supplier `timeout` tidak memblokir response
- [ ] Semua CRUD `/api/v1/suppliers` berjalan dengan validasi dan error codes
- [ ] BL-01: delete/nonaktifkan satu-satunya supplier aktif → 409
- [ ] BL-02: nama duplikat → 409
- [ ] BL-03: 0 supplier aktif → 200 dengan warning
- [ ] `services/` layer ada; handler tidak langsung panggil repo
- [ ] `FetcherFactory` ada; mode dikontrol dari env
- [ ] `FETCHER_MODE=mock` berjalan; `http_fetcher.go` ada sebagai stub
- [ ] Error response selalu format `{"error": {"code":..., "message":..., "field":...}}`
- [ ] Request ID ada di setiap log line dan response error
- [ ] CORS berfungsi dari `localhost:3000`

### Frontend
- [ ] Dashboard hero metric dengan counter animation
- [ ] Supplier cards dengan status badge akurat
- [ ] Card `SUCCESS` dengan `stock: 0` tampil hijau (bukan error)
- [ ] Card `TIMEOUT`/`ERROR` tampil degraded, angka `-`
- [ ] Empty state dashboard saat 0 supplier aktif
- [ ] Skeleton tanpa layout shift
- [ ] Sync Now + cooldown; auto-refresh toggle
- [ ] Halaman `/suppliers` dengan tabel + pagination
- [ ] Add/Edit form dengan validasi Zod (inline error)
- [ ] Toggle optimistic update + revert on error
- [ ] Delete dengan AlertDialog + toast
- [ ] Error toast menampilkan `error.message` (bukan raw error object)
- [ ] Empty state tabel saat belum ada supplier
- [ ] Responsive: mobile, tablet, desktop

### Documentation
- [ ] `README.md`: setup lokal, penjelasan layer architecture, cara ganti fetcher mode
- [ ] `.env.example` lengkap dengan semua variabel
- [ ] Setiap business rule (BL-01 s/d BL-06) ada komentar di kode yang relevan

---

## 12. Auth Strategy Roadmap

| Version | `auth_type` | Backend | Frontend |
|---------|-------------|---------|----------|
| **v1.0** | `none` | `MockFetcher` — baca `mock_behavior` | Field `api_key` disabled, tooltip "v1.1" |
| **v1.1** | `api_key` | `HttpFetcher` aktif — hit `endpoint_url` dengan `Authorization: Bearer {token}` | Field `api_key` enabled, input masked |
| **v1.2** | `oauth2` | `HttpFetcher` dengan token refresh | Token config tambahan di form |

Perubahan v1.0 → v1.1: `http_fetcher.go` di-implement + `FETCHER_MODE=http`. Tidak ada perubahan di `handlers/`, `services/`, `engine/`, `repository/`.

---

## 13. Portfolio Showcase Notes

| Talking Point | Bukti Teknis |
|---------------|-------------|
| "Dynamic, not hardcoded" | Supplier dari Postgres; tambah via UI efektif tanpa redeploy |
| "Clean architecture" | 5-layer separation: handlers → services → engine → fetcher → repository |
| "Zero-framework backend" | `net/http` stdlib; `pgx` satu-satunya dependency |
| "Pluggable fetcher" | Interface-based; `FETCHER_MODE` env switch mock ↔ http |
| "Graceful partial failure" | Timeout tidak blok supplier lain; partial response tetap return |
| "Defined business rules" | BL-01 s/d BL-06 documented dan enforced di services layer |
| "Production-ready patterns" | Goroutine leak guard, semaphore limit, structured logging, request ID, DB pool |
| "Type-safe full-stack" | Zod schema di frontend mirrors Go validation di backend |

---

## 14. Out of Scope (v1.0)

- Real supplier API calls (v1.1)
- Authentication/authorization untuk dashboard user (login page, sessions)
- Supplier-level stock history / time series chart
- Alerting / notification jika supplier down lebih dari X menit
- Multi-tenant support
- Stock threshold / low stock warning

---

*PRD ini adalah dokumen hidup. Update sesuai feedback atau perubahan scope.*

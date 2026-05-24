-- Hapus index terlebih dahulu (opsional karena drop table biasanya otomatis menghapus index, tapi ini best practice)
DROP INDEX IF EXISTS idx_suppliers_active;

-- Hapus tabel
DROP TABLE IF EXISTS suppliers;
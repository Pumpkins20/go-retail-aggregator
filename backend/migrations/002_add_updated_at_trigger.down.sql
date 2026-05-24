-- Hapus trigger dari tabel
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;

-- Hapus fungsi
DROP FUNCTION IF EXISTS update_modified_column();
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StockRepository interface {
	UpsertStock(ctx context.Context, supplierID string, stock int) error
	InsertSyncLog(ctx context.Context, supplierID string, status string, errorMessage *string, latencyMs int) error
}

type postgresStockRepository struct {
	db *pgxpool.Pool
}

func NewStockRepository(db *pgxpool.Pool) StockRepository {
	return &postgresStockRepository{db: db}
}

// UPSERT (Update and Insert)
func (r *postgresStockRepository) UpsertStock(ctx context.Context, supplierID string, stock int) error {
	query := `
			INSERT INTO supplier_stocks (supplier_id, stock_quantity, last_synced_at)
			VALUES ($1, $2, now())
			ON CONFLICT (supplier_id) 
			DO UPDATE SET
				stock_quantity = EXCLUDED.stock_quantity,
				last_synced_at = EXCLUDED.last_synced_at,
	`
	_, err := r.db.Exec(ctx, query, supplierID, stock)
	if err != nil {
		return fmt.Errorf("failed to upsert stock: %w", err)
	}
	return nil
}

// INSERT SYNC LOG
func (r *postgresStockRepository) InsertSyncLog(ctx context.Context, supplierID string, status string, errorMessage *string, latencyMs int) error {
	query := `
		INSERT INTO sync_logs (supplier_id, status, error_message, latency_ms)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.db.Exec(ctx, query, supplierID, status, errorMessage, latencyMs)
	if err != nil {
		return fmt.Errorf("failed to insert sync log: %w", err)
	}
	return nil
}

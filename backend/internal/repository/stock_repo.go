package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StockRepository interface {
	InsertSyncLog(ctx context.Context, supplierID string, traceID string, status string, records int, errMsg *string, startedAt time.Time) error
}

type postgresStockRepository struct {
	db *pgxpool.Pool
}

func NewStockRepository(db *pgxpool.Pool) StockRepository {
	return &postgresStockRepository{db: db}
}

// save to sync log table
func (r *postgresStockRepository) InsertSyncLog(ctx context.Context, supplierID string, traceID string, status string, records int, errMsg *string, startedAt time.Time) error {
	query := `
		INSERT INTO sync_logs (supplier_id, trace_id, status, records_processed, error_message, started_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
	`
	_, err := r.db.Exec(ctx, query, supplierID, traceID, status, records, errMsg, startedAt)
	if err != nil {
		return fmt.Errorf("failed to insert sync log: %w", err)
	}
	return nil
}

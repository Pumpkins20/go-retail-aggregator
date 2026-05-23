package repository

import (
	"backend/internal/models"
	"context"
	"github.com/jackc/pgx/v4/pgxpool"
	"fmt"
)

var _ SupplierRepository = (*postgresSupplierRepository)(nil)

type postgresSupplierRepository struct {
	db *pgxpool.Pool
}

func NewSupplierRepository(db *pgxpool.Pool) *SupplierRepository {
	return &postgresSupplierRepository{db: db}
}


func (r *postgresSupplierRepository) Create(ctx context.Context) ([]models.Supplier, error) {
	query := `
		SELECT id, name, description, endpoint_url, auth_type, auth_token,
				timeout_ms, is_active, mock_behavior, display_order, created_at, updated_at
		FROM suppliers
		WHERE is_active = true
		ORDER BY display_order ASC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query suppliers: %w", err)
	}
	defer rows.Close()

	var suppliers []models.Supplier
	for rows.Next() {
		var s models.Supplier
		if err := rows.Scan(
			&s.ID, &s.Name, &s.Description, &s.EndpointURL, &s.AuthType, &s.AuthToken,
			&s.TimeoutMS, &s.IsActive, &s.MockBehavior, &s.DisplayOrder, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan supplier: %w", err)
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, nil
}

// checking if supplier name already exists (case-insensitive)
func (r *postgresSupplierRepository) ExistsbyName(ctx context.Context, name string) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM suppliers WHERE LOWER(name) = LOWER($1))`
	var exists bool
	err := r.db.QueryRow(ctx, query, name).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check supplier name existence: %w", err)
	}
	return exists, nil
}

// counting active suppliers
func (r *postgresSupplierRepository) CountActiveSuppliers(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM suppliers WHERE is_active = true`
	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active suppliers: %w", err)
	}
	return count, nil
}

// Get supplier by ID and delete supplier by ID
func (r *postgresSupplierRepository) GetByID(ctx context.Context, id string) (*models.Supplier, error) {
	query := `
		SELECT id, name, description, endpoint_url, auth_type, auth_token,
				timeout_ms, is_active, mock_behavior, display_order, created_at, updated_at
		FROM suppliers
		WHERE id = $1
	`
	var s models.Supplier
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Description, &s.EndpointURL, &s.AuthType, &s.AuthToken,
		&s.TimeoutMS, &s.IsActive, &s.MockBehavior, &s.DisplayOrder, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get supplier by ID: %w", err)
	}
	return &s, nil
}

func (r *postgresSupplierRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM suppliers WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete supplier: %w", err)
	}
	return nil
}





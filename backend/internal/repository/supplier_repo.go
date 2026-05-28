package repository

import (
	"backend/internal/models"
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SupplierRepository interface {
	GetAllSuppliers(ctx context.Context, search string, page int, limit int) ([]models.Supplier, error)
	GetActiveSuppliers(ctx context.Context) ([]models.Supplier, error)
	ExistsbyName(ctx context.Context, name string) (bool, error)
	CountActiveSuppliers(ctx context.Context) (int, error)
	GetByID(ctx context.Context, id string) (models.Supplier, error)
	Delete(ctx context.Context, id string) error
	Create(ctx context.Context, req models.Supplier) error
	Update(ctx context.Context, req models.Supplier) error
	ToggleActiveStatus(ctx context.Context, id string, isActive bool) error
}

var _ SupplierRepository = (*postgresSupplierRepository)(nil)

type postgresSupplierRepository struct {
	db *pgxpool.Pool
}

func NewSupplierRepository(db *pgxpool.Pool) SupplierRepository {
	return &postgresSupplierRepository{db: db}
}

func (r *postgresSupplierRepository) GetActiveSuppliers(ctx context.Context) ([]models.Supplier, error) {
	query := `
		SELECT id, name, description, endpoint_url, auth_type, auth_token,
				timeout_ms, is_active, mock_behavior, display_order, created_at, updated_at
		FROM suppliers
		WHERE is_active = true AND deleted_at IS NULL
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
			&s.TimeoutMs, &s.IsActive, &s.MockBehavior, &s.DisplayOrder, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan supplier: %w", err)
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, nil
}

func (r *postgresSupplierRepository) GetAllSuppliers(ctx context.Context, search string, page int, limit int) ([]models.Supplier, error) {

	query := `
		SELECT id, name, description, endpoint_url, auth_type, auth_token,
				timeout_ms, is_active, mock_behavior, display_order, created_at, updated_at
		FROM suppliers
		WHERE deleted_at IS NULL
		ORDER BY display_order ASC, created_at ASC
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
			&s.TimeoutMs, &s.IsActive, &s.MockBehavior, &s.DisplayOrder, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan supplier: %w", err)
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, nil
}

// checking if supplier name already exists (case-insensitive)
func (r *postgresSupplierRepository) ExistsbyName(ctx context.Context, name string) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM suppliers WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL)`
	var exists bool
	err := r.db.QueryRow(ctx, query, name).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check supplier name existence: %w", err)
	}
	return exists, nil
}

// counting active suppliers
func (r *postgresSupplierRepository) CountActiveSuppliers(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM suppliers WHERE is_active = true AND deleted_at IS NULL`
	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active suppliers: %w", err)
	}
	return count, nil
}

// Get supplier by ID and delete supplier by ID
func (r *postgresSupplierRepository) GetByID(ctx context.Context, id string) (models.Supplier, error) {
	query := `
		SELECT id, name, description, endpoint_url, auth_type, auth_token,
				timeout_ms, is_active, mock_behavior, display_order, created_at, updated_at
		FROM suppliers
		WHERE id = $1 AND deleted_at IS NULL
	`
	var s models.Supplier
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Description, &s.EndpointURL, &s.AuthType, &s.AuthToken,
		&s.TimeoutMs, &s.IsActive, &s.MockBehavior, &s.DisplayOrder, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return models.Supplier{}, fmt.Errorf("failed to get supplier by ID: %w", err)
	}
	return s, nil
}

func (r *postgresSupplierRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE suppliers SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete supplier: %w", err)
	}
	return nil
}

func (r *postgresSupplierRepository) Create(ctx context.Context, req models.Supplier) error {
	query := `
		INSERT INTO suppliers (name, description, endpoint_url, auth_type, auth_token,
				timeout_ms,is_active, mock_behavior, display_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(ctx, query,
		req.Name, req.Description, req.EndpointURL, req.AuthType, req.AuthToken,
		req.TimeoutMs, req.IsActive, req.MockBehavior, req.DisplayOrder,
	)
	if err != nil {
		return fmt.Errorf("failed to create supplier: %w", err)
	}
	return nil
}

func (r *postgresSupplierRepository) Update(ctx context.Context, req models.Supplier) error {
	query := `
		UPDATE suppliers
		SET name = $1, description = $2, endpoint_url = $3, auth_type = $4, auth_token = $5,
			timeout_ms = $6, mock_behavior = $7, display_order = $8
		WHERE id = $9 AND deleted_at IS NULL
		RETURNING id
	`
	_, err := r.db.Exec(ctx, query,
		req.Name, req.Description, req.EndpointURL, req.AuthType, req.AuthToken,
		req.TimeoutMs, req.MockBehavior, req.DisplayOrder, req.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update supplier: %w", err)
	}
	return nil
}

func (r *postgresSupplierRepository) ToggleActiveStatus(ctx context.Context, id string, isActive bool) error {
	query := `UPDATE suppliers SET is_active = $1 WHERE id = $2 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, isActive, id)
	if err != nil {
		return fmt.Errorf("failed to toggle supplier active status: %w", err)
	}
	return nil
}

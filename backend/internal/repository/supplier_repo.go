package repository

import (
	"backend/internal/models"
	"context"
)

type SupplierRepository interface {
	GetActiveSuppliers(ctx context.Context) ([]models.Supplier, error)
}

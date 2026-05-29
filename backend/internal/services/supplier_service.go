package services

import (
	"backend/internal/models"
	"backend/internal/repository"
	"context"
	"errors"
	"strings"
)

var (
	ErrSupplierNameExists = errors.New("supplier name already exists")
	ErrLastActiveSupplier = errors.New("cannot deactivate the last active supplier")
)

type SupplierService struct {
	repo repository.SupplierRepository
}

func NewSupplierService(repo repository.SupplierRepository) *SupplierService {
	return &SupplierService{repo: repo}
}

func (s *SupplierService) ListSuppliers(ctx context.Context, search string, page int, limit int) ([]models.Supplier, int, error) {
	return s.repo.GetAllSuppliers(ctx, search, page, limit)
}

// Rule 1: Supplier names must be unique (case-insensitive)
func (s *SupplierService) CreateSupplier(ctx context.Context, req models.Supplier) error {
	// change name to lower case for case-insensitive comparison
	existing, err := s.repo.ExistsbyName(ctx, strings.ToLower(req.Name))
	if err != nil {
		return err
	}

	if existing {
		return ErrSupplierNameExists
	}

	return s.repo.Create(ctx, req)
}

// Rule 2: only one supplier can be active at a time
func (s *SupplierService) DeleteSupplier(ctx context.Context, id string) error {
	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if supplier.IsActive {
		activeCount, err := s.repo.CountActiveSuppliers(ctx)
		if err != nil {
			return err
		}
		if activeCount <= 1 {
			return ErrLastActiveSupplier
		}
	}
	return s.repo.Delete(ctx, id)
}

// edit supplier details (except ID) and toggle active status
func (s *SupplierService) UpdateSupplier(ctx context.Context, id string, req models.Supplier) error {

	oldSupplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if strings.ToLower(req.Name) != strings.ToLower(oldSupplier.Name) {
		exist, err := s.repo.ExistsbyName(ctx, strings.ToLower(req.Name))
		if err != nil {
			return err
		}
		if exist {
			return ErrSupplierNameExists
		}
	}

	req.ID = oldSupplier.ID
	return s.repo.Update(ctx, req)
}

func (s *SupplierService) ToggleActiveStatus(ctx context.Context, id string, isActive bool) error {
	supplier, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if supplier.IsActive {
		activeCount, err := s.repo.CountActiveSuppliers(ctx)
		if err != nil {
			return err
		}
		if activeCount <= 1 {
			return ErrLastActiveSupplier
		}
	}

	return s.repo.ToggleActiveStatus(ctx, id, !supplier.IsActive)
}

func (s *SupplierService) ExportSuppliersCSV(ctx context.Context, search string) ([]models.Supplier, error) {
	return s.repo.GetAllSuppliersForExport(ctx, search)
}

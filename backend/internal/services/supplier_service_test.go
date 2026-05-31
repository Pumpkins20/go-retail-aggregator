package services

import (
	"context"
	"errors"
	"testing"

	"backend/internal/models"
)

type mockSupplierRepo struct {
	existsByNameFunc func(name string) (bool, error)
	createFunc       func(req models.Supplier) error
}

func (m *mockSupplierRepo) GetAllSuppliers(ctx context.Context, search string, page int, limit int) ([]models.Supplier, int, error) {
	return nil, 0, nil
}

func (m *mockSupplierRepo) GetAllSuppliersForExport(ctx context.Context, search string) ([]models.Supplier, error) {
	return nil, nil
}

func (m *mockSupplierRepo) GetActiveSuppliers(ctx context.Context) ([]models.Supplier, error) {
	return nil, nil
}

func (m *mockSupplierRepo) CountActiveSuppliers(ctx context.Context) (int, error) {
	return 0, nil
}

func (m *mockSupplierRepo) GetByID(ctx context.Context, id string) (models.Supplier, error) {
	return models.Supplier{}, nil
}

func (m *mockSupplierRepo) Delete(ctx context.Context, id string) error {
	return nil
}

func (m *mockSupplierRepo) Update(ctx context.Context, req models.Supplier) error {
	return nil
}

func (m *mockSupplierRepo) ToggleActiveStatus(ctx context.Context, id string, isActive bool) error {
	return nil
}

func (m *mockSupplierRepo) ExistsbyName(ctx context.Context, name string) (bool, error) {
	return m.existsByNameFunc(name)
}

func (m *mockSupplierRepo) Create(ctx context.Context, req models.Supplier) error {
	return m.createFunc(req)
}

// unit test dengan tabel-driven test
func TestCreateSupplier(t *testing.T) {
	tests := []struct {
		name          string // Nama skenario tes
		inputName     string
		mockExists    bool
		mockExistsErr error
		mockCreateErr error
		expectedErr   error
	}{
		{
			name:          "Success - Name is Unique",
			inputName:     "Tokopedia",
			mockExists:    false,
			mockExistsErr: nil,
			mockCreateErr: nil,
			expectedErr:   nil,
		},
		{
			name:          "Fail - Name Already Exists",
			inputName:     "Shopee",
			mockExists:    true,
			mockExistsErr: nil,
			expectedErr:   ErrSupplierNameExists,
		},
		{
			name:          "Fail - Database Error on Check",
			inputName:     "Lazada",
			mockExists:    false,
			mockExistsErr: errors.New("db connection lost"),
			expectedErr:   errors.New("db connection lost"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockSupplierRepo{
				existsByNameFunc: func(name string) (bool, error) {
					return tt.mockExists, tt.mockExistsErr
				},
				createFunc: func(req models.Supplier) error {
					return tt.mockCreateErr
				},
			}

			service := NewSupplierService(mockRepo)

			req := models.Supplier{Name: tt.inputName}
			err := service.CreateSupplier(context.Background(), req)

			if tt.expectedErr != nil {
				if err == nil {
					t.Errorf("expected error %v, but got nil", tt.expectedErr)
				} else if err.Error() != tt.expectedErr.Error() {
					t.Errorf("expected error %v, but got %v", tt.expectedErr, err)
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, but got %v", err)
				}
			}
		})
	}
}

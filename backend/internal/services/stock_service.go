package services

import (
	"context"
	"sort"
	"time"

	"backend/internal/engine"
	"backend/internal/models"
	"backend/internal/repository"
)

type StockResponse struct {
	TotalStock        int                  `json:"total_stock"`
	SuccessfulSources int                  `json:"successful_sources"`
	FailedSources     int                  `json:"failed_sources"`
	FetchedAt         time.Time            `json:"fetched_at"`
	Warning           *string              `json:"warning"`
	Suppliers         []models.FetchResult `json:"suppliers"`
}

type StockService struct {
	repo   repository.SupplierRepository
	engine *engine.StockEngine
}

func NewStockService(repo repository.SupplierRepository, engine *engine.StockEngine) *StockService {
	return &StockService{
		repo:   repo,
		engine: engine,
	}
}

func (s *StockService) GetAggregatedStock(ctx context.Context) (*StockResponse, error) {
	suppliers, err := s.repo.GetActiveSuppliers(ctx)
	if err != nil {
		return nil, err
	}

	if len(suppliers) == 0 {
		warningmsg := "no active suppliers found"
		return &StockResponse{
			TotalStock:        0,
			SuccessfulSources: 0,
			FailedSources:     0,
			FetchedAt:         time.Now(),
			Warning:           &warningmsg,
			Suppliers:         []models.FetchResult{},
		}, nil
	}

	result := s.engine.FanOut(ctx, suppliers)

	sort.Slice(result, func(i, j int) bool {
		orderI, orderJ := 0, 0
		for _, sup := range suppliers {
			if sup.ID == result[i].SupplierID {
				orderI = sup.DisplayOrder
			}
			if sup.ID == result[j].SupplierID {
				orderJ = sup.DisplayOrder
			}
		}
		return orderI < orderJ
	})

	var totalStock, successfulCount, failedCount int
	for _, res := range result {
		if res.Status == "SUCCESS" {
			totalStock += res.Stock
			successfulCount++
		} else {
			failedCount++
		}
	}

	return &StockResponse{
		TotalStock:        totalStock,
		SuccessfulSources: successfulCount,
		FailedSources:     failedCount,
		FetchedAt:         time.Now(),
		Warning:           nil,
		Suppliers:         result,
	}, nil
}

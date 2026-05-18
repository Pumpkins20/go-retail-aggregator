package fetcher

import (
	"context"
	"math/rand"
	"time"

	"backend/internal/models"
)

type MockFetcher struct{}

func (f *MockFetcher) Fetch(ctx context.Context, supplier models.Supplier) models.FetchResult {
	start := time.Now()

	behavior := supplier.MockBehavior

	var latencyMs int
	if behavior == "Success" {
		latencyMs = rand.Intn(500) + 100 // 100-600ms
	} else if behavior == "random_error" {
		latencyMs = rand.Intn(600) + 200 // exceed timeout
	} else if behavior == "timeout" {
		latencyMs = supplier.TimeoutMs + 500 // exceed timeout
	}

	timer := time.NewTimer(time.Duration(latencyMs) * time.Millisecond)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		msg := "fetch cancelled due to context timeout"
		return models.FetchResult{
			SupplierID:   supplier.ID,
			SupplierName: supplier.Name,
			Description:  supplier.Description,
			Stock:        0,
			Status:       "TIMEOUT",
			LatencyMs:    time.Since(start).Milliseconds(),
			FetchedAt:    time.Now(),
			ErrorMessage: &msg,
		}
	case <-timer.C:
		if behavior == "random_error" && rand.Intn(100) < 20 {
			msg := "simulated random error"
			return models.FetchResult{
				SupplierID:   supplier.ID,
				SupplierName: supplier.Name,
				Description:  supplier.Description,
				Stock:        0,
				Status:       "ERROR",
				LatencyMs:    time.Since(start).Milliseconds(),
				FetchedAt:    time.Now(),
				ErrorMessage: &msg,
			}
		}
		return models.FetchResult{
			SupplierID:   supplier.ID,
			SupplierName: supplier.Name,
			Description:  supplier.Description,
			Stock:        rand.Intn(1501) + 500, // random stock level
			Status:       "SUCCESS",
			LatencyMs:    time.Since(start).Milliseconds(),
			FetchedAt:    time.Now(),
			ErrorMessage: nil,
		}
	}
}

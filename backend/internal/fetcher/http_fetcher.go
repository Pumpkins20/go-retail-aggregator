package fetcher

import (
	"context"
	"net/http"
	"time"

	"backend/internal/models"
)

type HttpFetcher struct {
	client *http.Client
}

func (f *HttpFetcher) Fetch(ctx context.Context, supplier models.Supplier) models.FetchResult {
	msg := "HTTP fetcher not implemented yet in v1.0"
	return models.FetchResult{
		SupplierID:   supplier.ID,
		SupplierName: supplier.Name,
		Description:  supplier.Description,
		Stock:        0,
		Status:       "ERROR",
		LatencyMs:    0,
		FetchedAt:    time.Now(),
		ErrorMessage: &msg,
	}
}

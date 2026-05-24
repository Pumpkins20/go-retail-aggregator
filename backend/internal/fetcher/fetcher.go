package fetcher

import (
	"context"
	"net/http"

	"backend/internal/models"
)

type SupplierFetcher interface {
	Fetch(ctx context.Context, supplier models.Supplier) models.FetchResult
}

type FetcherFactory struct {
	mode string
}

func NewFetcherFactory(mode string) *FetcherFactory {
	return &FetcherFactory{mode: mode}
}

func (f *FetcherFactory) GetFetcher() SupplierFetcher {
	if f.mode == "mock" {
		return &MockFetcher{}
	}

	return &HttpFetcher{client: http.DefaultClient}
}

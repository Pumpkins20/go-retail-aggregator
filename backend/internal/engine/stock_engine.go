package engine

import (
	"backend/internal/fetcher"
	"backend/internal/models"
	"context"
	"time"
)

type StockEngine struct {
	fetcherFactory *fetcher.FetcherFactory
}

func NewStockEngine(factory *fetcher.FetcherFactory) *StockEngine {
	return &StockEngine{
		fetcherFactory: factory,
	}
}

func (e *StockEngine) Sync(ctx context.Context, supplier models.Supplier) models.FetchResult {
	tCtx, cancel := context.WithTimeout(ctx, time.Duration(supplier.TimeoutMs)*time.Millisecond)
	defer cancel()

	f := e.fetcherFactory.GetFetcher()
	return f.Fetch(tCtx, supplier)
}

func (e *StockEngine) FanOut(ctx context.Context, suppliers []models.Supplier) []models.FetchResult {

	if len(suppliers) == 0 {
		return []models.FetchResult{}
	}

	// semaphore to limit concurrent fetches 50 at a time
	sem := make(chan struct{}, 50)

	// buffered channel to collect results
	results := make(chan models.FetchResult, len(suppliers))

	// fan out fetches
	for _, supplier := range suppliers {
		go func(sup models.Supplier) {
			sem <- struct{}{} // acquire semaphore

			defer func() {
				<-sem // release semaphore
			}()
			tCtx, cancel := context.WithTimeout(ctx, time.Duration(supplier.TimeoutMs)*time.Millisecond)
			defer cancel()

			f := e.fetcherFactory.GetFetcher()
			results <- f.Fetch(tCtx, sup)
		}(supplier)
	}

	// fan-in results
	out := make([]models.FetchResult, 0, len(suppliers))
	for i := 0; i < len(suppliers); i++ {
		out = append(out, <-results)
	}

	close(results)
	return out
}
